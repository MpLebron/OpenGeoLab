import test from 'node:test'
import assert from 'node:assert/strict'

import { buildCaseListParams } from '../src/utils/caseListFetch.js'

test('case list requests include a cache buster while preserving pagination', () => {
  const params = buildCaseListParams({
    page: 2,
    limit: 60,
    now: () => 1770100200000
  })

  assert.deepEqual(params, {
    page: 2,
    limit: 60,
    _: 1770100200000
  })
})
