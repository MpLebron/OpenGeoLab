import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const routePath = path.resolve(import.meta.dirname, '../routes/jupyter.js')

test('my space project list exposes output thumbnails through private download routes', () => {
  const source = fs.readFileSync(routePath, 'utf8')
  const projectsRouteMatch = source.match(/router\.get\('\/projects'[\s\S]*?\n}\);/)

  assert.ok(projectsRouteMatch, 'GET /projects route should exist')
  assert.match(projectsRouteMatch[0], /buildPrivateProjectThumbnail\(item\.name,\s*projectPath\)/)
  assert.match(projectsRouteMatch[0], /thumbnail,/)
  assert.match(source, /\/projects\/\$\{encodedProjectName\}\/files\/\$\{encodedPath\}\/download/)
  assert.match(source, /router\.get\('\/projects\/:projectName\/files\/\*filePath\/download'/)
})
