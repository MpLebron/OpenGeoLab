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
  assert.match(summary.description, /CesiumJS/)
  assert.ok(summary.tags.includes('GeoAI'))
  assert.equal(summary.links.code, 'https://github.com/yosgi/GeoCopilot')
  assert.equal(summary.links.demo, 'https://www.npmjs.com/package/geocopilot')
  assert.equal(summary.coverImageUrl, '/api/application-covers/geocopilot-cover.svg')
  assert.equal(summary.visible, true)

  assert.equal(detail.source, 'local')
  assert.equal(detail.sourceId, 'geocopilot')
  assert.match(detail.content, /## 关键能力/)
  assert.match(detail.content, /npm install geocopilot/)
  assert.equal(detail.detailSyncStatus, 'seeded')
})

test('local application seeds are discoverable from the seed directory', () => {
  const seeds = loadSeedFiles(seedDir)
  assert.ok(seeds.some(seed => seed.data.sourceId === 'geocopilot'))
})
