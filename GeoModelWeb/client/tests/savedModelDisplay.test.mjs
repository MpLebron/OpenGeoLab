import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getSavedModelExternalUrl,
  getSavedModelMetrics,
  getSavedModelStatusChips,
  getSavedModelSummary,
  getSavedModelTags
} from '../src/utils/savedModelDisplay.js'

test('formats saved model list display fields', () => {
  const model = {
    name: 'SWAT_Model',
    description: 'The Soil & Water Assessment Tool is a watershed model.',
    tags: ['Land regions', 'Regional scale', 'Hydrology'],
    status: 'Public',
    deploy: true,
    online: true,
    healthText: '正常',
    viewCount: 15741,
    invokeCount: 1079,
    lastModifyTime: '2026-01-28 11:07:24',
    externalUrl: 'https://geomodeling.njnu.edu.cn/modelItem/3f6857ba-c2d2-4e27-b220-6e5367803a12/'
  }

  assert.equal(getSavedModelExternalUrl(model), model.externalUrl)
  assert.equal(getSavedModelSummary(model), 'The Soil & Water Assessment Tool is a watershed model.')
  assert.deepEqual(getSavedModelTags(model), ['Land regions', 'Regional scale', 'Hydrology'])
  assert.deepEqual(getSavedModelStatusChips(model), [
    { label: 'Public', className: 'public' },
    { label: 'Deployed', className: 'deployed' },
    { label: 'Online', className: 'online' }
  ])
  assert.deepEqual(getSavedModelMetrics(model), {
    views: '15.7k views',
    runs: '1.1k runs',
    updated: 'Updated 2026-01-28'
  })
})

test('handles saved models without OpenGMS links', () => {
  const model = {
    name: 'Legacy Model',
    description: '',
    status: '',
    deploy: false,
    online: false
  }

  assert.equal(getSavedModelExternalUrl(model), '')
  assert.equal(getSavedModelSummary(model), 'No description available.')
  assert.deepEqual(getSavedModelTags(model), [])
  assert.deepEqual(getSavedModelStatusChips(model), [])
  assert.equal(getSavedModelMetrics(model).updated, 'Updated --')
})

test('builds saved model external URL from modelItemId fallback', () => {
  assert.equal(
    getSavedModelExternalUrl({
      modelItemId: '3d2ced76-2750-4b7f-b56e-ad9dd91e40cd'
    }),
    'https://geomodeling.njnu.edu.cn/modelItem/3d2ced76-2750-4b7f-b56e-ad9dd91e40cd/'
  )
})
