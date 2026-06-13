import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const {
  createCaseProjectMeta
} = require('../utils/caseProjectMeta.js')

test('case project meta preserves bundled case data bindings for forked projects', () => {
  const meta = createCaseProjectMeta('MpLebron', 'nanjing-rooftop-pv-demo', {
    slug: 'nanjing-rooftop-pv',
    title: 'Nanjing Rooftop Photovoltaic Potential Assessment',
    summary: 'Assess rooftop PV potential in Xuanwu District.',
    source: 'opengeolab-local-case',
    sourceId: 'nanjing-rooftop-pv',
    projectDataBindings: [
      {
        id: 'case-xuanwu-rooftop',
        dataId: 'case-xuanwu-rooftop',
        name: 'xuanwu_rooftop.zip',
        mountPath: 'data/input/xuanwu_rooftop.zip',
        localPath: 'data/input/xuanwu_rooftop.zip',
        source: 'case',
        bindingType: 'bundled-case-data',
        materialized: true
      }
    ]
  }, {
    now: () => '2026-05-23T00:00:00.000Z'
  })

  assert.equal(meta.name, 'nanjing-rooftop-pv-demo')
  assert.equal(meta.createdBy, 'MpLebron')
  assert.equal(meta.runtimeImageId, 'opengms-geoviz')
  assert.equal(meta.sourceCase.slug, 'nanjing-rooftop-pv')
  assert.equal(meta.dataBindings.length, 1)
  assert.equal(meta.dataBindings[0].source, 'case')
  assert.equal(meta.dataBindings[0].localPath, 'data/input/xuanwu_rooftop.zip')
})
