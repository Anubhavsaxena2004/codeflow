import test from 'node:test'
import assert from 'node:assert/strict'
import { checkPersonalToken } from '../token'
import { jsonResponse, mockFetchQueue } from './helpers'

const CLASSIC = `ghp_${'a'.repeat(36)}`
const FINE_GRAINED = `github_pat_${'B'.repeat(22)}_${'c'.repeat(59)}`
const me = (headers = {}) => jsonResponse({ id: 583231, login: 'octocat' }, { headers })

test('a classic token with the repo scope connects as its owner', async () => {
  const { fetchImpl, calls } = mockFetchQueue([me({ 'x-oauth-scopes': 'read:user, repo' })])
  assert.deepEqual(await checkPersonalToken(CLASSIC, fetchImpl), { ok: true, login: 'octocat', githubUserId: '583231', kind: 'classic' })
  assert.equal(calls[0].url, 'https://api.github.com/user')
  assert.equal(calls[0].headers.authorization, `Bearer ${CLASSIC}`)
})

test('a classic token without the repo scope is refused with what to fix', async () => {
  const { fetchImpl } = mockFetchQueue([me({ 'x-oauth-scopes': 'public_repo, read:user' })])
  const result = await checkPersonalToken(CLASSIC, fetchImpl)
  assert.equal(result.ok, false)
  assert.match(result.message, /"repo" scope/)
})

test('fine-grained tokens are accepted without scopes', async () => {
  const { fetchImpl } = mockFetchQueue([me()])
  const result = await checkPersonalToken(FINE_GRAINED, fetchImpl)
  assert.equal(result.ok, true)
  assert.equal(result.kind, 'fine-grained')
})

test('anything that is not a token never reaches GitHub', async () => {
  const { fetchImpl, calls } = mockFetchQueue([])
  for (const value of ['', 'my-password', 'gho_' + 'a'.repeat(36), `ghp_${'a'.repeat(36)} extra`]) {
    const result = await checkPersonalToken(value, fetchImpl)
    assert.equal(result.ok, false)
    assert.equal(result.status, 400)
  }
  assert.equal(calls.length, 0)
})

test('a token GitHub rejects, or an unreachable GitHub, is reported plainly', async () => {
  const rejected = mockFetchQueue([{ status: 401, body: { message: 'Bad credentials' } }])
  assert.match((await checkPersonalToken(CLASSIC, rejected.fetchImpl)).message, /rejected this token/)

  const offline = await checkPersonalToken(CLASSIC, async () => {
    throw new TypeError('fetch failed')
  })
  assert.deepEqual(offline, { ok: false, status: 502, message: 'Could not reach GitHub. Try again in a minute.' })
})
