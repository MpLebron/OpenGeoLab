import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const routePath = path.resolve(import.meta.dirname, '../routes/jupyter.js')

test('case library route lists public runnable case projects from the shared case service', () => {
  const source = fs.readFileSync(routePath, 'utf8')
  const routeMatch = source.match(/router\.get\('\/cases'[\s\S]*?\n}\);/)

  assert.ok(routeMatch, 'GET /cases route should exist')
  assert.match(routeMatch[0], /await\s+listPublicCaseSummaries\(\)/)
  assert.doesNotMatch(routeMatch[0], /listPublicProjectSummaries/)
})

test('case library detail routes reject non-case public projects', () => {
  const source = fs.readFileSync(routePath, 'utf8')

  assert.match(source, /findPublicCaseByOwnerProject\(req\.params\.owner,\s*req\.params\.projectName\)/)
  assert.match(source, /Case project not found/)
})

test('project id case actions are authenticated Jupyter routes', () => {
  const source = fs.readFileSync(routePath, 'utf8')

  assert.match(source, /router\.post\('\/cases\/:projectId\/fork'/)
  assert.match(source, /router\.post\('\/cases\/:projectId\/run'/)
  assert.match(source, /findPublicCaseByProjectId\(req\.params\.projectId\)/)
  assert.match(source, /startJupyterProjectForUser\(req,\s*projectName\)/)
})
