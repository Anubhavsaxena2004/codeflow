# GitHub Integration

Lets a signed-in learner push the project they are building (their `user_project_files`)
to **their own** GitHub repo, with a real commit history — then `git clone` and run it.

All new code lives in new files only:

- `lib/github/` — the service module wrapping every GitHub REST call (fetch-based, no SDK)
- `app/api/github/` — the six API endpoints
- `db/migrations/002_github_integration.sql` — storage tables
- `lib/github/__tests__/` — unit tests with mocked GitHub responses

## Setup

### 1. Environment variables

Add to `.env.local`:

```bash
# OAuth app credentials (GitHub → Settings → Developer settings → OAuth Apps)
GITHUB_CLIENT_ID=Iv1.xxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Passphrase used to derive the AES-256-GCM key that encrypts
# access tokens at rest. 16+ characters; keep it in the server env only.
TOKEN_ENCRYPTION_KEY=a-long-random-string-at-least-16-chars

# Optional. Defaults to <app origin>/api/github/callback.
# Set it explicitly if the app is served behind a proxy.
# GITHUB_REDIRECT_URI=https://myapp.example.com/api/github/callback
```

The access token is stored **server-side only**, encrypted with AES-256-GCM
(per-record random salt + IV, key derived via scrypt from `TOKEN_ENCRYPTION_KEY`).
It is never sent to the browser or written to localStorage.

### 2. Register the OAuth app

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**
2. **Homepage URL**: your app's origin, e.g. `http://localhost:3000`
3. **Authorization callback URL**: `<origin>/api/github/callback`
   (e.g. `http://localhost:3000/api/github/callback`)
4. Copy **Client ID** and generate a **Client Secret** into `.env.local`.

Scope requested: `repo` (needed to create repos and push via the Git Data API).

### 3. Apply the migration

```bash
npm run db:migrate
```

This creates `user_project_files`, `github_connections`, `github_repos` and
`github_oauth_states`. (The migration runner picks up any new file in
`db/migrations/` automatically, in name order.)

## API

All endpoints require the normal user session cookie.

| Method | Endpoint | Body / query | Result |
| --- | --- | --- | --- |
| GET | `/api/github/status` | `?journeyId=` optional | `{ connected, login, repo, repos }` |
| POST | `/api/github/connect` | — | `{ url }` — GitHub OAuth authorize URL |
| GET | `/api/github/callback` | `code`, `state` (GitHub) | 303 redirect to `/?github=connected` or `/?github=error&reason=…` |
| DELETE | `/api/github/connection` | — | `{ ok: true }` — deletes the stored token |
| POST | `/api/github/push` | `{ journeyId, message?, stageName?, repoName?, existingRepo? }` | structured push result |
| PUT | `/api/github/push/file` | `{ journeyId, path, message?, challengeId?, challengeTitle? }` | structured push result |
| POST | `/api/github/resolve` | `{ journeyId }` | `{ ok, remoteSha, branch }` — accept the remote head as the new base after a conflict |

Push results are structured: `{ ok, commitSha, pushedFiles, excludedFiles }` on
success; on failure `{ ok: false, error, message, … }` where `error` is one of
`repo_missing`, `no_push_access`, `secrets`, `empty`, `invalid_path`,
`rate_limited`, `auth`, `github` — or a conflict:

```json
{ "ok": false, "conflict": true, "remoteSha": "…", "expectedSha": "…", "branch": "main", "message": "…" }
```

The UI can link `remoteSha` vs `expectedSha` to a GitHub compare URL
(`https://github.com/{owner}/{repo}/compare/{expectedSha}...{remoteSha}`) and let
the learner review before re-pushing. **Nothing is overwritten on conflict.**

To recover: the learner reviews the diff on GitHub, then calls
`POST /api/github/resolve` with the `journeyId`. That stores the remote head as
the new base, and the next push layers the saved files on top of it — files that
only exist on GitHub are kept, files that are part of the project are updated to
the saved version.

## Push flows

**Bulk push** (primary — whole project, one atomic commit):

1. `GET /repos/{owner}/{repo}` — verify the repo exists and the user can push
2. `GET /git/ref/heads/{branch}` + `GET /git/commits/{sha}` — read HEAD sha + tree
3. Conflict check: HEAD sha must equal the stored `last_commit_sha`
4. Filter out `.env*`, `.git*`, `node_modules/**`; scan for secrets
5. `POST /git/blobs` per file (base64) → `POST /git/trees` with
   `base_tree` = HEAD tree, one `100644` blob entry per file →
   `POST /git/commits` with `parents: [HEAD]` → `PATCH /git/refs/heads/{branch}`
   with `force: false` (a moved branch is rejected → conflict, never a lost commit)
6. Empty repo (no ref yet): the commit has no parents and the branch is created
   with `POST /git/refs`

**Single-file push**: `GET /contents/{path}?ref={branch}` for the existing sha
(404 → new file), then `PUT /contents/{path}` with `{ message, content (base64),
branch, sha? }`.

**Commit messages**

- Per-challenge: `feat: build <path> — <challenge title>`
- Bulk/milestone: `feat: complete <stage name> stage`

**Repo management**: on first push the app creates a repo via `POST /user/repos`
(`auto_init: true`, name defaults to `<journey>-app`, override with `repoName`),
or the user passes `existingRepo: "owner/name"` — ownership is verified via the
repo's `permissions.push` before linking. Owner/repo/branch are stored per
(user, journey); the branch defaults to the repo's `default_branch` (`main`).

**Rate limits**: every response's `x-ratelimit-remaining` is checked; at 0 (or a
configurable floor) the push stops with `rate_limited` + `retryAt`. Transient
5xx responses are retried once after 1 s.

## Tests

No test framework is installed, so the suite uses Node's built-in runner
(Node 24 runs the TypeScript modules directly via type stripping):

```bash
node --import ./lib/github/__tests__/register.mjs --test lib/github/__tests__/*.test.mjs
```

Covers: file filtering, path validation, secret scanning, base64 handling, tree
building, commit message formatting, token encryption round-trip, client error
mapping/rate limits, and both push strategies — including the conflict path —
against mocked GitHub responses (a queue-based `fetch`; no network).

## Manual end-to-end test (throwaway repo)

1. Run the app locally with the env vars above and `npm run db:migrate`.
2. Sign in, then seed a couple of files (adjust ids/paths to your data):

   ```sql
   INSERT INTO user_project_files (user_id, journey_id, path, content)
   VALUES (1, 'mern-todo', 'server/routes/auth.js', 'export const auth = 1\n');
   ```

3. **Connect**: `POST /api/github/connect` → open the returned `url` → GitHub
   approves → you land back on `/?github=connected`.
4. **Bulk push**: `POST /api/github/push` with `{ "journeyId": "mern-todo", "stageName": "MERN skeleton" }`.
   Check your repo: `client/` + `server/` structure intact, one commit
   `feat: complete MERN skeleton stage`, no `node_modules`, no `.env`.
   `git clone` it and run it.
5. **Incremental push**: add another file to `user_project_files` and push again —
   a clean second commit on top.
6. **Conflict demo**: edit a file on github.com, then push again — the response is
   `{ ok: false, conflict: true, … }` and the remote edit is untouched.
7. **Secrets demo**: insert a file containing `const API_KEY = "sk-…"` and push —
   blocked with `error: "secrets"` and the offending path + line.
8. **Disconnect**: `DELETE /api/github/connection` — the stored token is gone.

When testing against your own account, delete the throwaway repo afterwards
(Settings → Danger Zone) so its history doesn't linger.
