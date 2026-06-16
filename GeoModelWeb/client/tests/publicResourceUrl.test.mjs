import assert from 'node:assert/strict'
import test from 'node:test'

import { resolvePublicResourceUrl } from '../src/utils/apiClient.js'

test('prefixes API-backed media URLs for path-prefix production deployments', () => {
  assert.equal(
    resolvePublicResourceUrl('/api/application-covers/cover.png', {
      apiBaseUrl: '/OpenGeoLab',
      appBaseUrl: '/OpenGeoLab/'
    }),
    '/OpenGeoLab/api/application-covers/cover.png'
  )

  assert.equal(
    resolvePublicResourceUrl('/api/case-assets/example/cover.png', {
      apiBaseUrl: 'http://localhost:3000',
      appBaseUrl: '/'
    }),
    'http://localhost:3000/api/case-assets/example/cover.png'
  )
})

test('preserves external, protocol-relative, blob, and data media URLs', () => {
  assert.equal(resolvePublicResourceUrl('https://example.com/a.png'), 'https://example.com/a.png')
  assert.equal(resolvePublicResourceUrl('//cdn.example.com/a.png'), '//cdn.example.com/a.png')
  assert.equal(resolvePublicResourceUrl('blob:https://example.com/id'), 'blob:https://example.com/id')
  assert.equal(resolvePublicResourceUrl('data:image/png;base64,abc'), 'data:image/png;base64,abc')
})
