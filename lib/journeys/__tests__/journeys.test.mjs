import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { levelTemplate } from '@/components/admin/level-templates'
import { bundledProjects } from '@/data/journeys'
import { GIT_IDENTITY, pushSteps } from '@/data/journeys/git'
import { stripComments, runChecks } from '@/lib/journeys/checks'
import { matchesStep } from '@/lib/journeys/commands'
import { termsFor } from '@/lib/journeys/glossary'
import { draftFromSolution, isLearnerPath, readDraft, readLearnerFiles, submissionOf } from '@/lib/journeys/draft'
import { achievementsFor, activityByDay, isUnlocked, longestStreak, playerLevelFor, postFor, POSTS, streakDays, xpFor } from '@/lib/journeys/progress'
import { scaffoldProject, parseFlow } from '@/lib/journeys/scaffold'
import { buildOrder, filesBefore, projectSnapshot } from '@/lib/journeys/snapshot'
import { parseTree } from '@/lib/journeys/tree'
import { validateProject } from '@/lib/journeys/validate'
import { verifyLevel } from '@/lib/journeys/verify'

// The tree from mern-todo-folder-structure.pdf, as it appears in the PDF.
const PDF_TREE = `todo-app/
├── client/                  # React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── TodoForm.jsx
│   │   │   ├── TodoItem.jsx
│   │   │   └── TodoList.jsx
│   │   ├── services/
│   │   │   └── api.js       # axios calls to backend
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
│
├── server/                  # Node + Express backend
│   ├── config/
│   │   └── db.js            # MongoDB connection
│   ├── models/
│   │   └── Todo.js          # Mongoose schema
│   ├── controllers/
│   │   └── todoController.js
│   ├── routes/
│   │   └── todoRoutes.js
│   ├── .env
│   ├── package.json
│   └── server.js            # entry point
│
├── .gitignore
└── README.md`

// The same tree as it arrives when copied out of the PDF: every line break gone.
const PDF_TREE_ONE_LINE = PDF_TREE.replace(/\n/g, ' ').replace(/ {2,}/g, ' ')

const PDF_FLOW = 'React component → api.js → route → controller → model → MongoDB, then back the same way.'

const EXPECTED_PATHS = [
  'client/public/index.html',
  'client/src/components/TodoForm.jsx',
  'client/src/components/TodoItem.jsx',
  'client/src/components/TodoList.jsx',
  'client/src/services/api.js',
  'client/src/App.jsx',
  'client/src/main.jsx',
  'client/src/index.css',
  'client/package.json',
  'client/vite.config.js',
  'server/config/db.js',
  'server/models/Todo.js',
  'server/controllers/todoController.js',
  'server/routes/todoRoutes.js',
  'server/.env',
  'server/package.json',
  'server/server.js',
  '.gitignore',
  'README.md',
]

/** The submission a learner who gets everything right would send. */
function perfectSubmission(level) {
  switch (level.kind) {
    case 'explore':
      return { answer: level.quiz?.answer }
    case 'command':
      return { commands: level.steps.map((step) => step.accept[0]) }
    case 'edit':
    case 'bugfix':
      return { code: level.solution }
    case 'build':
      return { order: buildOrder(level) }
    case 'architecture':
      return { order: level.nodes.map((node) => node.id) }
  }
}

describe('bundled journeys', () => {
  for (const project of bundledProjects) {
    test(`${project.id} is a valid, solvable definition`, () => {
      const result = validateProject(JSON.parse(JSON.stringify(project)))
      assert.deepEqual(result.ok ? [] : result.errors, [])
    })

    test(`${project.id}: every level passes with the right answer and fails with a wrong one`, () => {
      for (const level of project.levels) {
        assert.equal(verifyLevel(level, perfectSubmission(level)).ok, true, `${level.id} should pass`)
        if (level.kind === 'edit' || level.kind === 'bugfix') assert.equal(verifyLevel(level, { code: level.starter }).ok, false, `${level.id} starter should fail`)
        if (level.kind === 'command') assert.equal(verifyLevel(level, { commands: level.steps.map(() => 'ls') }).ok, false)
        if (level.kind === 'architecture') assert.equal(verifyLevel(level, { order: level.nodes.map((node) => node.id).reverse() }).ok, false)
        if (level.kind === 'build') assert.equal(verifyLevel(level, { order: [...buildOrder(level)].reverse() }).ok, false)
      }
    })

    test(`${project.id}: architecture nodes only point at files the project really has`, () => {
      const finalFiles = filesBefore(project, project.levels.length)
      for (const level of project.levels.filter((item) => item.kind === 'architecture')) {
        for (const node of level.nodes) for (const path of node.files) assert.ok(finalFiles.has(path), `${node.id} → ${path}`)
      }
    })
  }

  test('the finished MERN project has every file from the PDF, and nothing generated', () => {
    const mern = bundledProjects.find((project) => project.id === 'mern-todo')
    const pushed = projectSnapshot(mern, mern.levels.length).map((file) => file.path)
    // Vite keeps index.html at the client root rather than in public/.
    for (const path of EXPECTED_PATHS.map((item) => (item === 'client/public/index.html' ? 'client/index.html' : item))) assert.ok(pushed.includes(path), path)
    assert.ok(pushed.includes('server/tests/todoController.test.js'))
    assert.ok(!pushed.some((path) => path.includes('node_modules') || path.endsWith('package-lock.json') || path.endsWith('/')))
  })

  test('files appear level by level', () => {
    const mern = bundledProjects.find((project) => project.id === 'mern-todo')
    const index = mern.levels.findIndex((level) => level.id === 'connect-db')
    const before = filesBefore(mern, index)
    assert.ok(before.has('server/package.json'))
    assert.ok(!before.has('server/config/db.js'))
    assert.ok(filesBefore(mern, index + 1).has('server/config/db.js'))
  })

  test('the learner’s own solution is what gets saved', () => {
    const mern = bundledProjects.find((project) => project.id === 'mern-todo')
    const index = mern.levels.findIndex((level) => level.id === 'env-file')
    const mine = 'PORT=5000\nMONGO_URI=mongodb+srv://cluster.example.net/todos\n'
    const files = projectSnapshot(mern, index + 1, { 'env-file': { files: { 'server/.env': mine } } })
    assert.equal(files.find((file) => file.path === 'server/.env').content, mine)
  })

  test('Django keeps empty __init__.py files and drops the venv', () => {
    const django = bundledProjects.find((project) => project.id === 'django-todo')
    const pushed = projectSnapshot(django, django.levels.length)
    assert.equal(pushed.find((file) => file.path === 'todos/migrations/__init__.py')?.content, '')
    assert.ok(!pushed.some((file) => file.path.startsWith('venv/') || file.path === 'db.sqlite3'))
  })
})

describe('commands', () => {
  const step = (accept, pattern) => ({ goal: 'g', hint: 'h', accept, pattern })

  test('npm install ignores package order, i/install and -D/--save-dev', () => {
    const install = step(['npm install express mongoose dotenv cors'])
    assert.ok(matchesStep(install, 'npm i cors dotenv mongoose express'))
    assert.ok(matchesStep(step(['npm install --save-dev jest']), 'npm i -D jest'))
    assert.ok(!matchesStep(install, 'npm install express'))
    assert.ok(!matchesStep(step(['npm init -y']), 'npm i -y'))
  })

  test('whitespace and quote style do not matter', () => {
    assert.ok(matchesStep(step(['npm pkg set scripts.dev="nodemon server.js"']), "  npm pkg set   scripts.dev='nodemon server.js' "))
  })

  test('patterns accept free-form parts', () => {
    assert.ok(matchesStep(step(['git commit -m "x"'], 'git commit -m ".+"'), "git commit -m 'first commit'"))
    assert.ok(!matchesStep(step(['git commit -m "x"'], 'git commit -m ".+"'), 'git commit'))
  })

  test('git identity takes any name and email', () => {
    const [name, email] = GIT_IDENTITY
    assert.ok(matchesStep(name, 'git config --global user.name "Priya Sharma"'))
    assert.ok(matchesStep(name, 'git config user.name priya'))
    assert.ok(!matchesStep(name, 'git config --global user.name'))
    assert.ok(matchesStep(email, 'git config --global user.email priya@example.com'))
    assert.ok(!matchesStep(email, 'git config --global user.email "priya"'))
  })

  test('the remote takes the learner’s own repository, over HTTPS or SSH, but never a token in the URL', () => {
    const remote = pushSteps('todo-app', 41)[0]
    assert.ok(matchesStep(remote, 'git remote add origin https://github.com/priya-s/todo-app.git'))
    assert.ok(matchesStep(remote, 'git remote add origin git@github.com:priya-s/my-todos.git'))
    assert.ok(!matchesStep(remote, 'git remote add origin https://ghp_abc123@github.com/priya-s/todo-app.git'))
    assert.ok(!matchesStep(remote, 'git remote add https://github.com/priya-s/todo-app.git'))
  })
})

describe('checks', () => {
  test('comments never count, strings survive', () => {
    const code = 'const url = "http://localhost:5000/api"; // app.use(express.json())\n/* process.exit(1) */'
    const stripped = stripComments(code, 'server.js')
    assert.ok(stripped.includes('http://localhost:5000/api'))
    assert.ok(!stripped.includes('express.json'))
    assert.ok(!stripped.includes('process.exit'))
    assert.ok(!stripComments('x = 1  # MONGO_URI=1', 'settings.py').includes('MONGO_URI'))
  })

  test('includes ignores whitespace and quote style', () => {
    const [result] = runChecks("router.post( '/',   createTodo )", 'routes.js', [{ id: 'a', name: 'n', hint: 'h', type: 'includes', value: 'router.post("/", createTodo)' }])
    assert.equal(result.passed, true)
  })
})

describe('folder tree parser', () => {
  test('reads the PDF tree with its comments', () => {
    const tree = parseTree(PDF_TREE)
    assert.equal(tree.root, 'todo-app')
    assert.deepEqual(tree.warnings, [])
    const files = tree.entries.filter((entry) => !entry.folder).map((entry) => entry.path)
    assert.deepEqual([...files].sort(), [...EXPECTED_PATHS].sort())
    assert.equal(tree.entries.find((entry) => entry.path === 'server/config/db.js').about, 'MongoDB connection')
    assert.equal(tree.entries.find((entry) => entry.path === 'client').about, 'React frontend')
  })

  test('recovers the structure when the line breaks were lost', () => {
    const tree = parseTree(PDF_TREE_ONE_LINE)
    assert.equal(tree.warnings.length, 1)
    const files = tree.entries.filter((entry) => !entry.folder).map((entry) => entry.path)
    assert.deepEqual([...files].sort(), [...EXPECTED_PATHS].sort())
  })

  test('also reads indented outlines and plain path lists', () => {
    const outline = parseTree('server/\n  models/\n    Todo.js  # schema\n  server.js\nREADME.md')
    assert.deepEqual(outline.entries.filter((entry) => !entry.folder).map((entry) => entry.path), ['server/models/Todo.js', 'server/server.js', 'README.md'])
    // A single folder holding everything is the project root, like "todo-app/" in the PDF.
    assert.equal(parseTree('todo-app/\n  server.js').root, 'todo-app')
    const list = parseTree('server/models/Todo.js # schema\nserver/server.js')
    assert.deepEqual(list.entries.filter((entry) => !entry.folder).map((entry) => entry.path), ['server/models/Todo.js', 'server/server.js'])
    assert.equal(parseTree('../etc/passwd').entries.length, 0)
  })
})

describe('journey generator', () => {
  test('parses the request flow and its return trip', () => {
    const flow = parseFlow(PDF_FLOW)
    assert.deepEqual(flow.nodes.map((node) => node.label), ['React component', 'api.js', 'route', 'controller', 'model', 'MongoDB'])
    assert.equal(flow.returnTrip, 'Then back the same way.')
  })

  test('turns the PDF tree and flow into a valid journey, data layer first', () => {
    const { project, warnings } = scaffoldProject({ id: 'mern-todo-draft', track: 'mern', title: 'Todo App', tree: PDF_TREE, flow: PDF_FLOW })
    const result = validateProject(JSON.parse(JSON.stringify(project)))
    assert.deepEqual(result.ok ? [] : result.errors, [])
    assert.equal(project.projectName, 'todo-app')

    const order = project.levels.map((level) => level.id)
    assert.equal(order[0], 'project-root')
    const at = (id) => order.indexOf(id)
    assert.ok(at('server-config') < at('server-models'), order.join(' '))
    assert.ok(at('server-models') < at('server-controllers'))
    assert.ok(at('server-controllers') < at('server-routes'))
    assert.ok(at('server-routes') < at('server-entry'), 'server.js wires everything, so it comes after the folders it wires')
    assert.ok(at('server-entry') < at('client-src-services'), 'server before client')
    assert.ok(at('client-src-services') < at('client-src-components'))
    assert.equal(order[order.length - 1], 'trace-request')

    const architecture = project.levels.at(-1)
    const filesOf = (id) => architecture.nodes.find((node) => node.id === id).files
    assert.deepEqual(filesOf('api-js'), ['client/src/services/api.js'])
    assert.deepEqual(filesOf('mongodb'), ['server/config/db.js'])
    assert.ok(filesOf('react-component').includes('client/src/components/TodoForm.jsx'))
    assert.deepEqual(warnings, ['Some files have no "# explanation" in the tree; they got a placeholder.'])
  })
})

describe('glossary', () => {
  for (const project of bundledProjects) {
    test(`${project.id}: every glossary term is used by at least one level`, () => {
      const used = new Set(project.levels.flatMap((level) => termsFor(project.glossary, level).map((entry) => entry.term)))
      assert.deepEqual(project.glossary.map((entry) => entry.term).filter((term) => !used.has(term)), [])
    })
  }

  test('a level shows the terms its code uses, and only those', () => {
    const mern = bundledProjects.find((project) => project.id === 'mern-todo')
    const terms = termsFor(mern.glossary, mern.levels.find((level) => level.id === 'connect-db')).map((entry) => entry.term)
    for (const expected of ['mongoose.connect', 'process.env', 'async / await', 'try / catch', 'module.exports']) assert.ok(terms.includes(expected), expected)
    for (const unexpected of ['useEffect', '201', 'jest.mock']) assert.ok(!terms.includes(unexpected), unexpected)
  })

  test('numbers and dotted names match as whole tokens', () => {
    const level = { kind: 'architecture', lesson: 'status 2010 and todo._id and res.status(201)', nodes: [] }
    const glossary = [{ term: '201', definition: 'd', match: ['(201)'] }, { term: '_id', definition: 'd' }, { term: '20', definition: 'd' }]
    assert.deepEqual(termsFor(glossary, level).map((entry) => entry.term), ['201', '_id'])
  })
})

describe('admin', () => {
  const shell = (levels) => ({ id: 'demo', track: 'mern', title: 'Demo', summary: 'Demo', projectName: 'demo', folders: {}, worlds: [{ id: 'one', title: 'One', subtitle: '', theme: 'village' }, { id: 'two', title: 'Two', subtitle: '', theme: 'forest' }], levels })

  test('every "Add level" template is valid on its own', () => {
    for (const kind of ['explore', 'command', 'edit', 'bugfix', 'build', 'architecture']) {
      const result = validateProject(shell([levelTemplate(kind, `new-${kind}`, 'one')]))
      assert.deepEqual(result.ok ? [] : result.errors, [], kind)
    }
  })

  test('levels must follow the world order', () => {
    const result = validateProject(shell([levelTemplate('explore', 'a', 'two'), levelTemplate('explore', 'b', 'one')]))
    assert.equal(result.ok, false)
    assert.match(result.errors.join(' '), /earlier world/)
  })

  test('a broken reference solution is caught', () => {
    const level = { ...levelTemplate('edit', 'broken', 'one'), solution: 'const total = 3;\n' }
    const result = validateProject(shell([level]))
    assert.match(result.ok ? '' : result.errors.join(' '), /solution fails check "total"/)
  })
})

describe('progress', () => {
  const project = bundledProjects[0]
  const row = (levelId, completedAt = '2026-10-05T10:00:00Z', stars = 3) => ({ projectId: project.id, levelId, stars, xp: 50, completedAt })

  test('levels unlock one at a time', () => {
    assert.ok(isUnlocked(project, 0, {}))
    assert.ok(!isUnlocked(project, 1, {}))
    assert.ok(isUnlocked(project, 1, { [project.levels[0].id]: row(project.levels[0].id) }))
  })

  test('a passed level stays open when a new level is added before it', () => {
    const last = project.levels.length - 1
    const done = Object.fromEntries(project.levels.filter((_, index) => index !== last - 1).map((level) => [level.id, row(level.id)]))
    assert.ok(isUnlocked(project, last - 1, done))
    assert.ok(isUnlocked(project, last, done))
  })

  test('a learner an admin opened every level for can start anywhere', () => {
    const last = project.levels.length - 1
    assert.ok(!isUnlocked(project, last, {}))
    assert.ok(isUnlocked(project, last, {}, true))
  })

  test('every journey ends by pushing to GitHub', () => {
    for (const journey of bundledProjects) {
      const ids = journey.levels.map((level) => level.id)
      assert.ok(ids.indexOf('ship-it') >= 0 && ids.indexOf('push-github') === ids.indexOf('ship-it') + 1, journey.id)
    }
  })

  // Days are the learner's own calendar days (local time), so these use local dates.
  const at = (day, hour = 8) => new Date(2026, 9, day, hour).toISOString()

  test('streaks count consecutive days ending today or yesterday', () => {
    const now = new Date(2026, 9, 5, 12)
    assert.equal(streakDays([row('a', at(5)), row('b', at(4)), row('c', at(2))], now), 2)
    assert.equal(streakDays([row('a', at(4))], now), 1)
    assert.equal(streakDays([row('a', at(1))], now), 0)
  })

  test('a level passed late at night counts for that local day', () => {
    const now = new Date(2026, 9, 5, 9)
    assert.equal(streakDays([row('a', at(4, 23)), row('b', at(5, 0))], now), 2)
    assert.equal(activityByDay([row('a', at(4, 23)), row('b', at(4, 1))]).get('2026-10-04'), 2)
  })

  test('the longest streak is the longest run of active days', () => {
    assert.equal(longestStreak([]), 0)
    assert.equal(longestStreak([row('a', at(1)), row('b', at(2)), row('c', at(3)), row('d', at(5)), row('e', at(6))]), 3)
    // Several levels on one day still count once, and month ends roll over.
    assert.equal(longestStreak([row('a', new Date(2026, 8, 30).toISOString()), row('b', at(1)), row('c', at(1, 20))]), 2)
  })

  test('the player level rises every 500 XP', () => {
    assert.deepEqual(playerLevelFor(0), { level: 1, into: 0, size: 500 })
    assert.deepEqual(playerLevelFor(1250), { level: 3, into: 250, size: 500 })
  })

  test('posts are hard to climb: one or two small projects make a Trainee, not a Developer', () => {
    assert.equal(postFor(0).title, 'Intern')
    const mernTodo = bundledProjects.find((journey) => journey.id === 'mern-todo')
    assert.equal(postFor(mernTodo.levels.reduce((sum, level) => sum + xpFor(level), 0)).title, 'Trainee')
    assert.equal(postFor(2325).title, 'Trainee')
    assert.equal(postFor(4999).title, 'Trainee')
    assert.equal(postFor(5000).title, 'Junior Developer')
    assert.equal(postFor(11_999).title, 'Junior Developer')
    assert.equal(postFor(1_000_000).title, POSTS.at(-1).title)
    assert.equal(postFor(1_000_000).next, null)
    const trainee = postFor(1500 + 1750)
    assert.equal(trainee.toNext, 5000 - 3250)
    assert.equal(trainee.progress, 0.5)
    for (let index = 1; index < POSTS.length; index++) assert.ok(POSTS[index].xp > POSTS[index - 1].xp)
  })

  test('achievements come from progress', () => {
    const earned = achievementsFor([project], [row('big-picture'), row('model-bug-hunt')])
    assert.equal(earned.find((item) => item.id === 'first-steps').current, 1)
    assert.equal(earned.find((item) => item.id === 'boss-slayer').current, 1)
    assert.equal(earned.find((item) => item.id === 'bug-slayer').current, 1)
  })
})

describe('level drafts', () => {
  test('a passed level reopens from its saved solution, and the draft still solves it', () => {
    for (const project of bundledProjects) {
      for (const level of project.levels) {
        const verdict = verifyLevel(level, perfectSubmission(level))
        assert.equal(verdict.ok, true)
        const draft = draftFromSolution(level, verdict.solution)
        assert.ok(draft, `${level.id} has a draft`)
        assert.equal(draft.passed, true)
        assert.equal(verifyLevel(level, submissionOf(level, draft)).ok, true, `${level.id} draft should still pass`)
      }
    }
  })

  test('drafts are checked against the level, so a stale or forged one cannot break it', () => {
    const project = bundledProjects[0]
    const build = project.levels.find((level) => level.kind === 'build')
    const order = buildOrder(build)
    const draft = readDraft({ slots: [order[0], order[0], 'nope', 42], hints: -3, wrong: 2.5, extra: true }, build)
    assert.equal(draft.slots.length, order.length)
    assert.equal(draft.slots[0], order[0])
    assert.equal(draft.slots[1], null, 'a block can only be used once')
    assert.equal(draft.slots[2], null, 'unknown blocks are dropped')
    assert.equal(draft.hints, 0)
    assert.equal(draft.wrong, 0)
    assert.equal(readDraft(null, build), null)
    assert.equal(readDraft([1, 2], build), null)

    const explore = project.levels.find((level) => level.kind === 'explore' && level.quiz)
    assert.equal(readDraft({ answer: 99 }, explore).answer, null)
    assert.equal(readDraft({ answer: 1 }, explore).answer, 1)
  })

  test('learner files keep only safe paths', () => {
    assert.ok(isLearnerPath('notes.md'))
    assert.ok(isLearnerPath('server/utils/helpers.js'))
    for (const bad of ['', '/etc/passwd', '../x', 'a//b', 'a\\b', 'a/./b', 'bad<name>.js']) assert.ok(!isLearnerPath(bad), bad)
    const files = readLearnerFiles({ files: { 'ok.md': 'hi', '../evil': 'x', 'n.md': 5 }, folders: ['src/', 'src/', 'noslash', '../up/'] })
    assert.deepEqual(files, { files: { 'ok.md': 'hi' }, folders: ['src/'] })
    assert.deepEqual(readLearnerFiles('junk'), { files: {}, folders: [] })
  })
})
