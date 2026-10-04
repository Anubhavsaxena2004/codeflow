import test from 'node:test'
import assert from 'node:assert/strict'
import { AuthError, ConflictError, createGitHubClient, GitHubError, NotFoundError, RateLimitError } from '../client'
import { jsonResponse, mockFetchQueue } from './helpers'

const API = 'https://api.github.com'

function clientFor(responses, options = {}) {
  const { fetchImpl, calls } = mockFetchQueue(responses)
  return { client: createGitHubClient({ token: 'test-token', fetchImpl, ...options }), calls }
}

test('get sends the auth header and API version, returns parsed JSON', async () => {
  const { client, calls } = clientFor([jsonResponse({ login: 'octocat', id: 1 })])
  const me = await client.get('/user')
  assert.deepEqual(me, { login: 'octocat', id: 1 })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, `${API}/user`)
  assert.equal(calls[0].method, 'GET')
  assert.equal(calls[0].headers.authorization, 'Bearer test-token')
  assert.equal(calls[0].headers.accept, 'application/vnd.github+json')
})

test('post/put/patch serialize the body as JSON', async () => {
  const { client, calls } = clientFor([
    jsonResponse({ sha: 'blob1' }),
    jsonResponse({ sha: 'tree1' }),
    jsonResponse({ sha: 'commit1' }),
  ])
  await client.post('/git/blobs', { content: 'aGVsbG8=', encoding: 'base64' })
  await client.put('/contents/a.js', { message: 'm', content: 'aGVsbG8=' })
  await client.patch('/git/refs/heads/main', { sha: 'commit1', force: false })
  assert.deepEqual(calls[0].body, { content: 'aGVsbG8=', encoding: 'base64' })
  assert.deepEqual(calls[1].body, { message: 'm', content: 'aGVsbG8=' })
  assert.deepEqual(calls[2].body, { sha: 'commit1', force: false })
  assert.equal(calls[0].method, 'POST')
  assert.equal(calls[1].method, 'PUT')
  assert.equal(calls[2].method, 'PATCH')
})

test('HTTP errors map to typed exceptions', async () => {
  const notFound = clientFor([jsonResponse({ message: 'Not Found' }, { status: 404 })])
  await assert.rejects(() => notFound.client.get('/repos/o/missing'), NotFoundError)

  const unauthorized = clientFor([jsonResponse({ message: 'Bad credentials' }, { status: 401 })])
  await assert.rejects(() => unauthorized.client.get('/user'), AuthError)

  const conflict = clientFor([jsonResponse({ message: 'Unprocessable' }, { status: 422 })])
  await assert.rejects(() => conflict.client.patch('/git/refs/heads/main', {}), ConflictError)

  const serverError = clientFor([jsonResponse({ message: 'oops' }, { status: 500 })])
  await assert.rejects(() => serverError.client.get('/x'), GitHubError)
})

test('a rate limit of 0 raises RateLimitError with the reset time', async () => {
  const { client } = clientFor([
    jsonResponse({ message: 'API rate limit exceeded' }, {
      status: 403,
      headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1893456000' },
    }),
  ])
  await assert.rejects(
    () => client.get('/user'),
    (error) => {
      assert.ok(error instanceof RateLimitError)
      assert.equal(error.remaining, 0)
      assert.equal(error.resetAt instanceof Date, true)
      assert.equal(error.resetAt.toISOString(), '2030-01-01T00:00:00.000Z')
      return true
    },
  )
})

test('minRemaining refuses calls when the budget is nearly spent', async () => {
  const { client } = clientFor(
    [jsonResponse({}, { status: 200, headers: { 'x-ratelimit-remaining': '5' } })],
    { minRemaining: 10 },
  )
  await assert.rejects(() => client.get('/user'), RateLimitError)
})

test('5xx responses are retried once', async () => {
  const { client, calls } = clientFor([
    jsonResponse({ message: 'bad gateway' }, { status: 502 }),
    jsonResponse({ ok: true }),
  ])
  const result = await client.get('/user')
  assert.deepEqual(result, { ok: true })
  assert.equal(calls.length, 2)
})

test('204 responses resolve to undefined', async () => {
  const { client } = clientFor([new Response(null, { status: 204 })])
  assert.equal(await client.delete('/x'), undefined)
})
