import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTreeEntries, createTreePayload, toBase64, treeEntriesForFiles } from '../tree'

test('toBase64 round-trips UTF-8 content, including multi-byte characters', () => {
  const content = 'héllo 🚀 日本語\nconst x = "ü"'
  assert.equal(Buffer.from(toBase64(content), 'base64').toString('utf8'), content)
  assert.equal(toBase64(''), '')
  assert.equal(toBase64('abc'), Buffer.from('abc', 'utf8').toString('base64'))
})

test('buildTreeEntries returns one sorted 100644 blob entry per file', () => {
  const entries = buildTreeEntries([
    { path: 'server/routes/auth.js', sha: 'sha-auth' },
    { path: 'client/package.json', sha: 'sha-pkg' },
    { path: 'README.md', sha: 'sha-readme' },
  ])
  assert.deepEqual(entries, [
    { path: 'README.md', mode: '100644', type: 'blob', sha: 'sha-readme' },
    { path: 'client/package.json', mode: '100644', type: 'blob', sha: 'sha-pkg' },
    { path: 'server/routes/auth.js', mode: '100644', type: 'blob', sha: 'sha-auth' },
  ])
})

test('createTreePayload includes base_tree only when a HEAD tree exists', () => {
  const entries = buildTreeEntries([{ path: 'a.txt', sha: 'sha-a' }])
  assert.deepEqual(createTreePayload(entries), { tree: entries })
  assert.deepEqual(createTreePayload(entries, 'base-tree-sha'), { tree: entries, base_tree: 'base-tree-sha' })
  assert.deepEqual(createTreePayload(entries, null), { tree: entries })
})

test('treeEntriesForFiles maps file paths to their blob shas', () => {
  const files = [
    { path: 'b.txt', content: 'b' },
    { path: 'a.txt', content: 'a' },
  ]
  const shas = new Map([
    ['a.txt', 'sha-a'],
    ['b.txt', 'sha-b'],
  ])
  const entries = treeEntriesForFiles(files, shas)
  assert.deepEqual(entries.map((entry) => entry.path), ['a.txt', 'b.txt'])
  assert.deepEqual(entries.map((entry) => entry.sha), ['sha-a', 'sha-b'])
})
