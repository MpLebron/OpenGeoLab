import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const require = createRequire(import.meta.url)

const {
  DEFAULT_IMAGE,
  JUPYTER_IMAGES,
  resolveProjectRuntime,
  buildProjectRuntimeMeta,
  getRuntimeBuildSpec,
  getRuntimeCatalog,
  inspectRuntimeReadiness,
  formatDockerImageSize,
  buildDockerCommandEnv,
  buildOpenGmsCredentialEnv
} = require('../utils/jupyterRuntime.js')

test('resolves runtime.imageId before legacy runtimeImageId', () => {
  const result = resolveProjectRuntime({
    runtime: { imageId: 'opengms-pangeo-earth' },
    runtimeImageId: 'geomodel-jupyter'
  })

  assert.equal(result.ok, true)
  assert.equal(result.imageId, 'opengms-pangeo-earth')
  assert.equal(result.runtime.imageName, JUPYTER_IMAGES['opengms-pangeo-earth'].name)
  assert.equal(result.runtimeSource, 'project_runtime')
})

test('resolves legacy runtimeImageId for older projects', () => {
  const result = resolveProjectRuntime({ runtimeImageId: 'opengms-cloud-eo' })

  assert.equal(result.ok, true)
  assert.equal(result.imageId, 'opengms-cloud-eo')
  assert.equal(result.runtimeSource, 'legacy_runtimeImageId')
})

test('falls back to default runtime for projects without runtime metadata', () => {
  const result = resolveProjectRuntime({})

  assert.equal(result.ok, true)
  assert.equal(result.imageId, DEFAULT_IMAGE)
  assert.equal(result.runtimeSource, 'default_fallback')
})

test('reports unregistered runtime instead of silently changing environments', () => {
  const result = resolveProjectRuntime({ runtime: { imageId: 'unknown-runtime' } })

  assert.equal(result.ok, false)
  assert.equal(result.status, 400)
  assert.equal(result.code, 'runtime_not_registered')
  assert.equal(result.imageId, 'unknown-runtime')
})

test('builds canonical runtime metadata for project files', () => {
  const meta = buildProjectRuntimeMeta('geomodel-jupyter')

  assert.equal(meta.runtimeImageId, 'geomodel-jupyter')
  assert.equal(meta.runtime.imageId, 'geomodel-jupyter')
  assert.equal(meta.runtime.imageName, JUPYTER_IMAGES['geomodel-jupyter'].name)
  assert.equal(meta.runtime.label, JUPYTER_IMAGES['geomodel-jupyter'].label)
})

test('runtime catalog exposes real buildable Docker image definitions', () => {
  const catalog = getRuntimeCatalog()

  assert.ok(catalog.length >= 5)
  assert.ok(catalog.every(runtime => runtime.imageName))
  assert.ok(catalog.every(runtime => runtime.buildable))
  assert.ok(catalog.every(runtime => runtime.build?.dockerfile?.endsWith('Dockerfile')))
  assert.ok(catalog.some(runtime => runtime.id === 'opengms-pangeo-earth'))
  assert.ok(catalog.some(runtime => runtime.id === 'opengms-geoai-pytorch'))
})

test('runtime build spec points at project Dockerfile and build context', () => {
  const spec = getRuntimeBuildSpec('opengms-pangeo-earth', {
    serverRoot: '/repo/GeoModelWeb/server'
  })

  assert.equal(spec.ok, true)
  assert.equal(spec.imageId, 'opengms-pangeo-earth')
  assert.equal(spec.imageName, JUPYTER_IMAGES['opengms-pangeo-earth'].name)
  assert.equal(spec.contextPath, '/repo/GeoModelWeb/server/docker')
  assert.equal(spec.dockerfilePath, '/repo/GeoModelWeb/server/docker/runtimes/pangeo-earth/Dockerfile')
})

test('all buildable runtime Dockerfiles exist in the repository', () => {
  const serverRoot = path.resolve(import.meta.dirname, '..')

  for (const runtime of getRuntimeCatalog()) {
    const spec = getRuntimeBuildSpec(runtime.id, { serverRoot })
    assert.equal(spec.ok, true)
    assert.equal(fs.existsSync(spec.dockerfilePath), true, `${runtime.id} Dockerfile is missing`)
  }
})

test('default runtime Dockerfile keeps dependency and local wheel layers separate', () => {
  const serverRoot = path.resolve(import.meta.dirname, '..')
  const spec = getRuntimeBuildSpec(DEFAULT_IMAGE, { serverRoot })
  const dockerfile = fs.readFileSync(spec.dockerfilePath, 'utf8')

  const mambaLayer = dockerfile.indexOf('RUN mamba install')
  const wheelCopy = dockerfile.indexOf('COPY jupyterlab_geomodel-0.1.0-py3-none-any.whl')
  const pipLayer = dockerfile.indexOf('RUN pip install --no-cache-dir')

  assert.ok(mambaLayer > -1)
  assert.ok(wheelCopy > -1)
  assert.ok(pipLayer > -1)
  assert.ok(mambaLayer < wheelCopy)
  assert.ok(wheelCopy < pipLayer)
})

test('extension release updater targets installed catalog runtime images', () => {
  const repoRoot = path.resolve(import.meta.dirname, '../../..')
  const defaultRuntimeImage = JUPYTER_IMAGES[DEFAULT_IMAGE].name
  const updateDockerfile = fs.readFileSync(
    path.join(repoRoot, 'GeoModelWeb/server/docker/Dockerfile.update'),
    'utf8'
  )
  const releaseScript = fs.readFileSync(
    path.join(repoRoot, 'GeoModelWeb/scripts/release-jupyter-agent-image.sh'),
    'utf8'
  )

  assert.match(updateDockerfile, new RegExp(`ARG BASE_IMAGE=${defaultRuntimeImage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
  assert.match(updateDockerfile, /FROM \$\{BASE_IMAGE\}/)
  assert.match(updateDockerfile, /--force-reinstall/)
  assert.doesNotMatch(updateDockerfile, /FROM geomodel-jupyter:latest/)

  assert.match(releaseScript, new RegExp(`DEFAULT_RUNTIME_IMAGE="${defaultRuntimeImage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`))
  assert.match(releaseScript, /getRuntimeCatalog/)
  assert.match(releaseScript, /docker image inspect "\$\{runtime_image\}"/)
  assert.match(releaseScript, /--build-arg BASE_IMAGE="\$\{runtime_image\}"/)
  assert.match(releaseScript, /-t "\$\{runtime_image\}"/)
  assert.doesNotMatch(releaseScript, /mapfile/)
  assert.doesNotMatch(releaseScript, /geomodel-jupyter:latest/)
})

test('runtime build spec rejects unregistered images', () => {
  const spec = getRuntimeBuildSpec('unknown-runtime')

  assert.equal(spec.ok, false)
  assert.equal(spec.code, 'runtime_not_registered')
})

test('formats Docker image byte sizes for environment cards', () => {
  assert.equal(formatDockerImageSize(1024 * 1024 * 1024 * 3.25), '3.3 GB')
  assert.equal(formatDockerImageSize(undefined), '')
})

test('classifies Docker daemon failure separately from missing image', async () => {
  const runtime = resolveProjectRuntime({ runtimeImageId: 'geomodel-jupyter' }).runtime

  const status = await inspectRuntimeReadiness(runtime, async (command) => {
    assert.match(command, /^docker info/)
    throw new Error('Cannot connect to Docker daemon')
  })

  assert.equal(status.ok, false)
  assert.equal(status.status, 503)
  assert.equal(status.code, 'docker_unavailable')
})

test('classifies missing runtime image when Docker daemon is reachable', async () => {
  const runtime = resolveProjectRuntime({ runtimeImageId: 'geomodel-jupyter' }).runtime
  const commands = []

  const status = await inspectRuntimeReadiness(runtime, async (command) => {
    commands.push(command)
    if (command.startsWith('docker info')) return '28.3.3'
    if (command.startsWith('docker image inspect')) throw new Error('No such image')
    return ''
  })

  assert.deepEqual(commands, [
    'docker info --format "{{.ServerVersion}}"',
    `docker image inspect ${JUPYTER_IMAGES['geomodel-jupyter'].name}`
  ])
  assert.equal(status.ok, false)
  assert.equal(status.status, 409)
  assert.equal(status.code, 'runtime_image_missing')
  assert.equal(status.imageName, JUPYTER_IMAGES['geomodel-jupyter'].name)
})

test('reports runtime ready when Docker daemon and image are available', async () => {
  const runtime = resolveProjectRuntime({ runtimeImageId: 'geomodel-jupyter' }).runtime

  const status = await inspectRuntimeReadiness(runtime, async () => 'ok')

  assert.equal(status.ok, true)
  assert.equal(status.code, 'ready')
})

test('removes Windows npipe Docker host when running on non-Windows platforms', () => {
  const env = buildDockerCommandEnv(
    {
      PATH: '/usr/local/bin',
      DOCKER_HOST: 'npipe:////./pipe/docker_engine'
    },
    'darwin'
  )

  assert.equal(env.PATH, '/usr/local/bin')
  assert.equal(env.DOCKER_HOST, undefined)
})

test('builds OpenGMS credential environment for Jupyter runtime containers', () => {
  const env = buildOpenGmsCredentialEnv({
    OGMS_TOKEN: 'token-value',
    OGMS_BASE_PORTAL_URL: 'https://portal.example',
    OGMS_BASE_MANAGER_URL: 'https://portal.example/managerServer',
    OGMS_BASE_DATA_URL: 'https://portal.example/dataTransferServer',
    OPENGMS_ROOF_PV_TOKEN: 'roof-token',
    PYGEOMODEL_OPENAI_API_KEY: 'openai-key',
    EMPTY_VALUE: ''
  })

  assert.deepEqual(env, {
    OGMS_TOKEN: 'token-value',
    OGMS_BASE_PORTAL_URL: 'https://portal.example',
    OGMS_BASE_MANAGER_URL: 'https://portal.example/managerServer',
    OGMS_BASE_DATA_URL: 'https://portal.example/dataTransferServer',
    OPENGMS_ROOF_PV_TOKEN: 'roof-token',
    PYGEOMODEL_OPENAI_API_KEY: 'openai-key'
  })
})
