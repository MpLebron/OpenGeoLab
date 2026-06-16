import axios from 'axios'

export function normalizeApiBaseUrl(value = '') {
  const normalized = String(value || '').trim().replace(/\/+$/, '')
  return normalized === '/' ? '' : normalized
}

function getViteEnv() {
  return import.meta.env || {}
}

export function getApiBaseUrl() {
  return normalizeApiBaseUrl(getViteEnv().VITE_API_BASE_URL || '')
}

export function configureApiClient() {
  axios.defaults.baseURL = getApiBaseUrl()
  return axios.defaults.baseURL
}

export function createApiClient(config = {}) {
  return axios.create({
    ...config,
    baseURL: getApiBaseUrl() || undefined,
    headers: {
      ...(config.headers || {})
    }
  })
}

export function getAuthBaseUrl() {
  const apiBaseUrl = getApiBaseUrl()
  if (apiBaseUrl) {
    return apiBaseUrl
  }

  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/+$/, '')
  }

  return ''
}

export function withAppBasePath(path = '', baseUrl) {
  const basePath = String(baseUrl ?? getViteEnv().BASE_URL ?? '/').replace(/\/+$/, '')
  const normalizedPath = String(path || '').replace(/^\/+/, '')
  return `${basePath}/${normalizedPath}`.replace(/\/{2,}/g, '/')
}

function isAbsoluteResourceUrl(value) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)
}

function isAlreadyUnderBasePath(path, baseUrl) {
  const basePath = String(baseUrl || '/').replace(/\/+$/, '')
  if (!basePath || basePath === '/') {
    return false
  }

  return path === basePath || path.startsWith(`${basePath}/`)
}

export function resolvePublicResourceUrl(value = '', options = {}) {
  const source = String(value || '').trim()
  if (!source || source.startsWith('#') || isAbsoluteResourceUrl(source)) {
    return source
  }

  const apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl ?? getApiBaseUrl())
  const appBaseUrl = options.appBaseUrl ?? getViteEnv().BASE_URL ?? '/'

  if (source.startsWith('/api/')) {
    return apiBaseUrl ? `${apiBaseUrl}${source}` : source
  }

  if (source.startsWith('/')) {
    return isAlreadyUnderBasePath(source, appBaseUrl)
      ? source
      : withAppBasePath(source, appBaseUrl)
  }

  return withAppBasePath(source, appBaseUrl)
}
