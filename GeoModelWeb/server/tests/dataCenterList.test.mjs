import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const {
  hasDataCenterSourceLink,
  paginateDataCenterContent,
  resolveDataCenterSourceUrl
} = require('../utils/dataCenterList.js')

test('resolves external data source links from item and child records', () => {
  assert.equal(
    resolveDataCenterSourceUrl({ fileWebAddress: 'http://nnu.geodata.cn/data/datadetails.html?dataguid=1' }),
    'http://nnu.geodata.cn/data/datadetails.html?dataguid=1'
  )

  assert.equal(
    resolveDataCenterSourceUrl({ dataContainerUrl: '/data/detail/abc' }),
    'https://geomodeling.njnu.edu.cn/data/detail/abc'
  )

  assert.equal(
    resolveDataCenterSourceUrl({
      subDataItems: [{ fileWebAddress: 'https://example.com/dataset' }]
    }),
    'https://example.com/dataset'
  )
})

test('does not treat local file paths as external source links', () => {
  assert.equal(hasDataCenterSourceLink({ fileRelativePath: '/store/resourceData/demo.zip' }), false)
  assert.equal(hasDataCenterSourceLink({ fileWebAddress: '' }), false)
})

test('filters no-link datasets before paginating data center results', () => {
  const page = paginateDataCenterContent([
    { name: 'test' },
    { name: 'linked-a', fileWebAddress: 'https://example.com/a' },
    { name: 'landisll-8', subDataItems: [{ fileRelativePath: '/resourceData/b.zip' }] },
    { name: 'linked-b', dataContainerUrl: '/data/detail/b' },
    { name: 'linked-c', subDataItems: [{ sourceUrl: 'https://example.com/c' }] }
  ], 1, 2)

  assert.deepEqual(page.content.map(item => item.name), ['linked-a', 'linked-b'])
  assert.equal(page.totalElements, 3)
  assert.equal(page.totalPages, 2)
  assert.equal(page.numberOfElements, 2)
  assert.equal(page.first, true)
  assert.equal(page.last, false)
})
