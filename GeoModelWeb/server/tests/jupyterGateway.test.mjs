import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const require = createRequire(import.meta.url)

const {
  buildJupyterBasePath,
  buildJupyterLaunchUrl,
  buildJupyterServerId,
  buildLoopbackDockerPortBinding,
  createJupyterGatewayRegistry,
  extractWorkspaceIdFromGatewayPath,
  normalizePublicOrigin
} = require('../utils/jupyterGateway.js')

const {
  resolveJupyterProxyTarget
} = require('../middleware/jupyterProxy.js')

test('normalizes public origin for single-origin production deployment', () => {
  assert.equal(
    normalizePublicOrigin('https://opengeolab.geomodeling.njnu.edu.cn/'),
    'https://opengeolab.geomodeling.njnu.edu.cn'
  )

  assert.equal(
    normalizePublicOrigin('', { protocol: 'https', get: name => name === 'host' ? 'opengeolab.geomodeling.njnu.edu.cn' : '' }),
    'https://opengeolab.geomodeling.njnu.edu.cn'
  )
})

test('builds stable workspace ids from project UUIDs and Jupyter base paths without exposing names', () => {
  const workspaceId = buildJupyterServerId('MpLebron', 'Urban M2M 苏州', {
    projectId: '550e8400-e29b-41d4-a716-446655440000'
  })

  assert.equal(workspaceId, '550e8400-e29b-41d4-a716-446655440000')
  assert.equal(buildJupyterBasePath(workspaceId), '/jupyter/550e8400-e29b-41d4-a716-446655440000/')
  assert.equal(workspaceId.includes('mplebron'), false)
  assert.equal(workspaceId.includes('urban'), false)
})

test('builds public Jupyter launch URLs through the gateway path', () => {
  const url = buildJupyterLaunchUrl({
    publicOrigin: 'https://opengeolab.geomodeling.njnu.edu.cn/',
    workspaceId: '550e8400-e29b-41d4-a716-446655440000',
    token: 'abc123',
    geomodelToken: 'jwt456',
    containerName: 'jupyter-mplebron-urban-m2m',
    username: 'MpLebron',
    projectName: 'Urban M2M'
  })

  assert.equal(
    url,
    'https://opengeolab.geomodeling.njnu.edu.cn/jupyter/550e8400-e29b-41d4-a716-446655440000/lab?token=abc123&geomodel_token=jwt456'
  )
  assert.equal(url.includes(':8888'), false)
  assert.equal(url.includes(':3000'), false)
  assert.equal(url.includes('container='), false)
  assert.equal(url.includes('user='), false)
  assert.equal(url.includes('project='), false)
})

test('registry resolves gateway paths to loopback Jupyter targets', () => {
  const registry = createJupyterGatewayRegistry()

  registry.register({
    workspaceId: '550e8400-e29b-41d4-a716-446655440000',
    port: 8891,
    containerName: 'jupyter-mplebron-urban-m2m'
  })

  assert.deepEqual(
    extractWorkspaceIdFromGatewayPath('/jupyter/550e8400-e29b-41d4-a716-446655440000/api/kernels'),
    '550e8400-e29b-41d4-a716-446655440000'
  )

  const target = registry.resolveByPath('/jupyter/550e8400-e29b-41d4-a716-446655440000/api/kernels')

  assert.equal(target.ok, true)
  assert.equal(target.workspaceId, '550e8400-e29b-41d4-a716-446655440000')
  assert.equal(target.target, 'http://127.0.0.1:8891')
})

test('registry removes stopped workspaces and rejects unknown paths', () => {
  const registry = createJupyterGatewayRegistry()
  registry.register({ workspaceId: '550e8400-e29b-41d4-a716-446655440001', port: 8888 })

  assert.equal(registry.resolveByPath('/jupyter/550e8400-e29b-41d4-a716-446655440001/lab').ok, true)

  registry.unregister('550e8400-e29b-41d4-a716-446655440001')

  assert.equal(registry.resolveByPath('/jupyter/550e8400-e29b-41d4-a716-446655440001/lab').ok, false)
  assert.equal(registry.resolveByPath('/api/health').code, 'not_jupyter_gateway_path')
})

test('builds loopback-only Docker port bindings by default', () => {
  assert.equal(buildLoopbackDockerPortBinding(8892), '127.0.0.1:8892:8888')
  assert.equal(buildLoopbackDockerPortBinding(8892, '0.0.0.0'), '0.0.0.0:8892:8888')
})

test('proxy target resolver accepts only registered Jupyter gateway paths', () => {
  const registry = createJupyterGatewayRegistry()
  registry.register({ workspaceId: '550e8400-e29b-41d4-a716-446655440000', port: 8895 })

  assert.deepEqual(
    resolveJupyterProxyTarget('/jupyter/550e8400-e29b-41d4-a716-446655440000/api/kernels', registry),
    {
      ok: true,
      target: 'http://127.0.0.1:8895',
      workspaceId: '550e8400-e29b-41d4-a716-446655440000'
    }
  )

  assert.equal(
    resolveJupyterProxyTarget('/jupyter/missing/lab', registry).code,
    'jupyter_workspace_not_found'
  )
  assert.equal(
    resolveJupyterProxyTarget('/api/health', registry).code,
    'not_jupyter_gateway_path'
  )
})

test('Jupyter route launches through the gateway contract instead of direct public ports', () => {
  const routeSource = fs.readFileSync(
    path.resolve(import.meta.dirname, '../routes/jupyter.js'),
    'utf8'
  )

  assert.match(routeSource, /buildJupyterLaunchUrl/)
  assert.match(routeSource, /buildJupyterBasePath/)
  assert.match(routeSource, /buildLoopbackDockerPortBinding/)
  assert.match(routeSource, /defaultJupyterGatewayRegistry\.register/)
  assert.match(routeSource, /--ServerApp\.base_url=/)
  assert.doesNotMatch(routeSource, /http:\/\/\$\{JUPYTER_HOST\}:\$\{port\}\/lab/)
})

test('Jupyter route exposes workspace metadata so launch URLs do not carry duplicate context', () => {
  const routeSource = fs.readFileSync(
    path.resolve(import.meta.dirname, '../routes/jupyter.js'),
    'utf8'
  )
  const indexSource = fs.readFileSync(
    path.resolve(import.meta.dirname, '../index.js'),
    'utf8'
  )

  assert.match(routeSource, /router\.get\('\/workspaces\/:workspaceId'/)
  assert.match(routeSource, /defaultJupyterGatewayRegistry\.get\(workspaceId\)/)
  assert.match(routeSource, /ensureProjectWorkspaceId/)
  assert.match(routeSource, /crypto\.randomUUID/)
  assert.match(routeSource, /projectName/)
  assert.match(indexSource, /req\.path\.startsWith\('\/workspaces\/'\)/)
})

test('Jupyter project routes expose and resolve opaque project ids for local project pages', () => {
  const routeSource = fs.readFileSync(
    path.resolve(import.meta.dirname, '../routes/jupyter.js'),
    'utf8'
  )

  assert.match(routeSource, /function resolveUserProject/)
  assert.match(routeSource, /projectId:\s*ensureProjectWorkspaceId/)
  assert.match(routeSource, /resolveUserProject\(username,\s*projectName\)/)
})

test('server entrypoint mounts the Jupyter gateway before normal API routes and handles upgrades', () => {
  const indexSource = fs.readFileSync(
    path.resolve(import.meta.dirname, '../index.js'),
    'utf8'
  )

  assert.match(indexSource, /createJupyterProxy/)
  assert.match(indexSource, /app\.use\(jupyterProxy\.httpMiddleware\)/)
  assert.match(indexSource, /server\.on\('upgrade', jupyterProxy\.handleUpgrade\)/)
  assert.match(indexSource, /const server = app\.listen/)
})

test('deployment-facing server sources do not ship legacy OpenGMS tokens as defaults', () => {
  const sourceFiles = [
    '../index.js',
    '../routes/auth.js',
    '../routes/jupyter.js',
    '../.env.example',
    '../.env.development.example',
    '../.env.production.example'
  ]

  const combinedSource = sourceFiles
    .map(file => fs.readFileSync(path.resolve(import.meta.dirname, file), 'utf8'))
    .join('\n')

  assert.doesNotMatch(combinedSource, /token=\"[a-f0-9]{32}\"/)
  assert.doesNotMatch(combinedSource, /ua6R2Qbf=0cvx_/)
  assert.doesNotMatch(combinedSource, /your-super-secret-jwt-key/)
})
