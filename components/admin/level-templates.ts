import type { Level, LevelKind } from '@/lib/journeys/types'

/** A small, valid level of each kind for the admin's "Add level". Every one passes validation as is. */
export function levelTemplate(kind: LevelKind, id: string, world: string): Level {
  const base = { id, world, summary: 'One line about this level for the map.', lesson: 'Explain the idea here. Blank lines start new paragraphs, lines starting with "- " are bullets, and `backticks` mark code.' }
  switch (kind) {
    case 'explore':
      return {
        ...base,
        kind,
        title: 'New concept level',
        adds: [{ path: 'docs/notes.md', about: 'What this file is for.', content: '# Notes\n' }],
        quiz: { question: 'Ask something the files answer.', options: ['A wrong answer', 'The right answer'], answer: 1, explain: 'Why the right answer is right.' },
      }
    case 'command':
      return {
        ...base,
        kind,
        title: 'New terminal level',
        cwd: '',
        steps: [{ goal: 'Describe what to do, not the command.', hint: 'A clue about the command.', accept: ['mkdir docs'], adds: [{ path: 'docs/', about: 'Created by mkdir.' }], explain: 'What just happened.' }],
      }
    case 'edit':
    case 'bugfix':
      return {
        ...base,
        kind,
        title: kind === 'bugfix' ? 'New bug hunt' : 'New code level',
        path: 'src/example.js',
        about: 'What this file does.',
        starter: kind === 'bugfix' ? 'const total = 1 - 1;\n\nmodule.exports = total;\n' : '// TODO: set total to 1 + 1\n\nmodule.exports = total;\n',
        solution: 'const total = 1 + 1;\n\nmodule.exports = total;\n',
        checks: [{ id: 'total', name: 'total adds the numbers', hint: 'Use + to add.', type: 'includes', value: 'const total = 1 + 1' }],
      }
    case 'build':
      return {
        ...base,
        kind,
        title: 'New build level',
        path: 'src/handler.js',
        about: 'The file the learner assembles.',
        scaffold: [
          { type: 'line', text: 'const handler = (req, res) => {' },
          { type: 'slot', slot: 1, indent: 2 },
          { type: 'slot', slot: 2, indent: 2 },
          { type: 'line', text: '};' },
        ],
        blocks: [
          { id: 'read', label: 'Read the input', code: 'const { name } = req.body;', what: 'Pulls name out of the body.' },
          { id: 'respond', label: 'Respond', code: 'return res.json({ name });', what: 'Sends it back.' },
          { id: 'bad-respond', label: 'Respond', code: 'res.json(req.body);', what: 'Sends the body back.', whyWrong: 'Echoes everything the client sent.' },
        ],
        steps: [
          { kind: 'Request input', goal: 'Read what the client sent.' },
          { kind: 'Response', goal: 'Answer the client.' },
        ],
      }
    case 'architecture':
      return {
        ...base,
        kind,
        boss: true,
        title: 'Trace a request',
        nodes: [
          { id: 'client', label: 'Client', role: 'Sends the request.', files: [] },
          { id: 'server', label: 'Server', role: 'Answers it.', files: [] },
        ],
        returnTrip: 'Then back the same way.',
      }
  }
}
