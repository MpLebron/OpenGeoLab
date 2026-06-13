import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getLibraryItemAuthor,
  getLibraryItemDetailUrl,
  getLibraryItemIoStats,
  getLibraryItemMetrics,
  getLibraryItemStatusChips,
  getLibraryItemSummary,
  getLibraryItemTags,
  getLibraryItemTypeLabel
} from '../src/utils/librarySelectorDisplay.js'

test('formats model selector display fields with status, tags, metrics, and detail URL', () => {
  const model = {
    modelItemId: '3f6857ba-c2d2-4e27-b220-6e5367803a12',
    externalUrl: 'https://geomodeling.njnu.edu.cn/modelItem/3f6857ba-c2d2-4e27-b220-6e5367803a12/',
    name: 'SWAT_Model',
    description: 'The Soil & Water Assessment Tool is a watershed model.',
    author: '1508574735@qq.com',
    tags: ['Land regions', 'Regional scale', 'Hydrology'],
    status: 'Public',
    deploy: true,
    online: true,
    healthText: '正常',
    viewCount: 15743,
    invokeCount: 1079,
    lastModifyTime: '2026-01-28 11:07:24'
  }

  assert.equal(getLibraryItemTypeLabel(model, 'model'), 'GM')
  assert.equal(getLibraryItemSummary(model, 'model'), 'The Soil & Water Assessment Tool is a watershed model.')
  assert.equal(getLibraryItemAuthor(model), '1508574735@qq.com')
  assert.deepEqual(getLibraryItemTags(model, 'model'), ['Land regions', 'Regional scale'])
  assert.deepEqual(getLibraryItemStatusChips(model, 'model'), [
    { label: 'Public', className: 'public' },
    { label: 'Deployed', className: 'deployed' },
    { label: 'Online', className: 'online' }
  ])
  assert.deepEqual(getLibraryItemMetrics(model, 'model'), [
    'Author 1508574735@qq.com',
    '15.7k views',
    '1.1k runs',
    'Updated 2026-01-28'
  ])
  assert.equal(getLibraryItemDetailUrl(model, 'model'), model.externalUrl)
})

test('formats data method selector display fields without exposing implementation specs', () => {
  const method = {
    id: 2,
    name: 'AdaptiveFilter',
    description: 'Performs an adaptive filter on an image.',
    longDescription: 'This tool performs a type of adaptive filter on a raster image.',
    author: '',
    tags: ['Image Processing Tools', 'Filters'],
    createTime: '2024-08-14 21:11:54',
    engine: 'whitebox',
    execution: 'exe',
    methodType: 'refactoring',
    paramCount: 5,
    inputCount: 1,
    outputCount: 1,
    optionCount: 3,
    inputKinds: ['Raster'],
    outputKinds: ['Raster']
  }

  assert.equal(getLibraryItemTypeLabel(method, 'dataMethod'), 'WB')
  assert.equal(getLibraryItemSummary(method, 'dataMethod'), 'This tool performs a type of adaptive filter on a raster image.')
  assert.equal(getLibraryItemAuthor(method), 'Unknown')
  assert.deepEqual(getLibraryItemTags(method, 'dataMethod'), ['Raster input', 'Raster output', 'Image Processing Tools'])
  assert.deepEqual(getLibraryItemStatusChips(method, 'dataMethod'), [
    { label: 'WHITEBOX', className: 'engine' },
    { label: 'EXE', className: 'execution' },
    { label: 'Refactoring', className: 'neutral' }
  ])
  assert.deepEqual(getLibraryItemIoStats(method), [
    { label: 'Inputs', value: '1' },
    { label: 'Outputs', value: '1' },
    { label: 'Params', value: '5' },
    { label: 'Options', value: '3' }
  ])
  assert.deepEqual(getLibraryItemMetrics(method, 'dataMethod'), [
    'Author Unknown',
    'Created 2024-08-14'
  ])
  assert.equal(getLibraryItemDetailUrl(method, 'dataMethod'), '')
})

test('uses explicit empty-state fallbacks for sparse records', () => {
  assert.equal(getLibraryItemSummary({}, 'model'), 'No description available')
  assert.equal(getLibraryItemAuthor({ author: '' }), 'Unknown')
  assert.deepEqual(getLibraryItemTags({ tags: null }, 'model'), [])
  assert.deepEqual(getLibraryItemMetrics({}, 'model'), [
    'Author Unknown',
    '0 views',
    '0 runs',
    'Updated --'
  ])
  assert.deepEqual(getLibraryItemIoStats({}), [
    { label: 'Inputs', value: '0' },
    { label: 'Outputs', value: '0' },
    { label: 'Params', value: '0' },
    { label: 'Options', value: '0' }
  ])
})
