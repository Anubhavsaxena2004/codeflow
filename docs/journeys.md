# Journeys: how projects, levels and files are added

A **journey** is one project (e.g. the MERN Todo App) that a learner builds level by level.
Every level adds or changes files, so the explorer on the left grows the way a real project
does: `npm init -y` makes `package.json` appear, `django-admin startproject config .` makes
`manage.py` and `config/` appear, and so on. What the learner writes is saved and can be
pushed to their own GitHub repo.

- `lib/journeys/` is the engine: types, validation, checks, command matching, the file snapshot, XP and progress.
- `data/journeys/` holds the journeys that ship with the code (`mern-todo.ts`, `django-todo.ts`).
- `app/admin/` and `components/admin/` hold the admin UI; `app/api/admin/` holds the admin API.
- `components/journey/` is the learner workspace; `components/home/` is the map and profile.
- `db/migrations/003_journeys.sql` holds the storage.

## Before and after

Before this, every flow was hard-coded: the challenge lived in `data/challenges/signup.ts`, was
registered by hand in `data/challenges/index.ts`, had its own route file, and the home page cards were
a hard-coded array. Mentor mode could preview pasted JSON but never saved it.

Now content is data. A journey is one JSON document. It ships in `data/journeys/` or lives in the
`journey_projects` table, and admins create and edit it in the browser. No deploy is needed to add or
change a journey.

## Where content comes from

| Source | Where it lives | Who changes it |
| --- | --- | --- |
| Bundled | `data/journeys/*.ts`, listed in `data/journeys/index.ts` | Developers, through a PR |
| Edited | a `journey_projects` row with the same id as a bundled journey | Admins. It replaces the bundled version for everyone |
| Custom | a `journey_projects` row with a new id | Admins |

"Revert to bundled" in the editor deletes the row, so the shipped version comes back. Without a
database, or before the migration has run, the bundled journeys still work.

## The admin workflow

1. Open `/admin` (the **Admin** link in the sidebar). While `ADMIN_EMAILS` is empty every signed-in
   user is an admin; list emails there (comma-separated) to limit it to them.
2. On `/admin`, under **New journey**, give a topic, a stack, the folder tree and the request flow:

   ```
   todo-app/
   ├── server/                  # Node + Express backend
   │   ├── models/
   │   │   └── Todo.js          # Mongoose schema
   │   └── server.js            # entry point
   └── README.md
   ```
   `React component → api.js → route → controller → model → MongoDB, then back the same way.`

   The server parses the tree (box-drawing `tree` output, an indented outline, or one path per line;
   a tree pasted from a PDF with its line breaks lost also works) and places every file in its
   folder. Text after `# ` becomes the file's explanation. Each folder becomes a level. Levels are
   ordered data layer first: the side of the project holding the end of the flow comes first, and
   inside it the reverse of the flow (config → models → controllers → routes), then the entry file.
   The flow itself becomes the final architecture level, with each stop mapped to its files.
3. Review the draft (worlds, levels, finished file tree), then **Create as draft**.
4. In the editor, turn the generated "read these files" levels into real ones. Use **Add level** for
   a new level of any kind, or edit the fields:
   - **Terminal**: steps with accepted commands, terminal output and the files each command generates.
     "From tree" pastes many files at once.
   - **Code**: a starter with TODOs, a solution, and checks.
   - **Bug hunt**: the same, with bugs planted in the starter.
5. **Preview** plays any level exactly as a learner would, with nothing saved. Turn on **Published**
   and **Save**.

The editor validates on every change, and the server validates again on save. A journey can only be
saved if every level is solvable: each reference solution passes all its checks, each starter fails
at least one, each terminal step accepts its own first command, and the levels run through the
worlds in order.

## Level kinds

| Kind | What the learner does | Passes when |
| --- | --- | --- |
| `explore` | Opens the new files, answers a question | Every new file is opened and the answer is right |
| `command` | Types setup commands in the terminal; files appear as each one runs | Every step's command matches |
| `edit` | Completes the TODOs in a file | Every check passes |
| `bugfix` | Fixes bugs planted in a file | Every check passes |
| `build` | Drags code blocks into the slots of a file (some blocks are decoys) | The blocks are in order |
| `architecture` | Puts the stops of a request in order | The order is right |

**Checks** are static tests on the code, not executed code: `includes` / `excludes` (whitespace and
quote style don't matter) and `matches` / `notMatches` (a regex). Comments are stripped first, so
commenting a line out never passes a check. Running real code (Jest, pytest) in a sandbox would be the
next step up.

**Commands** match ignoring whitespace and quote style. `npm install`, `npm i` and `npm add` are
interchangeable, so are `-D` and `--save-dev`, and package order doesn't matter (same for `pip install`).
List alternatives such as `python`, `python3` and `py`, or OS-specific activation commands, in
`accept`. Use `pattern` for free-form parts like a commit message. The terminal also understands `ls`,
`cat`, `pwd`, `clear`, `hint` and `help`.

**Files**: a path ending in `/` is an empty folder (`mkdir`). `generated: true` marks tool output
(`node_modules/`, `venv/`, lock files): it is dimmed in the explorer and never pushed. A later level can
replace a file, and the explorer marks it `M`; new files are marked `U`.

## Progress, profiles and GitHub

- Learners pick a tech stack (`users.track`: mern, django or spring). The map shows that stack's
  journeys. Guests' stack and progress are kept in localStorage.
- Levels unlock in order. `POST /api/journeys/:id/levels/:levelId` re-verifies the submission on the
  server, refuses locked levels, and stores stars, XP and the learner's solution in `level_progress`.
  A passed level stays open, so adding a level in the middle of a journey never locks finished work.
  An admin can open every level for one learner (`users.all_levels_open`, migration 005, the
  **Open every level** switch under Learners); they can then attempt levels in any order.
- `/admin` starts with **Learners**: every account, the level each one is on, XP, GitHub and last
  activity, plus how many learners passed each level. It reads `users`, `level_progress`,
  `github_connections` and `github_repos`; nothing extra is stored.
- After each passed level, the project as it stands after the learner's furthest passed level,
  including their own code, is written to `user_project_files`. That is the table the GitHub
  integration pushes from, so the GitHub view in a level pushes the real project. `.env*`, `.git*` and
  `node_modules` are never stored or pushed.
- XP, ranks (500 XP each), streaks and achievements are derived from `level_progress`; nothing extra is
  stored.

## API

| Method | Endpoint | Who | What |
| --- | --- | --- | --- |
| GET | `/api/journeys?track=mern` | anyone | Published journeys for the map (no solutions) |
| GET | `/api/journeys/:id` | anyone | One published journey in full |
| POST | `/api/journeys/:id/levels/:levelId` | learner | `{ submission, wrongAttempts, hints }` passes a level |
| GET | `/api/progress` | learner | Challenge progress plus every passed level |
| PUT | `/api/profile` | learner | `{ track }` |
| GET / POST | `/api/admin/projects` | admin | List everything / create `{ definition, published }` |
| GET / PUT / DELETE | `/api/admin/projects/:id` | admin | Read / save `{ definition, published }` / delete or revert |
| POST | `/api/admin/scaffold` | admin | `{ id, track, title, tree, flow }` → a draft journey (not saved) |
| GET | `/api/admin/learners` | admin | Every learner with their journeys, passed levels and GitHub repo |
| PATCH | `/api/admin/learners/:id` | admin | `{ allLevelsOpen }` opens every level for that learner |

## Setup

```bash
pnpm db:migrate          # adds users.track, journey_projects, level_progress
pnpm test:journeys       # validates every bundled journey and the engine
```

On Supabase, migration 004 matters: Supabase serves the `public` schema through its Data API
and grants the `anon` role (anyone with the publishable key) full access to new tables by
default. 004 turns on row level security and revokes those grants, so only the server can
read users, sessions or GitHub tokens. Any new table needs the same treatment in its migration.

The admin is open to every signed-in user until `ADMIN_EMAILS=you@example.com` is set.

## Adding a bundled journey in code

Write `data/journeys/<id>.ts` exporting a `Project` (see `lib/journeys/types.ts`; the MERN journey is
the reference), add it to `data/journeys/index.ts`, and run `pnpm test:journeys`. The tests prove every
level is solvable and that architecture levels only point at files that exist. Alternatively, build it
in the admin and **Export** the JSON.
