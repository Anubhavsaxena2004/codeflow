import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultRepoName, isValidRepoName, parseExistingRepo } from '../repo-name'

test('parseExistingRepo treats a bare name as owned by the connected account', () => {
  assert.deepEqual(parseExistingRepo('my-app', 'octocat'), { owner: 'octocat', repo: 'my-app' })
})

test('parseExistingRepo supports "owner/repo"', () => {
  assert.deepEqual(parseExistingRepo('octocat/my-app', 'someone-else'), { owner: 'octocat', repo: 'my-app' })
})

test('parseExistingRepo rejects empty, extra segments and unsafe characters', () => {
  assert.equal(parseExistingRepo('', 'octocat'), null)
  assert.equal(parseExistingRepo('a/b/c', 'octocat'), null)
  assert.equal(parseExistingRepo('bad name', 'octocat'), null)
  assert.equal(parseExistingRepo('owner/repo with spaces', 'octocat'), null)
  assert.equal(parseExistingRepo('../etc', 'octocat'), null)
})

test('defaultRepoName slugifies the journey and appends "-app"', () => {
  assert.equal(defaultRepoName('mern-todo'), 'mern-todo-app')
  assert.equal(defaultRepoName('Signup Flow!'), 'signup-flow-app')
  assert.equal(defaultRepoName('--weird--name--'), 'weird-name-app')
  assert.equal(defaultRepoName(''), 'project-app')
})

test('isValidRepoName allows dotted/hyphenated names but rejects "." and ".."', () => {
  assert.equal(isValidRepoName('my.app_2'), true)
  assert.equal(isValidRepoName('.'), false)
  assert.equal(isValidRepoName('..'), false)
  assert.equal(isValidRepoName('has space'), false)
  assert.equal(isValidRepoName('a'.repeat(101)), false)
})
