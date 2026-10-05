'use client'

import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from 'react'
import Link from 'next/link'
import {
  Check,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  GitBranch,
  GitCommitHorizontal,
  KeyRound,
  Link2,
  Loader2,
  LoaderCircle,
  RefreshCw,
  Unplug,
  Upload,
  X,
} from 'lucide-react'
import { NEW_TOKEN_URL } from '@/lib/github/token'
import { cn } from '@/lib/utils'
import { GamePanel, Pill, gameButtonClasses } from '@/components/ui/game'

// The profile's GitHub section: connect an account (OAuth or a personal access token) and push
// each project from one place. It uses the same endpoints as the GitHub view inside a level.

export interface GithubProject {
  /** The journey id, which is also what the learner's repo is linked by. */
  id: string
  title: string
  stack: string
  projectName: string
  passed: number
  total: number
}

type Repo = { journeyId: string; owner: string; repo: string; branch: string; lastCommitSha: string | null }
type Status = { oauth: boolean; connected: boolean; login: string | null; repos: Repo[] }
type Notice = { kind: 'ok' | 'error'; text: string; link?: { href: string; label: string } }
type Conflict = { journeyId: string; message: string; compare: string | null }

const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '') || 'codeflow-project'

function Button({ icon: Icon, children, onClick, disabled, busy, primary, type = 'button' }: {
  icon: ComponentType<{ className?: string }>
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  busy?: boolean
  primary?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy ? 'true' : undefined}
      className={cn(
        gameButtonClasses({
          variant: primary ? 'primary' : 'secondary',
          size: 'sm',
        }),
        'font-display font-bold',
      )}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
      {children}
    </button>
  )
}

export function GithubCard({ signedIn, projects }: { signedIn: boolean; projects: GithubProject[] }) {
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [tokenOpen, setTokenOpen] = useState(false)
  const [token, setToken] = useState('')
  const [names, setNames] = useState<Record<string, string>>({})
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [projectStatus, setProjectStatus] = useState<Record<string, { kind: 'ok' | 'error'; text: string }>>({})

  const refresh = useCallback(async (): Promise<Status | null> => {
    const data = await fetch('/api/github/status').then((response) => (response.ok ? response.json() : null)).catch(() => null)
    if (!data) return null
    const next: Status = { oauth: data.oauth !== false, connected: !!data.connected, login: data.login ?? null, repos: data.repos ?? [] }
    setStatus(next)
    return next
  }, [])

  useEffect(() => {
    if (signedIn) void refresh()
  }, [signedIn, refresh])

  // Back from GitHub's OAuth page (?github=connected|error): say how it went and tidy the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const github = params.get('github')
    if (!github) return
    setNotice(github === 'connected' ? { kind: 'ok', text: 'GitHub connected.' } : { kind: 'error', text: `GitHub connection failed: ${(params.get('reason') ?? 'unknown').replace(/_/g, ' ')}.` })
    params.delete('github')
    params.delete('reason')
    const query = params.toString()
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }, [])

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key)
    setNotice(null)
    try {
      await action()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Something went wrong.'
      setNotice({ kind: 'error', text: errorMsg })
      if (key.startsWith('push-')) {
        const pId = key.replace('push-', '')
        setProjectStatus((prev) => ({ ...prev, [pId]: { kind: 'error', text: errorMsg } }))
      }
    } finally {
      setBusy(null)
    }
  }

  const errorOf = async (response: Response, fallback: string) => ((await response.json().catch(() => null)) as { error?: string } | null)?.error ?? fallback

  const connect = () =>
    run('connect', async () => {
      const response = await fetch('/api/github/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnTo: '/profile' }) })
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!response.ok || !data.url) throw new Error(data.error ?? 'Could not start GitHub sign-in.')
      window.location.href = data.url
    })

  const saveToken = () =>
    run('token', async () => {
      const response = await fetch('/api/github/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      const data = (await response.json().catch(() => ({}))) as { login?: string; error?: string }
      if (!response.ok || !data.login) throw new Error(data.error ?? 'Could not save the token.')
      setToken('')
      setTokenOpen(false)
      setNotice({ kind: 'ok', text: `GitHub connected as @${data.login}.` })
      await refresh()
    })

  const disconnect = () =>
    run('disconnect', async () => {
      const response = await fetch('/api/github/connection', { method: 'DELETE' })
      if (!response.ok) throw new Error(await errorOf(response, 'Could not disconnect GitHub.'))
      setConflict(null)
      setNotice({ kind: 'ok', text: 'GitHub disconnected. The saved token was deleted.' })
      await refresh()
    })

  const push = (project: GithubProject, repo: Repo | undefined) =>
    run(`push-${project.id}`, async () => {
      setConflict(null)
      const response = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journeyId: project.id,
          message: `feat: ${project.title}, ${project.passed} of ${project.total} levels`,
          ...(repo ? {} : { repoName: (names[project.id] ?? slugOf(project.projectName)).trim() }),
        }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        conflict?: boolean
        commitSha?: string
        pushedFiles?: string[]
        expectedSha?: string | null
        remoteSha?: string | null
        message?: string
        error?: string
      }
      if (!response.ok) throw new Error(data.error ?? 'The push failed.')
      // The first push creates and links the repo, so read it back for the links.
      const fresh = (await refresh())?.repos.find((item) => item.journeyId === project.id)
      const url = fresh ? `https://github.com/${fresh.owner}/${fresh.repo}` : null
      if (data.ok && data.commitSha) {
        const successText = `Pushed ${data.pushedFiles?.length ?? 0} files of ${project.title}.`
        setNotice({ kind: 'ok', text: successText, ...(url ? { link: { href: `${url}/commit/${data.commitSha}`, label: data.commitSha.slice(0, 7) } } : {}) })
        setProjectStatus((prev) => ({ ...prev, [project.id]: { kind: 'ok', text: successText } }))
      } else if (data.conflict) {
        setConflict({ journeyId: project.id, message: data.message ?? 'The repository changed on GitHub.', compare: url && data.expectedSha && data.remoteSha ? `${url}/compare/${data.expectedSha}...${data.remoteSha}` : null })
      } else {
        throw new Error(data.message ?? data.error ?? 'The push failed.')
      }
    })

  const unlink = (project: GithubProject) =>
    run(`unlink-${project.id}`, async () => {
      const response = await fetch(`/api/github/repo?journeyId=${encodeURIComponent(project.id)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(await errorOf(response, 'Could not change the repository.'))
      setConflict(null)
      await refresh()
    })

  const keepGithubVersion = (project: GithubProject) =>
    run(`resolve-${project.id}`, async () => {
      const response = await fetch('/api/github/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ journeyId: project.id }) })
      if (!response.ok) throw new Error(await errorOf(response, 'Could not resolve the conflict.'))
      setConflict(null)
      setNotice({ kind: 'ok', text: 'Kept the GitHub version. Push again to add your project on top of it.' })
    })

  const connected = !!status?.connected

  const tokenForm = (
    <form
      className="mt-4 rounded-xl border border-(--cf-border) bg-(--cf-surface) p-4"
      onSubmit={(event) => {
        event.preventDefault()
        void saveToken()
      }}
    >
      <div className="flex items-center gap-2 text-sm font-bold"><KeyRound className="size-4 text-[#f59e0b]" /> Connect with a personal access token</div>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] leading-5 text-(--cf-muted)">
        <li>
          <a href={NEW_TOKEN_URL} target="_blank" rel="noreferrer" className="font-semibold text-[#2563eb] hover:underline dark:text-[#60a5fa]">Create a token on GitHub</a>. It opens with the <code className="rounded bg-(--cf-surface-2) px-1 text-[12px]">repo</code> scope ticked; pick an expiry.
        </li>
        <li>Click <span className="font-semibold text-(--cf-text)">Generate token</span> and copy it. GitHub shows it only once.</li>
        <li>Paste it below. It is encrypted before it is stored and only used to push your projects.</li>
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="ghp_… or github_pat_…"
          aria-label="GitHub personal access token"
          autoComplete="off"
          spellCheck={false}
          className="h-9 min-w-0 flex-1 rounded-xl border-2 border-(--cf-border) bg-(--cf-surface-2) px-3 text-sm outline-none focus:border-[#22c55e]"
        />
        <Button type="submit" icon={KeyRound} primary busy={busy === 'token'} disabled={busy !== null || !token.trim()}>Save token</Button>
      </div>
    </form>
  )

  return (
    <GamePanel as="section" tone="default">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-[#24292f] text-white shadow-xs dark:bg-[#f0f6fc] dark:text-[#24292f]">
          <GitBranch className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-(--cf-faint)">Linked account</div>
          <h2 className="font-display text-lg font-bold text-(--cf-text)">GitHub</h2>
          <p className="text-xs text-(--cf-muted)">Push the projects you build to repositories of your own.</p>
        </div>
        {signedIn && status && (
          <Pill
            tone={connected ? 'success' : 'neutral'}
            size="md"
            className="gap-1.5 font-bold"
          >
            {connected ? (
              <>
                <Check className="size-3.5 text-[#16a34a]" />
                <span>Connected</span>
              </>
            ) : (
              <>
                <Unplug className="size-3.5 text-(--cf-muted)" />
                <span>Not connected</span>
              </>
            )}
          </Pill>
        )}
      </div>

      {notice && (
        <p role="status" className={cn('mt-4 flex items-start gap-2 rounded-xl border px-3 py-2 text-[13px]', notice.kind === 'ok' ? 'border-[#86efac] bg-[#f0fdf4] text-[#166534] dark:border-[#16a34a]/40 dark:bg-[#16a34a]/10 dark:text-[#86efac]' : 'border-[#fecaca] bg-[#fef2f2] text-[#b91c1c] dark:border-[#ef4444]/40 dark:bg-[#ef4444]/10 dark:text-[#fca5a5]')}>
          {notice.kind === 'ok' ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <CircleAlert className="mt-0.5 size-4 shrink-0" />}
          <span>
            {notice.text}{' '}
            {notice.link && (
              <a href={notice.link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold underline">
                {notice.link.label} <ExternalLink className="size-3" />
              </a>
            )}
          </span>
        </p>
      )}

      {!signedIn ? (
        <p className="mt-4 text-sm text-(--cf-muted)">
          <Link href="/login?next=/profile" className="font-semibold text-[#16a34a] underline dark:text-[#4ade80]">Sign in</Link> to connect GitHub and push your projects.
        </p>
      ) : !status ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-(--cf-muted)"><LoaderCircle className="size-4 animate-spin" /> Loading GitHub status…</p>
      ) : (
        <>
          <div className="mt-4 rounded-xl bg-(--cf-surface-2) p-4">
            {connected && status.login ? (
              <div className="flex flex-wrap items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- a GitHub avatar, already sized by GitHub */}
                <img src={`https://github.com/${status.login}.png?size=80`} alt="" className="size-10 rounded-full bg-(--cf-surface) ring-2 ring-(--cf-border)" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">Connected as @{status.login}</div>
                  <a href={`https://github.com/${status.login}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-(--cf-muted) hover:underline">
                    github.com/{status.login} <ExternalLink className="size-3" />
                  </a>
                </div>
                <Button icon={RefreshCw} onClick={() => (status.oauth ? void connect() : setTokenOpen(true))} busy={busy === 'connect'} disabled={busy !== null}>Reconnect</Button>
                <Button icon={Unplug} onClick={() => void disconnect()} busy={busy === 'disconnect'} disabled={busy !== null}>Disconnect</Button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-(--cf-muted)">Connect your GitHub account once; every project you build can then be pushed to its own repository.</p>
                {status.oauth && (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Button icon={GitBranch} primary onClick={() => void connect()} busy={busy === 'connect'} disabled={busy !== null}>Connect GitHub</Button>
                    {!tokenOpen && (
                      <button type="button" onClick={() => setTokenOpen(true)} className="text-[13px] font-semibold text-[#2563eb] hover:underline dark:text-[#60a5fa]">
                        Use a personal access token instead
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {(tokenOpen || (!connected && !status.oauth)) && tokenForm}
          </div>

          <h3 className="mt-5 text-[11px] font-bold uppercase tracking-wider text-(--cf-faint)">Your projects</h3>
          {projects.length === 0 ? (
            <p className="mt-2 text-sm text-(--cf-muted)">Pick a stack and start a journey: its project shows up here, ready to push.</p>
          ) : (
            <ul className="mt-2 flex flex-col divide-y divide-(--cf-border)">
              {projects.map((project) => {
                const repo = status.repos.find((item) => item.journeyId === project.id)
                const url = repo ? `https://github.com/${repo.owner}/${repo.repo}` : null
                const ready = project.passed > 0
                const pStatus = projectStatus[project.id]
                const isPushing = busy === `push-${project.id}`
                return (
                  <li key={project.id} className="py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-[12rem] flex-1">
                        <div className="font-semibold">{project.title} <span className="text-xs font-normal text-(--cf-muted)">· {project.stack}</span></div>
                        <div className="text-xs text-(--cf-muted)">{project.passed}/{project.total} levels · {ready ? 'saved and ready to push' : 'pass a level to save the project'}</div>
                      </div>

                      {repo && url ? (
                        <div className="min-w-0 text-sm">
                          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#2563eb] hover:underline dark:text-[#60a5fa]">
                            {repo.owner}/{repo.repo} <ExternalLink className="size-3" />
                          </a>
                          <div className="flex items-center gap-1 text-xs text-(--cf-muted)">
                            {repo.lastCommitSha ? (
                              <a href={`${url}/commit/${repo.lastCommitSha}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                                <GitCommitHorizontal className="size-3.5" /> last push {repo.lastCommitSha.slice(0, 7)}
                              </a>
                            ) : (
                              'not pushed yet'
                            )}
                            <span aria-hidden>·</span>
                            <button type="button" onClick={() => void unlink(project)} disabled={busy !== null} className="inline-flex items-center gap-1 hover:underline">
                              <Link2 className="size-3" /> change
                            </button>
                          </div>
                        </div>
                      ) : connected ? (
                        <label className="flex items-center gap-2 text-xs text-(--cf-muted)">
                          New repo
                          <input
                            value={names[project.id] ?? slugOf(project.projectName)}
                            onChange={(event) => setNames((current) => ({ ...current, [project.id]: event.target.value }))}
                            aria-label={`Repository name for ${project.title}`}
                            className="h-8 w-40 rounded-lg border-2 border-(--cf-border) bg-(--cf-surface-2) px-2 text-[13px] text-(--cf-text) outline-none focus:border-[#22c55e]"
                          />
                        </label>
                      ) : (
                        <span className="text-xs text-(--cf-muted)">Connect GitHub to push</span>
                      )}

                      <div className="flex items-center gap-2">
                        {pStatus?.kind === 'ok' && !isPushing && (
                          <div className="flex items-center gap-1 text-xs font-semibold text-[#166534] dark:text-[#86efac]">
                            <Check className="size-3.5 text-[#16a34a]" />
                            <span className="max-w-[160px] truncate">{pStatus.text}</span>
                          </div>
                        )}
                        {pStatus?.kind === 'error' && !isPushing && (
                          <div className="flex items-center gap-1 text-xs font-semibold text-[#b91c1c] dark:text-[#fca5a5]">
                            <X className="size-3.5 text-[#dc2626]" />
                            <span className="max-w-[160px] truncate">{pStatus.text}</span>
                          </div>
                        )}
                        <Button
                          icon={Upload}
                          primary={false}
                          onClick={() => void push(project, repo)}
                          busy={isPushing}
                          disabled={!connected || !ready || busy !== null}
                        >
                          {repo ? 'Push latest' : 'Create repo & push'}
                        </Button>
                      </div>
                    </div>

                    {conflict?.journeyId === project.id && (
                      <div className="mt-3 rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3 text-[13px] text-[#b91c1c] dark:border-[#ef4444]/40 dark:bg-[#ef4444]/10 dark:text-[#fca5a5]">
                        <div className="font-bold">The repository changed on GitHub</div>
                        <p className="mt-0.5">{conflict.message} Nothing was overwritten.</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {conflict.compare && (
                            <a href={conflict.compare} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-lg border border-current px-3 text-xs font-bold">
                              Review on GitHub <ExternalLink className="size-3" />
                            </a>
                          )}
                          <button type="button" onClick={() => void keepGithubVersion(project)} disabled={busy !== null} className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#dc2626] px-3 text-xs font-bold text-white">
                            Keep GitHub version
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </GamePanel>
  )
}
