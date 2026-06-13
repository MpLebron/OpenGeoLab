import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const require = createRequire(import.meta.url)

const {
  buildWorkbenchCaseProjectMeta,
  getLocalCaseSeedSpecs,
  NANJING_ROOFTOP_CASE_SLUG
} = require('../utils/localCaseSeeds.js')

test('Nanjing rooftop PV case seed defines a runnable workbench case project', () => {
  const seed = getLocalCaseSeedSpecs().find(item => item.slug === NANJING_ROOFTOP_CASE_SLUG)
  assert.ok(seed)

  const meta = buildWorkbenchCaseProjectMeta(seed, {
    owner: 'MpLebron',
    syncedAt: new Date('2026-05-23T00:00:00.000Z')
  })

  assert.equal(meta.name, 'nanjing-rooftop-pv')
  assert.equal(meta.createdBy, 'MpLebron')
  assert.equal(meta.isPublic, true)
  assert.equal(meta.isCase, true)
  assert.equal(meta.runtimeImageId, 'opengms-geoviz')
  assert.equal(meta.case.title, 'Nanjing Rooftop Photovoltaic Potential Assessment')
  assert.equal(meta.case.coreNotebook, 'main.ipynb')
  assert.deepEqual(meta.dataBindings, [])
  assert.ok(meta.case.tags.includes('PyGeoModel'))
  assert.ok(meta.case.results.some(item => item.includes('heatmap')))
})

test('Nanjing rooftop PV notebook follows the original research workflow without productized scaffolding', () => {
  const seed = getLocalCaseSeedSpecs().find(item => item.slug === NANJING_ROOFTOP_CASE_SLUG)
  const notebookPath = path.join(seed.projectDir, 'main.ipynb')
  const inputShpPath = path.join(seed.projectDir, 'data', 'xuanwu', 'xuanwu.shp')
  const inputZipPath = path.join(seed.projectDir, 'data', 'xuanwu_rooftop.zip')
  const resultShpPath = path.join(seed.projectDir, 'data', 'result', 'roof_results_with_power_generation.shp')
  const resultZipPath = path.join(seed.projectDir, 'data', 'SolarCalculation-roofSloar.zip')
  const outputsDir = path.join(seed.projectDir, 'outputs')

  assert.equal(fs.existsSync(notebookPath), true)
  assert.equal(fs.existsSync(inputShpPath), true)
  assert.equal(fs.existsSync(inputZipPath), true)
  assert.equal(fs.existsSync(resultShpPath), true)
  assert.equal(fs.existsSync(resultZipPath), true)
  assert.equal(fs.existsSync(outputsDir), false)

  const notebook = JSON.parse(fs.readFileSync(notebookPath, 'utf8'))
  const sourceText = notebook.cells
    .map(cell => Array.isArray(cell.source) ? cell.source.join('') : String(cell.source || ''))
    .join('\n')

  assert.equal(notebook.nbformat, 4)
  assert.match(sourceText, /from pygeomodel import GeoModeler/)
  assert.match(sourceText, /modeler\.suggest_model\(\)/)
  assert.match(sourceText, /modeler\.invoke\(/)
  assert.match(sourceText, /result\.save\(output_dir=["']\.\/data\/["']\)/)
  assert.match(sourceText, /data\/xuanwu\/xuanwu\.shp/)
  assert.match(sourceText, /data\/xuanwu_rooftop\.zip/)
  assert.match(sourceText, /data\/result\/roof_results_with_power_generation\.shp/)
  assert.doesNotMatch(sourceText, /RUN_LIVE_MODEL/)
  assert.doesNotMatch(sourceText, /safe_extract/)
  assert.doesNotMatch(sourceText, /first_shapefile/)
  assert.doesNotMatch(sourceText, /outputs\/summary\.json/)
  assert.doesNotMatch(sourceText, /report\.md/)
  assert.doesNotMatch(sourceText, /OGMSAccess/)
  assert.doesNotMatch(sourceText, /token=/)
  assert.doesNotMatch(sourceText, /%pip install/)
  assert.doesNotMatch(sourceText, /mapbox/i)
})
