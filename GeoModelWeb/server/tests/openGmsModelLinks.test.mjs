import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const {
  buildOpenGmsModelExternalUrl,
  normalizeOpenGmsModelFavorite
} = require('../utils/openGmsModelLinks.js')

test('builds OpenGMS model item URLs from related model item ids', () => {
  assert.equal(
    buildOpenGmsModelExternalUrl('3f6857ba-c2d2-4e27-b220-6e5367803a12'),
    'https://geomodeling.njnu.edu.cn/modelItem/3f6857ba-c2d2-4e27-b220-6e5367803a12/'
  )
})

test('normalizes a model library record into a saved model favorite', () => {
  const favorite = normalizeOpenGmsModelFavorite({
    id: '16e31602-bd05-4da4-bd01-cb7582c21ae8',
    md5: 'd9d48eb948e7a36006c7d04d702c3fbb',
    relatedModelItems: ['3f6857ba-c2d2-4e27-b220-6e5367803a12'],
    name: 'SWAT_Model',
    description: 'Watershed modeling service.',
    author: '1508574735@qq.com',
    tags: ['Land regions', 'Regional scale'],
    status: 'Public',
    deploy: true,
    online: true,
    healthText: '正常',
    viewCount: 15741,
    invokeCount: 1079,
    createTime: '2019-05-16 21:25:55',
    lastModifyTime: '2026-01-28 11:07:24'
  }, {
    addedAt: '2026-05-21T14:30:00.000Z'
  })

  assert.equal(favorite.id, '16e31602-bd05-4da4-bd01-cb7582c21ae8')
  assert.equal(favorite.modelItemId, '3f6857ba-c2d2-4e27-b220-6e5367803a12')
  assert.equal(favorite.externalUrl, 'https://geomodeling.njnu.edu.cn/modelItem/3f6857ba-c2d2-4e27-b220-6e5367803a12/')
  assert.equal(favorite.deploy, true)
  assert.equal(favorite.online, true)
  assert.deepEqual(favorite.tags, ['Land regions', 'Regional scale'])
  assert.equal(favorite.addedAt, '2026-05-21T14:30:00.000Z')
})

test('preserves legacy saved models and marks missing external links explicitly', () => {
  const favorite = normalizeOpenGmsModelFavorite({
    id: 'legacy-id',
    name: 'Legacy Model',
    description: 'Old favorite shape.',
    author: 'OpenGeoLab'
  }, {
    addedAt: '2026-05-21T14:31:00.000Z'
  })

  assert.equal(favorite.id, 'legacy-id')
  assert.equal(favorite.name, 'Legacy Model')
  assert.equal(favorite.externalUrl, null)
  assert.equal(favorite.modelItemId, null)
})

test('normalizes modelItemId-only records into external links', () => {
  const favorite = normalizeOpenGmsModelFavorite({
    id: 'legacy-id',
    modelItemId: '3d2ced76-2750-4b7f-b56e-ad9dd91e40cd',
    name: '地震群发滑坡概率评估预警模型'
  })

  assert.equal(favorite.externalUrl, 'https://geomodeling.njnu.edu.cn/modelItem/3d2ced76-2750-4b7f-b56e-ad9dd91e40cd/')
})
