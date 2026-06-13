export const CREATE_PROJECT_TARGETS = {
  project: 'project',
  jupyter: 'jupyter'
}

export const PROJECT_STARTER_TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank workspace',
    description: 'Start with an empty project directory.'
  },
  {
    id: 'python-notebook',
    name: 'Python notebook',
    description: 'Create a clean main.ipynb for general scientific analysis.'
  },
  {
    id: 'geospatial-notebook',
    name: 'Geospatial notebook',
    description: 'Create a notebook outline for vector, raster, and gridded data workflows.'
  }
]

const STARTER_TEMPLATE_IDS = new Set(PROJECT_STARTER_TEMPLATES.map(template => template.id))

export function shouldLaunchJupyterAfterCreate(target) {
  return target === CREATE_PROJECT_TARGETS.jupyter || target === CREATE_PROJECT_TARGETS.project
}

export function getCreateProjectSubmitLabel({ target = CREATE_PROJECT_TARGETS.project, isCreating = false } = {}) {
  if (shouldLaunchJupyterAfterCreate(target)) {
    return isCreating ? 'Creating and launching...' : 'Create and Open JupyterLab'
  }

  return isCreating ? 'Creating...' : 'Create Project'
}

export function getDefaultStarterTemplateId() {
  return 'blank'
}

export function normalizeStarterTemplateId(value) {
  return STARTER_TEMPLATE_IDS.has(value) ? value : getDefaultStarterTemplateId()
}

export function getCreateProjectVisibilityPayload() {
  return { isPublic: false }
}
