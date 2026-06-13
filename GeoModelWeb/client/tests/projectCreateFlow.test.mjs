import test from 'node:test'
import assert from 'node:assert/strict'

import {
  CREATE_PROJECT_TARGETS,
  PROJECT_STARTER_TEMPLATES,
  getCreateProjectSubmitLabel,
  getCreateProjectVisibilityPayload,
  getDefaultStarterTemplateId,
  normalizeStarterTemplateId,
  shouldLaunchJupyterAfterCreate
} from '../src/utils/projectCreateFlow.js'

test('environment-created projects launch JupyterLab immediately after creation', () => {
  assert.equal(shouldLaunchJupyterAfterCreate(CREATE_PROJECT_TARGETS.jupyter), true)
})

test('regular workspace-created projects also launch JupyterLab after creation', () => {
  assert.equal(shouldLaunchJupyterAfterCreate(CREATE_PROJECT_TARGETS.project), true)
})

test('create modal button copy reflects launch target', () => {
  assert.equal(
    getCreateProjectSubmitLabel({ target: CREATE_PROJECT_TARGETS.jupyter, isCreating: false }),
    'Create and Open JupyterLab'
  )
  assert.equal(
    getCreateProjectSubmitLabel({ target: CREATE_PROJECT_TARGETS.jupyter, isCreating: true }),
    'Creating and launching...'
  )
  assert.equal(
    getCreateProjectSubmitLabel({ target: CREATE_PROJECT_TARGETS.project, isCreating: true }),
    'Creating and launching...'
  )
})

test('new projects are private at creation time', () => {
  assert.deepEqual(getCreateProjectVisibilityPayload(), { isPublic: false })
})

test('starter template ids normalize to supported project initializers', () => {
  assert.equal(getDefaultStarterTemplateId(), 'blank')
  assert.equal(normalizeStarterTemplateId('python-notebook'), 'python-notebook')
  assert.equal(normalizeStarterTemplateId('geospatial-notebook'), 'geospatial-notebook')
  assert.equal(normalizeStarterTemplateId('unknown-template'), 'blank')
  assert.deepEqual(
    PROJECT_STARTER_TEMPLATES.map(template => template.id),
    ['blank', 'python-notebook', 'geospatial-notebook']
  )
})
