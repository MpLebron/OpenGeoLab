const httpProxy = require('http-proxy');
const { defaultJupyterGatewayRegistry } = require('../utils/jupyterGateway');

function resolveJupyterProxyTarget(requestUrl = '', registry = defaultJupyterGatewayRegistry, basePath = '/jupyter') {
    const resolved = registry.resolveByPath(requestUrl, basePath);
    if (!resolved.ok) {
        return resolved;
    }

    return {
        ok: true,
        target: resolved.target,
        workspaceId: resolved.workspaceId
    };
}

function createJupyterProxy({
    registry = defaultJupyterGatewayRegistry,
    basePath = process.env.JUPYTER_PUBLIC_BASE_PATH || '/jupyter',
    logger = console
} = {}) {
    const proxy = httpProxy.createProxyServer({
        changeOrigin: false,
        ws: true,
        xfwd: true,
        secure: false
    });

    proxy.on('error', (error, req, res) => {
        logger.warn('[Jupyter Gateway] Proxy error:', error.message);
        if (res && !res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
        }
        if (res && !res.writableEnded) {
            res.end(JSON.stringify({
                error: 'Jupyter gateway proxy failed',
                detail: error.message
            }));
        }
    });

    function httpMiddleware(req, res, next) {
        const requestUrl = req.originalUrl || req.url || '';
        const resolved = resolveJupyterProxyTarget(requestUrl, registry, basePath);
        if (!resolved.ok) {
            if (resolved.code === 'not_jupyter_gateway_path') {
                return next();
            }
            return res.status(404).json({
                error: 'Jupyter workspace is not registered',
                code: resolved.code,
                workspaceId: resolved.workspaceId
            });
        }

        proxy.web(req, res, {
            target: resolved.target
        });
    }

    function handleUpgrade(req, socket, head) {
        const requestUrl = req.url || '';
        const resolved = resolveJupyterProxyTarget(requestUrl, registry, basePath);
        if (!resolved.ok) {
            if (resolved.code === 'not_jupyter_gateway_path') {
                return false;
            }
            socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
            socket.destroy();
            return true;
        }

        proxy.ws(req, socket, head, {
            target: resolved.target
        });
        return true;
    }

    return {
        httpMiddleware,
        handleUpgrade,
        proxy
    };
}

module.exports = {
    createJupyterProxy,
    resolveJupyterProxyTarget
};
