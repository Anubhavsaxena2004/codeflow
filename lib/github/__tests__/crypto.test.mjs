import test from 'node:test'
import assert from 'node:assert/strict'
import { decryptSecret, encryptSecret } from '../crypto'

const PASSPHRASE = 'a-very-long-token-encryption-key'

test('encryptSecret/decryptSecret round-trips a token', () => {
  const token = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz'
  assert.equal(decryptSecret(encryptSecret(token, PASSPHRASE), PASSPHRASE), token)
})

test('identical tokens encrypt to different ciphertexts (random salt + iv)', () => {
  const a = encryptSecret('same-token', PASSPHRASE)
  const b = encryptSecret('same-token', PASSPHRASE)
  assert.notEqual(a, b)
  assert.equal(a.split(':').length, 4)
  assert.equal(b.split(':').length, 4)
})

test('a wrong passphrase cannot decrypt the token', () => {
  const encoded = encryptSecret('secret-token', PASSPHRASE)
  assert.throws(() => decryptSecret(encoded, 'wrong-passphrase'), /Decryption failed/)
})

test('tampered ciphertext is rejected', () => {
  const parts = encryptSecret('secret-token', PASSPHRASE).split(':')
  const ciphertext = parts[3]
  const flipped = (ciphertext[0] === '0' ? '1' : '0') + ciphertext.slice(1)
  assert.throws(() => decryptSecret([...parts.slice(0, 3), flipped].join(':'), PASSPHRASE), /Decryption failed/)
})

test('malformed input is rejected', () => {
  assert.throws(() => decryptSecret('not-valid-encoded', PASSPHRASE), /Invalid encrypted secret format/)
  assert.throws(() => decryptSecret('a:b:c', PASSPHRASE), /Invalid encrypted secret format/)
})
