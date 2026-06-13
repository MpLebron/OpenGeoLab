import assert from 'node:assert/strict'
import test from 'node:test'
import {
  dockerContainerExists,
  isDockerContainerRunning,
  removeDockerContainer
} from '../utils/dockerContainerState.js'

test('detects an existing stopped container by docker inspect name', async () => {
  const commands = []
  const run = async (command) => {
    commands.push(command)
    return '/jupyter-mplebron-nanjing-rooftop-pv'
  }

  const exists = await dockerContainerExists('jupyter-mplebron-nanjing-rooftop-pv', run)

  assert.equal(exists, true)
  assert.deepEqual(commands, [
    'docker inspect --format "{{.Name}}" jupyter-mplebron-nanjing-rooftop-pv'
  ])
})

test('reports missing containers as not existing and not running', async () => {
  const run = async () => {
    throw new Error('No such container')
  }

  assert.equal(await dockerContainerExists('missing-container', run), false)
  assert.equal(await isDockerContainerRunning('missing-container', run), false)
})

test('reads running state from docker inspect', async () => {
  const run = async () => 'true\n'

  assert.equal(await isDockerContainerRunning('jupyter-project', run), true)
})

test('builds docker rm command with optional force flag', async () => {
  const commands = []
  const run = async (command) => {
    commands.push(command)
    return ''
  }

  await removeDockerContainer('jupyter-project', run)
  await removeDockerContainer('jupyter-project', run, { force: true })

  assert.deepEqual(commands, [
    'docker rm jupyter-project',
    'docker rm -f jupyter-project'
  ])
})
