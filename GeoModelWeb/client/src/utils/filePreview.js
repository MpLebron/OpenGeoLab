export const NOTEBOOK_EXTENSIONS = new Set(['.ipynb'])

export const CODE_EXTENSIONS = new Set([
  '.py', '.r', '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
  '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs',
  '.sh', '.bash', '.zsh', '.sql', '.jl', '.m'
])

export const TEXT_EXTENSIONS = new Set([
  '.md', '.txt', '.json', '.geojson', '.csv', '.tsv', '.xml',
  '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.log',
  '.html', '.css', '.scss', '.less'
])

export const UNSUPPORTED_EXTENSIONS = new Set([
  '.tif', '.tiff', '.geotiff', '.nc', '.h5', '.hdf5', '.grd',
  '.zip', '.rar', '.7z', '.tar', '.gz', '.pdf', '.doc', '.docx',
  '.xls', '.xlsx', '.ppt', '.pptx', '.png', '.jpg', '.jpeg',
  '.gif', '.bmp', '.webp', '.svg'
])

export function getExtension(name) {
  const match = String(name || '').toLowerCase().match(/(\.[^.\\/]+)$/)
  return match ? match[1] : ''
}

export function inferPreviewKind(file, extension = getExtension(file?.name)) {
  if (file?.type === 'folder') return 'folder'
  if (NOTEBOOK_EXTENSIONS.has(extension)) return 'notebook'
  if (CODE_EXTENSIONS.has(extension)) return 'code'
  if (TEXT_EXTENSIONS.has(extension)) return 'text'
  return 'unsupported'
}

export function inferPreviewReason(file, previewKind, extension = getExtension(file?.name)) {
  if (file?.type === 'folder') return '文件夹暂不支持直接预览'
  if (!extension) return '缺少可识别的文件后缀，暂不支持在线预览'
  if (previewKind === 'unsupported') return '该类文件暂不支持在线预览'
  return ''
}

export function normalizeFile(file = {}) {
  const extension = file.extension || getExtension(file.name)
  const previewKind = file.previewKind || inferPreviewKind(file, extension)
  const previewSupported = typeof file.previewSupported === 'boolean'
    ? file.previewSupported
    : ['notebook', 'code', 'text'].includes(previewKind)

  return {
    ...file,
    path: file.path || file.name,
    extension,
    previewKind,
    previewSupported,
    previewReason: file.previewReason || inferPreviewReason(file, previewKind, extension)
  }
}

export function fileLanguage(file) {
  const extension = file?.extension || getExtension(file?.name)
  const map = {
    '.py': 'python',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.json': 'json',
    '.xml': 'xml',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.sh': 'bash',
    '.bash': 'bash',
    '.zsh': 'bash'
  }
  return map[extension] || ''
}

export function splitLines(value) {
  return String(value || '').replace(/\r\n/g, '\n').split('\n')
}

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function fileBadge(file) {
  const normalized = normalizeFile(file)
  if (normalized.previewKind === 'notebook') return 'NB'
  if (normalized.previewKind === 'code') return normalized.extension.replace('.', '').toUpperCase().slice(0, 4)
  if (normalized.previewKind === 'text') return normalized.extension.replace('.', '').toUpperCase().slice(0, 4) || 'TXT'
  if (normalized.previewKind === 'folder') return 'DIR'
  return normalized.extension ? normalized.extension.replace('.', '').toUpperCase().slice(0, 4) : 'NA'
}

export function treeBadge(file) {
  const normalized = normalizeFile(file)
  if (normalized.previewKind === 'notebook') return 'NB'
  if (normalized.previewKind === 'code') return normalized.extension === '.py' ? 'PY' : '</>'
  if (normalized.previewKind === 'text') return 'TXT'
  if (normalized.previewKind === 'unsupported') return normalized.extension ? normalized.extension.replace('.', '').slice(0, 3).toUpperCase() : 'NA'
  return ''
}

export function languageLabel(file) {
  const labels = {
    '.py': 'Python Script',
    '.js': 'JavaScript File',
    '.ts': 'TypeScript File',
    '.sh': 'Shell Script',
    '.r': 'R Script',
    '.sql': 'SQL Script'
  }
  return labels[file.extension] || 'Code File'
}

export function textLabel(file) {
  if (file.extension === '.txt') return 'Plain Text Document'
  if (file.extension === '.md') return 'Markdown Document'
  if (file.extension === '.json') return 'JSON Document'
  return 'Text Document'
}

export function fileSubtitle(file, formatSize = defaultFormatSize) {
  const normalized = normalizeFile(file)
  const sizeLabel = formatSize(normalized.size)
  if (normalized.previewKind === 'notebook') return `Jupyter Notebook • ${sizeLabel}`
  if (normalized.previewKind === 'code') return `${languageLabel(normalized)} • ${sizeLabel}`
  if (normalized.previewKind === 'text') return `${textLabel(normalized)} • ${sizeLabel}`
  return sizeLabel
}

export function pickPreferredPreviewFile(files = [], entryNotebook = '') {
  const normalizedFiles = files
    .map(file => normalizeFile(file))
    .filter(file => file.type !== 'folder')

  if (!normalizedFiles.length) {
    return null
  }

  const preferredNotebook = String(entryNotebook || '').trim()
  if (preferredNotebook) {
    const exactMatch = normalizedFiles.find(file => file.path === preferredNotebook || file.name === preferredNotebook)
    if (exactMatch) return exactMatch
  }

  const mainNotebook = normalizedFiles.find(file => {
    const fileName = String(file.name || '').toLowerCase()
    return file.previewKind === 'notebook' && fileName === 'main.ipynb'
  })
  if (mainNotebook) return mainNotebook

  const firstNotebook = normalizedFiles.find(file => file.previewKind === 'notebook')
  if (firstNotebook) return firstNotebook

  const firstPreviewable = normalizedFiles.find(file => file.previewSupported)
  if (firstPreviewable) return firstPreviewable

  return normalizedFiles[0]
}

function defaultFormatSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / (1024 ** power)
  return `${value.toFixed(power === 0 ? 0 : 1)} ${units[power]}`
}
