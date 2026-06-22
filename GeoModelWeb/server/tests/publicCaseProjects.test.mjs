import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)

const {
  buildPublicCaseDetail,
  buildPublicCaseSummary,
  findPublicCaseByProjectId,
  listPublicCaseSummaries,
  resolvePublicCaseFile
} = require('../utils/publicCaseProjects.js')

function writeProject(root, owner, projectName, meta, files = {}) {
  const projectDir = path.join(root, owner, projectName)
  fs.mkdirSync(projectDir, { recursive: true })
  fs.writeFileSync(path.join(projectDir, '.project.json'), JSON.stringify(meta, null, 2))

  for (const [relativePath, content] of Object.entries(files)) {
    const target = path.join(projectDir, relativePath)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, content)
  }

  return projectDir
}

test('lists only public Jupyter case projects with stable project ids', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'opengeolab-public-cases-'))

  writeProject(root, 'alice', 'good-case', {
    projectId: 'case-project-1',
    name: 'good-case',
    isPublic: true,
    isCase: true,
    runtime: { imageName: 'opengms/geoviz-notebook:2026.05', label: 'Interactive GeoViz' },
    case: {
      title: 'Runnable Case',
      summary: 'A complete runnable case',
      coreNotebook: 'main.ipynb',
      tags: ['Urban', 'Model']
    }
  }, {
    'main.ipynb': JSON.stringify({ cells: [], nbformat: 4, nbformat_minor: 5 }),
    'data/input.csv': 'x,y\n1,2\n',
    'outputs/thumb.png': 'not really png'
  })

  writeProject(root, 'alice', 'not-a-case', {
    projectId: 'public-project-1',
    isPublic: true,
    isCase: false
  }, {
    'main.ipynb': '{}'
  })

  writeProject(root, 'alice', 'private-case', {
    projectId: 'private-case-1',
    isPublic: false,
    isCase: true
  }, {
    'main.ipynb': '{}'
  })

  writeProject(root, 'alice', 'missing-id-case', {
    isPublic: true,
    isCase: true
  }, {
    'main.ipynb': '{}'
  })

  const cases = await listPublicCaseSummaries({ userDataDir: root })

  assert.equal(cases.length, 1)
  assert.equal(cases[0].projectId, 'case-project-1')
  assert.equal(cases[0].owner, 'alice')
  assert.equal(cases[0].projectName, 'good-case')
  assert.equal(cases[0].title, 'Runnable Case')
  assert.equal(cases[0].isCase, true)
  assert.equal(cases[0].isPublic, true)
  assert.equal(cases[0].thumbnail.downloadPath, '/api/cases/case-project-1/files/outputs/thumb.png/preview')
})

test('finds public case detail by project id and rejects non-cases', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'opengeolab-public-case-detail-'))
  const projectDir = writeProject(root, 'bob', 'watershed', {
    projectId: 'watershed-case-id',
    name: 'watershed',
    isPublic: true,
    isCase: true,
    runtimeImageId: 'opengms-hydro-terrain',
    case: {
      title: 'Watershed Case',
      summary: 'Hydrology workflow',
      coreNotebook: 'main.ipynb',
      datasets: ['DEM raster']
    }
  }, {
    'README.md': '# Watershed\n',
    'main.ipynb': JSON.stringify({ cells: [], nbformat: 4, nbformat_minor: 5 }),
    'data/dem.tif': 'raster'
  })

  writeProject(root, 'bob', 'not-case', {
    projectId: 'not-case-id',
    isPublic: true,
    isCase: false
  }, {
    'main.ipynb': '{}'
  })

  const found = findPublicCaseByProjectId('watershed-case-id', { userDataDir: root })
  assert.equal(found.projectDir, projectDir)
  assert.equal(found.owner, 'bob')
  assert.equal(found.projectName, 'watershed')

  const detail = buildPublicCaseDetail(found)
  assert.equal(detail.projectId, 'watershed-case-id')
  assert.equal(detail.case.title, 'Watershed Case')
  assert.equal(detail.fileCount, 3)
  assert.equal(detail.files.some(file => file.path === 'data/dem.tif'), true)
  assert.equal(detail.fileTree.some(file => file.path === 'data'), true)

  assert.equal(findPublicCaseByProjectId('not-case-id', { userDataDir: root }), null)
})

test('resolves public preview files inside a case project only', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'opengeolab-public-case-file-'))
  writeProject(root, 'carol', 'preview-case', {
    projectId: 'preview-case-id',
    isPublic: true,
    isCase: true,
    case: { title: 'Preview Case' }
  }, {
    'README.md': '# Preview\n',
    'data/input.csv': 'a,b\n'
  })

  const summary = buildPublicCaseSummary({
    owner: 'carol',
    projectName: 'preview-case',
    projectDir: path.join(root, 'carol', 'preview-case'),
    meta: JSON.parse(fs.readFileSync(path.join(root, 'carol', 'preview-case', '.project.json'), 'utf8'))
  })
  assert.equal(summary.projectId, 'preview-case-id')

  const resolved = resolvePublicCaseFile('preview-case-id', 'README.md', { userDataDir: root })
  assert.equal(resolved.error, undefined)
  assert.equal(resolved.decodedPath, 'README.md')

  const traversal = resolvePublicCaseFile('preview-case-id', '../secret.txt', { userDataDir: root })
  assert.equal(traversal.status, 403)

  const missing = resolvePublicCaseFile('missing-id', 'README.md', { userDataDir: root })
  assert.equal(missing.status, 404)
})
