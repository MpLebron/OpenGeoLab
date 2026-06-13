function cleanText(value) {
  return String(value || '').trim()
}

export function getRunFileKindLabel(param = {}) {
  return cleanText(param.parameter_type?.ExistingFile) || 'File'
}

export function getRunFileBadge(fileName = '', fallbackKind = 'File') {
  const name = cleanText(fileName)
  const extension = name.includes('.') ? name.split('.').pop() : ''
  const source = cleanText(extension) || cleanText(fallbackKind) || 'File'
  return source.slice(0, 4).toUpperCase()
}

export function formatUploadFileSize(bytes = 0) {
  const size = Number(bytes)
  if (!Number.isFinite(size) || size <= 0) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`
}
