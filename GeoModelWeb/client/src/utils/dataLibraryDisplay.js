export function getDataKind(item = {}) {
  return item.kind === 'folder' || item.type === 'folder' ? 'folder' : 'file'
}

export function getDataItemTitle(item = {}) {
  return item.name || item.filename || 'Untitled data asset'
}

export function getDataItemBadge(item = {}) {
  if (getDataKind(item) === 'folder') return 'DIR'
  const name = getDataItemTitle(item)
  const ext = String(item.extension || item.type || name.split('.').pop() || '')
    .replace(/^\./, '')
    .toUpperCase()
  return ext && ext !== name.toUpperCase() ? ext.slice(0, 4) : 'FILE'
}

export function formatDataSize(size) {
  if (typeof size === 'string') return size
  const bytes = Number(size || 0)
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

export function getDataParentPath(item = {}) {
  const rawPath = String(item.path || '')
  if (!rawPath || rawPath === '/') return '/'
  const segments = rawPath.split('/').filter(Boolean)
  if (getDataKind(item) === 'file') {
    segments.pop()
  }
  return segments.length ? `/${segments.join('/')}` : '/'
}

export function getDataItemSubtitle(item = {}) {
  if (getDataKind(item) === 'folder') {
    return item.path || '/'
  }

  const parts = [
    getDataParentPath(item),
    item.metadata?.formatLabel || getDataItemBadge(item),
    formatDataSize(item.size)
  ].filter(Boolean)

  return parts.join(' · ')
}

export function canAttachMyDataItem(item = {}) {
  return getDataKind(item) === 'file'
}

export function isBundledCaseDataBinding(binding = {}) {
  return binding.source === 'case' || binding.bindingType === 'bundled-case-data'
}

export function canRemoveProjectDataBinding(binding = {}) {
  return !isBundledCaseDataBinding(binding)
}

export function getVisibleProjectDataBindings(bindings = []) {
  return (Array.isArray(bindings) ? bindings : []).filter(binding => !isBundledCaseDataBinding(binding))
}

export function getProjectDataSectionDisplay(bindings = []) {
  const safeBindings = Array.isArray(bindings) ? bindings : []
  const visibleBindings = getVisibleProjectDataBindings(safeBindings)
  const count = visibleBindings.length
  const hasBundledCaseData = safeBindings.some(isBundledCaseDataBinding)

  return {
    title: 'PROJECT DATA',
    countLabel: count > 0 ? `${count} ${count === 1 ? 'resource' : 'resources'}` : '',
    canAdd: true,
    hasBundledCaseData,
    shouldShow: count > 0 || !hasBundledCaseData
  }
}

export function shouldShowProjectDataSection(bindings = [], project = {}) {
  const visibleBindings = getVisibleProjectDataBindings(bindings)
  if (visibleBindings.length > 0) return true
  if (project?.isCase) return false
  return getProjectDataSectionDisplay(bindings).shouldShow
}

export function getProjectDataStatus(binding = {}) {
  if (binding.status === 'source_missing' || binding.sourceAvailable === false) {
    return {
      label: 'Source missing',
      className: 'missing'
    }
  }

  return {
    label: 'Ready',
    className: 'ready'
  }
}
