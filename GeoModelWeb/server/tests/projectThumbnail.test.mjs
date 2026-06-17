import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  collectThumbnailCandidates,
  findProjectThumbnail,
  isOutputThumbnailCandidate
} from '../utils/projectThumbnail.js'

function makeTempProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'opengeolab-thumb-'))
  fs.mkdirSync(path.join(root, 'outputs'), { recursive: true })
  fs.mkdirSync(path.join(root, 'data'), { recursive: true })
  fs.writeFileSync(path.join(root, 'cover.png'), Buffer.alloc(8000))
  fs.writeFileSync(path.join(root, 'outputs', 'sample_montage.png'), Buffer.alloc(50000))
  fs.writeFileSync(path.join(root, 'outputs', 'compound_risk_map.png'), Buffer.alloc(20000))
  fs.writeFileSync(path.join(root, 'data', 'raw_photo.jpg'), Buffer.alloc(90000))
  return root
}

test('findProjectThumbnail prefers meaningful generated outputs over covers and raw data', () => {
  const projectRoot = makeTempProject()

  try {
    const thumbnail = findProjectThumbnail(projectRoot)
    assert.equal(thumbnail.path, 'outputs/compound_risk_map.png')
    assert.equal(thumbnail.name, 'compound_risk_map.png')
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true })
  }
})

test('collectThumbnailCandidates returns only web image candidates', () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'opengeolab-thumb-'))

  try {
    fs.writeFileSync(path.join(projectRoot, 'result.png'), Buffer.alloc(100))
    fs.writeFileSync(path.join(projectRoot, 'result.tif'), Buffer.alloc(100))
    fs.writeFileSync(path.join(projectRoot, 'notes.csv'), 'a,b\n1,2\n')

    const candidates = collectThumbnailCandidates(projectRoot)
    assert.deepEqual(candidates.map(item => item.path), ['result.png'])
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true })
  }
})

test('findProjectThumbnail only uses current case output images', () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'opengeolab-thumb-'))

  try {
    fs.mkdirSync(path.join(projectRoot, 'figures'), { recursive: true })
    fs.writeFileSync(path.join(projectRoot, 'cover.png'), Buffer.alloc(10000))
    fs.writeFileSync(path.join(projectRoot, 'figures', 'map_result.png'), Buffer.alloc(20000))

    assert.equal(findProjectThumbnail(projectRoot), null)

    fs.mkdirSync(path.join(projectRoot, 'output'), { recursive: true })
    fs.writeFileSync(path.join(projectRoot, 'output', 'scenario_map.png'), Buffer.alloc(12000))

    const thumbnail = findProjectThumbnail(projectRoot)
    assert.equal(thumbnail.path, 'output/scenario_map.png')
    assert.equal(isOutputThumbnailCandidate(thumbnail), true)
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true })
  }
})
