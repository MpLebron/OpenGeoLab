export const NOTEBOOK_EXTENSIONS = new Set(['.ipynb'])

export const CODE_EXTENSIONS = new Set([
  '.py', '.r', '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
  '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs',
  '.sh', '.bash', '.zsh', '.sql', '.jl', '.m', '.css', '.scss', '.less'
])

export const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.qmd'])

export const TABLE_EXTENSIONS = new Set(['.csv', '.tsv'])

export const JSON_EXTENSIONS = new Set(['.json', '.jsonl', '.ndjson'])

export const GEOJSON_EXTENSIONS = new Set(['.geojson', '.topojson'])

export const HTML_EXTENSIONS = new Set(['.html', '.htm'])

export const PDF_EXTENSIONS = new Set(['.pdf'])

export const ARCHIVE_EXTENSIONS = new Set(['.zip'])

export const TEXT_EXTENSIONS = new Set([
  '.txt', '.xml', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf',
  '.log', '.prj', '.wkt', '.sld', '.cpg'
])

export const UNSUPPORTED_EXTENSIONS = new Set([
  '.tif', '.tiff', '.geotiff', '.nc', '.h5', '.hdf5', '.grd',
  '.rar', '.7z', '.tar', '.gz', '.doc', '.docx', '.xls', '.xlsx',
  '.ppt', '.pptx'
])

export const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'])

export function getExtension(name) {
  const match = String(name || '').toLowerCase().match(/(\.[^.\\/]+)$/)
  return match ? match[1] : ''
}

export function inferPreviewKind(file, extension = getExtension(file?.name)) {
  if (file?.type === 'folder') return 'folder'
  if (NOTEBOOK_EXTENSIONS.has(extension)) return 'notebook'
  if (IMAGE_EXTENSIONS.has(extension)) return 'image'
  if (PDF_EXTENSIONS.has(extension)) return 'pdf'
  if (HTML_EXTENSIONS.has(extension)) return 'html'
  if (MARKDOWN_EXTENSIONS.has(extension)) return 'markdown'
  if (GEOJSON_EXTENSIONS.has(extension)) return 'geojson'
  if (TABLE_EXTENSIONS.has(extension)) return 'table'
  if (JSON_EXTENSIONS.has(extension)) return 'json'
  if (CODE_EXTENSIONS.has(extension)) return 'code'
  if (TEXT_EXTENSIONS.has(extension)) return 'text'
  if (ARCHIVE_EXTENSIONS.has(extension)) return 'archive'
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
    : ['notebook', 'code', 'text', 'image', 'pdf', 'html', 'markdown', 'table', 'json', 'geojson', 'archive'].includes(previewKind)

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
    '.jsonl': 'json',
    '.ndjson': 'json',
    '.geojson': 'json',
    '.topojson': 'json',
    '.xml': 'xml',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.sh': 'bash',
    '.bash': 'bash',
    '.zsh': 'bash',
    '.css': 'css',
    '.scss': 'scss',
    '.less': 'less',
    '.html': 'xml',
    '.htm': 'xml'
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

export function filePreviewIconName(file) {
  const normalized = normalizeFile(file)
  const extension = normalized.extension || ''

  if (normalized.type === 'folder' || normalized.previewKind === 'folder') return 'folder'
  if (normalized.previewKind === 'notebook') return 'bookMarked'
  if (normalized.previewKind === 'code') return extension === '.json' ? 'fileJson' : 'fileCode'
  if (normalized.previewKind === 'markdown' || normalized.previewKind === 'text') return 'fileText'
  if (normalized.previewKind === 'json' || normalized.previewKind === 'geojson') return 'fileJson'
  if (normalized.previewKind === 'table') return 'fileSpreadsheet'
  if (normalized.previewKind === 'image') return 'fileImage'
  if (['.tif', '.tiff', '.geotiff', '.nc', '.h5', '.hdf5', '.grd'].includes(extension)) return 'image'
  if (normalized.previewKind === 'pdf') return 'fileType'
  if (normalized.previewKind === 'html') return 'code'
  if (normalized.previewKind === 'archive' || ['.rar', '.7z', '.tar', '.gz'].includes(extension)) return 'fileArchive'
  if (['.doc', '.docx', '.ppt', '.pptx'].includes(extension)) return 'fileText'
  if (['.xls', '.xlsx'].includes(extension)) return 'fileSpreadsheet'
  return 'file'
}

export function languageLabel(file) {
  const labels = {
    '.py': 'Python Script',
    '.js': 'JavaScript File',
    '.ts': 'TypeScript File',
    '.jsx': 'JavaScript Component',
    '.tsx': 'TypeScript Component',
    '.sh': 'Shell Script',
    '.r': 'R Script',
    '.sql': 'SQL Script',
    '.css': 'CSS Stylesheet',
    '.scss': 'SCSS Stylesheet',
    '.less': 'Less Stylesheet',
    '.html': 'HTML Document',
    '.htm': 'HTML Document'
  }
  return labels[file.extension] || 'Code File'
}

export function textLabel(file) {
  if (file.extension === '.txt') return 'Plain Text Document'
  if (file.extension === '.xml') return 'XML Document'
  if (['.yml', '.yaml'].includes(file.extension)) return 'YAML Document'
  if (file.extension === '.log') return 'Log File'
  return 'Text Document'
}

export function fileSubtitle(file, formatSize = defaultFormatSize) {
  const normalized = normalizeFile(file)
  const sizeLabel = formatSize(normalized.size)
  if (normalized.previewKind === 'notebook') return `Jupyter Notebook • ${sizeLabel}`
  if (normalized.previewKind === 'code') return `${languageLabel(normalized)} • ${sizeLabel}`
  if (normalized.previewKind === 'markdown') return `Markdown document • ${sizeLabel}`
  if (normalized.previewKind === 'table') return `${normalized.extension === '.tsv' ? 'TSV' : 'CSV'} table • ${sizeLabel}`
  if (normalized.previewKind === 'json') return `JSON data • ${sizeLabel}`
  if (normalized.previewKind === 'geojson') return `Geospatial JSON data • ${sizeLabel}`
  if (normalized.previewKind === 'html') return `HTML document • ${sizeLabel}`
  if (normalized.previewKind === 'pdf') return `PDF document • ${sizeLabel}`
  if (normalized.previewKind === 'archive') return `ZIP archive • ${sizeLabel}`
  if (normalized.previewKind === 'text') return `${textLabel(normalized)} • ${sizeLabel}`
  if (normalized.previewKind === 'image') return `Image preview • ${sizeLabel}`
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
