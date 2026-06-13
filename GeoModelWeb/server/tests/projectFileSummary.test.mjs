import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { summarizeProjectFiles } = require('../utils/projectFileSummary')

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
  return Buffer.byteLength(content)
}

test('summarizes project files recursively without counting hidden metadata', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opengeolab-project-summary-'))
  const expectedSize =
    writeFile(path.join(projectDir, '.project.json'), '{"hidden":true}') * 0 +
    writeFile(path.join(projectDir, 'main.ipynb'), '{}') +
    writeFile(path.join(projectDir, 'README.md'), '# Demo\n') +
    writeFile(path.join(projectDir, 'data', 'input.geojson'), '{"type":"FeatureCollection"}') +
    writeFile(path.join(projectDir, 'data', 'nested', 'params.json'), '{"k":1}') +
    writeFile(path.join(projectDir, '.hidden', 'ignored.txt'), 'hidden') * 0

  const summary = summarizeProjectFiles(projectDir)

  assert.equal(summary.notebookCount, 1)
  assert.equal(summary.fileCount, 4)
  assert.equal(summary.sizeBytes, expectedSize)
  assert.ok(summary.modifiedAt instanceof Date)
  assert.ok(summary.createdAt instanceof Date)

  fs.rmSync(projectDir, { recursive: true, force: true })
})
