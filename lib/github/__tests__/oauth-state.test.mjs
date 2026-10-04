import test from 'node:test'
import assert from 'node:assert/strict'
import { encodeOAuthState, returnToFromState, safeReturnTo } from '../oauth-state'

test('safeReturnTo accepts a same-origin path', () => {
  assert.equal(safeReturnTo('/challenge/signup'), '/challenge/signup')
  assert.equal(safeReturnTo('/challenge/signup?tab=1'), '/challenge/signup?tab=1')
})

test('safeReturnTo rejects absolute, protocol-relative, backslash and control-char values', () => {
  assert.equal(safeReturnTo('https://evil.test'), '/')
  assert.equal(safeReturnTo('//evil.test'), '/')
  assert.equal(safeReturnTo('/a\\b'), '/')
  assert.equal(safeReturnTo('/a\nb'), '/')
  assert.equal(safeReturnTo(''), '/')
  assert.equal(safeReturnTo('x'.repeat(201)), '/')
  assert.equal(safeReturnTo(undefined), '/')
})

test('encodeOAuthState keeps a bare nonce when the path is the default', () => {
  assert.equal(encodeOAuthState('abc123', '/'), 'abc123')
  assert.equal(returnToFromState('abc123'), '/')
})

test('encodeOAuthState round-trips a return path through the state', () => {
  const state = encodeOAuthState('abc123', '/challenge/signup')
  assert.match(state, /^abc123\./)
  assert.equal(returnToFromState(state), '/challenge/signup')
})

test('returnToFromState falls back to "/" for malformed payloads', () => {
  assert.equal(returnToFromState('abc123.'), '/')
  assert.equal(returnToFromState('abc123.' + Buffer.from('https://evil.test').toString('base64url')), '/')
})
