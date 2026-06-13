import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const require = createRequire(import.meta.url)

const {
  buildWorkbenchCaseProjectMeta,
  getLocalCaseSeedSpecs,
  URBAN_M2M_CASE_SLUG
} = require('../utils/localCaseSeeds.js')

test('UrbanM2M case seed defines a runnable workbench case project', () => {
  assert.equal(URBAN_M2M_CASE_SLUG, 'urban-m2m-suzhou-expansion')

  const seed = getLocalCaseSeedSpecs().find(item => item.slug === URBAN_M2M_CASE_SLUG)
  assert.ok(seed)

  const meta = buildWorkbenchCaseProjectMeta(seed, {
    owner: 'MpLebron',
    syncedAt: new Date('2026-06-03T00:00:00.000Z')
  })

  assert.equal(meta.name, URBAN_M2M_CASE_SLUG)
  assert.equal(meta.createdBy, 'MpLebron')
  assert.equal(meta.isPublic, true)
  assert.equal(meta.isCase, true)
  assert.equal(meta.runtimeImageId, 'opengms-geoviz')
  assert.equal(meta.case.title, 'Suzhou Urban Expansion Simulation with UrbanM2M')
  assert.equal(meta.case.coreNotebook, 'main.ipynb')
  assert.deepEqual(meta.dataBindings, [])
  assert.ok(meta.case.tags.includes('UrbanM2M'))
  assert.ok(meta.case.results.some(item => item.includes('Precision')))
})

test('UrbanM2M notebook uses real local data paths and avoids legacy tokens or mocks', () => {
  const seed = getLocalCaseSeedSpecs().find(item => item.slug === URBAN_M2M_CASE_SLUG)
  assert.ok(seed)

  const notebookPath = path.join(seed.projectDir, 'main.ipynb')
  const readmePath = path.join(seed.projectDir, 'README.md')
  const rangePath = path.join(seed.projectDir, 'data', 'Suzhou-Masked', 'range.tif')
  const land2010Path = path.join(seed.projectDir, 'data', 'Suzhou-Masked', 'year', 'land_2010.tif')
  const land2013Path = path.join(seed.projectDir, 'data', 'Suzhou-Masked', 'year', 'land_2013.tif')
  const simPath = path.join(seed.projectDir, 'data', 'Result', 'sim_2013.tif')
  const probPath = path.join(seed.projectDir, 'data', 'Result', 'prob_2013.tif')
  const inputZipPath = path.join(seed.projectDir, 'data', 'Suzhou.zip')

  for (const expectedPath of [
    notebookPath,
    readmePath,
    rangePath,
    land2010Path,
    land2013Path,
    simPath,
    probPath,
    inputZipPath
  ]) {
    assert.equal(fs.existsSync(expectedPath), true, `Missing expected case file: ${expectedPath}`)
  }

  const notebook = JSON.parse(fs.readFileSync(notebookPath, 'utf8'))
  const sourceText = notebook.cells
    .map(cell => Array.isArray(cell.source) ? cell.source.join('') : String(cell.source || ''))
    .join('\n')

  assert.equal(notebook.nbformat, 4)
  assert.match(sourceText, /from pygeomodel import GeoModeler/)
  assert.match(sourceText, /UrbanM2M城市扩张模拟模型/)
  assert.match(sourceText, /d65631a5-9e1a-4450-9487-640c5a6494c2/)
  assert.match(sourceText, /data\/Suzhou-Masked\/year\/land_2010\.tif/)
  assert.match(sourceText, /data\/Suzhou-Masked\/year\/land_2013\.tif/)
  assert.match(sourceText, /data\/Result\/sim_2013\.tif/)
  assert.match(sourceText, /data\/Result\/prob_2013\.tif/)
  assert.match(sourceText, /data\/Suzhou\.zip/)
  assert.doesNotMatch(sourceText, /OGMSAccess/)
  assert.doesNotMatch(sourceText, /token=/i)
  assert.doesNotMatch(sourceText, /mapbox/i)
  assert.doesNotMatch(sourceText, /def\s+run_datamethod/)
  assert.doesNotMatch(sourceText, /def\s+OGMSAccess/)
})
