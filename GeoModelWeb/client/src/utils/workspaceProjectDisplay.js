export function getWorkspaceProjectTitle(project = {}) {
  return project.case?.title || project.title || project.name || project.projectName || 'Untitled Project'
}

export function getWorkspaceProjectRouteId(project = {}) {
  return String(
    project.projectId ||
    project.workspaceId ||
    project.uuid ||
    project.id ||
    project.name ||
    project.projectName ||
    ''
  ).trim()
}

export function buildWorkspaceProjectRoutePath(project = {}) {
  const routeId = getWorkspaceProjectRouteId(project)
  return `/jupyter/project/${encodeURIComponent(routeId)}`
}

export function getWorkspaceProjectSummary(project = {}) {
  const explicit = String(project.description || project.case?.summary || project.summary || '').trim()
  if (explicit) return explicit

  const fileCount = Number(project.fileCount || 0)
  return `Project workspace with ${fileCount} file${fileCount === 1 ? '' : 's'} and ${formatWorkspaceProjectSize(project.sizeBytes)}.`
}

export function getWorkspaceProjectVisibility(project = {}) {
  if (project.isPublic) {
    return { label: 'Public', className: 'public', kicker: 'Public' }
  }

  return { label: 'Private', className: 'private', kicker: 'Private' }
}

export function formatWorkspaceProjectSize(bytes = 0) {
  const value = Number(bytes || 0)
  if (!Number.isFinite(value) || value <= 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = value
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  if (unitIndex === 0) return `${Math.round(size)} ${units[unitIndex]}`
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

export function getWorkspaceProjectRuntimeImage(project = {}) {
  return String(
    project.runtime?.imageName ||
    project.runtime?.imageId ||
    project.runtimeImageId ||
    project.imageId ||
    project.environmentId ||
    ''
  ).trim()
}

export function getWorkspaceProjectRuntimeLabel(project = {}) {
  const image = getWorkspaceProjectRuntimeImage(project)
  if (!image) return '-'
  return image.replace(/^opengms\//, '')
}

export function getWorkspaceProjectFileLabel(project = {}) {
  const fileCount = Number(project.fileCount || 0)
  return `${fileCount} file${fileCount === 1 ? '' : 's'}`
}

export function getWorkspaceProjectSizeLabel(project = {}) {
  return formatWorkspaceProjectSize(project.sizeBytes)
}

export function getWorkspaceProjectArtifacts(project = {}) {
  const runtimeImage = getWorkspaceProjectRuntimeImage(project)
  const parts = [
    getWorkspaceProjectFileLabel(project),
    getWorkspaceProjectSizeLabel(project)
  ]

  if (runtimeImage) {
    parts.push(`Based on ${runtimeImage}`)
  }

  return parts.join(' • ')
}

export function getWorkspaceProjectMark(project = {}) {
  const visibility = getWorkspaceProjectVisibility(project)

  return {
    kicker: visibility.kicker,
    label: project.markLabel || (project.isCase ? 'CASE' : 'WS'),
    variant: project.isCase ? 'case' : project.isPublic ? 'shared' : 'private'
  }
}

export function getWorkspaceProjectSearchText(project = {}) {
  return [
    project.name,
    project.projectName,
    project.owner,
    project.title,
    project.description,
    project.summary,
    project.case?.title,
    project.case?.summary,
    project.case?.scenario,
    ...(Array.isArray(project.case?.tags) ? project.case.tags : []),
    ...(Array.isArray(project.tags) ? project.tags : [])
  ].filter(Boolean).join(' ').toLowerCase()
}
