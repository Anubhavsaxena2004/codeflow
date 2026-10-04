import test from 'node:test'
import assert from 'node:assert/strict'
import { challengeMessage, defaultBulkMessage, defaultFileMessage, stageMessage } from '../messages'

test('challengeMessage formats "feat: build <path> — <challenge title>"', () => {
  assert.equal(challengeMessage('server/routes/auth.js', 'Sign up'), 'feat: build server/routes/auth.js — Sign up')
  assert.equal(challengeMessage('client/src/App.tsx', 'Todo list UI'), 'feat: build client/src/App.tsx — Todo list UI')
})

test('stageMessage formats "feat: complete <stage name> stage"', () => {
  assert.equal(stageMessage('MERN skeleton'), 'feat: complete MERN skeleton stage')
  assert.equal(stageMessage('auth'), 'feat: complete auth stage')
})

test('messages are normalized to one line of at most 72 characters', () => {
  const long = challengeMessage('server/routes/auth.js', 'A very long challenge title that goes on and on and on forever')
  assert.equal(long.length, 72)
  assert.equal(long.includes('\n'), false)

  assert.equal(challengeMessage('a.js', 'Title   with   spaces'), 'feat: build a.js — Title with spaces')
})

test('default messages', () => {
  assert.equal(defaultBulkMessage(), 'feat: update project files')
  assert.equal(defaultFileMessage('server/app.js'), 'feat: update server/app.js')
})
