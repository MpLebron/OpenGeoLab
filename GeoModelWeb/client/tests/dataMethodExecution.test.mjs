import test from 'node:test'
import assert from 'node:assert/strict'

import { buildDataMethodRunRequest } from '../src/utils/dataMethodExecution.js'

test('builds a data method run request for the selected method and parsed inputs', () => {
  const method = {
    id: 42,
    name: 'AdaptiveFilter'
  }
  const inputs = {
    val0: 'input-file-id',
    val1: 7
  }

  assert.deepEqual(buildDataMethodRunRequest(method, inputs), {
    modelId: 42,
    inputs
  })
})

test('uses stable id fallbacks and never creates a repository navigation target', () => {
  const request = buildDataMethodRunRequest({
    methodId: 'whitebox-add',
    name: 'Add'
  }, {
    val0: 'raster-a',
    val1: 'raster-b'
  })

  assert.deepEqual(request, {
    modelId: 'whitebox-add',
    inputs: {
      val0: 'raster-a',
      val1: 'raster-b'
    }
  })
  assert.equal(Object.hasOwn(request, 'href'), false)
  assert.equal(Object.hasOwn(request, 'url'), false)
})
