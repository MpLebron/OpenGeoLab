import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  buildApplicationSeedRecords,
  loadSeedFiles
} = require('./seedLocalApplicationSchemes.js')

const seedDir = path.resolve('GeoModelWeb/server/application-seeds')

test('GeoCopilot local application seed maps to scheme summary and detail records', () => {
  const seedPath = path.join(seedDir, 'geocopilot.json')
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
  const syncedAt = new Date('2026-06-25T00:00:00.000Z')

  const { summary, detail } = buildApplicationSeedRecords(seed, syncedAt)

  assert.equal(summary.source, 'local')
  assert.equal(summary.sourceId, 'geocopilot')
  assert.equal(summary.id, 'geocopilot')
  assert.match(summary.title, /GeoCopilot/)
  assert.match(summary.title, /OpenGMS-Jupyter-Agent/)
  assert.match(summary.description, /JupyterLab/)
  assert.ok(summary.tags.includes('OpenGMS'))
  assert.ok(summary.tags.includes('Jupyter'))
  assert.ok(summary.tags.includes('Agent'))
  assert.equal(summary.links.code, 'https://github.com/Zhoums396/OpenGMS-Jupyter-Agent')
  assert.equal(summary.links.demo, 'https://zhoums396.github.io/OpenGMS-Jupyter-Agent/')
  assert.equal(summary.links.video, 'https://zhoums396.github.io/OpenGMS-Jupyter-Agent/safari-demo-h264.mp4')
  assert.equal(summary.coverImageUrl, '/api/application-covers/geocopilot-cover.gif')
  assert.equal(summary.visible, true)
  assert.deepEqual(seed.extraAssets, ['assets/geocopilot-product.png'])

  assert.equal(detail.source, 'local')
  assert.equal(detail.sourceId, 'geocopilot')
  assert.match(detail.content, /\/api\/application-covers\/geocopilot-product\.png/)
  assert.match(detail.content, /notebook-aware geospatial AI workflow/)
  assert.match(detail.content, /jupyter labextension develop \. --overwrite/)
  assert.match(detail.content, /## 主要能力/)
  assert.equal(detail.detailSyncStatus, 'seeded')
})

test('local application seeds are discoverable from the seed directory', () => {
  const seeds = loadSeedFiles(seedDir)
  assert.ok(seeds.some(seed => seed.data.sourceId === 'geocopilot'))
})
