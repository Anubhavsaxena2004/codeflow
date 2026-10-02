import test from 'node:test'
import assert from 'node:assert/strict'
import { filterFiles, isExcludedPath, isValidPath, scanForSecrets } from '../filter'

test('isExcludedPath blocks .env*, .git* and node_modules/** at any depth', () => {
  const excluded = [
    '.env',
    '.env.local',
    'server/.env',
    'server/.env.production',
    '.git',
    '.git/config',
    '.gitignore',
    '.gitmodules',
    '.github/workflows/ci.yml',
    'node_modules/react/index.js',
    'client/node_modules/.bin/vite',
    'server/node_modules/express/lib/express.js',
  ]
  for (const path of excluded) {
    assert.equal(isExcludedPath(path), true, `expected ${path} to be excluded`)
  }
})

test('isExcludedPath keeps normal project files', () => {
  const kept = ['package.json', 'client/package.json', 'server/routes/auth.js', 'src/App.tsx', 'README.md', 'env.example.ts']
  for (const path of kept) {
    assert.equal(isExcludedPath(path), false, `expected ${path} to be kept`)
  }
})

test('filterFiles splits a project into pushable and excluded files', () => {
  const { included, excluded } = filterFiles([
    { path: 'server/routes/auth.js', content: 'export {}' },
    { path: '.env', content: 'TOKEN=1' },
    { path: 'client/package.json', content: '{}' },
    { path: 'node_modules/x/index.js', content: 'module.exports = {}' },
  ])
  assert.deepEqual(included.map((file) => file.path), ['server/routes/auth.js', 'client/package.json'])
  assert.deepEqual(excluded, ['.env', 'node_modules/x/index.js'])
})

test('isValidPath accepts relative nested paths only', () => {
  for (const path of ['package.json', 'server/routes/auth.js', 'client/src/components/App.tsx']) {
    assert.equal(isValidPath(path), true, path)
  }
  for (const path of ['', '/absolute', '../escape', 'a/../b', 'a//b', './x', '.', '..', 'a\\b']) {
    assert.equal(isValidPath(path), false, path)
  }
})

test('scanForSecrets detects obvious secrets', () => {
  const findings = scanForSecrets([
    {
      path: 'server/routes/auth.js',
      content: [
        'const express = require("express")',
        'const router = express.Router()',
        'const API_KEY = "sk-abcdefghijklmnopqrstuvwxyz123456"',
        'router.post("/login", (req, res) => {',
        '  const password = "hunter2supersecret"',
        '})',
      ].join('\n'),
    },
    { path: 'deploy.sh', content: 'export AWS_KEY=AKIAIOSFODNN7EXAMPLE' },
    { path: 'server/id_rsa', content: '-----BEGIN RSA PRIVATE KEY-----\nMIIEow...\n-----END RSA PRIVATE KEY-----' },
    { path: 'README.md', content: 'token: ghp_1234567890abcdefghijklmnopqrstuvwxyz' },
  ])

  assert.equal(findings.length >= 4, true)
  const kinds = new Set(findings.map((finding) => finding.kind))
  assert.equal(kinds.has('openai-style-key'), true)
  assert.equal(kinds.has('assigned-secret'), true)
  assert.equal(kinds.has('aws-access-key-id'), true)
  assert.equal(kinds.has('private-key-block'), true)
  assert.equal(kinds.has('github-token'), true)

  // The API key sits on line 3 of auth.js.
  const apiKey = findings.find((finding) => finding.path === 'server/routes/auth.js' && finding.kind === 'openai-style-key')
  assert.equal(apiKey.line, 3)
})

test('scanForSecrets passes clean code (env references are not literals)', () => {
  const findings = scanForSecrets([
    { path: 'server/routes/auth.js', content: 'const password = process.env.DB_PASSWORD\nconst key = req.body.apiKey' },
    { path: 'client/src/App.tsx', content: 'const title = "my project"\nconst n = 42' },
    { path: 'README.md', content: '# Project\nSee the docs for configuration.' },
  ])
  assert.deepEqual(findings, [])
})
