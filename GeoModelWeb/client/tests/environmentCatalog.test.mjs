import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canCreateProjectFromEnvironment,
  getEnvironmentActionLabel,
  getEnvironmentAvailabilityLabel,
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
  assert.equal(catalog[0].projects, 'Installed')
  assert.equal(catalog[0].availabilityLabel, 'Installed')
  assert.equal(catalog[0].sizeLabel, '5-8 GB')
})

test('requires installed runtime images before creating projects', () => {
  assert.equal(getEnvironmentActionLabel({ available: true }), 'Use for New Project')
  assert.equal(getEnvironmentActionLabel({ available: false, buildable: true, id: 'opengms-pangeo-earth' }), 'Build required')
  assert.equal(getEnvironmentActionLabel({ available: false, buildable: false, id: 'custom-runtime' }), 'Unavailable')

  assert.equal(canCreateProjectFromEnvironment({ available: true }), true)
  assert.equal(canCreateProjectFromEnvironment({ available: false, buildable: true, id: 'opengms-pangeo-earth' }), false)
  assert.equal(canCreateProjectFromEnvironment({ available: false, buildable: false }), false)
})

test('labels missing runtime images as build-required catalog entries', () => {
  const catalog = normalizeEnvironmentCatalog([
    {
      id: 'opengms-spatial-stats',
      title: 'Spatial Statistics',
      imageName: 'opengms/spatial-stats:2026.05',
      available: false,
      status: 'missing',
      buildable: true,
      estimatedSize: '5-7 GB'
    }
  ])

  assert.equal(catalog[0].available, false)
  assert.equal(catalog[0].status, 'missing')
  assert.equal(catalog[0].projects, 'Build required')
  assert.equal(catalog[0].availabilityLabel, 'Build required')
  assert.equal(catalog[0].size, 'Estimated 5-7 GB')
  assert.equal(catalog[0].sizeLabel, 'Estimated 5-7 GB')
  assert.equal(getEnvironmentAvailabilityLabel(catalog[0]), 'Build required')
})
