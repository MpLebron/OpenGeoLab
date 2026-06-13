import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const roofProjectDir = path.join(__dirname, '..', 'jupyter-data', 'Zhoums396', 'Roof')
const roofNotebookPath = path.join(roofProjectDir, 'main.ipynb')

function notebookSourceText(notebookPath) {
  const notebook = JSON.parse(fs.readFileSync(notebookPath, 'utf8'))
  return notebook.cells
    .map(cell => Array.isArray(cell.source) ? cell.source.join('') : String(cell.source || ''))
    .join('\n')
}

test('Roof workbench notebook invokes the Roof PV model for full-year 2018 with normalized data paths', (t) => {
  if (!fs.existsSync(roofNotebookPath)) {
    t.skip('local Roof workbench notebook is not present')
    return
  }

  const sourceText = notebookSourceText(roofNotebookPath)

  assert.match(sourceText, /INPUT_ZIP\s*=\s*DATA_DIR\s*\/\s*"xuanwu_rooftop\.zip"/)
  assert.match(sourceText, /INPUT_ROOF_SHP\s*=\s*DATA_DIR\s*\/\s*"xuanwu"\s*\/\s*"xuanwu\.shp"/)
  assert.match(sourceText, /REFERENCE_RESULT_SHP\s*=\s*DATA_DIR\s*\/\s*"result"\s*\/\s*"roof_results_with_power_generation\.shp"/)
  assert.match(sourceText, /"start_time":\s*"2018-01"/)
  assert.match(sourceText, /"end_time":\s*"2018-12"/)
  assert.match(sourceText, /"roof_vector_path":\s*str\(INPUT_ZIP\)/)
  assert.doesNotMatch(sourceText, /INPUT_ZIP\s*=\s*PROJECT_DIR\s*\/\s*"xuanwu\.zip"/)
  assert.doesNotMatch(sourceText, /REFERENCE_RESULT_SHP\s*=\s*PROJECT_DIR\s*\/\s*"Archive"/)
})
