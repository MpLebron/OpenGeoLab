import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const {
  listPyGeoModelModels,
  getPyGeoModelModelDetail,
  buildPyGeoModelRegistryFilter,
  buildPyGeoModelFacetCounts,
  clearPyGeoModelCatalogCache
} = require('../utils/pyGeoModelCatalog.js')

test('lists models from the PyGeoModel executable catalog order', () => {
  clearPyGeoModelCatalogCache()

  const result = listPyGeoModelModels({ page: 1, limit: 5 })
  const rooftop = listPyGeoModelModels({ query: 'photovoltaic', page: 1, limit: 1 }).data[0]

  assert.equal(result.source, 'pygeomodel')
  assert.equal(result.total, 2063)
  assert.equal(rooftop.name, 'Roof Photovoltaic Carbon Emission Reduction Potential Assessment Model')
  assert.equal(rooftop.md5, '242c696e1162f42d3c239456d354b526')
  assert.deepEqual(rooftop.tags, ['Land regions'])
})

test('searches the PyGeoModel catalog with display names and descriptions', () => {
  const result = listPyGeoModelModels({ query: 'photovoltaic', page: 1, limit: 10 })

  assert.ok(result.total >= 1)
  assert.equal(result.data[0].name, 'Roof Photovoltaic Carbon Emission Reduction Potential Assessment Model')
  assert.match(result.data[0].description, /photovoltaic/i)
})

test('loads PyGeoModel model details and local input parameters by display name', () => {
  const detail = getPyGeoModelModelDetail('Area Weighted Cover Index')
  const inputs = detail.mdl.inputs
  const childNames = inputs.flatMap(input => input.children.map(child => child.eventName))

  assert.equal(detail.name, '面积加权的覆被指数')
  assert.equal(detail.displayName, 'Area Weighted Cover Index')
  assert.equal(detail.detailSource, 'pygeomodel-catalog')
  assert.deepEqual(childNames, ['P', 'C_k', 'j'])
})

test('loads PyGeoModel model details and local input parameters by source name', () => {
  const detail = getPyGeoModelModelDetail('缀块景观的种群动态模型')
  const inputs = detail.mdl.inputs
  const childNames = inputs.flatMap(input => input.children.map(child => child.eventName))

  assert.equal(detail.displayName, 'Population Dynamics Model Of Patchy Landscapes')
  assert.deepEqual(childNames, ['N_tdeltat_i', 'C_t_i', 'rou', 'K_i'])
})

test('includes the current OpenGMS UrbanM2M expansion model by UUID', () => {
  const result = listPyGeoModelModels({ query: 'UrbanM2M', page: 1, limit: 5 })

  assert.ok(result.total >= 1)
  assert.equal(result.data[0].id, 'd65631a5-9e1a-4450-9487-640c5a6494c2')
  assert.equal(result.data[0].name, 'UrbanM2M城市扩张模拟模型')
  assert.match(result.data[0].description, /ConvLSTM/)
  assert.equal(result.data[0].externalUrl, 'https://geomodeling.njnu.edu.cn/computableModel/d65631a5-9e1a-4450-9487-640c5a6494c2')
})

test('loads current UrbanM2M model parameters from the local catalog', () => {
  const detail = getPyGeoModelModelDetail('d65631a5-9e1a-4450-9487-640c5a6494c2')
  const inputs = detail.mdl.inputs
  const inputNames = inputs.map(input => input.event)
  const childNames = inputs.flatMap(input => input.children.map(child => child.eventName))

  assert.equal(detail.name, 'UrbanM2M城市扩张模拟模型')
  assert.equal(detail.displayName, 'UrbanM2M Urban Expansion Simulation Model')
  assert.equal(detail.author, 'Wanhao.Li')
  assert.equal(inputs.length, 10)
  assert.deepEqual(inputNames.slice(0, 6), [
    'research_range',
    'research_restriction',
    'history_land_data',
    'slope_data',
    'dist_town_data',
    'dist_county_data'
  ])
  assert.deepEqual(childNames, ['st_year', 'first_sim_year', 'out_len', 'land_demands'])
})

test('builds PyGeoModel model facets from catalog tags', () => {
  const facets = buildPyGeoModelFacetCounts()

  assert.ok(facets.length > 0)
  assert.ok(facets.some(facet => facet.label === 'Land regions' || facet.label === '陆地圈'))
})

test('builds executable registry filter from modellist csv entries', () => {
  const filter = buildPyGeoModelRegistryFilter()

  assert.equal(filter.source, 'pygeomodel')
  assert.equal(filter.total, 2063)
  assert.ok(filter.ids.includes('d65631a5-9e1a-4450-9487-640c5a6494c2'))
  assert.ok(filter.names.includes('UrbanM2M城市扩张模拟模型'))
})
