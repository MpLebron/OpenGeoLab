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

      return {
        ...image,
        name,
        title: image.title || name,
        runtimeName: image.imageName || image.name || '',
        tags,
        source: image.source || 'official',
        stack: image.stack || image.description || '',
        accelerator: image.accelerator || 'CPU',
        size: image.size || image.installedSize || image.estimatedSize || '',
        projects: image.projects || (platformProvided ? 'System runtime' : 'Unavailable'),
        available,
        buildable,
        platformProvided,
        default: userDefaultEnvId ? image.id === userDefaultEnvId : Boolean(image.default)
      }
    })
}

export function canCreateProjectFromEnvironment(environment = {}) {
  return Boolean((environment.id || environment.available) && environment.platformProvided !== false)
}

export function getEnvironmentActionLabel(environment = {}) {
  return canCreateProjectFromEnvironment(environment) ? 'Use for New Project' : 'Unavailable'
}
