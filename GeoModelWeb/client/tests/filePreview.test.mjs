import test from 'node:test'
import assert from 'node:assert/strict'

import {
  fileLanguage,
  normalizeFile,
  pickPreferredPreviewFile,
  splitLines
} from '../src/utils/filePreview.js'

test('classifies notebooks, code, and unsupported scientific artifacts', () => {
  assert.deepEqual(
    pick(normalizeFile({ name: 'main.ipynb', type: 'notebook', size: 2400 })),
    {
      extension: '.ipynb',
      previewKind: 'notebook',
      previewSupported: true,
      previewReason: ''
    }
  )

  assert.deepEqual(
    pick(normalizeFile({ name: 'dependency.py', type: 'file', size: 5600 })),
    {
      extension: '.py',
      previewKind: 'code',
      previewSupported: true,
      previewReason: ''
    }
  )

  assert.equal(fileLanguage(normalizeFile({ name: 'dependency.py' })), 'python')

  assert.deepEqual(
    pick(normalizeFile({ name: 'output_output.tif', type: 'file' })),
    {
      extension: '.tif',
      previewKind: 'unsupported',
      previewSupported: false,
      previewReason: '该类文件暂不支持在线预览'
    }
  )

  assert.deepEqual(
    pick(normalizeFile({ name: 'test', type: 'file' })),
    {
      extension: '',
      previewKind: 'unsupported',
      previewSupported: false,
      previewReason: '缺少可识别的文件后缀，暂不支持在线预览'
    }
  )
})

test('splits file content without losing empty trailing lines', () => {
  assert.deepEqual(splitLines('a\r\nb\n'), ['a', 'b', ''])
})

test('picks the public case preview file by entry notebook priority', () => {
  const files = [
    normalizeFile({ name: 'dependency.py', path: 'dependency.py', type: 'file' }),
    normalizeFile({ name: 'main.ipynb', path: 'main.ipynb', type: 'file' }),
    normalizeFile({ name: 'case.ipynb', path: 'notebooks/case.ipynb', type: 'file' }),
    normalizeFile({ name: 'output.tif', path: 'output.tif', type: 'file' })
  ]

  assert.equal(pickPreferredPreviewFile(files, 'notebooks/case.ipynb')?.path, 'notebooks/case.ipynb')
  assert.equal(pickPreferredPreviewFile(files, 'missing.ipynb')?.path, 'main.ipynb')
  assert.equal(pickPreferredPreviewFile(files.filter(file => file.path !== 'main.ipynb'), '')?.path, 'notebooks/case.ipynb')
  assert.equal(pickPreferredPreviewFile(files.filter(file => file.previewKind !== 'notebook'), '')?.path, 'dependency.py')
  assert.equal(pickPreferredPreviewFile(files.filter(file => file.previewSupported === false), '')?.path, 'output.tif')
})

function pick(file) {
  return {
    extension: file.extension,
    previewKind: file.previewKind,
    previewSupported: file.previewSupported,
    previewReason: file.previewReason
  }
}
