const MAX_TAGS = 3
const OPEN_GMS_MODEL_ITEM_BASE_URL = 'https://geomodeling.njnu.edu.cn/modelItem'

export function buildOpenGmsModelItemUrl(modelItemId) {
  const cleanId = String(modelItemId || '').trim()
  if (!cleanId) return ''
  return `${OPEN_GMS_MODEL_ITEM_BASE_URL}/${encodeURIComponent(cleanId)}/`
}

export function getSavedModelExternalUrl(model = {}) {
  return String(model.externalUrl || '').trim() || buildOpenGmsModelItemUrl(model.modelItemId)
}

export function getSavedModelSummary(model = {}) {
  const summary = String(model.description || '').trim()
  return summary || 'No description available.'
}

export function getSavedModelTags(model = {}) {
  return Array.isArray(model.tags)
    ? model.tags.filter(Boolean).slice(0, MAX_TAGS)
    : []
}

export function getSavedModelStatusChips(model = {}) {
  const chips = []
  const status = String(model.status || '').trim()
  if (status) chips.push({ label: status, className: status.toLowerCase().includes('public') ? 'public' : 'neutral' })
  if (model.deploy) chips.push({ label: 'Deployed', className: 'deployed' })
  if (model.online) chips.push({ label: 'Online', className: 'online' })
  return chips
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
  if (!value) return '--'
  const dateText = String(value).trim()
  return dateText ? dateText.split(/[T\s]/)[0] : '--'
}

export function getSavedModelMetrics(model = {}) {
  return {
    views: `${formatCompactNumber(model.viewCount)} views`,
    runs: `${formatCompactNumber(model.invokeCount)} runs`,
    updated: `Updated ${formatDate(model.lastModifyTime || model.createTime || model.addedAt)}`
  }
}

export function getSavedModelSearchText(model = {}) {
  return [
    model.name,
    model.description,
    model.author,
    model.status,
    model.healthText,
    ...(Array.isArray(model.tags) ? model.tags : [])
  ].join(' ').toLowerCase()
}
