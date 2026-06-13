import test from 'node:test'
import assert from 'node:assert/strict'

import {
  formatWorkspaceProjectSize,
  getWorkspaceProjectArtifacts,
  getWorkspaceProjectFileLabel,
  getWorkspaceProjectMark,
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
