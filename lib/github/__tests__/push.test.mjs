import test from 'node:test'
import assert from 'node:assert/strict'
import { createGitHubClient } from '../client'
import { bulkPush, singleFilePush } from '../push'
import {
  blobWith,
  commitAt,
  COMMIT_SHA,
  HEAD_SHA,
  HEAD_TREE,
  jsonResponse,
  mockFetchQueue,
  NEW_TREE,
  newCommit,
  newTree,
  refAt,
  refUpdated,
  repoOk,
} from './helpers'

const ENDPOINT = 'https://api.github.com/repos/octocat/demo'

function clientFor(responses) {
  const { fetchImpl, calls } = mockFetchQueue(responses)
  return { client: createGitHubClient({ token: 'test-token', fetchImpl }), calls }
}

const FILES = [
  { path: 'server/routes/auth.js', content: 'export const auth = 1\n' },
  { path: 'client/package.json', content: '{ "name": "client" }\n' },
]

const BLOB_AUTH = Buffer.from(FILES[0].content, 'utf8').toString('base64')
const BLOB_PKG = Buffer.from(FILES[1].content, 'utf8').toString('base64')

function baseInput(overrides = {}) {
  return {
    client: null,
    owner: 'octocat',
    repo: 'demo',
    branch: 'main',
    files: FILES,
    message: 'feat: complete MERN skeleton stage',
    expectedHeadSha: HEAD_SHA,
    ...overrides,
  }
}

test('bulk push: blobs → tree (base_tree=HEAD) → commit (parents=[HEAD]) → PATCH ref', async () => {
  const { client, calls } = clientFor([
    repoOk(), // GET repo
    refAt(), // GET ref heads/main
    commitAt(), // GET commit (for the HEAD tree sha)
    blobWith('blob-auth'), // POST blobs
    blobWith('blob-pkg'),
    newTree(), // POST tree
    newCommit(), // POST commit
    refUpdated(), // PATCH ref
  ])

  const result = await bulkPush(baseInput({ client }))

  assert.deepEqual(result, {
    ok: true,
    commitSha: COMMIT_SHA,
    pushedFiles: ['server/routes/auth.js', 'client/package.json'],
    excludedFiles: [],
  })

  // Blobs are base64.
  assert.deepEqual(calls[3].body, { content: BLOB_AUTH, encoding: 'base64' })
  assert.deepEqual(calls[4].body, { content: BLOB_PKG, encoding: 'base64' })

  // Tree layers on the HEAD tree.
  assert.deepEqual(calls[5].body, {
    tree: [
      { path: 'client/package.json', mode: '100644', type: 'blob', sha: 'blob-pkg' },
      { path: 'server/routes/auth.js', mode: '100644', type: 'blob', sha: 'blob-auth' },
    ],
    base_tree: HEAD_TREE,
  })

  // Commit has the new tree and the previous commit as its only parent.
  assert.deepEqual(calls[6].body, { message: 'feat: complete MERN skeleton stage', tree: NEW_TREE, parents: [HEAD_SHA] })

  // The ref is fast-forwarded only (never forced).
  assert.equal(calls[7].url, `${ENDPOINT}/git/refs/heads/main`)
  assert.deepEqual(calls[7].body, { sha: COMMIT_SHA, force: false })
})

test('bulk push to an empty repo: no parents, no base_tree, branch is created', async () => {
  const { client, calls } = clientFor([
    repoOk(),
    json404(), // no ref yet → empty repo
    blobWith('blob-auth'),
    blobWith('blob-pkg'),
    newTree(),
    newCommit(),
    jsonResponse({ object: { sha: COMMIT_SHA } }), // POST ref
  ])

  const result = await bulkPush(baseInput({ client, expectedHeadSha: null }))

  assert.equal(result.ok, true)
  // No base_tree and no parents on the first commit.
  assert.equal('base_tree' in calls[4].body, false)
  assert.deepEqual(calls[5].body.parents, [])
  // The branch is created rather than patched.
  assert.equal(calls[6].url, `${ENDPOINT}/git/refs`)
  assert.equal(calls[6].method, 'POST')
  assert.deepEqual(calls[6].body, { ref: 'refs/heads/main', sha: COMMIT_SHA })
})

test('bulk push reports a conflict when the remote sha differs from our last push', async () => {
  const { client, calls } = clientFor([
    repoOk(),
    refAt(), // remote moved on
    commitAt(),
  ])

  const result = await bulkPush(baseInput({ client, expectedHeadSha: 'oldsha9999999999999999999999999999999' }))

  assert.deepEqual(result, {
    ok: false,
    conflict: true,
    remoteSha: HEAD_SHA,
    expectedSha: 'oldsha9999999999999999999999999999999',
    branch: 'main',
    message: result.message,
  })
  // Stopped before touching blobs, trees, commits or refs — nothing overwritten.
  assert.equal(calls.length, 3)
  assert.equal(calls.some((call) => call.method === 'PATCH' || call.method === 'POST' && call.url.includes('/git/')), false)
})

test('bulk push to a missing repo prompts a re-link', async () => {
  const { client, calls } = clientFor([json404()])
  const result = await bulkPush(baseInput({ client }))
  assert.equal(result.ok, false)
  assert.equal(result.error, 'repo_missing')
  assert.equal(calls.length, 1)
})

test('bulk push refuses repos the user cannot push to', async () => {
  const { client } = clientFor([repoOk({ permissions: { push: false } })])
  const result = await bulkPush(baseInput({ client }))
  assert.equal(result.ok, false)
  assert.equal(result.error, 'no_push_access')
})

test('bulk push is blocked when a file contains an obvious secret', async () => {
  const { client, calls } = clientFor([
    repoOk(),
    refAt(),
    commitAt(),
  ])
  const result = await bulkPush(
    baseInput({
      client,
      files: [{ path: 'server/config.js', content: 'const API_KEY = "sk-abcdefghijklmnopqrstuvwxyz123456"' }],
    }),
  )
  assert.equal(result.ok, false)
  assert.equal(result.error, 'secrets')
  // The literal matches both the sk- pattern and the assignment pattern.
  assert.equal(result.findings.length, 2)
  for (const finding of result.findings) assert.equal(finding.path, 'server/config.js')
  // No blobs were created.
  assert.equal(calls.length, 3)
})

test('bulk push skips .env/.git/node_modules and reports them as excluded', async () => {
  const { client, calls } = clientFor([
    repoOk(),
    refAt(),
    commitAt(),
    blobWith('blob-auth'), // both project files are pushed; the rest is filtered
    blobWith('blob-pkg'),
    newTree(),
    newCommit(),
    refUpdated(),
  ])
  const result = await bulkPush(
    baseInput({
      client,
      files: [
        ...FILES,
        { path: '.env', content: 'TOKEN=1' },
        { path: 'server/.env.local', content: 'TOKEN=2' },
        { path: 'client/node_modules/x/index.js', content: 'x' },
        { path: '.git/config', content: '[core]' },
      ],
    }),
  )
  assert.equal(result.ok, true)
  assert.deepEqual(result.pushedFiles, ['server/routes/auth.js', 'client/package.json'])
  assert.deepEqual(result.excludedFiles, ['.env', 'server/.env.local', 'client/node_modules/x/index.js', '.git/config'])
  assert.equal(calls.length, 8)
})

test('bulk push surfaces rate limits with a retry time', async () => {
  const { client } = clientFor([
    repoOk(),
    refAt(),
    commitAt(),
    jsonResponse({ message: 'API rate limit exceeded' }, {
      status: 403,
      headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1893456000' },
    }),
  ])
  const result = await bulkPush(baseInput({ client }))
  assert.equal(result.ok, false)
  assert.equal(result.error, 'rate_limited')
  assert.equal(result.retryAt, '2030-01-01T00:00:00.000Z')
})

test('bulk push maps a revoked token to a clear auth error', async () => {
  const { client } = clientFor([jsonResponse({ message: 'Bad credentials' }, { status: 401 })])
  const result = await bulkPush(baseInput({ client }))
  assert.equal(result.ok, false)
  assert.equal(result.error, 'auth')
})

test('single-file push: existing file is PUT with its sha', async () => {
  const { client, calls } = clientFor([
    repoOk(),
    refAt(),
    commitAt(),
    jsonResponse({ sha: 'existing-blob-sha' }), // GET contents
    jsonResponse({ commit: { sha: 'put-commit-sha' } }), // PUT contents
  ])

  const result = await singleFilePush(
    baseInput({
      client,
      files: [FILES[0]],
      message: 'feat: build server/routes/auth.js — Sign up',
    }),
  )

  assert.deepEqual(result, { ok: true, commitSha: 'put-commit-sha', pushedFiles: ['server/routes/auth.js'], excludedFiles: [] })
  assert.equal(calls[3].url, `${ENDPOINT}/contents/server/routes/auth.js?ref=main`)
  assert.deepEqual(calls[4].body, {
    message: 'feat: build server/routes/auth.js — Sign up',
    content: BLOB_AUTH,
    branch: 'main',
    sha: 'existing-blob-sha',
  })
})

test('single-file push: a new file is PUT without a sha', async () => {
  const { client, calls } = clientFor([
    repoOk(),
    refAt(),
    commitAt(),
    json404(), // contents not found → new file
    jsonResponse({ commit: { sha: 'put-commit-sha' } }),
  ])

  const result = await singleFilePush(baseInput({ client, files: [FILES[0]] }))

  assert.equal(result.ok, true)
  assert.equal('sha' in calls[4].body, false)
  assert.equal(calls[4].body.content, BLOB_AUTH)
})

test('single-file push reports conflicts the same way', async () => {
  const { client, calls } = clientFor([repoOk(), refAt(), commitAt()])
  const result = await singleFilePush(baseInput({ client, files: [FILES[0]], expectedHeadSha: 'stale-sha-999999999999999999999' }))
  assert.equal(result.ok, false)
  assert.equal(result.conflict, true)
  assert.equal(result.remoteSha, HEAD_SHA)
  assert.equal(calls.length, 3)
})

function json404() {
  return jsonResponse({ message: 'Not Found' }, { status: 404 })
}
