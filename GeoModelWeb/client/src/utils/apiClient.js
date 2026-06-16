import axios from 'axios'

export function normalizeApiBaseUrl(value = '') {
  const normalized = String(value || '').trim().replace(/\/+$/, '')
  return normalized === '/' ? '' : normalized
}

export function getApiBaseUrl() {
  return normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL || '')
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

export function withAppBasePath(path = '') {
  const basePath = String(import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  const normalizedPath = String(path || '').replace(/^\/+/, '')
  return `${basePath}/${normalizedPath}`.replace(/\/{2,}/g, '/')
}
