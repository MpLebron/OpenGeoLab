import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import test from 'node:test'

const srcDir = fileURLToPath(new URL('../src/', import.meta.url))
const nativeDialogPattern = /\b(?:alert|confirm|prompt)\s*\(|window\.(?:alert|confirm|prompt)\s*\(/

function collectSourceFiles(dir) {
  return readdirSync(dir).flatMap(entry => {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) return collectSourceFiles(fullPath)
    if (/\.(vue|js|ts)$/.test(entry)) return [fullPath]
    return []
  })
}

test('client source does not use native browser dialog APIs', () => {
  const offenders = collectSourceFiles(srcDir).filter(file => {
    const content = readFileSync(file, 'utf8')
    return nativeDialogPattern.test(content)
  })

  assert.deepEqual(offenders, [])
})
