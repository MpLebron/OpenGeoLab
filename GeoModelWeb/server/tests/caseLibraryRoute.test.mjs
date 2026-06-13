import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const routePath = path.resolve(import.meta.dirname, '../routes/jupyter.js')

test('case library route lists all public runnable projects, not only published case records', () => {
  const source = fs.readFileSync(routePath, 'utf8')
  const routeMatch = source.match(/router\.get\('\/cases'[\s\S]*?\n}\);/)

  assert.ok(routeMatch, 'GET /cases route should exist')
  assert.match(routeMatch[0], /listPublicProjectSummaries\(\)/)
  assert.doesNotMatch(routeMatch[0], /caseOnly:\s*true/)
})
