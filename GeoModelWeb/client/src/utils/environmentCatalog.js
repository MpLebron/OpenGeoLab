export function normalizeEnvironmentCatalog(images = [], options = {}) {
  const userDefaultEnvId = options.userDefaultEnvId || ''

  return images
    .filter(image => image && image.id)
    .map(image => {
      const name = image.title || image.displayName || image.label || image.id
      const tags = Array.isArray(image.tags) ? image.tags : []
      const available = Boolean(image.available)
      const buildable = Boolean(image.buildable)
      const platformProvided = image.platformProvided !== false
      const status = image.status || (available ? 'installed' : 'missing')
      const installedSize = image.installedSize || ''
      const estimatedSize = image.estimatedSize || ''
      const sizeLabel = available
        ? (installedSize || image.size || estimatedSize)
        : formatEstimatedSize(estimatedSize || image.size)
      const availabilityLabel = getEnvironmentAvailabilityLabel({
        ...image,
        available,
        buildable,
        platformProvided,
        status
      })

      return {
        ...image,
        name,
        title: image.title || name,
        runtimeName: image.imageName || image.name || '',
        tags,
        source: image.source || 'official',
        stack: image.stack || image.description || '',
        accelerator: image.accelerator || 'CPU',
        status,
        installedSize,
        estimatedSize,
        size: sizeLabel,
        sizeLabel,
        availabilityLabel,
        projects: image.projects || availabilityLabel,
        available,
        buildable,
        platformProvided,
        default: userDefaultEnvId ? image.id === userDefaultEnvId : Boolean(image.default)
      }
    })
}

export function canCreateProjectFromEnvironment(environment = {}) {
  return Boolean(environment.available && environment.platformProvided !== false)
}

export function getEnvironmentActionLabel(environment = {}) {
  if (canCreateProjectFromEnvironment(environment)) return 'Use for New Project'
  if (environment.buildable && environment.platformProvided !== false) return 'Build required'
  return 'Unavailable'
}

export function getEnvironmentAvailabilityLabel(environment = {}) {
  if (environment.available) return 'Installed'
  if (environment.buildable && environment.platformProvided !== false) return 'Build required'
  return 'Unavailable'
}

function formatEstimatedSize(size = '') {
  const value = String(size || '').trim()
  if (!value) return ''
  if (/^estimated\s+/i.test(value)) return value
  return `Estimated ${value}`
}
