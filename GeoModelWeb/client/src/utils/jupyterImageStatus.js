export function normalizeJupyterImageCatalog(payload = {}) {
  const dockerAvailable = payload.dockerAvailable !== false
  const dockerMessage = String(payload.dockerMessage || '').trim()
  const images = Array.isArray(payload.images)
    ? payload.images.map(image => ({
      ...image,
      available: dockerAvailable && Boolean(image.available)
    }))
    : []

  return {
    images,
    dockerAvailable,
    dockerMessage
  }
}

export function canSelectJupyterImage(image = {}, catalog = {}) {
  return catalog.dockerAvailable !== false && Boolean(image.available)
}

export function getJupyterImageUnavailableLabel(image = {}, catalog = {}) {
  if (catalog.dockerAvailable === false) return 'Docker 未启动'
  return image.available ? '' : '未安装'
}

export function getJupyterImageStatusMessage(catalog = {}) {
  if (catalog.dockerAvailable === false) {
    return catalog.dockerMessage || 'Docker Desktop 未启动，请先启动 Docker 后再选择运行环境。'
  }

  return ''
}
