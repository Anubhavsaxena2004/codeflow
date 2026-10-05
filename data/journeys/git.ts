import type { CommandStep, JourneyTerm } from '@/lib/journeys/types'

// Git and GitHub steps every journey ends with: who you are, then pushing to GitHub with a token.
// Shared so the MERN and Django journeys teach exactly the same commands.

export const GIT_TERMS: JourneyTerm[] = [
  { term: 'git config', definition: 'Sets git options. user.name and user.email are stamped on every commit; --global sets them for the whole computer.', match: ['git config'] },
  { term: 'remote (origin)', definition: 'A copy of the repository somewhere else, like GitHub. origin is the usual name for it: git remote add origin <url>.', match: ['git remote', 'origin main'] },
  { term: 'git branch -M main', definition: "Renames the current branch to main, GitHub's default branch name.", match: ['git branch -M', 'git branch -m'] },
  { term: 'git push -u', definition: 'Uploads your commits to the remote. -u remembers where the branch goes, so later a plain git push is enough.', match: ['git push'] },
  { term: 'git status', definition: 'Shows the branch, what changed, what is staged, and whether you are ahead of or behind the remote.', match: ['git status'] },
  { term: 'Personal access token', definition: 'A password-like key for GitHub, used instead of your account password by git and apps. Shown once; never commit it.', match: ['access token'] },
  { term: 'SSH key', definition: 'A key pair: the private key stays on your computer, the public .pub key goes to GitHub, and git pushes without a token.', match: ['ssh-keygen', 'SSH keys'] },
]

/** The first time git is used on a computer: who the commits are from. */
export const GIT_IDENTITY: CommandStep[] = [
  {
    goal: 'Tell git your name. It is stamped on every commit you make.',
    hint: 'git config --global user.name "Your Name" (quotes, because a name has a space)',
    accept: ['git config --global user.name "Ada Lovelace"'],
    pattern: 'git config (?:--global )?user\\.name (?:"[^"]+"|\\S+)',
    explain: '--global saves it for every repository on this computer, so you only do this once per machine.',
  },
  {
    goal: 'Tell git your email. Use the one on your GitHub account.',
    hint: 'git config --global user.email "you@example.com"',
    accept: ['git config --global user.email "ada@example.com"'],
    pattern: 'git config (?:--global )?user\\.email "?[^"\\s@]+@[^"\\s@]+\\.[^"\\s@]+"?',
    explain: 'GitHub matches this email to your account, so your commits show your name and picture.',
  },
]

/** What learners read before pushing: the repository, the token, and how to keep it safe. */
export const pushLesson = (repo: string) => `Your commits live only on this computer. GitHub keeps a copy online: a backup, a link you can share, and the start of pull requests and deploys.

On github.com, before you type anything:
- Click + (top right) → New repository. Name it ${repo} and leave "Add a README file" unticked, so the repository starts empty and takes your first push as it is.
- GitHub then shows "…or push an existing repository from the command line". Those are the commands you type in this level.

GitHub does not accept your account password for git. When \`git push\` asks for a password, paste a personal access token:
- GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token.
- Give it a name and an expiry, tick the repo scope, then click Generate token.
- Copy it straight away: GitHub shows it only once. Git's credential manager (part of Git for Windows and macOS) remembers it after the first push.

A token is a password. Never put it in code, a commit, .env or the remote URL. If one leaks, delete it on GitHub and make a new one. CodeFlow refuses to push files that contain a token.

Prefer SSH keys? Run \`ssh-keygen -t ed25519 -C "you@example.com"\`, add the public key (the .pub file) under GitHub → Settings → SSH and GPG keys, and use the git@github.com:your-username/${repo}.git address instead.

The GitHub view in CodeFlow (the branch icon on the left) can push this project for you with the same token: paste it there once.`

/** The three commands GitHub shows for an existing repository, plus a check that it worked. */
export const pushSteps = (repo: string, objects: number): CommandStep[] => [
  {
    goal: 'Connect this repository to the empty one you made on GitHub, under the name origin.',
    hint: `git remote add <name> <url>. The URL is on your new repository's page: https://github.com/your-username/${repo}.git`,
    accept: [`git remote add origin https://github.com/your-username/${repo}.git`],
    pattern: 'git remote add origin (?:https://github\\.com/|git@github\\.com:)[A-Za-z0-9-]+/[A-Za-z0-9._-]+',
    explain: 'origin is a nickname for that URL, so you never type it again. git remote -v lists your remotes. Never put a token inside this URL.',
  },
  {
    goal: 'Make sure the branch is called main, the name GitHub uses.',
    hint: 'git branch with -M renames the current branch: git branch -M main',
    accept: ['git branch -M main', 'git branch -m main'],
    explain: 'Older versions of git call the first branch master. -M renames it to main; here it already was, so nothing changed.',
  },
  {
    goal: 'Push main to origin, and remember origin/main as where it goes.',
    hint: 'git push, then -u, the remote and the branch: git push -u origin main',
    accept: ['git push -u origin main', 'git push --set-upstream origin main'],
    output: [
      "Username for 'https://github.com': your-username",
      "Password for 'https://your-username@github.com': (paste your token; it stays hidden)",
      `Enumerating objects: ${objects}, done.`,
      `Counting objects: 100% (${objects}/${objects}), done.`,
      'Delta compression using up to 8 threads',
      `Compressing objects: 100% (${objects - 6}/${objects - 6}), done.`,
      `Writing objects: 100% (${objects}/${objects}), 9.84 KiB | 1.64 MiB/s, done.`,
      `Total ${objects} (delta 2), reused 0 (delta 0), pack-reused 0`,
      `To https://github.com/your-username/${repo}.git`,
      ' * [new branch]      main -> main',
      "branch 'main' set up to track 'origin/main'.",
    ].join('\n'),
    explain: 'Your code is on GitHub. Thanks to -u, a plain git push (or git pull) is enough from now on.',
  },
  {
    goal: 'Check that your branch and GitHub are in step.',
    hint: 'The command that tells you what git sees: git status',
    accept: ['git status'],
    output: "On branch main\nYour branch is up to date with 'origin/main'.\n\nnothing to commit, working tree clean",
    explain: 'Up to date with origin/main: GitHub has every commit you have. Open your repository page to see the files.',
  },
]
