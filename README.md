# CodeFlow

CodeFlow teaches backend development by building real projects, level by level. A learner picks a
tech stack (MERN, Django or Spring Boot), then works through a journey: typing real setup commands,
filling in code, arranging logic blocks and fixing planted bugs. Every level adds files to a real
project, which the learner can push to their own GitHub repository from inside the app.

- **Learners**: the map at `/`, levels at `/learn/<journey>/<level>`, profile at `/profile`
- **Admins**: see every learner's progress and create or edit journeys at `/admin`
- **Logic challenges**: `/challenge/signup`

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4 and PostgreSQL (Supabase), using `pg`
directly with no ORM.

---

## 1. Run it locally

### Prerequisites

- **Node.js 20.18 or newer** (22 LTS recommended)
- **npm** (comes with Node). pnpm 9 also works.
- A **PostgreSQL** database. The team uses Supabase; any Postgres 14+ works.
- **Git**

### Steps

```bash
git clone https://github.com/Anubhavsaxena2004/codeflow.git
cd codeflow
npm install
cp .env.example .env.local      # Windows (cmd): copy .env.example .env.local
```

Fill in `.env.local` (see [Environment variables](#2-environment-variables)). At minimum set
`DATABASE_URL`. Then create the tables and start the app:

```bash
npm run db:migrate              # creates or updates the tables; safe to run again
npm run dev                     # http://localhost:3000
```

Open http://localhost:3000, create an account and pick a stack. The MERN Todo journey is ready to
play.

The **Admin** link in the sidebar opens `/admin`. While `ADMIN_EMAILS` is empty, every signed-in
user can open it; see [Admin access](#admin-access).

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload on http://localhost:3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build (run `build` first) |
| `npm run db:migrate` | Apply new files from `db/migrations/` to `DATABASE_URL`, in order, once each |
| `npm run test:journeys` | Check the journey engine and prove every bundled level is solvable |
| `npm run test:github` | Check the GitHub integration against a mocked GitHub (no network) |
| `npx tsc --noEmit` | Type-check (the build skips type errors, so run this before pushing) |

---

## 2. Environment variables

Locally they live in `.env.local`, which is gitignored and must never be committed. On Vercel they go
under **Project → Settings → Environment Variables**.

| Variable | Needed for | Where it comes from |
| --- | --- | --- |
| `DATABASE_URL` | Everything that saves | Supabase → **Connect** (see below) |
| `DATABASE_POOL_MAX` | Optional | Connections per server process (default 5). Use `1` on Vercel |
| `DATABASE_CA_CERT_PATH` | Optional | Path to the database's CA certificate, for full TLS verification |
| `ADMIN_EMAILS` | Optional | Comma-separated emails of admins, e.g. `you@example.com,teammate@example.com`. **Empty means every signed-in user can open `/admin`** |
| `TOKEN_ENCRYPTION_KEY` | GitHub push | Any random string of 16+ characters. **Never change it once set**: stored GitHub connections become unreadable |
| `GITHUB_CLIENT_ID` | Optional | Your GitHub OAuth app, for the one-click **Connect GitHub** button (see section 4) |
| `GITHUB_CLIENT_SECRET` | Optional | Your GitHub OAuth app |
| `GITHUB_REDIRECT_URI` | Optional | Only if the app is behind a proxy. Defaults to `<site>/api/github/callback` |

Generate a `TOKEN_ENCRYPTION_KEY` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

---

## 3. The database (Supabase)

Copy the connection string from **Supabase → your project → Connect**. Use a **pooler** string, not
the "Direct connection" one: the direct host `db.<ref>.supabase.co` is IPv6-only and fails on many
networks and on Vercel.

| Where | Connection | Port | Also set |
| --- | --- | --- | --- |
| Your machine (`.env.local`) and migrations | **Session pooler** | `5432` | — |
| Vercel | **Transaction pooler** | `6543` | `DATABASE_POOL_MAX=1` |

The format is:

```
postgres://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

URL-encode special characters in the password (`!` → `%21`, `@` → `%40`, `#` → `%23`).

Why two ports? Each Vercel function instance opens its own connections, and the session pooler only
allows a few clients in total, so a handful of visitors can exhaust it and sign-in starts failing.
The transaction pooler shares connections between requests. The app has been tested against both.

**Migrations** are SQL files in `db/migrations/`. Vercel does not run them: run `npm run db:migrate`
from your machine against the same database before deploying code that needs a new table. Each
file runs once, and `schema_migrations` records what has been applied.

Supabase serves the `public` schema over its Data API, and by default anyone holding the publishable
key can read and write new tables there. Migration `004_lock_down_data_api.sql` blocks that for every
CodeFlow table. **Any migration that adds a table must also enable row level security on it.**

---

## 4. GitHub push

Learners push the project they built to **their own** GitHub repository from the GitHub view (the
branch icon in any level). Every learner connects their own GitHub account, and their token is
stored encrypted in `github_connections`, one row per CodeFlow user, so 15 or 1,500 learners each
push to their own repositories. The only server setting it needs is `TOKEN_ENCRYPTION_KEY`.

A learner connects in one of two ways:

| Way | What the learner does | What you set up |
| --- | --- | --- |
| **Personal access token** | Creates a token on GitHub (the panel links straight to the page, with the `repo` scope ticked) and pastes it into the GitHub view | Nothing |
| **Connect GitHub** button | Clicks it and approves CodeFlow on GitHub | One OAuth app for the whole site (below) |

`GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` identify **CodeFlow** to GitHub, not a learner. One
OAuth app serves every learner; nobody needs their own. Without them, the button is hidden and the
GitHub view shows only the token form.

To add the button:

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
2. **Homepage URL**: `http://localhost:3000` (or your deployed URL)
3. **Authorization callback URL**: `http://localhost:3000/api/github/callback` (or
   `https://<your-domain>/api/github/callback`)
4. Copy the **Client ID**, generate a **Client secret**, and set `GITHUB_CLIENT_ID` and
   `GITHUB_CLIENT_SECRET`. Restart the server (or redeploy on Vercel).

An OAuth app has a single callback URL, so make **one app for local development and one for
production**. Details: [docs/github-integration.md](docs/github-integration.md).

Both journeys also end with a **Push to GitHub** level that teaches the same thing on the command
line: create an empty repository, create a token, then `git remote add origin`, `git branch -M main`
and `git push -u origin main`. Each project's own README.md lists every command.

---

## 5. Deploy to Vercel

1. Import the GitHub repository in Vercel. The framework (Next.js) and build command are detected.
2. Add the environment variables from section 2 for **Production**, using the **transaction pooler**
   `DATABASE_URL` plus `DATABASE_POOL_MAX=1`.
3. Run `npm run db:migrate` from your machine against that database.
4. Deploy. Every push to `main` deploys again.

**"A variable with the name … already exists"**: the variable is already set. Don't add it again.
In **Settings → Environment Variables**, find it, open its **⋯** menu and choose **Edit**. Leave
`TOKEN_ENCRYPTION_KEY` as it is unless you mean to disconnect everyone's GitHub.

**Changed a variable?** It only applies to new deployments. Go to **Deployments**, open the latest
one's **⋯** menu and choose **Redeploy**.

---

## 6. Running it for a group of learners

For a class or a pilot (say 15 people), one deployment serves everyone. Each learner has their own
account, progress and GitHub connection.

1. **Deploy** (section 5) with `DATABASE_URL` on the transaction pooler, `DATABASE_POOL_MAX=1` and
   `TOKEN_ENCRYPTION_KEY`. Optionally add the GitHub OAuth app (section 4).
2. **Check it yourself first**: sign up, pick MERN, pass the first level, and open `/admin` to see
   yourself under **Learners**.
3. **Share the site link.** Each learner signs up with their own email (no invitations needed) and
   picks a stack. Don't share one account: progress and the GitHub connection belong to the account.
4. **GitHub**: in any level, the learner opens the GitHub view and pastes a token (or clicks
   **Connect GitHub**). The **Push to GitHub** level near the end walks them through it.
5. **Follow along** at `/admin` → **Learners**: the level each learner is on, XP, GitHub account and
   repository, last activity, and how many learners passed each level. It refreshes every minute,
   and **CSV** downloads the table.
6. **Reviewers and mentors** who need to jump to any level: expand them under **Learners** and tick
   **Open every level**. They can then open and attempt levels in any order; a level still only
   counts once it is solved.

The free Supabase plan handles a group this size. It pauses after a week with no activity, so
open the site before a session if it has been quiet (see Troubleshooting).

### Admin access

`/admin` shows every learner's name and email and lets you edit journeys for everyone. It always
requires signing in.

- `ADMIN_EMAILS` **empty** (the default): every signed-in user is an admin. Handy while you set
  things up; anyone with an account can see the learner list and edit journeys.
- `ADMIN_EMAILS=you@example.com,teammate@example.com`: only those accounts. Set it before you share
  the site widely, then redeploy.

---

## 7. Where things are

```
app/                    pages and API routes (App Router)
  page.tsx              the journey map (home)
  learn/                level pages: /learn/<journey>/<level>
  admin/                admin dashboard and journey editor
  api/                  auth, progress, journeys, admin, GitHub
components/
  journey/              the level workspace (mission panel, terminal, architecture board)
  home/                 island map, stack picker, profile
  admin/                admin dashboard and editor
  ide/                  VS Code-style pieces shared by levels and challenges
data/
  journeys/             journeys that ship with the app (MERN Todo, Django Todo)
  challenges/           the block challenges (Signup Flow)
lib/
  journeys/             journey engine: validation, checks, commands, file snapshots, XP
  github/               GitHub OAuth and push
  server/               database, auth and the journey catalog
db/migrations/          SQL migrations, applied in name order
docs/                   how journeys and the GitHub integration work
```

- **How journeys, levels and files are added or edited**: [docs/journeys.md](docs/journeys.md)
- **How the GitHub integration works**: [docs/github-integration.md](docs/github-integration.md)

---

## 8. Troubleshooting

**Sign-in says the server "could not reach the database"** (or the console shows a 500 from
`/api/auth/login`). The real error is in the server log: your terminal locally, or Vercel →
**Logs** in production. The usual causes:

- `DATABASE_URL` is missing or wrong, or the password has unencoded special characters.
- It uses the IPv6-only direct host. Switch to a pooler string.
- `max clients reached` on Vercel. Switch to the transaction pooler (6543) with `DATABASE_POOL_MAX=1`.
- The Supabase project is **paused**. Free projects pause after a week without activity; restore it
  from the Supabase dashboard.

**`relation "…" does not exist`**: run `npm run db:migrate` against that database.

**The GitHub view only shows a token form**: the OAuth app isn't configured. Tokens work on their
own; to add the **Connect GitHub** button, see section 4.

**"This token is missing the repo scope"**: create a new classic token with **repo** ticked (the link
in the GitHub view opens GitHub with it ticked). A fine-grained token needs **Contents** and
**Administration** set to *Read and write* for CodeFlow to create the repository.

**"The server has no TOKEN_ENCRYPTION_KEY"**: set it (section 2) and redeploy.

**pnpm fails with "packages field missing or empty"**: use `npm install`, or pnpm 9.

**`EBADENGINE` warnings during install**: upgrade Node to 20.18 or newer (22 LTS recommended).

**A shared demo account and GitHub**: anyone who knows a shared account's password can push to the
GitHub account connected to it. After a demo, open the GitHub view and click **Disconnect**.
