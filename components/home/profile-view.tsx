'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ExternalLink, Flame, GitBranch, Shield, Star } from 'lucide-react'
import { Stars } from '@/components/journey/level-meta'
import { achievementsFor, indexProgress, rankFor, streakDays } from '@/lib/journeys/progress'
import { tracks, trackIds, type Track } from '@/lib/journeys/types'
import type { ProjectSummary } from '@/lib/server/journeys'
import { useLearner } from '@/lib/use-learner'
import { TrackPicker } from './track-picker'

type GithubStatus = { connected: boolean; login: string | null; repos: { owner: string; repo: string }[] }

export function ProfileView({ journeys }: { journeys: ProjectSummary[] }) {
  const { session, track, setTrack, levels, ready } = useLearner()
  const [github, setGithub] = useState<GithubStatus | null>(null)
  const signedIn = session.status === 'signed-in'

  useEffect(() => {
    if (!signedIn) return
    fetch('/api/github/status')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setGithub({ connected: !!data.connected, login: data.login ?? null, repos: data.repos ?? [] }))
      .catch(() => undefined)
  }, [signedIn])

  const totalXp = levels.reduce((sum, row) => sum + row.xp, 0)
  const rank = rankFor(totalXp)
  const byProject = indexProgress(levels)
  const earned = achievementsFor(journeys, levels).filter((item) => item.current >= item.target)
  const journeyCounts = Object.fromEntries(trackIds.map((id) => [id, journeys.filter((item) => item.track === id).length])) as Record<Track, number>
  const started = journeys.filter((journey) => byProject[journey.id] || journey.track === track)
  const initials = session.user?.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  return (
    <main className="min-h-dvh bg-[#f5f7fb] px-4 py-6 text-[#1f2440] md:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <Link href="/" className="flex w-fit items-center gap-1.5 text-sm text-[#4b5563] hover:text-[#1f2440]">
          <ArrowLeft className="size-4" /> Back to the map
        </Link>

        <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#e6e9f0] bg-white p-5 shadow-sm">
          <span className="grid size-16 place-items-center rounded-full bg-[#16a34a] text-xl font-bold text-white">{initials}</span>
          <div className="min-w-0">
            {signedIn ? (
              <>
                <h1 className="flex items-center gap-2 text-xl font-bold">
                  {session.user.name}
                  {session.user.isAdmin && <span className="inline-flex items-center gap-1 rounded-md bg-[#ede9fe] px-2 py-0.5 text-[11px] font-semibold text-[#5b21b6]"><Shield className="size-3" /> Admin</span>}
                </h1>
                <p className="text-sm text-[#6b7280]">{session.user.email}</p>
              </>
            ) : (
              <>
                <h1 className="text-xl font-bold">Guest</h1>
                <p className="text-sm text-[#6b7280]">
                  Progress is saved in this browser only. <Link href="/register?next=/profile" className="font-semibold text-[#16a34a] underline">Create an account</Link> to keep it.
                </p>
              </>
            )}
          </div>
          <dl className="ml-auto grid grid-cols-3 gap-4 text-center">
            <div><dt className="text-[11px] uppercase tracking-wider text-[#6b7280]">Rank</dt><dd className="text-lg font-bold">{rank.rank}</dd></div>
            <div><dt className="text-[11px] uppercase tracking-wider text-[#6b7280]">XP</dt><dd className="text-lg font-bold">{totalXp}</dd></div>
            <div><dt className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wider text-[#6b7280]"><Flame className="size-3" /> Streak</dt><dd className="text-lg font-bold">{streakDays(levels)}</dd></div>
          </dl>
        </section>

        <section className="rounded-2xl border border-[#e6e9f0] bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Tech stack</h2>
          <p className="mb-4 mt-1 text-sm text-[#6b7280]">The map shows journeys for this stack, and challenges open in its language.</p>
          {ready ? <TrackPicker value={track} onPick={(next) => void setTrack(next)} journeyCounts={journeyCounts} /> : <p className="text-sm text-[#6b7280]">Loading…</p>}
        </section>

        <section className="rounded-2xl border border-[#e6e9f0] bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Journeys</h2>
          <ul className="mt-3 flex flex-col divide-y divide-[#e6e9f0]">
            {started.length === 0 && <li className="py-2 text-sm text-[#6b7280]">Pick a stack to see its journeys.</li>}
            {started.map((journey) => {
              const done = byProject[journey.id] ?? {}
              const passed = journey.levels.filter((level) => done[level.id])
              const stars = passed.reduce((sum, level) => sum + done[level.id].stars, 0)
              return (
                <li key={journey.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{journey.title} <span className="text-xs text-[#6b7280]">· {tracks[journey.track].label}</span></div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="h-1.5 w-40 overflow-hidden rounded-full bg-[#e5e7eb]">
                        <span className="block h-full rounded-full bg-[#16a34a]" style={{ width: `${(passed.length / journey.levels.length) * 100}%` }} />
                      </span>
                      <span className="text-xs text-[#6b7280]">{passed.length}/{journey.levels.length} levels</span>
                      <span className="flex items-center gap-1 text-xs text-[#b45309]"><Star className="size-3 fill-current" /> {stars}</span>
                    </div>
                  </div>
                  <Link href={`/learn/${journey.id}`} className="flex items-center gap-1 text-sm font-semibold text-[#16a34a] hover:underline">
                    {passed.length === journey.levels.length ? 'Review' : passed.length ? 'Continue' : 'Start'} <ArrowRight className="size-4" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-[#e6e9f0] bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Achievements</h2>
            {earned.length ? (
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {earned.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2">
                    <span><span className="font-medium">{item.title}</span> <span className="text-xs text-[#6b7280]">{item.description}</span></span>
                    <Stars count={3} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[#6b7280]">None yet. Pass a level to earn First Steps.</p>
            )}
          </section>

          <section className="rounded-2xl border border-[#e6e9f0] bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold"><GitBranch className="size-4" /> GitHub</h2>
            {!signedIn ? (
              <p className="mt-2 text-sm text-[#6b7280]">Sign in to push the projects you build to your own GitHub repositories.</p>
            ) : github?.connected ? (
              <>
                <p className="mt-2 text-sm">Connected as <span className="font-semibold">@{github.login}</span>.</p>
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {github.repos.map((repo) => (
                    <li key={`${repo.owner}/${repo.repo}`}>
                      <a href={`https://github.com/${repo.owner}/${repo.repo}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#2563eb] hover:underline">
                        {repo.owner}/{repo.repo} <ExternalLink className="size-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-sm text-[#6b7280]">Not connected. Open any level and use the GitHub view (the branch icon) to connect and push.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
