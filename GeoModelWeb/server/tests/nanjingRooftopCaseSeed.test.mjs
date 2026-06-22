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
  assert.equal(meta.projectId, 'ea2b1a90-8421-5bdc-8a86-967e0b77883c')
  assert.equal(meta.createdBy, 'MpLebron')
  assert.equal(meta.isPublic, true)
  assert.equal(meta.isCase, true)
  assert.equal(meta.runtimeImageId, 'opengms-geoviz')
  assert.equal(meta.case.title, 'Nanjing Rooftop Photovoltaic Potential Assessment')
  assert.equal(meta.case.coreNotebook, 'main.ipynb')
  assert.deepEqual(meta.dataBindings, [])
  assert.ok(meta.case.tags.includes('PyGeoModel'))
  assert.ok(meta.case.steps.some(item => item.includes('fresh OpenGMS rooftop PV task')))
  assert.ok(meta.case.datasets.every(item => !item.includes('data/result/roof_results_with_power_generation.shp')))
  assert.ok(meta.case.results.some(item => item.includes('live model output')))
  assert.ok(meta.case.results.some(item => item.includes('heatmap')))
})

test('Nanjing rooftop PV notebook uses fresh PyGeoModel task outputs instead of bundled result files', () => {
  const seed = getLocalCaseSeedSpecs().find(item => item.slug === NANJING_ROOFTOP_CASE_SLUG)
  const notebookPath = path.join(seed.projectDir, 'main.ipynb')
  const inputShpPath = path.join(seed.projectDir, 'data', 'xuanwu', 'xuanwu.shp')
  const inputZipPath = path.join(seed.projectDir, 'data', 'xuanwu_rooftop.zip')
  const resultShpPath = path.join(seed.projectDir, 'data', 'result', 'roof_results_with_power_generation.shp')
  const resultZipPath = path.join(seed.projectDir, 'data', 'SolarCalculation-roofSloar.zip')
  const outputsDir = path.join(seed.projectDir, 'outputs')
  const processThumbnailPath = path.join(outputsDir, 'rooftop_pv_generation_map.png')

  assert.equal(fs.existsSync(notebookPath), true)
  assert.equal(fs.existsSync(inputShpPath), true)
  assert.equal(fs.existsSync(inputZipPath), true)
  assert.equal(fs.existsSync(resultShpPath), true)
  assert.equal(fs.existsSync(resultZipPath), true)
  assert.equal(fs.existsSync(outputsDir), true)
  assert.equal(fs.existsSync(processThumbnailPath), true)

  const notebook = JSON.parse(fs.readFileSync(notebookPath, 'utf8'))
  const sourceText = notebook.cells
    .map(cell => Array.isArray(cell.source) ? cell.source.join('') : String(cell.source || ''))
    .join('\n')

  assert.equal(notebook.nbformat, 4)
  assert.match(sourceText, /from pygeomodel import GeoModeler/)
  assert.match(sourceText, /modeler\.invoke\(/)
  assert.match(sourceText, /output_dir=DOWNLOAD_DIR/)
  assert.match(sourceText, /record_path=RUN_DIR\s*\/\s*["']task_result\.json["']/)
  assert.match(sourceText, /outputs\/live-rooftop-pv/)
  assert.match(sourceText, /def configure_opengms_http_timeout/)
  assert.match(sourceText, /OPENGMS_LIVE_TIMEOUT_SECONDS/)
  assert.match(sourceText, /downloaded_outputs/)
  assert.match(sourceText, /unpack_downloaded_outputs/)
  assert.match(sourceText, /find_live_output/)
  assert.match(sourceText, /live_result_shp\s*=\s*find_live_output/)
  assert.match(sourceText, /gpd\.read_file\(live_result_shp\)/)
  assert.match(sourceText, /ROOFTOP_INVENTORY\s*=\s*DATA_DIR\s*\/\s*["']xuanwu["']\s*\/\s*["']xuanwu\.shp["']/)
  assert.match(sourceText, /MODEL_INPUT_ZIP\s*=\s*DATA_DIR\s*\/\s*["']xuanwu_rooftop\.zip["']/)
  assert.doesNotMatch(sourceText, /result\.save\(output_dir=["']\.\/data\/["']\)/)
  assert.doesNotMatch(sourceText, /data\/result\/roof_results_with_power_generation\.shp/)
  assert.doesNotMatch(sourceText, /shp_file_path\s*=\s*["']data\/result/)
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

test('curated case seed manifests are discovered without hard-coding each case', () => {
  const seedRoot = path.resolve(import.meta.dirname, '..', 'case-seeds')
  const manifestDirs = fs.readdirSync(seedRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .filter(entry => fs.existsSync(path.join(seedRoot, entry.name, 'case.json')))
    .map(entry => entry.name)

  const specs = getLocalCaseSeedSpecs()
  for (const slug of manifestDirs) {
    const seed = specs.find(item => item.slug === slug)
    assert.ok(seed, `Missing curated case seed spec for ${slug}`)
    assert.equal(fs.existsSync(path.join(seed.projectDir, seed.coreNotebook)), true)
    assert.equal(path.basename(seed.coverPath), seed.coverFileName)
  }
})
