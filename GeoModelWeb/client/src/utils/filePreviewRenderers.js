import { escapeHtml } from './filePreview.js'

export function renderMarkdown(markdown = '') {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n')
  const output = []
  let paragraph = []
  let list = null
  let quote = []
  let codeFence = null
  let codeLines = []

  const flushParagraph = () => {
    if (!paragraph.length) return
    output.push(`<p>${formatInline(paragraph.join(' '))}</p>`)
    paragraph = []
  }

  const flushList = () => {
    if (!list) return
    const tag = list.type === 'ol' ? 'ol' : 'ul'
    output.push(`<${tag}>${list.items.map(item => `<li>${formatInline(item)}</li>`).join('')}</${tag}>`)
    list = null
  }

  const flushQuote = () => {
    if (!quote.length) return
    output.push(`<blockquote>${quote.map(line => `<p>${formatInline(line)}</p>`).join('')}</blockquote>`)
    quote = []
  }

  const flushCode = () => {
    if (!codeFence) return
    const language = codeFence.language ? ` data-language="${escapeHtml(codeFence.language)}"` : ''
    output.push(`<pre${language}><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
    codeFence = null
    codeLines = []
  }

  lines.forEach(rawLine => {
    const line = rawLine.replace(/\s+$/, '')
    const fence = line.match(/^```+\s*([A-Za-z0-9_-]+)?\s*$/)
    if (fence) {
      if (codeFence) {
        flushCode()
      } else {
        flushParagraph()
        flushList()
        flushQuote()
        codeFence = { language: fence[1] || '' }
        codeLines = []
      }
      return
    }

    if (codeFence) {
      codeLines.push(rawLine)
      return
    }

    if (!line.trim()) {
      flushParagraph()
      flushList()
      flushQuote()
      return
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      flushList()
      flushQuote()
      const level = heading[1].length
      output.push(`<h${level}>${formatInline(heading[2])}</h${level}>`)
      return
    }

    const quoteLine = line.match(/^>\s?(.*)$/)
    if (quoteLine) {
      flushParagraph()
      flushList()
      quote.push(quoteLine[1])
      return
    }

    const unordered = line.match(/^\s*[-*+]\s+(.+)$/)
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/)
    if (unordered || ordered) {
      flushParagraph()
      flushQuote()
      const nextType = ordered ? 'ol' : 'ul'
      if (!list || list.type !== nextType) flushList()
      if (!list) list = { type: nextType, items: [] }
      list.items.push((unordered || ordered)[1])
      return
    }

    paragraph.push(line.trim())
  })

  flushCode()
  flushParagraph()
  flushList()
  flushQuote()

  return output.join('\n') || '<p class="empty-preview">No markdown content.</p>'
}

function formatInline(value = '') {
  let html = escapeHtml(value)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
  html = html.replace(/_([^_\n]+)_/g, '<em>$1</em>')
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    const safeHref = sanitizeLink(href)
    return safeHref ? `<a href="${safeHref}" target="_blank" rel="noreferrer">${label}</a>` : label
  })
  return html
}

function sanitizeLink(value = '') {
  const href = String(value || '').trim()
  if (!href) return ''
  if (/^(https?:|mailto:|#|\/|\.)/i.test(href)) return escapeHtml(href)
  return ''
}

export function parseDelimitedText(text = '', delimiter = ',', options = {}) {
  const maxRows = Number(options.maxRows || 200)
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false
  const source = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === delimiter && !inQuotes) {
      row.push(cell)
      cell = ''
      continue
    }

    if (char === '\n' && !inQuotes) {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }

    cell += char
  }

  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }

  while (rows.length && rows[rows.length - 1].every(value => !String(value || '').trim())) {
    rows.pop()
  }

  const header = rows[0] || []
  const body = rows.slice(1)
  const columnCount = Math.max(header.length, ...body.slice(0, maxRows).map(item => item.length), 0)
  const normalizedHeader = Array.from({ length: columnCount }, (_, index) => header[index] || `Column ${index + 1}`)
  const visibleRows = body.slice(0, maxRows).map(item => (
    Array.from({ length: columnCount }, (_, index) => item[index] || '')
  ))

  return {
    header: normalizedHeader,
    rows: visibleRows,
    rowCount: body.length,
    columnCount,
    truncated: body.length > maxRows,
    delimiter
  }
}

export function parseJsonPreview(text = '') {
  try {
    const value = JSON.parse(String(text || ''))
    return {
      ok: true,
      value,
      formatted: JSON.stringify(value, null, 2),
      summary: summarizeJsonValue(value)
    }
  } catch (error) {
    return {
      ok: false,
      value: null,
      formatted: String(text || ''),
      error: error.message,
      summary: 'Invalid JSON'
    }
  }
}

function summarizeJsonValue(value) {
  if (Array.isArray(value)) return `${value.length} array item${value.length === 1 ? '' : 's'}`
  if (value && typeof value === 'object') return `${Object.keys(value).length} top-level key${Object.keys(value).length === 1 ? '' : 's'}`
  if (value === null) return 'Null value'
  return `${typeof value} value`
}

export function buildGeoJsonPreview(text = '') {
  const parsed = parseJsonPreview(text)
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, shapes: [], properties: [], geometryCounts: {}, featureCount: 0 }
  }

  const features = normalizeGeoJsonFeatures(parsed.value)
  const coords = []
  const geometryCounts = {}
  const shapes = []
  const properties = []

  features.forEach((feature, featureIndex) => {
    const geometry = feature.geometry || feature
    if (!geometry?.type) return
    geometryCounts[geometry.type] = (geometryCounts[geometry.type] || 0) + 1
    collectCoordinates(geometry, coords)
    properties.push({
      index: featureIndex + 1,
      type: geometry.type,
      properties: feature.properties && typeof feature.properties === 'object' ? feature.properties : {}
    })
  })

  if (!coords.length) {
    return { ok: false, error: 'No drawable coordinates were found.', shapes: [], properties, geometryCounts, featureCount: features.length }
  }

  const bounds = coords.reduce((acc, point) => ({
    minX: Math.min(acc.minX, point[0]),
    minY: Math.min(acc.minY, point[1]),
    maxX: Math.max(acc.maxX, point[0]),
    maxY: Math.max(acc.maxY, point[1])
  }), {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY
  })

  const project = createProjector(bounds)
  features.forEach((feature, featureIndex) => {
    appendGeometryShapes(feature.geometry || feature, project, shapes, featureIndex)
  })

  return {
    ok: true,
    bounds,
    shapes,
    properties: properties.slice(0, 12),
    geometryCounts,
    featureCount: features.length
  }
}

function normalizeGeoJsonFeatures(value) {
  if (!value || typeof value !== 'object') return []
  if (value.type === 'FeatureCollection' && Array.isArray(value.features)) return value.features
  if (value.type === 'Feature') return [value]
  if (value.type && value.coordinates) return [{ type: 'Feature', geometry: value, properties: {} }]
  return []
}

function collectCoordinates(geometry, coords) {
  if (!geometry) return
  if (geometry.type === 'GeometryCollection') {
    ;(geometry.geometries || []).forEach(item => collectCoordinates(item, coords))
    return
  }
  walkCoordinateArray(geometry.coordinates, coords)
}

function walkCoordinateArray(value, coords) {
  if (!Array.isArray(value)) return
  if (typeof value[0] === 'number' && typeof value[1] === 'number') {
    coords.push([value[0], value[1]])
    return
  }
  value.forEach(item => walkCoordinateArray(item, coords))
}

function createProjector(bounds) {
  const width = 920
  const height = 520
  const pad = 34
  const spanX = Math.max(bounds.maxX - bounds.minX, 0.000001)
  const spanY = Math.max(bounds.maxY - bounds.minY, 0.000001)
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY)
  const offsetX = (width - spanX * scale) / 2
  const offsetY = (height - spanY * scale) / 2

  return point => {
    const x = offsetX + (point[0] - bounds.minX) * scale
    const y = height - (offsetY + (point[1] - bounds.minY) * scale)
    return [Number(x.toFixed(2)), Number(y.toFixed(2))]
  }
}

function appendGeometryShapes(geometry, project, shapes, featureIndex) {
  if (!geometry) return

  if (geometry.type === 'Point') {
    shapes.push({ kind: 'point', point: project(geometry.coordinates), featureIndex })
    return
  }

  if (geometry.type === 'MultiPoint') {
    geometry.coordinates.forEach(point => shapes.push({ kind: 'point', point: project(point), featureIndex }))
    return
  }

  if (geometry.type === 'LineString') {
    shapes.push({ kind: 'line', points: geometry.coordinates.map(project), featureIndex })
    return
  }

  if (geometry.type === 'MultiLineString') {
    geometry.coordinates.forEach(line => shapes.push({ kind: 'line', points: line.map(project), featureIndex }))
    return
  }

  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach((ring, ringIndex) => {
      shapes.push({ kind: ringIndex === 0 ? 'polygon' : 'line', points: ring.map(project), featureIndex })
    })
    return
  }

  if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(polygon => {
      polygon.forEach((ring, ringIndex) => {
        shapes.push({ kind: ringIndex === 0 ? 'polygon' : 'line', points: ring.map(project), featureIndex })
      })
    })
    return
  }

  if (geometry.type === 'GeometryCollection') {
    ;(geometry.geometries || []).forEach(item => appendGeometryShapes(item, project, shapes, featureIndex))
  }
}

export function formatShapePoints(points = []) {
  return points.map(point => point.join(',')).join(' ')
}

