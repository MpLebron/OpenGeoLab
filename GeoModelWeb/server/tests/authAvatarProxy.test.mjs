import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
const authRoutes = require('../routes/auth.js')

test('OpenGMS HTTP avatars are exposed through the same-origin avatar proxy', () => {
  const avatarUrl = 'http://94.191.49.160:8080/userServer/avatar/example.png'
  const options = {
    avatarBaseUrl: '',
    userServerUrl: 'http://94.191.49.160:8080/userServer'
  }

  assert.equal(authRoutes._private.canProxyAvatarUrl(avatarUrl, options), true)
  assert.equal(
    authRoutes._private.buildClientAvatarUrl({
      id: '550e8400e29b41d4a716446655440000',
      avatarUrl
    }, options),
    '/api/auth/avatar/550e8400e29b41d4a716446655440000'
  )
})

test('HTTPS and non-OpenGMS avatar URLs are not proxied', () => {
  const options = {
    avatarBaseUrl: '',
    userServerUrl: 'http://94.191.49.160:8080/userServer'
  }

  assert.equal(
    authRoutes._private.buildClientAvatarUrl({
      id: 'user-id',
      avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4'
    }, options),
    'https://avatars.githubusercontent.com/u/1?v=4'
  )

  assert.equal(
    authRoutes._private.canProxyAvatarUrl('http://example.com/avatar.png', options),
    false
  )
})
