import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'

const require = createRequire(import.meta.url)

const {
  buildDownloadContentDisposition,
  createProjectDataBinding,
  getSafeDownloadFilename,
  materializeProjectDataBinding,
  normalizeMyDataList,
  removeProjectDataBinding,
  resolveMyDataUploadDestination,
  resolveProjectDataBindings,
  sanitizeProjectDataMountPath,
  seedMockMyDataIfEmpty,
  writeProjectDataManifest
} = require('../utils/myDataLibrary.js')

test('normalizes legacy My Data items without losing folder hierarchy', () => {
  const normalized = normalizeMyDataList([
    { id: 'folder-terrain', name: 'Terrain', type: 'folder', path: '/Terrain' },
    { id: 'folder-dem', name: 'DEM', type: 'folder', parentId: 'folder-terrain' },
    { id: 'legacy-dem', name: 'Changsha_DEM_30m.tif', type: 'tif', size: 2048, parentId: 'folder-dem' }
  ])

  assert.equal(normalized[0].kind, 'folder')
  assert.equal(normalized[1].kind, 'folder')
  assert.equal(normalized[1].path, '/Terrain/DEM')
  assert.equal(normalized[2].kind, 'file')
  assert.equal(normalized[2].path, '/Terrain/DEM/Changsha_DEM_30m.tif')
  assert.equal(normalized[2].downloadable, false)
  assert.equal(normalized[2].metadata.formatLabel, 'GeoTIFF')
})

test('seeds realistic mock My Data only when a user has no data', () => {
  const seeded = seedMockMyDataIfEmpty([])

  assert.ok(seeded.length >= 12)
  assert.ok(seeded.some(item => item.path === '/Remote Sensing/ESA WorldCover/Changsha_ESA_WorldCover_2020.tif'))
  assert.ok(seeded.some(item => item.path === '/Terrain/DEM/Changsha_DEM_30m.tif'))
  assert.ok(seeded.every(item => item.source === 'mock'))

  const existing = [{ id: 'existing', name: 'user-data.csv', type: 'csv' }]
  assert.equal(seedMockMyDataIfEmpty(existing), existing)
})

test('creates readonly project data bindings from file assets only', () => {
  const dataList = seedMockMyDataIfEmpty([])
  const meta = { name: 'Test3', dataBindings: [] }

  const result = createProjectDataBinding(meta, dataList, {
    dataId: 'mock-dem-changsha-30m'
  })

  assert.equal(result.ok, true)
  assert.equal(result.binding.dataId, 'mock-dem-changsha-30m')
  assert.equal(result.binding.mode, 'readonly')
  assert.equal(result.binding.bindingType, 'reference')
  assert.equal(result.binding.mountPath, 'data/terrain/Changsha_DEM_30m.tif')
  assert.equal(meta.dataBindings.length, 1)

  const duplicate = createProjectDataBinding(meta, dataList, {
    dataId: 'mock-dem-changsha-30m'
  })
  assert.equal(duplicate.ok, false)
  assert.equal(duplicate.status, 409)
  assert.equal(duplicate.code, 'data_binding_exists')

  const folder = createProjectDataBinding(meta, dataList, {
    dataId: 'mock-folder-terrain'
  })
  assert.equal(folder.ok, false)
  assert.equal(folder.status, 400)
  assert.equal(folder.code, 'folder_binding_not_supported')
})

test('rejects unsafe project data mount paths', () => {
  assert.throws(
    () => sanitizeProjectDataMountPath('../secrets.env'),
    /must stay inside data/
  )

  assert.equal(
    sanitizeProjectDataMountPath('data/climate/era5.nc'),
    'data/climate/era5.nc'
  )
})

test('resolves My Data upload destinations and detects conflicts', () => {
  const dataList = normalizeMyDataList([
    { id: 'folder-terrain', name: 'Terrain', type: 'folder', path: '/Terrain' },
    { id: 'folder-dem', name: 'DEM', type: 'folder', parentId: 'folder-terrain' },
    { id: 'dem-existing', name: 'Changsha_DEM_30m.tif', filename: 'Changsha_DEM_30m.tif', type: 'tif', parentId: 'folder-dem' }
  ])

  const resolved = resolveMyDataUploadDestination(dataList, {
    path: '/Terrain/DEM',
    parentId: 'folder-dem',
    name: 'New_DEM.tif',
    filename: 'New_DEM.tif'
  })

  assert.equal(resolved.ok, true)
  assert.equal(resolved.dataPath, '/Terrain/DEM')
  assert.equal(resolved.parentId, 'folder-dem')

  const inferredParent = resolveMyDataUploadDestination(dataList, {
    path: '/Terrain/DEM',
    name: 'Another_DEM.tif',
    filename: 'Another_DEM.tif'
  })

  assert.equal(inferredParent.ok, true)
  assert.equal(inferredParent.parentId, 'folder-dem')

  const duplicate = resolveMyDataUploadDestination(dataList, {
    path: '/Terrain/DEM',
    parentId: 'folder-dem',
    name: 'Changsha_DEM_30m.tif',
    filename: 'Changsha_DEM_30m.tif'
  })

  assert.equal(duplicate.ok, false)
  assert.equal(duplicate.status, 409)
  assert.equal(duplicate.code, 'file_name_exists')
})

test('rejects invalid My Data upload destination metadata', () => {
  const dataList = normalizeMyDataList([
    { id: 'folder-terrain', name: 'Terrain', type: 'folder', path: '/Terrain' }
  ])

  const unsafePath = resolveMyDataUploadDestination(dataList, {
    path: '../Terrain',
    name: 'bad.csv',
    filename: 'bad.csv'
  })

  assert.equal(unsafePath.ok, false)
  assert.equal(unsafePath.code, 'invalid_data_path')

  const missingFolder = resolveMyDataUploadDestination(dataList, {
    path: '/Climate',
    name: 'era5.nc',
    filename: 'era5.nc'
  })

  assert.equal(missingFolder.ok, false)
  assert.equal(missingFolder.code, 'upload_path_not_found')

  const mismatch = resolveMyDataUploadDestination(dataList, {
    path: '/Terrain',
    parentId: 'different-folder',
    name: 'terrain.csv',
    filename: 'terrain.csv'
  })

  assert.equal(mismatch.ok, false)
  assert.equal(mismatch.code, 'parent_path_mismatch')
})

test('builds UTF-8 safe My Data download filenames', () => {
  assert.equal(
    getSafeDownloadFilename({ name: 'Ai入门学习路线.pdf' }),
    'Ai入门学习路线.pdf'
  )

  assert.equal(
    getSafeDownloadFilename({
      name: 'Ai入门学习路线.pdf',
      filename: 'Aiå¥é¨å­¦ä¹ è·¯çº¿.pdf'
    }),
    'Ai入门学习路线.pdf'
  )

  assert.equal(
    getSafeDownloadFilename({ name: 'bad/name\r\n.pdf' }),
    'bad_name .pdf'
  )

  const disposition = buildDownloadContentDisposition('Ai入门学习路线.pdf')
  assert.match(disposition, /^attachment; filename="/)
  assert.match(disposition, /filename\*=UTF-8''Ai%E5%85%A5%E9%97%A8%E5%AD%A6%E4%B9%A0%E8%B7%AF%E7%BA%BF\.pdf$/)
})

test('resolves bindings as source_missing when My Data source was removed', () => {
  const dataList = seedMockMyDataIfEmpty([])
  const meta = { dataBindings: [] }
  const created = createProjectDataBinding(meta, dataList, {
    dataId: 'mock-poi-changsha-2024'
  })

  assert.equal(created.ok, true)

  const resolved = resolveProjectDataBindings(meta, [])

  assert.equal(resolved.length, 1)
  assert.equal(resolved[0].status, 'source_missing')
  assert.equal(resolved[0].sourceAvailable, false)
})

test('resolves bundled case data without requiring a My Data source asset', () => {
  const meta = {
    dataBindings: [
      {
        id: 'case-xuanwu-rooftop',
        dataId: 'case-xuanwu-rooftop',
        name: 'xuanwu_rooftop.zip',
        sourcePath: 'case://nanjing-rooftop-pv/data/input/xuanwu_rooftop.zip',
        mountPath: 'data/input/xuanwu_rooftop.zip',
        localPath: 'data/input/xuanwu_rooftop.zip',
        source: 'case',
        bindingType: 'bundled-case-data',
        mode: 'readonly',
        status: 'ready',
        materialized: true,
        materializedAt: '2026-05-23T00:00:00.000Z',
        metadata: { domain: 'solar-energy', formatLabel: 'ZIP' }
      }
    ]
  }

  const resolved = resolveProjectDataBindings(meta, [])

  assert.equal(resolved.length, 1)
  assert.equal(resolved[0].sourceAvailable, true)
  assert.equal(resolved[0].status, 'ready')
  assert.equal(resolved[0].materialized, true)
  assert.equal(resolved[0].localPath, 'data/input/xuanwu_rooftop.zip')
  assert.equal(resolved[0].sourceItem.name, 'xuanwu_rooftop.zip')
})

test('removes project data bindings without mutating source assets', () => {
  const dataList = seedMockMyDataIfEmpty([])
  const meta = { dataBindings: [] }
  const created = createProjectDataBinding(meta, dataList, {
    dataId: 'mock-readme-project-data'
  })

  const removed = removeProjectDataBinding(meta, created.binding.id)

  assert.equal(removed.ok, true)
  assert.equal(meta.dataBindings.length, 0)
  assert.ok(dataList.some(item => item.id === 'mock-readme-project-data'))
})

test('writes a Jupyter-visible Project Data manifest before launch', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opengms-project-data-'))
  const dataList = seedMockMyDataIfEmpty([])
  const meta = { name: 'Test3', dataBindings: [] }
  createProjectDataBinding(meta, dataList, {
    dataId: 'mock-era5-changsha-temperature-2020'
  })

  const manifest = writeProjectDataManifest(tempDir, meta, dataList)
  const manifestPath = path.join(tempDir, 'data', '_bindings', 'project-data.json')

  assert.equal(fs.existsSync(manifestPath), true)
  assert.equal(manifest.projectName, 'Test3')
  assert.equal(manifest.bindings.length, 1)
  assert.equal(manifest.bindings[0].materialized, false)
  assert.equal(manifest.bindings[0].status, 'ready')

  const saved = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  assert.equal(saved.bindings[0].mountPath, 'data/climate/Changsha_ERA5_Temperature_2020.nc')
})

test('materializes downloadable Project Data into a Jupyter-visible local path', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opengms-materialize-'))
  const dataList = normalizeMyDataList([
    {
      id: 'dem-1',
      name: 'Changsha_DEM_30m.tif',
      kind: 'file',
      type: 'tif',
      path: '/Terrain/DEM/Changsha_DEM_30m.tif',
      url: 'https://example.test/data/dem.tif',
      downloadable: true,
      metadata: { formatLabel: 'GeoTIFF' }
    }
  ])
  const meta = { name: 'MappingProject', dataBindings: [] }
  const created = createProjectDataBinding(meta, dataList, { dataId: 'dem-1' })

  const result = await materializeProjectDataBinding(tempDir, created.binding, {
    fetchStream: async (url) => {
      assert.equal(url, 'https://example.test/data/dem.tif')
      return Readable.from(Buffer.from('dem-bytes'))
    },
    now: () => '2026-05-22T12:00:00.000Z'
  })

  assert.equal(result.ok, true)
  assert.equal(result.binding.materialized, true)
  assert.equal(result.binding.localPath, 'data/terrain/Changsha_DEM_30m.tif')
  assert.equal(result.binding.materializedAt, '2026-05-22T12:00:00.000Z')
  assert.equal(
    fs.readFileSync(path.join(tempDir, 'data', 'terrain', 'Changsha_DEM_30m.tif'), 'utf8'),
    'dem-bytes'
  )
})

test('does not materialize Project Data without a downloadable source', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opengms-materialize-missing-'))
  const binding = {
    id: 'binding-mock',
    dataId: 'mock',
    name: 'Mock.tif',
    mountPath: 'data/mock/Mock.tif',
    downloadable: false,
    url: ''
  }

  const result = await materializeProjectDataBinding(tempDir, binding)

  assert.equal(result.ok, false)
  assert.equal(result.code, 'download_unavailable')
  assert.equal(result.binding.materialized, false)
  assert.equal(result.binding.error, 'This data asset does not have a downloadable source')
})
