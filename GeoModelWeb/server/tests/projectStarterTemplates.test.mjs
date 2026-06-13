import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)

const {
  initializeProjectStarter,
  normalizeStarterTemplate
} = require('../utils/projectStarterTemplates.js')

function makeTempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'opengms-starter-'))
}

function readNotebook(projectDir) {
  return JSON.parse(fs.readFileSync(path.join(projectDir, 'main.ipynb'), 'utf8'))
}

test('blank starter only records template metadata', () => {
  const projectDir = makeTempProject()
  const result = initializeProjectStarter(projectDir, 'blank', { projectName: 'BlankCase' })

  assert.equal(result.starterTemplate, 'blank')
  assert.deepEqual(result.createdFiles, [])
  assert.equal(fs.existsSync(path.join(projectDir, 'main.ipynb')), false)
})

test('python starter creates a minimal notebook entrypoint', () => {
  const projectDir = makeTempProject()
  const result = initializeProjectStarter(projectDir, 'python-notebook', { projectName: 'PythonCase' })
  const notebook = readNotebook(projectDir)

  assert.equal(result.starterTemplate, 'python-notebook')
  assert.deepEqual(result.createdFiles, ['main.ipynb'])
  assert.equal(notebook.nbformat, 4)
  assert.equal(notebook.metadata.kernelspec.name, 'python3')
  assert.match(JSON.stringify(notebook.cells), /PythonCase/)
  assert.match(JSON.stringify(notebook.cells), /import pandas as pd/)
})

test('geospatial starter creates a geospatial notebook outline', () => {
  const projectDir = makeTempProject()
  const result = initializeProjectStarter(projectDir, 'geospatial-notebook', { projectName: 'GeoCase' })
  const notebook = readNotebook(projectDir)
  const serializedCells = JSON.stringify(notebook.cells)

  assert.equal(result.starterTemplate, 'geospatial-notebook')
  assert.deepEqual(result.createdFiles, ['main.ipynb'])
  assert.match(serializedCells, /geopandas/)
  assert.match(serializedCells, /rasterio/)
  assert.match(serializedCells, /xarray/)
})

test('starter templates do not create notebook helper files', () => {
  for (const starterTemplate of ['blank', 'python-notebook', 'geospatial-notebook']) {
    const projectDir = makeTempProject()
    initializeProjectStarter(projectDir, starterTemplate, { projectName: 'NoHelperCase' })

    assert.equal(fs.existsSync(path.join(projectDir, 'dependency.py')), false)
  }
})

test('unknown starter templates fall back to blank', () => {
  assert.equal(normalizeStarterTemplate('not-real'), 'blank')
})
