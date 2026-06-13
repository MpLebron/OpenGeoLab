import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canCreateProjectFromEnvironment,
  getEnvironmentActionLabel,
  normalizeEnvironmentCatalog
} from '../src/utils/environmentCatalog.js'

test('normalizes backend runtime images into environment cards', () => {
  const catalog = normalizeEnvironmentCatalog([
    {
      id: 'opengms-pangeo-earth',
      title: 'Pangeo Earth System',
      label: 'Pangeo Earth System',
      imageName: 'opengms/pangeo-earth:2026.05',
      tags: ['Official', 'CPU', 'Pangeo'],
      available: true,
      buildable: true,
      stack: 'Pangeo Notebook · Xarray',
      accelerator: 'CPU',
      estimatedSize: '5-8 GB'
    }
  ], { userDefaultEnvId: 'opengms-pangeo-earth' })

  assert.equal(catalog.length, 1)
  assert.equal(catalog[0].name, 'Pangeo Earth System')
  assert.equal(catalog[0].runtimeName, 'opengms/pangeo-earth:2026.05')
  assert.equal(catalog[0].default, true)
  assert.equal(catalog[0].projects, 'System runtime')
})

test('treats predefined environments as user-selectable runtime templates', () => {
  assert.equal(getEnvironmentActionLabel({ available: true }), 'Use for New Project')
  assert.equal(getEnvironmentActionLabel({ available: false, buildable: true, id: 'opengms-pangeo-earth' }), 'Use for New Project')
  assert.equal(getEnvironmentActionLabel({ available: false, buildable: false, id: 'custom-runtime' }), 'Use for New Project')

  assert.equal(canCreateProjectFromEnvironment({ available: true }), true)
  assert.equal(canCreateProjectFromEnvironment({ available: false, buildable: true, id: 'opengms-pangeo-earth' }), true)
  assert.equal(canCreateProjectFromEnvironment({ available: false, buildable: false }), false)
})
