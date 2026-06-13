import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  buildWorkspaceProjectRoutePath,
  formatWorkspaceProjectSize,
  getWorkspaceProjectArtifacts,
  getWorkspaceProjectFileLabel,
  getWorkspaceProjectMark,
  getWorkspaceProjectRouteId,
  getWorkspaceProjectRuntimeImage,
  getWorkspaceProjectRuntimeLabel,
  getWorkspaceProjectSearchText,
  getWorkspaceProjectSizeLabel,
  getWorkspaceProjectSummary,
  getWorkspaceProjectTitle,
  getWorkspaceProjectVisibility
} from '../src/utils/workspaceProjectDisplay.js'

test('normalizes private workspace project display fields', () => {
  const project = {
    projectId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test3',
    description: '',
    notebookCount: 1,
    fileCount: 6,
    sizeBytes: 12288,
    runtime: {
      imageName: 'opengms/geomodel-core:2026.05'
    },
    isPublic: false,
    isCase: false
  }

  assert.equal(getWorkspaceProjectTitle(project), 'Test3')
  assert.equal(getWorkspaceProjectSummary(project), 'Project workspace with 6 files and 12.0 KB.')
  assert.deepEqual(getWorkspaceProjectVisibility(project), {
    label: 'Private',
    className: 'private',
    kicker: 'Private'
  })
  assert.equal(getWorkspaceProjectArtifacts(project), '6 files • 12.0 KB • Based on opengms/geomodel-core:2026.05')
  assert.equal(getWorkspaceProjectFileLabel(project), '6 files')
  assert.equal(getWorkspaceProjectSizeLabel(project), '12.0 KB')
  assert.equal(getWorkspaceProjectRuntimeImage(project), 'opengms/geomodel-core:2026.05')
  assert.equal(getWorkspaceProjectRuntimeLabel(project), 'geomodel-core:2026.05')
  assert.equal(getWorkspaceProjectMark(project).label, 'WS')
  assert.equal(getWorkspaceProjectRouteId(project), '550e8400-e29b-41d4-a716-446655440000')
  assert.equal(buildWorkspaceProjectRoutePath(project), '/jupyter/project/550e8400-e29b-41d4-a716-446655440000')
})

test('normalizes public case library records without inventing a different entity type', () => {
  const item = {
    owner: 'Zhoums396',
    projectName: 'Roof',
    notebookCount: 2,
    fileCount: 14,
    sizeBytes: 7340032,
    runtime: {
      imageName: 'opengms/geoviz-notebook:2026.05'
    },
    isPublic: true,
    isCase: true,
    case: {
      title: 'Roof extraction workflow',
      summary: 'Reusable notebook project for roof feature extraction.',
      scenario: 'Urban analytics',
      tags: ['Remote Sensing', 'Notebook']
    }
  }

  assert.equal(getWorkspaceProjectTitle(item), 'Roof extraction workflow')
  assert.equal(getWorkspaceProjectSummary(item), 'Reusable notebook project for roof feature extraction.')
  assert.deepEqual(getWorkspaceProjectVisibility(item), {
    label: 'Public',
    className: 'public',
    kicker: 'Public'
  })
  assert.equal(getWorkspaceProjectArtifacts(item), '14 files • 7.0 MB • Based on opengms/geoviz-notebook:2026.05')
  assert.equal(getWorkspaceProjectFileLabel(item), '14 files')
  assert.equal(getWorkspaceProjectSizeLabel(item), '7.0 MB')
  assert.equal(getWorkspaceProjectRuntimeImage(item), 'opengms/geoviz-notebook:2026.05')
  assert.equal(getWorkspaceProjectRuntimeLabel(item), 'geoviz-notebook:2026.05')
  assert.equal(getWorkspaceProjectMark(item).label, 'CASE')
  assert.match(getWorkspaceProjectSearchText(item), /roof extraction workflow/i)
  assert.match(getWorkspaceProjectSearchText(item), /zhoums396/i)
  assert.match(getWorkspaceProjectSearchText(item), /remote sensing/i)
})

test('formats project size in compact binary units', () => {
  assert.equal(formatWorkspaceProjectSize(0), '0 B')
  assert.equal(formatWorkspaceProjectSize(512), '512 B')
  assert.equal(formatWorkspaceProjectSize(1536), '1.5 KB')
})

test('project detail page canonicalizes legacy name URLs to project id URLs', () => {
  const source = fs.readFileSync(
    path.resolve(import.meta.dirname, '../src/views/JupyterProject.vue'),
    'utf8'
  )

  assert.match(source, /buildWorkspaceProjectRoutePath/)
  assert.match(source, /router\.replace\(canonicalProjectRoute\)/)
  assert.match(source, /projectRouteId\.value !== res\.data\.project\?\.projectId/)
})

test('notebook previews allow interactive output scripts in sandboxed iframes', () => {
  const previewFiles = [
    '../src/views/JupyterProject.vue',
    '../src/views/CaseDetail.vue',
    '../src/views/SharedProjectPreview.vue'
  ]

  for (const file of previewFiles) {
    const source = fs.readFileSync(path.resolve(import.meta.dirname, file), 'utf8')
    assert.doesNotMatch(source, /sandbox=""/)
    assert.match(source, /sandbox="allow-scripts allow-same-origin"/)
  }

  const caseDetailSource = fs.readFileSync(
    path.resolve(import.meta.dirname, '../src/views/CaseDetail.vue'),
    'utf8'
  )
  assert.doesNotMatch(caseDetailSource, /replace\(\s*\/<script/)
})
