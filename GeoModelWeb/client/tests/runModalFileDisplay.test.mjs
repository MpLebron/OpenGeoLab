import test from 'node:test'
import assert from 'node:assert/strict'

import {
  formatUploadFileSize,
  getRunFileBadge,
  getRunFileKindLabel
} from '../src/utils/runModalFileDisplay.js'

test('reads expected file kind from ExistingFile parameters', () => {
  assert.equal(getRunFileKindLabel({
    parameter_type: { ExistingFile: 'Raster' }
  }), 'Raster')
  assert.equal(getRunFileKindLabel({}), 'File')
})

test('builds compact upload badges from file names or expected kind', () => {
  assert.equal(getRunFileBadge('dem_input.tif', 'Raster'), 'TIF')
  assert.equal(getRunFileBadge('archive.tar.gz', 'File'), 'GZ')
  assert.equal(getRunFileBadge('', 'Raster'), 'RAST')
})

test('formats upload file sizes for selected files', () => {
  assert.equal(formatUploadFileSize(0), '0 B')
  assert.equal(formatUploadFileSize(1536), '1.5 KB')
  assert.equal(formatUploadFileSize(2 * 1024 * 1024), '2.0 MB')
})
