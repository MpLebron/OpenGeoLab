import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const sourcePath = path.resolve(import.meta.dirname, '..', 'src', 'services', 'gatewayPath.ts')

function plain(value) {
  return JSON.parse(JSON.stringify(value))
}

function loadGatewayPathHelpers() {
  const source = fs.readFileSync(sourcePath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  })
  const sandbox = {
    exports: {},
    module: { exports: {} },
    console,
    decodeURIComponent,
    encodeURIComponent
  }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(transpiled.outputText, sandbox, { filename: sourcePath })
  return sandbox.exports
}

test('parses plain and prefixed Jupyter gateway paths', () => {
  const { parseJupyterGatewayPath } = loadGatewayPathHelpers()

  assert.deepEqual(plain(parseJupyterGatewayPath('/jupyter/workspace-1/lab')), {
    prefix: '',
    workspaceId: 'workspace-1',
    jupyterBasePath: '/jupyter/workspace-1'
  })

  assert.deepEqual(plain(parseJupyterGatewayPath('/OpenGeoLab/jupyter/workspace-1/api/kernels')), {
    prefix: '/OpenGeoLab',
    workspaceId: 'workspace-1',
    jupyterBasePath: '/OpenGeoLab/jupyter/workspace-1'
  })
})

test('builds OpenGeoLab API bases from prefixed Jupyter paths', () => {
  const { buildOpenGeoLabApiBaseFromLocation } = loadGatewayPathHelpers()

  assert.equal(
    buildOpenGeoLabApiBaseFromLocation({
      origin: 'https://geomodeling.njnu.edu.cn',
      pathname: '/OpenGeoLab/jupyter/workspace-1/lab',
      includeApiSegment: true
    }),
    'https://geomodeling.njnu.edu.cn/OpenGeoLab/api'
  )

  assert.equal(
    buildOpenGeoLabApiBaseFromLocation({
      origin: 'https://geomodeling.njnu.edu.cn',
      pathname: '/OpenGeoLab/jupyter/workspace-1/lab',
      includeApiSegment: false
    }),
    'https://geomodeling.njnu.edu.cn/OpenGeoLab'
  )
})
