import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
/** Encoded format: salt:iv:tag:ciphertext, each hex-encoded. */
const ENCODED_PARTS = 4

/**
 * Encrypts a secret (the GitHub access token) with AES-256-GCM.
 * The scrypt key is derived from the passphrase with a fresh random salt,
 * so identical tokens encrypt to different ciphertexts.
 */
export function encryptSecret(plaintext: string, passphrase: string): string {
  const salt = randomBytes(16)
  const key = scryptSync(passphrase, salt, 32)
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return [salt, iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('hex')).join(':')
}

/** Reverses encryptSecret. Throws on a wrong passphrase or tampered ciphertext. */
export function decryptSecret(encoded: string, passphrase: string): string {
  const parts = encoded.split(':')
  if (parts.length !== ENCODED_PARTS) throw new Error('Invalid encrypted secret format.')
  const [salt, iv, tag, ciphertext] = parts.map((part) => Buffer.from(part, 'hex'))
  const key = scryptSync(passphrase, salt, 32)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch {
    throw new Error('Decryption failed — wrong key or corrupted data.')
  }
}
