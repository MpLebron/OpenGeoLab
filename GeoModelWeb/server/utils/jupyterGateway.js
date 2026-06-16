function trimTrailingSlash(value) {
    return String(value || '').replace(/\/+$/, '');
}

function normalizePublicOrigin(publicOrigin = '', req = null) {
    const explicit = trimTrailingSlash(publicOrigin);
    if (explicit) return explicit;

    if (req) {
        const protocol = req.headers?.['x-forwarded-proto'] || req.protocol || 'http';
        const host = typeof req.get === 'function'
            ? req.get('host')
            : req.headers?.host;
        if (host) {
            return `${protocol}://${host}`;
        }
    }

    return 'http://localhost:3000';
}

function buildPublicUrl(publicOrigin = '', pathValue = '') {
    const origin = normalizePublicOrigin(publicOrigin);
    const url = new URL(origin);
    const originPath = url.pathname === '/' ? '' : trimTrailingSlash(url.pathname);
    const normalizedPath = `/${String(pathValue || '').replace(/^\/+/, '')}`;
    url.pathname = `${originPath}${normalizedPath}`.replace(/\/{2,}/g, '/');
    url.search = '';
    url.hash = '';
    return url;
}

function normalizePathSegment(value = '') {
    return String(value || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
}

function normalizeWorkspaceId(value = '') {
    return String(value || '').trim().replace(/^\/+|\/+$/g, '');
}

function buildJupyterServerId(username = '', projectName = '', projectMeta = {}) {
    const explicitId = normalizeWorkspaceId(
        projectMeta.workspaceId ||
        projectMeta.projectId ||
        projectMeta.uuid ||
        projectMeta.id
    );
    if (explicitId) {
        return explicitId;
    }

    const userPart = normalizePathSegment(username) || 'user';
    const projectPart = normalizePathSegment(projectName) || 'workspace';
    return `${userPart}-${projectPart}`;
}

function buildJupyterBasePath(workspaceId, basePath = '/jupyter') {
    const normalizedBase = `/${String(basePath || '/jupyter').replace(/^\/+|\/+$/g, '')}`;
    const id = encodeURIComponent(String(workspaceId || '').trim());
    if (!id) {
        throw new Error('workspaceId is required');
    }
    return `${normalizedBase}/${id}/`;
}

function appendLaunchSearchParams(url, params = {}) {
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        url.searchParams.set(key, String(value));
    });
    return url;
}

function buildJupyterLaunchUrl({
    publicOrigin = '',
    basePath = '/jupyter',
    workspaceId = '',
    token = '',
    geomodelToken = ''
} = {}) {
    const serverBasePath = buildJupyterBasePath(workspaceId, basePath);
    const url = buildPublicUrl(publicOrigin, `${serverBasePath}lab`);
    appendLaunchSearchParams(url, {
        token,
        geomodel_token: geomodelToken
    });
    return url.toString();
}

function extractWorkspaceIdFromGatewayPath(requestPath = '', basePath = '/jupyter') {
    const normalizedBase = `/${String(basePath || '/jupyter').replace(/^\/+|\/+$/g, '')}`;
    const escapedBase = normalizedBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = String(requestPath || '').match(new RegExp(`^${escapedBase}/([^/?#]+)(?:[/?#]|$)`));
    return match ? decodeURIComponent(match[1]) : '';
}

function buildLoopbackDockerPortBinding(port, bindHost = '127.0.0.1') {
    const normalizedPort = Number.parseInt(port, 10);
    if (!Number.isInteger(normalizedPort) || normalizedPort < 1 || normalizedPort > 65535) {
        throw new Error('A valid Jupyter host port is required');
    }
    return `${bindHost || '127.0.0.1'}:${normalizedPort}:8888`;
}

function createJupyterGatewayRegistry() {
    const workspaces = new Map();

    function register(info = {}) {
        const workspaceId = String(info.workspaceId || '').trim();
        const port = Number.parseInt(info.port, 10);
        if (!workspaceId) {
            throw new Error('workspaceId is required');
        }
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            throw new Error('A valid Jupyter port is required');
        }

        const record = {
            ...info,
            workspaceId,
            port,
            target: `http://127.0.0.1:${port}`,
            registeredAt: info.registeredAt || new Date()
        };
        workspaces.set(workspaceId, record);
        return record;
    }

    function unregister(workspaceId) {
        return workspaces.delete(String(workspaceId || '').trim());
    }

    function get(workspaceId) {
        return workspaces.get(String(workspaceId || '').trim()) || null;
    }

    function resolveByPath(requestPath, basePath = '/jupyter') {
        const workspaceId = extractWorkspaceIdFromGatewayPath(requestPath, basePath);
        if (!workspaceId) {
            return {
                ok: false,
                code: 'not_jupyter_gateway_path'
            };
        }

        const record = get(workspaceId);
        if (!record) {
            return {
                ok: false,
                code: 'jupyter_workspace_not_found',
                workspaceId
            };
        }

        return {
            ok: true,
            workspaceId,
            target: record.target,
            record
        };
    }

    function entries() {
        return Array.from(workspaces.entries());
    }

    return {
        register,
        unregister,
        get,
        resolveByPath,
        entries
    };
}

const defaultJupyterGatewayRegistry = createJupyterGatewayRegistry();

module.exports = {
    buildPublicUrl,
    buildJupyterBasePath,
    buildJupyterLaunchUrl,
    buildJupyterServerId,
    buildLoopbackDockerPortBinding,
    createJupyterGatewayRegistry,
    defaultJupyterGatewayRegistry,
    extractWorkspaceIdFromGatewayPath,
    normalizePublicOrigin
};
