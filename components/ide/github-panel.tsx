'use client'

import { useEffect, useMemo, useState, type ComponentType } from 'react'
import {
  CircleAlert,
  CircleCheck,
  ExternalLink,
  FolderGit2,
  GitCommitHorizontal,
  KeyRound,
  Link2,
  LoaderCircle,
  RefreshCw,
  Unplug,
  Upload,
} from 'lucide-react'
import { NEW_TOKEN_URL } from '@/lib/github/token'
import { cn } from '@/lib/utils'

export interface GithubRepo {
  owner: string
  repo: string
  branch: string
}

export type ProjectSaveState = 'idle' | 'saving' | 'saved' | 'error'

interface GithubPanelProps {
  signedIn: boolean
  /** GitHub login of the connected account, if any. */
  login: string | null
  /** The OAuth app is configured. Without it, learners connect with a personal access token. */
  oauthAvailable?: boolean
  repo: GithubRepo | null
  loading: boolean
  journeyId: string
  projectName: string
  challengeId: string
  challengeTitle: string
  /** Path of the challenge file inside the workspace. */
  challengePath: string
  /** The whole project is solved, so pushes are unlocked. */
  completed: boolean
  saveState: ProjectSaveState
  /** What to do to unlock pushes; defaults to the challenge wording. */
  lockedHint?: string
  signInHref: string
  /** Re-reads connection + repo state after connect/disconnect/unlink. */
  onChanged: () => void
}

type PushResult =
  | { ok: true; conflict?: false; commitSha: string; pushedFiles: string[]; excludedFiles: string[] }
  | { ok: false; conflict: true; remoteSha: string | null; expectedSha: string | null; branch: string; message: string }
  | { ok: false; conflict?: false; error: string; message: string; retryAt?: string }

type Notice = { kind: 'ok' | 'error'; text: string }

function slugRepoName(projectName: string): string {
  const slug = projectName.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '')
  return slug || 'codeflow-project'
}

export function GithubPanel({
  signedIn,
  login,
  oauthAvailable = true,
  repo,
  loading,
  journeyId,
  projectName,
  challengeId,
  challengeTitle,
  challengePath,
  completed,
  saveState,
  lockedHint = 'Solve the challenge (all steps in the right order) to unlock pushes. Your project is saved automatically once it is solved.',
  signInHref,
  onChanged,
}: GithubPanelProps) {
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [result, setResult] = useState<PushResult | null>(null)
  const [conflict, setConflict] = useState<Extract<PushResult, { conflict: true }> | null>(null)
  const [repoMode, setRepoMode] = useState<'new' | 'existing'>('new')
  const [repoName, setRepoName] = useState(() => slugRepoName(projectName))
  const [existingRepo, setExistingRepo] = useState('')
  const [tokenOpen, setTokenOpen] = useState(false)
  const [token, setToken] = useState('')

  const connected = login !== null
  const challengeFileName = challengePath.split('/').pop() ?? challengePath

  // Keep the default name in step with the project (e.g. after a stack switch).
  useEffect(() => {
    setRepoName(slugRepoName(projectName))
  }, [projectName])

  // Surface the OAuth outcome (?github=connected|error) and tidy the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const github = params.get('github')
    if (!github) return
    if (github === 'connected') setNotice({ kind: 'ok', text: 'GitHub connected.' })
    else setNotice({ kind: 'error', text: `GitHub connection failed: ${(params.get('reason') ?? 'unknown').replace(/_/g, ' ')}.` })
    params.delete('github')
    params.delete('reason')
    const query = params.toString()
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }, [])

  const repoUrl = repo ? `https://github.com/${repo.owner}/${repo.repo}` : null
  const repoChoice = useMemo(() => {
    if (repo) return {}
    if (repoMode === 'new') return { repoName }
    return { existingRepo }
  }, [repo, repoMode, repoName, existingRepo])

  const repoChoiceReady = repo !== null || (repoMode === 'new' ? repoName.trim().length > 0 : existingRepo.trim().length > 0)
  const canPush = connected && completed && repoChoiceReady && busy === null

  const readResult = async (response: Response): Promise<PushResult> => {
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
    if (!response.ok) return { ok: false, error: typeof data.error === 'string' ? data.error : 'request_failed', message: typeof data.error === 'string' ? data.error : 'Something went wrong.' }
    return data as unknown as PushResult
  }

  const handleResult = (data: PushResult) => {
    if (data.ok) {
      setConflict(null)
      setResult(data)
      setNotice(null)
      onChanged()
      return
    }
    if (data.conflict) {
      setConflict(data)
      setResult(null)
      return
    }
    setResult(null)
    setNotice({ kind: 'error', text: data.message })
  }

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key)
    setNotice(null)
    try {
      await action()
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Something went wrong.' })
    } finally {
      setBusy(null)
    }
  }

  const connect = () =>
    run('connect', async () => {
      const response = await fetch('/api/github/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnTo: window.location.pathname }),
      })
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!response.ok || !data.url) throw new Error(data.error ?? 'Could not start GitHub sign-in.')
      window.location.href = data.url
    })

  const saveToken = () =>
    run('token', async () => {
      const response = await fetch('/api/github/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = (await response.json().catch(() => ({}))) as { login?: string; error?: string }
      if (!response.ok || !data.login) throw new Error(data.error ?? 'Could not save the token.')
      setToken('')
      setTokenOpen(false)
      setNotice({ kind: 'ok', text: `GitHub connected as @${data.login}.` })
      onChanged()
    })

  // Reconnecting goes through OAuth when it is set up, and through a new token otherwise.
  const reconnect = () => (oauthAvailable ? connect() : setTokenOpen(true))

  const tokenForm = (
    <form
      className="mt-3 border-t border-[#2b2b2b] pt-3"
      onSubmit={(event) => {
        event.preventDefault()
        void saveToken()
      }}
    >
      <div className="mb-2 flex items-center gap-1.5 text-[12px] text-[#e7e7e7]">
        <KeyRound className="size-3.5" /> Connect with a personal access token
      </div>
      <ol className="list-decimal space-y-1 pl-4 text-[11px] leading-[18px] text-[#9d9d9d]">
        <li>
          <a href={NEW_TOKEN_URL} target="_blank" rel="noreferrer" className="text-[#3794ff] hover:underline">Create a token on GitHub</a>. It opens with the <code className="text-[#ce9178]">repo</code> scope ticked; pick an expiry.
        </li>
        <li>Click <span className="text-[#cccccc]">Generate token</span> and copy it. GitHub shows it only once.</li>
        <li>Paste it here. It is encrypted before it is stored and only used to push your projects.</li>
      </ol>
      <input
        type="password"
        value={token}
        onChange={(event) => setToken(event.target.value)}
        placeholder="ghp_… or github_pat_…"
        aria-label="GitHub personal access token"
        autoComplete="off"
        spellCheck={false}
        className="mt-2 h-7 w-full rounded border border-[#3c3c3c] bg-[#313131] px-2 text-[12px] text-[#cccccc] outline-none focus:border-[#0078d4]"
      />
      <button
        type="submit"
        disabled={busy !== null || !token.trim()}
        className="mt-2 inline-flex h-7 items-center gap-1.5 rounded bg-[#0078d4] px-3 text-[12px] font-medium text-white hover:bg-[#026ec1] disabled:opacity-40"
      >
        {busy === 'token' ? <LoaderCircle className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}
        Save token
      </button>
    </form>
  )

  const disconnect = () =>
    run('disconnect', async () => {
      const response = await fetch('/api/github/connection', { method: 'DELETE' })
      if (!response.ok) throw new Error('Could not disconnect GitHub.')
      setResult(null)
      setConflict(null)
      onChanged()
    })

  const unlink = () =>
    run('unlink', async () => {
      const response = await fetch(`/api/github/repo?journeyId=${encodeURIComponent(journeyId)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Could not change the repository.')
      setResult(null)
      setConflict(null)
      onChanged()
    })

  const bulkPush = () =>
    run('bulk', async () => {
      const response = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyId, stageName: challengeTitle, ...repoChoice }),
      })
      handleResult(await readResult(response))
    })

  const filePush = () =>
    run('file', async () => {
      const response = await fetch('/api/github/push/file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyId, path: challengePath, challengeId, challengeTitle, ...repoChoice }),
      })
      handleResult(await readResult(response))
    })

  const resolveConflict = () =>
    run('resolve', async () => {
      const response = await fetch('/api/github/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyId }),
      })
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!response.ok || !data.ok) throw new Error(data.error ?? 'Could not resolve the conflict.')
      setConflict(null)
      setNotice({ kind: 'ok', text: 'Accepted the GitHub version. Push again to layer your project on top.' })
      onChanged()
    })

  return (
    <div className="flex h-full min-h-0 flex-col text-[13px] text-[#cccccc]">
      <div className="flex h-9 shrink-0 items-center gap-1.5 px-5 text-[11px] tracking-wide text-[#bbbbbb]">
        GITHUB
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {!signedIn ? (
          <div className="mt-4 rounded border border-[#3c3c3c] bg-[#1f1f1f] p-4 text-[12px] text-[#9d9d9d]">
            <FolderGit2 className="mb-2 size-6 text-[#868686]" strokeWidth={1.5} />
            <p className="text-[#cccccc]">Sign in to connect GitHub and push your project.</p>
            <a href={signInHref} className="mt-3 inline-flex h-7 items-center rounded bg-[#0078d4] px-3 text-[12px] font-medium text-white hover:bg-[#026ec1]">
              Sign in
            </a>
          </div>
        ) : loading ? (
          <div className="mt-4 flex items-center gap-2 text-[12px] text-[#9d9d9d]">
            <LoaderCircle className="size-4 animate-spin" /> Loading GitHub status…
          </div>
        ) : (
          <>
            {notice && (
              <div className={cn('mt-3 flex items-start gap-2 rounded border p-2.5 text-[12px]', notice.kind === 'ok' ? 'border-[#2ea043]/50 bg-[#2ea043]/10 text-[#89d185]' : 'border-[#f14c4c]/50 bg-[#f14c4c]/10 text-[#f48771]')}>
                {notice.kind === 'ok' ? <CircleCheck className="mt-0.5 size-3.5 shrink-0" /> : <CircleAlert className="mt-0.5 size-3.5 shrink-0" />}
                <span>{notice.text}</span>
              </div>
            )}

            {/* Account / connection */}
            <section className="mt-4">
              <div className="mb-2 text-[11px] font-bold tracking-wide text-[#bbbbbb]">ACCOUNT</div>
              {connected ? (
                <div className="rounded border border-[#2b2b2b] bg-[#1f1f1f] p-3">
                  <div className="flex items-center gap-2">
                    <CircleCheck className="size-4 text-[#89d185]" />
                    <span className="text-[#e7e7e7]">Connected as <span className="font-semibold">@{login}</span></span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <PanelButton icon={RefreshCw} label="Reconnect" onClick={reconnect} disabled={busy !== null} />
                    <PanelButton icon={Unplug} label="Disconnect" onClick={disconnect} disabled={busy !== null} />
                  </div>
                  {tokenOpen && tokenForm}
                </div>
              ) : (
                <div className="rounded border border-[#2b2b2b] bg-[#1f1f1f] p-3">
                  <p className="text-[12px] text-[#9d9d9d]">Connect your GitHub account to push this project to your own repository.</p>
                  {oauthAvailable && (
                    <>
                      <button
                        type="button"
                        onClick={connect}
                        disabled={busy !== null}
                        className="mt-3 inline-flex h-7 items-center gap-1.5 rounded bg-[#0078d4] px-3 text-[12px] font-medium text-white hover:bg-[#026ec1] disabled:opacity-40"
                      >
                        {busy === 'connect' ? <LoaderCircle className="size-3.5 animate-spin" /> : <ExternalLink className="size-3.5" />}
                        Connect GitHub
                      </button>
                      {!tokenOpen && (
                        <button type="button" onClick={() => setTokenOpen(true)} className="mt-2 block text-[11px] text-[#3794ff] hover:underline">
                          Use a personal access token instead
                        </button>
                      )}
                    </>
                  )}
                  {(!oauthAvailable || tokenOpen) && tokenForm}
                </div>
              )}
            </section>

            {/* Repository */}
            {connected && (
              <section className="mt-4">
                <div className="mb-2 text-[11px] font-bold tracking-wide text-[#bbbbbb]">REPOSITORY</div>
                {repo ? (
                  <div className="rounded border border-[#2b2b2b] bg-[#1f1f1f] p-3">
                    <div className="flex items-center gap-2">
                      <FolderGit2 className="size-4 text-[#cccccc]" />
                      <a href={repoUrl ?? undefined} target="_blank" rel="noreferrer" className="truncate font-medium text-[#3794ff] hover:underline">
                        {repo.owner}/{repo.repo}
                      </a>
                      <ExternalLink className="size-3 text-[#868686]" />
                    </div>
                    <p className="mt-1 text-[11px] text-[#9d9d9d]">Branch: {repo.branch}</p>
                    <button type="button" onClick={unlink} disabled={busy !== null} className="mt-3 inline-flex h-7 items-center gap-1.5 rounded border border-[#3c3c3c] px-2.5 text-[12px] text-[#cccccc] hover:bg-[#2a2d2e] disabled:opacity-40">
                      <Link2 className="size-3.5" /> Change repository
                    </button>
                  </div>
                ) : (
                  <div className="rounded border border-[#2b2b2b] bg-[#1f1f1f] p-3">
                    <p className="mb-2 text-[12px] text-[#9d9d9d]">Where should the first push go? A repo is created (private) or an existing one you own is used.</p>
                    <label className="flex items-center gap-2 text-[12px]">
                      <input type="radio" name="repo-mode" checked={repoMode === 'new'} onChange={() => setRepoMode('new')} className="accent-[#0078d4]" />
                      Create a new repository
                    </label>
                    {repoMode === 'new' && (
                      <input
                        value={repoName}
                        onChange={(event) => setRepoName(event.target.value)}
                        placeholder="repo-name"
                        aria-label="New repository name"
                        className="mt-2 h-7 w-full rounded border border-[#3c3c3c] bg-[#313131] px-2 text-[12px] text-[#cccccc] outline-none focus:border-[#0078d4]"
                      />
                    )}
                    <label className="mt-3 flex items-center gap-2 text-[12px]">
                      <input type="radio" name="repo-mode" checked={repoMode === 'existing'} onChange={() => setRepoMode('existing')} className="accent-[#0078d4]" />
                      Use an existing repository
                    </label>
                    {repoMode === 'existing' && (
                      <input
                        value={existingRepo}
                        onChange={(event) => setExistingRepo(event.target.value)}
                        placeholder="owner/repo"
                        aria-label="Existing repository"
                        className="mt-2 h-7 w-full rounded border border-[#3c3c3c] bg-[#313131] px-2 text-[12px] text-[#cccccc] outline-none focus:border-[#0078d4]"
                      />
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Pushes */}
            {connected && (
              <section className="mt-4">
                <div className="mb-2 text-[11px] font-bold tracking-wide text-[#bbbbbb]">PUSH</div>
                {!completed ? (
                  <div className="rounded border border-[#cca700]/40 bg-[#cca700]/10 p-3 text-[12px] text-[#e2c08d]">{lockedHint}</div>
                ) : (
                  <>
                    <div className="mb-3 flex items-center gap-2 text-[11px] text-[#9d9d9d]">
                      {saveState === 'saving' ? <LoaderCircle className="size-3.5 animate-spin" /> : saveState === 'error' ? <CircleAlert className="size-3.5 text-[#f48771]" /> : <CircleCheck className="size-3.5 text-[#89d185]" />}
                      {saveState === 'saving' ? 'Saving project…' : saveState === 'error' ? 'Project not saved — try again' : 'Project saved and ready to push'}
                    </div>

                    <PanelButton
                      icon={Upload}
                      label={`Push ${challengeFileName} (one commit)`}
                      onClick={filePush}
                      disabled={!canPush}
                      busy={busy === 'file'}
                      full
                    />
                    <div className="h-2" />
                    <PanelButton
                      icon={FolderGit2}
                      label="Push whole project (one commit)"
                      onClick={bulkPush}
                      disabled={!canPush}
                      busy={busy === 'bulk'}
                      full
                    />
                  </>
                )}
              </section>
            )}

            {/* Conflict */}
            {conflict && repoUrl && (
              <section className="mt-4 rounded border border-[#f14c4c]/50 bg-[#f14c4c]/10 p-3">
                <div className="flex items-center gap-2 font-semibold text-[#f48771]">
                  <CircleAlert className="size-4" /> The repo changed on GitHub
                </div>
                <p className="mt-1 text-[12px] text-[#cccccc]">{conflict.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {conflict.expectedSha && conflict.remoteSha && (
                    <a
                      href={`${repoUrl}/compare/${conflict.expectedSha}...${conflict.remoteSha}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-7 items-center gap-1.5 rounded border border-[#3c3c3c] px-2.5 text-[12px] text-[#cccccc] hover:bg-[#2a2d2e]"
                    >
                      <ExternalLink className="size-3.5" /> Review on GitHub
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={resolveConflict}
                    disabled={busy !== null}
                    className="inline-flex h-7 items-center gap-1.5 rounded bg-[#0078d4] px-2.5 text-[12px] font-medium text-white hover:bg-[#026ec1] disabled:opacity-40"
                  >
                    {busy === 'resolve' ? <LoaderCircle className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                    Keep GitHub version &amp; retry
                  </button>
                </div>
              </section>
            )}

            {/* Success */}
            {result?.ok && repoUrl && (
              <section className="mt-4 rounded border border-[#2ea043]/50 bg-[#2ea043]/10 p-3">
                <div className="flex items-center gap-2 font-semibold text-[#89d185]">
                  <GitCommitHorizontal className="size-4" /> Pushed {result.pushedFiles.length} file{result.pushedFiles.length === 1 ? '' : 's'}
                </div>
                <a href={`${repoUrl}/commit/${result.commitSha}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12px] text-[#3794ff] hover:underline">
                  {result.commitSha.slice(0, 7)} <ExternalLink className="size-3" />
                </a>
                {result.excludedFiles.length > 0 && (
                  <p className="mt-1 text-[11px] text-[#9d9d9d]">Skipped for safety: {result.excludedFiles.join(', ')}</p>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function PanelButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  busy,
  full,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  disabled?: boolean
  busy?: boolean
  full?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-7 items-center justify-center gap-1.5 rounded border border-[#3c3c3c] px-2.5 text-[12px] text-[#cccccc] hover:bg-[#2a2d2e] disabled:pointer-events-none disabled:opacity-40',
        full && 'w-full',
      )}
    >
      {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
      <span className="truncate">{label}</span>
    </button>
  )
}
