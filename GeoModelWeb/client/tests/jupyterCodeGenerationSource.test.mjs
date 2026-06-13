import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const codeGeneratorPath = fileURLToPath(new URL('../../../jupyterlab-geomodel/src/utils/codeGenerator.ts', import.meta.url))
const panelPath = fileURLToPath(new URL('../../../jupyterlab-geomodel/src/components/GeoModelPanel.tsx', import.meta.url))

function source(path) {
  return readFileSync(path, 'utf8')
}

test('Jupyter model code generation uses PyGeoModel Core API without exposing low-level OpenGMS token wiring', () => {
  const content = source(codeGeneratorPath)

  assert.match(content, /from pygeomodel import GeoModeler/)
  assert.match(content, /modeler\.invoke/)
  assert.match(content, /result\.to_json/)
  assert.doesNotMatch(content, /OGMSAccess/)
  assert.doesNotMatch(content, /token\s*=/)
  assert.doesNotMatch(content, /OGMS_TOKEN/)
})

test('Jupyter data method code generation imports packaged helper and never creates dependency.py', () => {
  const generator = source(codeGeneratorPath)
  const panel = source(panelPath)
  const combined = `${generator}\n${panel}`

  assert.match(generator, /from jupyterlab_geomodel\.datamethod import run_datamethod/)
  assert.match(generator, /run_datamethod\(/)
  assert.doesNotMatch(combined, /generateDependencyFile/)
  assert.doesNotMatch(combined, /dependency\.py/)
  assert.doesNotMatch(generator, /from dependency import run_datamethod/)
})
