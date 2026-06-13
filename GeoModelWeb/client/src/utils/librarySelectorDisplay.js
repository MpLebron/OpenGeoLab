const OPEN_GMS_MODEL_ITEM_BASE_URL = 'https://geomodeling.njnu.edu.cn/modelItem'

function cleanText(value) {
  return String(value || '').trim()
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

function formatCompactNumber(value) {
  const count = toNumber(value)
  if (count >= 1000000) return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(count)
}

function formatDate(value) {
  const text = cleanText(value)
  if (!text) return '--'
  return text.split(/[T\s]/)[0] || '--'
}

function formatLabel(value) {
  const text = cleanText(value)
  if (!text) return ''
  return text
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase())
}

function buildOpenGmsModelItemUrl(modelItemId) {
  const cleanId = cleanText(modelItemId)
  if (!cleanId) return ''
  return `${OPEN_GMS_MODEL_ITEM_BASE_URL}/${encodeURIComponent(cleanId)}/`
}

export function getLibraryItemSummary(item = {}, kind = 'model') {
  const summary = kind === 'dataMethod'
    ? cleanText(item.longDescription) || cleanText(item.description)
    : cleanText(item.description)
  return summary || 'No description available'
}

export function getLibraryItemAuthor(item = {}) {
  return cleanText(item.author) || 'Unknown'
}

export function getLibraryItemTags(item = {}, kind = 'model') {
  const baseTags = Array.isArray(item.tags)
    ? item.tags.map(cleanText).filter(Boolean)
    : []

  if (kind !== 'dataMethod') {
    return baseTags.slice(0, 2)
  }

  const inputKinds = Array.isArray(item.inputKinds)
    ? item.inputKinds.map(value => `${formatLabel(value)} input`).filter(Boolean)
    : []
  const outputKinds = Array.isArray(item.outputKinds)
    ? item.outputKinds.map(value => `${formatLabel(value)} output`).filter(Boolean)
    : []

  return [...inputKinds.slice(0, 1), ...outputKinds.slice(0, 1), ...baseTags].slice(0, 3)
}

export function getLibraryItemStatusChips(item = {}, kind = 'model') {
  if (kind === 'dataMethod') {
    const chips = []
    const engine = cleanText(item.engine)
    const execution = cleanText(item.execution)
    const methodType = cleanText(item.methodType || item.category)
    if (engine) chips.push({ label: engine.toUpperCase(), className: 'engine' })
    if (execution) chips.push({ label: execution.toUpperCase(), className: 'execution' })
    if (methodType) chips.push({ label: formatLabel(methodType), className: 'neutral' })
    return chips
  }

  const chips = []
  const status = cleanText(item.status)
  if (status) {
    chips.push({
      label: status,
      className: status.toLowerCase().includes('public') ? 'public' : 'neutral'
    })
  }
  if (item.deploy) chips.push({ label: 'Deployed', className: 'deployed' })
  if (item.online) chips.push({ label: 'Online', className: 'online' })
  if (!item.online && cleanText(item.healthText)) {
    chips.push({ label: cleanText(item.healthText), className: 'health' })
  }
  return chips
}

export function getLibraryItemIoStats(item = {}) {
  return [
    { label: 'Inputs', value: String(toNumber(item.inputCount)) },
    { label: 'Outputs', value: String(toNumber(item.outputCount)) },
    { label: 'Params', value: String(toNumber(item.paramCount)) },
    { label: 'Options', value: String(toNumber(item.optionCount)) }
  ]
}

export function getLibraryItemMetrics(item = {}, kind = 'model') {
  if (kind === 'dataMethod') {
    return [
      `Author ${getLibraryItemAuthor(item)}`,
      `Created ${formatDate(item.createTime || item.lastModifyTime || item.updatedAt)}`
    ]
  }

  return [
    `Author ${getLibraryItemAuthor(item)}`,
    `${formatCompactNumber(item.viewCount)} views`,
    `${formatCompactNumber(item.invokeCount)} runs`,
    `Updated ${formatDate(item.lastModifyTime || item.createTime || item.updatedAt)}`
  ]
}

export function getLibraryItemDetailUrl(item = {}, kind = 'model') {
  if (kind === 'dataMethod') {
    return ''
  }

  return cleanText(item.externalUrl) || buildOpenGmsModelItemUrl(item.modelItemId) || (
    cleanText(item.name) ? `/api/ogms/models/${encodeURIComponent(item.name)}` : ''
  )
}

export function getLibraryItemTypeLabel(item = {}, kind = 'model') {
  if (kind === 'dataMethod') {
    const engine = cleanText(item.engine)
    if (!engine) return 'DM'
    if (engine.toLowerCase() === 'whitebox') return 'WB'
    const parts = engine.split(/[\s_-]+/).filter(Boolean)
    if (parts.length > 1) {
      return parts.map(part => part[0]).join('').slice(0, 2).toUpperCase()
    }
    return engine.slice(0, 2).toUpperCase()
  }

  return 'GM'
}
