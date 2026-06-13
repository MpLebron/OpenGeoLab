import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const wheelPath = path.join(__dirname, '..', 'docker', 'pygeomodel-1.0.15-py3-none-any.whl')

function readZipEntry(zipPath, entryName) {
  const buffer = fs.readFileSync(zipPath)
  let offset = 0
  while (offset < buffer.length - 30) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) {
      offset += 1
      continue
    }

    const method = buffer.readUInt16LE(offset + 8)
    const compressedSize = buffer.readUInt32LE(offset + 18)
    const fileNameLength = buffer.readUInt16LE(offset + 26)
    const extraLength = buffer.readUInt16LE(offset + 28)
    const nameStart = offset + 30
    const name = buffer.subarray(nameStart, nameStart + fileNameLength).toString('utf8')
    const dataStart = nameStart + fileNameLength + extraLength
    const data = buffer.subarray(dataStart, dataStart + compressedSize)

    if (name === entryName) {
      if (method === 0) return data.toString('utf8')
      if (method === 8) return zlib.inflateRawSync(data).toString('utf8')
      throw new Error(`Unsupported zip compression method: ${method}`)
    }

    offset = dataStart + compressedSize
  }

  throw new Error(`Zip entry not found: ${entryName}`)
}

test('PyGeoModel wheel limits synchronous OpenGMS task waiting to 20 minutes', () => {
  const clientSource = readZipEntry(wheelPath, 'pygeomodel/client.py')

  assert.match(clientSource, /DEFAULT_TASK_TIMEOUT_SECONDS\s*=\s*20\s*\*\s*60/)
  assert.match(clientSource, /wait4Status\(timeout=DEFAULT_TASK_TIMEOUT_SECONDS\)/)
  assert.doesNotMatch(clientSource, /wait4Status\(\)/)
})
