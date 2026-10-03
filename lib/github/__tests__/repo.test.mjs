import test from 'node:test'
import assert from 'node:assert/strict'
import { createGitHubClient } from '../client'
import { resolveTargetRepo } from '../repo'
import { jsonResponse, mockFetchQueue, repoOk } from './helpers'

function clientFor(responses) {
  const { fetchImpl, calls } = mockFetchQueue(responses)
  return { client: createGitHubClient({ token: 'test-token', fetchImpl }), calls }
}

/** Records what resolveTargetRepo persists, without touching the database. */
function fakeStore(linked = null) {
  const linkedRepos = []
  return {
    linkedRepos,
    getLinkedRepo: async () => linked,
    linkRepo: async (userId, journeyId, repo) => linkedRepos.push({ userId, journeyId, repo }),
  }
}

const OPTIONS = { userId: 'u1', journeyId: 'signup', login: 'octocat' }

test('resolveTargetRepo reuses an already-linked repo without calling GitHub', async () => {
  const existing = { owner: 'octocat', repo: 'demo', branch: 'main', lastCommitSha: 'sha1' }
  const store = fakeStore(existing)
  const { client, calls } = clientFor([])
  const result = await resolveTargetRepo({ ...OPTIONS, client, store })
  assert.deepEqual(result, { ok: true, repo: existing })
  assert.equal(calls.length, 0)
  assert.equal(store.linkedRepos.length, 0)
})

test('resolveTargetRepo links a chosen existing repo, defaulting owner to the login', async () => {
  const store = fakeStore()
  const { client, calls } = clientFor([repoOk()])
  const result = await resolveTargetRepo({ ...OPTIONS, client, store, existingRepo: 'demo' })
  assert.equal(result.ok, true)
  assert.deepEqual(result.repo, { owner: 'octocat', repo: 'demo', branch: 'main', lastCommitSha: null })
  assert.equal(calls[0].url, 'https://api.github.com/repos/octocat/demo')
  assert.deepEqual(store.linkedRepos[0].repo, { owner: 'octocat', repo: 'demo', branch: 'main', lastCommitSha: null })
})

test('resolveTargetRepo honours an explicit owner/repo and the repo default branch', async () => {
  const store = fakeStore()
  const { client } = clientFor([repoOk({ owner: { login: 'acme' }, default_branch: 'trunk' })])
  const result = await resolveTargetRepo({ ...OPTIONS, client, store, existingRepo: 'acme/widget' })
  assert.equal(result.ok, true)
  assert.deepEqual(result.repo, { owner: 'acme', repo: 'widget', branch: 'trunk', lastCommitSha: null })
})

test('resolveTargetRepo rejects repos the user cannot push to', async () => {
  const store = fakeStore()
  const { client } = clientFor([repoOk({ permissions: { push: false } })])
  const result = await resolveTargetRepo({ ...OPTIONS, client, store, existingRepo: 'acme/widget' })
  assert.equal(result.ok, false)
  assert.equal(result.error, 'no_push_access')
  assert.equal(store.linkedRepos.length, 0)
})

test('resolveTargetRepo reports a missing chosen repo', async () => {
  const store = fakeStore()
  const { client } = clientFor([jsonResponse({ message: 'Not Found' }, { status: 404 })])
  const result = await resolveTargetRepo({ ...OPTIONS, client, store, existingRepo: 'acme/gone' })
  assert.equal(result.ok, false)
  assert.equal(result.error, 'repo_missing')
})

test('resolveTargetRepo rejects an invalid repo name before calling GitHub', async () => {
  const store = fakeStore()
  const { client, calls } = clientFor([])
  const result = await resolveTargetRepo({ ...OPTIONS, client, store, existingRepo: 'bad name' })
  assert.equal(result.ok, false)
  assert.equal(result.error, 'invalid_name')
  assert.equal(calls.length, 0)
})

test('resolveTargetRepo creates a private repo named from the journey', async () => {
  const store = fakeStore()
  const { client, calls } = clientFor([jsonResponse({ owner: { login: 'octocat' }, default_branch: 'main' })])
  const result = await resolveTargetRepo({ ...OPTIONS, client, store })
  assert.equal(result.ok, true)
  assert.deepEqual(result.repo, { owner: 'octocat', repo: 'signup-app', branch: 'main', lastCommitSha: null })
  assert.equal(calls[0].url, 'https://api.github.com/user/repos')
  assert.equal(calls[0].method, 'POST')
  assert.deepEqual(calls[0].body, { name: 'signup-app', auto_init: true, private: true })
})

test('resolveTargetRepo rejects an invalid explicit repo name', async () => {
  const store = fakeStore()
  const { client } = clientFor([])
  const result = await resolveTargetRepo({ ...OPTIONS, client, store, repoName: 'bad name' })
  assert.equal(result.ok, false)
  assert.equal(result.error, 'invalid_name')
})
