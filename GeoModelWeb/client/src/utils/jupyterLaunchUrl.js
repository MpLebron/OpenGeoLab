const MISSING_TOKEN_PLACEHOLDERS = new Set([
  '',
  'check-container-logs'
])

export function hasUsableJupyterToken(url = '', token = '') {
  const explicitToken = String(token || '').trim()
  if (explicitToken && !MISSING_TOKEN_PLACEHOLDERS.has(explicitToken)) {
    return true
  }

  try {
    const parsedUrl = new URL(String(url || ''))
    const queryToken = String(parsedUrl.searchParams.get('token') || '').trim()
    return Boolean(queryToken && !MISSING_TOKEN_PLACEHOLDERS.has(queryToken))
  } catch (error) {
    return false
  }
}

export function shouldRefreshJupyterLaunchUrl(status = '', url = '', token = '') {
  return status === 'running' && !hasUsableJupyterToken(url, token)
}

export function buildJupyterFileUrl(baseLaunchUrl = '', token = '', filePath = '') {
  const baseUrl = String(baseLaunchUrl || '').split('?')[0]
  if (!baseUrl || !filePath) return ''

  return `${baseUrl}/tree/${encodeURIComponent(filePath)}?token=${encodeURIComponent(token)}`
}
