import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canAttachMyDataItem,
  getDataItemBadge,
  getDataItemSubtitle,
  getDataItemTitle,
  getDataKind,
  getProjectDataSectionDisplay,
  getProjectDataStatus,
  getVisibleProjectDataBindings,
  shouldShowProjectDataSection
} from '../src/utils/dataLibraryDisplay.js'

test('normalizes My Data folder and file display fields', () => {
  const folder = {
    kind: 'folder',
    type: 'folder',
    name: 'DEM',
    path: '/Terrain/DEM',
    metadata: { domain: 'Terrain' }
  }
  const file = {
    kind: 'file',
    type: 'tif',
    name: 'Changsha_DEM_30m.tif',
    path: '/Terrain/DEM/Changsha_DEM_30m.tif',
    size: 44879052,
    source: 'mock',
    metadata: {
      domain: 'Terrain',
      formatLabel: 'GeoTIFF',
      crs: 'EPSG:4326',
      resolution: '30 m'
    }
  }

  assert.equal(getDataKind(folder), 'folder')
  assert.equal(getDataKind(file), 'file')
  assert.equal(getDataItemTitle(file), 'Changsha_DEM_30m.tif')
  assert.equal(getDataItemBadge(file), 'TIF')
  assert.equal(getDataItemSubtitle(file), '/Terrain/DEM · GeoTIFF · 42.8 MB')
  assert.equal(canAttachMyDataItem(folder), false)
  assert.equal(canAttachMyDataItem(file), true)
})

test('formats Project Data binding status without decorative colors', () => {
  assert.deepEqual(getProjectDataStatus({ status: 'ready', sourceAvailable: true }), {
    label: 'Ready',
    className: 'ready'
  })

  assert.deepEqual(getProjectDataStatus({ status: 'source_missing', sourceAvailable: false }), {
    label: 'Source missing',
    className: 'missing'
  })
})

test('does not duplicate bundled case data in the Project Data management strip', () => {
  const bundledBindings = [
    {
      source: 'case',
      bindingType: 'bundled-case-data',
      name: 'xuanwu_rooftop.zip'
    },
    {
      source: 'case',
      bindingType: 'bundled-case-data',
      name: 'SolarCalculation-roofSloar.zip'
    }
  ]

  assert.deepEqual(getProjectDataSectionDisplay(bundledBindings), {
    title: 'PROJECT DATA',
    countLabel: '',
    canAdd: true,
    hasBundledCaseData: true,
    shouldShow: false
  })
  assert.deepEqual(getVisibleProjectDataBindings(bundledBindings), [])

  const externalBinding = { source: 'my-data', name: 'dem.tif' }
  assert.deepEqual(getProjectDataSectionDisplay([externalBinding, ...bundledBindings]), {
    title: 'PROJECT DATA',
    countLabel: '1 resource',
    canAdd: true,
    hasBundledCaseData: true,
    shouldShow: true
  })
  assert.deepEqual(getVisibleProjectDataBindings([externalBinding, ...bundledBindings]), [externalBinding])
})

test('hides the Project Data strip for case projects without external data', () => {
  assert.equal(shouldShowProjectDataSection([], { isCase: true }), false)
  assert.equal(shouldShowProjectDataSection([], { isCase: false }), true)
  assert.equal(shouldShowProjectDataSection([{ source: 'my-data', name: 'dem.tif' }], { isCase: true }), true)
})
