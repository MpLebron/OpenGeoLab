import test from 'node:test'
import assert from 'node:assert/strict'

import { getJupyterLaunchErrorMessage } from '../src/utils/jupyterLaunchErrors.js'

test('explains Docker daemon failures without mentioning image installation', () => {
  const message = getJupyterLaunchErrorMessage({
    code: 'docker_unavailable',
    message: 'Docker Desktop 未启动或 Docker daemon 无法连接。'
  })

  assert.equal(message, 'Docker Desktop 未启动或 Docker daemon 无法连接。')
})

test('explains missing project-bound runtime image', () => {
  const message = getJupyterLaunchErrorMessage({
    code: 'runtime_image_missing',
    imageName: 'geomodel-jupyter:latest'
  })

  assert.equal(message, '当前项目绑定环境未安装：geomodel-jupyter:latest')
})

test('explains unregistered runtime ids', () => {
  const message = getJupyterLaunchErrorMessage({
    code: 'runtime_not_registered',
    imageId: 'legacy-runtime'
  })

  assert.equal(message, '当前项目绑定的运行环境未注册：legacy-runtime')
})
