import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canSelectJupyterImage,
  getJupyterImageUnavailableLabel,
  normalizeJupyterImageCatalog
} from '../src/utils/jupyterImageStatus.js'

test('shows Docker daemon problems separately from missing images', () => {
  const catalog = normalizeJupyterImageCatalog({
    dockerAvailable: false,
    dockerMessage: 'Docker Desktop is not running.',
    images: [
      { id: 'geomodel-jupyter', available: false },
      { id: 'geomodel-jupyter-py39', available: false }
    ]
  })

  assert.equal(catalog.dockerAvailable, false)
  assert.equal(canSelectJupyterImage(catalog.images[0], catalog), false)
  assert.equal(getJupyterImageUnavailableLabel(catalog.images[0], catalog), 'Docker 未启动')
})

test('keeps missing image labeling when Docker is available', () => {
  const catalog = normalizeJupyterImageCatalog({
    dockerAvailable: true,
    images: [
      { id: 'geomodel-jupyter', available: false },
      { id: 'geomodel-jupyter-py39', available: true }
    ]
  })

  assert.equal(getJupyterImageUnavailableLabel(catalog.images[0], catalog), '未安装')
  assert.equal(getJupyterImageUnavailableLabel(catalog.images[1], catalog), '')
  assert.equal(canSelectJupyterImage(catalog.images[1], catalog), true)
})
