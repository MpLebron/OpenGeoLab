export interface JupyterGatewayPath {
  prefix: string;
  workspaceId: string;
  jupyterBasePath: string;
}

function normalizePrefix(prefix = ''): string {
  const normalized = String(prefix || '').replace(/\/+$/, '');
  return normalized === '/' ? '' : normalized;
}

function decodeWorkspaceId(value = ''): string {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

export function parseJupyterGatewayPath(pathname = ''): JupyterGatewayPath | null {
  const match = String(pathname || '').match(/^(.*?)(?:\/jupyter\/([^/?#]+)(?:[/?#]|$))/);
  if (!match) {
    return null;
  }

  const prefix = normalizePrefix(match[1] || '');
  const workspaceId = decodeWorkspaceId(match[2] || '');
  if (!workspaceId) {
    return null;
  }

  return {
    prefix,
    workspaceId,
    jupyterBasePath: `${prefix}/jupyter/${encodeURIComponent(workspaceId)}`
  };
}

export function extractWorkspaceIdFromGatewayPath(pathname = ''): string {
  return parseJupyterGatewayPath(pathname)?.workspaceId || '';
}

export function buildOpenGeoLabApiBaseFromLocation({
  origin = '',
  pathname = '',
  includeApiSegment = true
}: {
  origin?: string;
  pathname?: string;
  includeApiSegment?: boolean;
} = {}): string {
  const gatewayPath = parseJupyterGatewayPath(pathname);
  if (!gatewayPath) {
    return '';
  }

  const base = `${String(origin || '').replace(/\/+$/, '')}${gatewayPath.prefix}`;
  return includeApiSegment ? `${base}/api` : base;
}
