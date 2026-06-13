import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const routeSource = fs.readFileSync(path.join(__dirname, '..', 'routes', 'jupyter.js'), 'utf8')

test('notebook preview buffer supports full interactive map outputs', () => {
  assert.match(routeSource, /NOTEBOOK_PREVIEW_MAX_BUFFER/)
  assert.match(routeSource, /process\.env\.NOTEBOOK_PREVIEW_MAX_BUFFER/)
  assert.match(routeSource, /96 \* 1024 \* 1024/)
  assert.doesNotMatch(routeSource, /maxBuffer:\s*16 \* 1024 \* 1024/)
})
