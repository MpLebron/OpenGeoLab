import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const sourceRoot = path.resolve(import.meta.dirname, '..', 'src', 'services')

test('main API service uses same-origin API when Jupyter runs behind /jupyter gateway', () => {
  const source = fs.readFileSync(path.join(sourceRoot, 'api.ts'), 'utf8')

  assert.match(source, /window\.GEOMODEL_API_URL/)
  assert.match(source, /window\.location\.origin/)
  assert.match(source, /\/jupyter\//)
  assert.match(source, /\/api/)
  assert.match(source, /\/jupyter\/workspaces\//)
  assert.match(source, /extractWorkspaceIdFromPath/)
  assert.doesNotMatch(source, /http:\/\/\$\{hostname\}:3000\/api/)
})

test('agent API service uses the same gateway-aware API base helper', () => {
  const source = fs.readFileSync(path.join(sourceRoot, 'agentApi.ts'), 'utf8')

  assert.match(source, /window\.location\.origin/)
  assert.match(source, /\/jupyter\//)
  assert.match(source, /\/api\/agent/)
  assert.match(source, /\/api\/jupyter\/workspaces\//)
  assert.match(source, /extractWorkspaceIdFromPath/)
  assert.doesNotMatch(source, /http:\/\/\$\{hostname\}:3000/)
})
