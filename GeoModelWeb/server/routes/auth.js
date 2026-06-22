/**
 * OAuth Authentication Routes
 */
const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const https = require('https');
const crypto = require('crypto');
const router = express.Router();
const { getUserById, upsertOAuthUser } = require('../db/users');

// 创建忽略 SSL 证书验证的 agent
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

// Configuration - 请替换为您的 GitHub OAuth App 信息
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'YOUR_GITHUB_CLIENT_ID';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'YOUR_GITHUB_CLIENT_SECRET';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const OPENGMS_USER_SERVER_URL = normalizeBaseUrl(process.env.OPENGMS_USER_SERVER_URL || '');
const OPENGMS_CLIENT_ID = process.env.OPENGMS_CLIENT_ID || '';
const OPENGMS_CLIENT_SECRET = process.env.OPENGMS_CLIENT_SECRET || '';
const OPENGMS_AVATAR_BASE_URL = normalizeBaseUrl(process.env.OPENGMS_AVATAR_BASE_URL || OPENGMS_USER_SERVER_URL);
const OPENGMS_PASSWORD_ENCODING = process.env.OPENGMS_PASSWORD_ENCODING || 'sha256_md5';
const JWT_SECRET = process.env.JWT_SECRET || 'development-only-jwt-secret';

// 从 HOST_IP 自动生成 URL
const HOST_IP = process.env.HOST_IP || 'localhost';
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || `http://${HOST_IP}:5173`;
const BACKEND_URL = process.env.BACKEND_URL || `http://${HOST_IP}:${PORT}`;
const OAUTH_HTTP_TIMEOUT_MS = Number(process.env.OAUTH_HTTP_TIMEOUT_MS || 10000);

function buildOAuthRequestOptions(options = {}) {
    return {
        timeout: OAUTH_HTTP_TIMEOUT_MS,
        httpsAgent,
        ...options
    };
}

/**
 * GET /api/auth/github
 * 重定向到 GitHub OAuth 授权页面
 */
router.get('/github', (req, res) => {
    if (!isOAuthValueConfigured(GITHUB_CLIENT_ID) || !isOAuthValueConfigured(GITHUB_CLIENT_SECRET)) {
        return redirectToLoginError(res, 'github_not_configured');
    }

    // 使用环境变量配置的后端地址
    const redirectUri = `${BACKEND_URL}/api/auth/github/callback`;
    const scope = 'user:email read:user';
    
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
    
    res.redirect(githubAuthUrl);
});

/**
 * GET /api/auth/github/callback
 * GitHub OAuth 回调处理
 */
router.get('/github/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return redirectToLoginError(res, 'github_no_code');
    }
    
    try {
        // 1. 用 code 换取 access_token
        const tokenResponse = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code: code
            },
            {
                headers: { Accept: 'application/json' },
                ...buildOAuthRequestOptions()
            }
        );
        
        const accessToken = tokenResponse.data.access_token;
        
        if (!accessToken) {
            console.error('GitHub OAuth failed:', tokenResponse.data);
            return redirectToLoginError(res, 'github_token_failed');
        }
        
        // 2. 获取用户信息
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${accessToken}` },
            ...buildOAuthRequestOptions()
        });
        
        const githubUser = userResponse.data;
        
        // 3. 获取用户邮箱
        let email = githubUser.email;
        if (!email) {
            try {
                const emailResponse = await axios.get('https://api.github.com/user/emails', {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    ...buildOAuthRequestOptions()
                });
                const primaryEmail = emailResponse.data.find(e => e.primary);
                email = primaryEmail ? primaryEmail.email : null;
            } catch (e) {
                console.log('Could not fetch email');
            }
        }
        
        // 4. 创建或更新本地用户
        const user = await upsertOAuthUser({
            provider: 'github',
            externalUserId: githubUser.id,
            providerUsername: githubUser.login,
            email: email,
            displayName: githubUser.name || githubUser.login,
            avatarUrl: githubUser.avatar_url,
            accessToken: accessToken,
            profile: githubUser,
            lastLoginIp: getClientIp(req)
        });
        
        // 5. 生成 JWT
        const token = signSessionToken(user);
        
        // 6. 重定向回前端，带上 token
        redirectToLoginCallback(res, token);
        
    } catch (error) {
        console.error('GitHub OAuth error:', error.message);
        redirectToLoginError(res, 'github_oauth_failed');
    }
});

/**
 * GET /api/auth/google
 * 重定向到 Google OAuth 授权页面
 */
router.get('/google', (req, res) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return redirectToLoginError(res, 'google_not_configured');
    }

    const redirectUri = `${BACKEND_URL}/api/auth/google/callback`;
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.search = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'online',
        include_granted_scopes: 'true',
        prompt: 'select_account'
    }).toString();

    res.redirect(googleAuthUrl.toString());
});

/**
 * GET /api/auth/google/callback
 * Google OAuth 回调处理
 */
router.get('/google/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
        return redirectToLoginError(res, 'google_access_denied');
    }

    if (!code) {
        return redirectToLoginError(res, 'google_no_code');
    }

    try {
        const redirectUri = `${BACKEND_URL}/api/auth/google/callback`;
        const tokenResponse = await axios.post(
            'https://oauth2.googleapis.com/token',
            new URLSearchParams({
                code: String(code),
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                ...buildOAuthRequestOptions()
            }
        );

        const accessToken = tokenResponse.data?.access_token;
        if (!accessToken) {
            console.error('Google OAuth failed:', tokenResponse.data);
            return redirectToLoginError(res, 'google_token_failed');
        }

        const userResponse = await axios.get(
            'https://openidconnect.googleapis.com/v1/userinfo',
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                ...buildOAuthRequestOptions()
            }
        );

        const googleUser = userResponse.data;
        if (!googleUser?.sub) {
            return redirectToLoginError(res, 'google_profile_failed');
        }

        const user = await upsertOAuthUser({
            provider: 'google',
            externalUserId: googleUser.sub,
            providerUsername: googleUser.email || googleUser.name || `google-${googleUser.sub}`,
            email: googleUser.email || null,
            displayName: googleUser.name || googleUser.email || 'Google User',
            avatarUrl: googleUser.picture || null,
            accessToken: accessToken,
            refreshToken: tokenResponse.data?.refresh_token || null,
            tokenInfo: {
                expiresIn: tokenResponse.data?.expires_in ?? null,
                expiryTime: null
            },
            profile: googleUser,
            lastLoginIp: getClientIp(req)
        });

        const token = signSessionToken(user);
        redirectToLoginCallback(res, token);
    } catch (error) {
        console.error('Google OAuth error:', error.response?.data || error.message);
        redirectToLoginError(res, 'google_oauth_failed');
    }
});

/**
 * POST /api/auth/opengms/login
 * 使用 OpenGMS 现有账号密码登录
 */
router.post('/opengms/login', async (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !String(email).trim() || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!OPENGMS_USER_SERVER_URL || !OPENGMS_CLIENT_ID || !OPENGMS_CLIENT_SECRET) {
        return res.status(503).json({
            error: 'OpenGMS authentication is not configured'
        });
    }

    try {
        const encodedPassword = encodeOpenGmsPassword(String(password));
        const tokenResponse = await axios.post(
            buildOpenGmsUrl('/oauth/token'),
            new URLSearchParams({
                client_id: OPENGMS_CLIENT_ID,
                client_secret: OPENGMS_CLIENT_SECRET,
                username: String(email).trim(),
                password: encodedPassword,
                scope: 'all',
                grant_type: 'password'
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                httpsAgent: httpsAgent
            }
        );

        const accessToken = tokenResponse.data?.access_token;
        const refreshToken = tokenResponse.data?.refreshToken || tokenResponse.data?.refresh_token || null;
        const expiresIn = tokenResponse.data?.expire ?? tokenResponse.data?.expires_in ?? null;
        const expiryTime = tokenResponse.data?.expiryTime || tokenResponse.data?.invalidTime || null;

        if (!accessToken) {
            return res.status(401).json({
                error: tokenResponse.data?.msg || tokenResponse.data?.error_description || 'OpenGMS login failed'
            });
        }

        const remoteUser = await fetchOpenGmsUser(accessToken, getClientIp(req));
        if (!remoteUser) {
            return res.status(401).json({ error: 'Failed to fetch OpenGMS user profile' });
        }

        const user = await upsertOAuthUser({
            provider: 'opengms',
            externalUserId: remoteUser.userId || remoteUser.id || String(email).trim(),
            providerUsername: buildOpenGmsUsernameCandidate(remoteUser, String(email).trim()),
            email: remoteUser.email || String(email).trim(),
            displayName: remoteUser.name || remoteUser.userName || remoteUser.email || String(email).trim(),
            avatarUrl: absolutizeOpenGmsAvatarUrl(remoteUser.avatar),
            accessToken: accessToken,
            refreshToken: refreshToken,
            tokenInfo: {
                expiresIn,
                expiryTime
            },
            profile: remoteUser,
            lastLoginIp: getClientIp(req)
        });

        const token = jwt.sign(
            {
                userId: user.id,
                username: user.username,
                displayName: user.displayName
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: buildUserResponse(user),
            tokenInfo: {
                accessToken,
                refreshToken,
                expiresIn,
                expiryTime
            }
        });
    } catch (error) {
        const message =
            error.response?.data?.msg ||
            error.response?.data?.error_description ||
            error.response?.data?.error ||
            error.message;

        console.error('OpenGMS login error:', message);
        res.status(401).json({ error: message || 'OpenGMS login failed' });
    }
});

/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 */
router.get('/me', authenticateToken, async (req, res) => {
    const user = await getUserById(req.user.userId);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    // 不返回敏感信息
    res.json(buildUserResponse(user));
});

router.get('/avatar/:userId', async (req, res) => {
    const user = await getUserById(req.params.userId);

    if (!user?.avatarUrl || !canProxyAvatarUrl(user.avatarUrl)) {
        return res.status(404).json({ error: 'Avatar not found' });
    }

    try {
        const avatarResponse = await axios.get(user.avatarUrl, {
            responseType: 'stream',
            timeout: 15000,
            maxRedirects: 3,
            httpsAgent
        });

        const contentType = avatarResponse.headers['content-type'];
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        const contentLength = avatarResponse.headers['content-length'];
        if (contentLength) {
            res.setHeader('Content-Length', contentLength);
        }

        res.setHeader('Cache-Control', 'public, max-age=86400');
        avatarResponse.data.on('error', error => {
            console.error('OpenGMS avatar stream error:', error.message);
            if (!res.headersSent) {
                res.status(502).end();
            } else {
                res.end();
            }
        });
        avatarResponse.data.pipe(res);
    } catch (error) {
        console.error('OpenGMS avatar proxy error:', error.response?.status || error.message);
        res.status(502).json({ error: 'Failed to load avatar' });
    }
});

/**
 * POST /api/auth/logout
 * 登出
 */
router.post('/logout', authenticateToken, (req, res) => {
    // 在实际应用中，可以将 token 加入黑名单
    res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * JWT 验证中间件
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = decoded;
        next();
    });
}

function signSessionToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            username: user.username,
            displayName: user.displayName
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function getClientIp(req) {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
        return forwardedFor.split(',')[0].trim();
    }

    return req.socket?.remoteAddress || null;
}

function encodeOpenGmsPassword(password) {
    if (OPENGMS_PASSWORD_ENCODING === 'sha256') {
        return crypto.createHash('sha256').update(password, 'utf8').digest('hex');
    }

    const md5Hex = crypto.createHash('md5').update(password, 'utf8').digest('hex');
    return crypto.createHash('sha256').update(md5Hex, 'utf8').digest('hex');
}

function normalizeBaseUrl(value) {
    if (!value) {
        return '';
    }

    const trimmed = String(value).trim().replace(/\/+$/, '');
    if (!trimmed) {
        return '';
    }

    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    return `http://${trimmed}`;
}

function normalizeUrlPrefix(value) {
    return String(value || '').trim().replace(/\/+$/, '');
}

function getAllowedAvatarProxyPrefixes(options = {}) {
    return [
        options.avatarBaseUrl ?? OPENGMS_AVATAR_BASE_URL,
        options.userServerUrl ?? OPENGMS_USER_SERVER_URL
    ]
        .map(normalizeUrlPrefix)
        .filter(Boolean);
}

function canProxyAvatarUrl(avatarUrl, options = {}) {
    const source = String(avatarUrl || '').trim();
    if (!source) {
        return false;
    }

    let parsed;
    try {
        parsed = new URL(source);
    } catch {
        return false;
    }

    if (parsed.protocol !== 'http:') {
        return false;
    }

    return getAllowedAvatarProxyPrefixes(options).some(prefix => (
        source === prefix || source.startsWith(`${prefix}/`)
    ));
}

function buildClientAvatarUrl(user, options = {}) {
    const avatarUrl = user?.avatarUrl || null;
    if (!avatarUrl) {
        return null;
    }

    if (!canProxyAvatarUrl(avatarUrl, options)) {
        return avatarUrl;
    }

    return `/api/auth/avatar/${encodeURIComponent(String(user.id))}`;
}

function buildUserResponse(user) {
    return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: buildClientAvatarUrl(user),
        lastLogin: user.lastLogin,
        authSource: user.authSource
    };
}

function isOAuthValueConfigured(value) {
    if (!value) {
        return false;
    }

    return !String(value).startsWith('YOUR_');
}

function redirectToLoginCallback(res, token) {
    res.redirect(`${FRONTEND_URL}/jupyter/callback?token=${encodeURIComponent(token)}`);
}

function redirectToLoginError(res, errorCode) {
    res.redirect(`${FRONTEND_URL}/jupyter?error=${encodeURIComponent(errorCode)}`);
}

function buildOpenGmsUrl(pathname) {
    return `${OPENGMS_USER_SERVER_URL}${pathname}`;
}

async function fetchOpenGmsUser(accessToken, ipAddress) {
    const ipSegment = encodeURIComponent(ipAddress || 'unknown');

    try {
        const loginResponse = await axios.get(
            buildOpenGmsUrl(`/auth/login/${ipSegment}`),
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                httpsAgent: httpsAgent
            }
        );

        const user = unwrapUserServerPayload(loginResponse.data);
        if (user) {
            return user;
        }
    } catch (error) {
        console.warn('OpenGMS /auth/login lookup failed, fallback to /auth/userInfo:', error.response?.data || error.message);
    }

    const userInfoResponse = await axios.get(
        buildOpenGmsUrl('/auth/userInfo'),
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            },
            httpsAgent: httpsAgent
        }
    );

    return unwrapUserServerPayload(userInfoResponse.data);
}

function unwrapUserServerPayload(payload) {
    if (!payload) {
        return null;
    }

    if (payload.code !== undefined && payload.code !== 0) {
        return null;
    }

    return payload.data || payload;
}

function buildOpenGmsUsernameCandidate(remoteUser, fallbackEmail) {
    const email = remoteUser?.email || fallbackEmail || '';
    const emailLocalPart = email.includes('@') ? email.split('@')[0] : email;

    return (
        remoteUser?.userName ||
        emailLocalPart ||
        remoteUser?.name ||
        (remoteUser?.userId ? `opengms-${remoteUser.userId}` : 'opengms-user')
    );
}

function absolutizeOpenGmsAvatarUrl(avatarPath) {
    if (!avatarPath) {
        return null;
    }

    if (/^https?:\/\//i.test(avatarPath)) {
        return avatarPath;
    }

    if (!OPENGMS_AVATAR_BASE_URL) {
        return avatarPath;
    }

    return `${OPENGMS_AVATAR_BASE_URL}${avatarPath.startsWith('/') ? '' : '/'}${avatarPath}`;
}

// 导出中间件供其他路由使用
router.authenticateToken = authenticateToken;
router._private = {
    buildClientAvatarUrl,
    canProxyAvatarUrl,
    normalizeBaseUrl
};

module.exports = router;
