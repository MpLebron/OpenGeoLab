import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildJupyterFileUrl,
  hasUsableJupyterToken,
  shouldRefreshJupyterLaunchUrl
} from '../src/utils/jupyterLaunchUrl.js'

test('detects tokenized Jupyter launch URLs', () => {
  assert.equal(hasUsableJupyterToken('http://localhost:8888/lab?token=abc123', ''), true)
  assert.equal(hasUsableJupyterToken('http://localhost:8888/lab', 'abc123'), true)
})

test('requires a refreshed launch URL when status only has a stale bare URL', () => {
  assert.equal(shouldRefreshJupyterLaunchUrl('running', 'http://localhost:8888/lab', ''), true)
  assert.equal(shouldRefreshJupyterLaunchUrl('running', 'http://localhost:8888/lab', 'check-container-logs'), true)
  assert.equal(shouldRefreshJupyterLaunchUrl('stopped', 'http://localhost:8888/lab', ''), false)
})

test('builds notebook file URLs with encoded paths and token', () => {
  assert.equal(
    buildJupyterFileUrl('http://localhost:8888/lab?token=abc123', 'abc123', 'folder/main notebook.ipynb'),
    'http://localhost:8888/lab/tree/folder%2Fmain%20notebook.ipynb?token=abc123'
  )
})
