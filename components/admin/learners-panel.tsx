'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, CircleCheck, Download, ExternalLink, FolderGit2, LoaderCircle, RefreshCw, Search, TriangleAlert } from 'lucide-react'
import { kindIcons } from '@/components/journey/level-meta'
import { trackIds, tracks, type Track } from '@/lib/journeys/types'
import type { Learner, LearnerJourney, LearnerReport, PassedLevel, ReportJourney } from '@/lib/server/learners'
import { cn } from '@/lib/utils'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { inputClass } from './fields'

const REFRESH_MS = 60_000
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31_536_000], ['month', 2_592_000], ['week', 604_800], ['day', 86_400], ['hour', 3_600], ['minute', 60]]

function ago(iso: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  for (const [unit, size] of UNITS) if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  return 'just now'
}

const day = (iso: string) => new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short' })

/** One learner's standing in one journey. */
interface Standing {
  journey: ReportJourney
  entry: LearnerJourney
  passed: Map<string, PassedLevel>
  done: number
  /** Index of the first level not passed; -1 once the journey is finished. */
  current: number
}

function standingsOf(learner: Learner, journeys: Map<string, ReportJourney>): Standing[] {
  return learner.journeys
    .map((entry) => {
      const journey = journeys.get(entry.journeyId)
      if (!journey) return null
      const passed = new Map(entry.passed.map((row) => [row.levelId, row]))
      return { journey, entry, passed, done: journey.levels.filter((level) => passed.has(level.id)).length, current: journey.levels.findIndex((level) => !passed.has(level.id)) }
    })
    .filter((standing): standing is Standing => standing !== null)
    .sort((a, b) => b.done - a.done)
}

const worldNumber = (journey: ReportJourney, worldId: string) => journey.worlds.findIndex((world) => world.id === worldId) + 1

function csvOf(rows: { learner: Learner; standings: Standing[] }[]) {
  const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
  const lines = [['Name', 'Email', 'Stack', 'Journey', 'Levels passed', 'Levels total', 'Current level', 'XP', 'GitHub', 'Repository', 'Last active']]
  for (const { learner, standings } of rows) {
    const xp = learner.journeys.reduce((sum, entry) => sum + entry.passed.reduce((total, row) => total + row.xp, 0), 0)
    const base = [learner.name, learner.email, learner.track ? tracks[learner.track].label : '']
    const tail = (standing?: Standing) => [standing?.entry.repo ? `https://github.com/${standing.entry.repo.owner}/${standing.entry.repo.repo}` : '', learner.lastActiveAt]
    if (!standings.length) lines.push([...base, '', '0', '0', '', String(xp), learner.github ?? '', ...tail()])
    for (const standing of standings) {
      const level = standing.current >= 0 ? standing.journey.levels[standing.current] : null
      lines.push([...base, standing.journey.title, String(standing.done), String(standing.journey.levels.length), level ? level.title : 'Finished', String(xp), learner.github ?? '', ...tail(standing)])
    }
  }
  return lines.map((line) => line.map(cell).join(',')).join('\r\n')
}

export function LearnersPanel() {
  const [report, setReport] = useState<LearnerReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [stack, setStack] = useState<Track | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [funnelId, setFunnelId] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/learners')
      .then(async (response) => (response.ok ? response.json() : Promise.reject((await response.json().catch(() => null))?.error ?? 'Could not load learners.')))
      .then((data: LearnerReport) => {
        setReport(data)
        setError(null)
      })
      .catch((reason) => setError(String(reason)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  const setAllOpen = async (learner: Learner, allLevelsOpen: boolean) => {
    setToggling(learner.id)
    const response = await fetch(`/api/admin/learners/${learner.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ allLevelsOpen }) }).catch(() => null)
    setToggling(null)
    if (!response?.ok) return setError(((await response?.json().catch(() => null)) as { error?: string } | null)?.error ?? 'Could not change that learner.')
    setReport((current) => current && { ...current, learners: current.learners.map((item) => (item.id === learner.id ? { ...item, allLevelsOpen } : item)) })
  }

  const journeys = useMemo(() => new Map((report?.journeys ?? []).map((journey) => [journey.id, journey])), [report])
  const rows = useMemo(() => (report?.learners ?? []).map((learner) => ({ learner, standings: standingsOf(learner, journeys) })), [report, journeys])
  const shown = rows.filter(({ learner }) => {
    const term = search.trim().toLowerCase()
    return (stack === 'all' || learner.track === stack) && (!term || learner.name.toLowerCase().includes(term) || learner.email.includes(term))
  })

  const now = report ? new Date(report.generatedAt).getTime() : 0
  const stats = [
    { label: 'Learners', value: rows.length },
    { label: 'Active this week', value: rows.filter(({ learner }) => now - new Date(learner.lastActiveAt).getTime() < WEEK_MS).length },
    { label: 'Started a journey', value: rows.filter(({ standings }) => standings.some((standing) => standing.done > 0)).length },
    { label: 'Finished a journey', value: rows.filter(({ standings }) => standings.some((standing) => standing.current < 0)).length },
    { label: 'GitHub connected', value: rows.filter(({ learner }) => learner.github).length },
    { label: 'Pushed to GitHub', value: rows.filter(({ learner }) => learner.journeys.some((entry) => entry.repo?.pushed)).length },
  ]

  // "Where learners are": per level, how many passed it and who is on it right now.
  const startedJourneys = (report?.journeys ?? []).filter((journey) => rows.some(({ standings }) => standings.some((standing) => standing.journey.id === journey.id)))
  const funnel = startedJourneys.find((journey) => journey.id === funnelId) ?? startedJourneys[0] ?? null
  const funnelRows = funnel ? rows.flatMap(({ learner, standings }) => standings.filter((standing) => standing.journey.id === funnel.id).map((standing) => ({ learner, standing }))) : []

  const download = () => {
    const blob = new Blob([csvOf(shown)], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `codeflow-learners-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <section id="learners" className="scroll-mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-(--adm-heading)">Learners</h1>
        {report && <span className="text-[12px] text-(--adm-dim)">Updated {ago(report.generatedAt)} · refreshes every minute</span>}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={download} disabled={!shown.length} className="flex items-center gap-1.5 rounded border border-(--adm-border-strong) px-2.5 py-1 text-[12px] hover:bg-(--adm-hover) disabled:opacity-40">
            <Download className="size-3.5" /> CSV
          </button>
          <button type="button" onClick={load} disabled={loading} className="flex items-center gap-1.5 rounded border border-(--adm-border-strong) px-2.5 py-1 text-[12px] hover:bg-(--adm-hover) disabled:opacity-40">
            {loading ? <LoaderCircle className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Refresh
          </button>
        </div>
      </div>
      <p className="mt-1 max-w-3xl text-[12px] leading-5 text-(--adm-muted)">Everyone who signed up, the level they are on in each journey, and whether their project reached GitHub. Click a learner to see every level.</p>

      {report?.open && (
        <p className="mt-3 flex max-w-3xl gap-2 rounded border border-(--adm-warning)/40 bg-(--adm-warning)/10 p-2.5 text-[12px] leading-5 text-(--adm-warning)">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          <span>The admin is open: every signed-in account can see this page and edit journeys. To lock it, set <code>ADMIN_EMAILS</code> to the admins&apos; emails (comma-separated) and redeploy.</span>
        </p>
      )}
      {error && (
        <div className="mt-3 max-w-xl">
          <ErrorState
            title="Could not load learners"
            message={error}
            onRetry={load}
            retryText="Retry"
          />
        </div>
      )}
      {!report && !error && (
        <div className="mt-4 flex items-center gap-2 text-[12px] text-(--adm-dim)">
          <div className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Loading learners…</span>
        </div>
      )}

      {report && (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded border border-(--adm-border) bg-(--adm-panel) px-3 py-2">
                <dt className="text-[11px] text-(--adm-muted)">{stat.label}</dt>
                <dd className="text-lg font-bold text-(--adm-heading)">{stat.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <label className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-(--adm-dim)" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" aria-label="Search learners" className={cn(inputClass, 'pl-7')} />
            </label>
            <select value={stack} onChange={(event) => setStack(event.target.value as Track | 'all')} aria-label="Filter by stack" className={cn(inputClass, 'w-auto')}>
              <option value="all">All stacks</option>
              {trackIds.map((item) => <option key={item} value={item}>{tracks[item].label}</option>)}
            </select>
          </div>

          <div className="mt-3 overflow-x-auto rounded border border-(--adm-border)">
            <table className="w-full min-w-[860px] text-left text-[12px]">
              <thead className="bg-(--adm-panel) text-[11px] tracking-wide text-(--adm-muted)">
                <tr>
                  <th className="w-6 px-2 py-2" />
                  <th className="px-3 py-2 font-semibold">LEARNER</th>
                  <th className="px-3 py-2 font-semibold">STACK</th>
                  <th className="px-3 py-2 font-semibold">PROGRESS</th>
                  <th className="px-3 py-2 font-semibold">NOW ON</th>
                  <th className="px-3 py-2 font-semibold">XP</th>
                  <th className="px-3 py-2 font-semibold">GITHUB</th>
                  <th className="px-3 py-2 font-semibold">LAST ACTIVE</th>
                </tr>
              </thead>
              <tbody>
                {loading && !report ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-(--adm-border)">
                      <td className="px-2 py-3"><Skeleton scope="adm" shape="circle" className="size-3.5 mx-auto" /></td>
                      <td className="px-3 py-3"><Skeleton scope="adm" shape="line" className="h-3.5 w-32" /></td>
                      <td className="px-3 py-3"><Skeleton scope="adm" shape="line" className="h-3.5 w-16" /></td>
                      <td className="px-3 py-3"><Skeleton scope="adm" shape="line" className="h-3.5 w-24" /></td>
                      <td className="px-3 py-3"><Skeleton scope="adm" shape="line" className="h-3.5 w-28" /></td>
                      <td className="px-3 py-3"><Skeleton scope="adm" shape="line" className="h-3.5 w-12" /></td>
                      <td className="px-3 py-3"><Skeleton scope="adm" shape="line" className="h-3.5 w-20" /></td>
                      <td className="px-3 py-3"><Skeleton scope="adm" shape="line" className="h-3.5 w-16" /></td>
                    </tr>
                  ))
                ) : shown.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center">
                      <EmptyState
                        mascot={false}
                        title={rows.length ? 'No learner matches the filter' : 'No learners yet'}
                        description={rows.length ? 'Try clearing or changing your search terms.' : 'Nobody has signed up yet. Share the site link and learners show up here.'}
                        className="py-4"
                      />
                    </td>
                  </tr>
                ) : null}
                {shown.map(({ learner, standings }) => {
                  const main = standings[0]
                  const xp = learner.journeys.reduce((sum, entry) => sum + entry.passed.reduce((total, row) => total + row.xp, 0), 0)
                  const open = expanded === learner.id
                  const level = main && main.current >= 0 ? main.journey.levels[main.current] : null
                  const Icon = level ? kindIcons[level.kind] : null
                  const repo = standings.find((standing) => standing.entry.repo)?.entry.repo
                  return (
                    <Fragment key={learner.id}>
                      <tr onClick={() => setExpanded(open ? null : learner.id)} className="cursor-pointer border-t border-(--adm-border) hover:bg-(--adm-row-hover)">
                        <td className="px-2 py-2.5 text-(--adm-dim)">
                          <button type="button" aria-expanded={open} aria-label={`${open ? 'Hide' : 'Show'} levels of ${learner.name}`} className="grid place-items-center">
                            {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-(--adm-heading)">
                            {learner.name}
                            {learner.allLevelsOpen && <span className="ml-1.5 rounded bg-(--adm-link)/15 px-1.5 py-0.5 text-[10px] font-normal text-(--adm-link)">all levels open</span>}
                          </div>
                          <div className="text-(--adm-dim)">{learner.email}</div>
                        </td>
                        <td className="px-3 py-2.5">{learner.track ? tracks[learner.track].label : <span className="text-(--adm-dim)">Not picked</span>}</td>
                        <td className="px-3 py-2.5">
                          {main ? (
                            <div className="w-40">
                              <div className="flex justify-between gap-2 text-[11px]">
                                <span className="truncate text-(--adm-muted)">{main.journey.title}</span>
                                <span className="shrink-0">{main.done}/{main.journey.levels.length}</span>
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-(--adm-border)">
                                <div className={cn('h-full rounded-full', main.current < 0 ? 'bg-(--adm-teal)' : 'bg-(--adm-link)')} style={{ width: `${(main.done / Math.max(1, main.journey.levels.length)) * 100}%` }} />
                              </div>
                              {standings.length > 1 && <div className="mt-1 text-[11px] text-(--adm-dim)">+{standings.length - 1} more journey{standings.length > 2 ? 's' : ''}</div>}
                            </div>
                          ) : (
                            <span className="text-(--adm-dim)">No journey yet</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {!main ? (
                            <span className="text-(--adm-dim)">—</span>
                          ) : main.current < 0 ? (
                            <span className="inline-flex items-center gap-1 text-(--adm-teal)"><CircleCheck className="size-3.5" /> Finished</span>
                          ) : (
                            <div className="flex items-start gap-1.5">
                              {Icon && <Icon className="mt-0.5 size-3.5 shrink-0 text-(--adm-code)" />}
                              <div>
                                <div className="text-(--adm-heading)">{level!.title}</div>
                                <div className="text-[11px] text-(--adm-dim)">World {worldNumber(main.journey, level!.world)} · level {main.current + 1}{main.done === 0 ? ' · not started' : ''}</div>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">{xp}</td>
                        <td className="px-3 py-2.5">
                          {learner.github ? (
                            <div>
                              <div className="flex items-center gap-1"><FolderGit2 className="size-3.5" /> @{learner.github}</div>
                              {repo && (
                                <a href={`https://github.com/${repo.owner}/${repo.repo}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1 text-[11px] text-(--adm-link) hover:underline">
                                  {repo.repo} {repo.pushed ? '· pushed' : '· not pushed yet'} <ExternalLink className="size-3" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-(--adm-dim)">Not connected</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5" title={new Date(learner.lastActiveAt).toLocaleString()}>{ago(learner.lastActiveAt)}</td>
                      </tr>
                      {open && (
                        <tr className="border-t border-(--adm-border) bg-(--adm-panel-deep)">
                          <td />
                          <td colSpan={7} className="px-3 py-3">
                            <div className="mb-3 flex flex-wrap items-center gap-3">
                              <span className="text-[11px] text-(--adm-dim)">Joined {day(learner.joinedAt)}</span>
                              <label className="ml-auto flex cursor-pointer items-center gap-2 text-[12px]" title="Lets this learner open any level in any order. Levels still have to be solved to count.">
                                <input type="checkbox" checked={learner.allLevelsOpen} disabled={toggling === learner.id} onChange={(event) => void setAllOpen(learner, event.target.checked)} className="accent-(--adm-link)" />
                                Open every level
                                {toggling === learner.id && <LoaderCircle className="size-3.5 animate-spin" />}
                              </label>
                            </div>
                            {standings.length === 0 && <p className="text-(--adm-dim)">{learner.track ? 'No published journey for this stack yet.' : 'Has not picked a stack yet.'}</p>}
                            {standings.map((standing) => (
                              <LevelGrid key={standing.journey.id} standing={standing} />
                            ))}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {funnel && (
            <div className="mt-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-bold text-(--adm-heading)">Where learners are</h2>
                {startedJourneys.length > 1 && (
                  <select value={funnel.id} onChange={(event) => setFunnelId(event.target.value)} aria-label="Journey" className={cn(inputClass, 'w-auto')}>
                    {startedJourneys.map((journey) => <option key={journey.id} value={journey.id}>{journey.title} ({tracks[journey.track].label})</option>)}
                  </select>
                )}
              </div>
              <p className="mt-1 text-[12px] text-(--adm-muted)">{funnel.title}: how many of its {funnelRows.length} learner{funnelRows.length === 1 ? '' : 's'} passed each level, and who is on it right now. A level many people are stuck on is worth a look.</p>
              <ol className="mt-3 flex flex-col gap-1">
                {funnel.levels.map((level, index) => {
                  const passed = funnelRows.filter(({ standing }) => standing.passed.has(level.id)).length
                  const here = funnelRows.filter(({ standing }) => standing.current === index)
                  const Icon = kindIcons[level.kind]
                  return (
                    <li key={level.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)_6rem] items-center gap-3 text-[12px] sm:grid-cols-[1.5rem_minmax(0,16rem)_minmax(0,1fr)_minmax(0,14rem)]">
                      <span className="text-right text-(--adm-dim)">{index + 1}</span>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Icon className="size-3.5 shrink-0 text-(--adm-code)" />
                        <span className="truncate">{level.title}</span>
                      </span>
                      <span className="flex items-center gap-2 max-sm:col-start-3 max-sm:row-start-1">
                        <span className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-(--adm-border) sm:block">
                          <span className="block h-full rounded-full bg-(--adm-teal)" style={{ width: `${(passed / Math.max(1, funnelRows.length)) * 100}%` }} />
                        </span>
                        <span className="shrink-0 text-[11px] text-(--adm-muted)">{passed} passed</span>
                      </span>
                      <span className="col-start-2 truncate text-[11px] text-(--adm-link) sm:col-start-auto" title={here.map(({ learner }) => learner.name).join(', ')}>
                        {here.length ? `On it now: ${here.map(({ learner }) => learner.name).join(', ')}` : ''}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function LevelGrid({ standing }: { standing: Standing }) {
  const { journey, passed, current, entry } = standing
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[12px]">
        <span className="font-semibold text-(--adm-heading)">{journey.title}</span>
        <span className="text-(--adm-dim)">{tracks[journey.track].label} · {standing.done}/{journey.levels.length} levels</span>
        {entry.repo && (
          <a href={`https://github.com/${entry.repo.owner}/${entry.repo.repo}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-(--adm-link) hover:underline">
            {entry.repo.owner}/{entry.repo.repo} <ExternalLink className="size-3" />
          </a>
        )}
      </div>
      <ol className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
        {journey.levels.map((level, index) => {
          const row = passed.get(level.id)
          const state = row ? 'done' : index === current ? 'current' : 'locked'
          return (
            <li
              key={level.id}
              title={row ? `Passed ${new Date(row.completedAt).toLocaleString()} · ${row.attempts} tr${row.attempts === 1 ? 'y' : 'ies'} · ${row.hints} hint${row.hints === 1 ? '' : 's'}` : state === 'current' ? 'Next up' : 'Not reached yet'}
              className={cn('flex items-center gap-2 rounded border px-2 py-1 text-[11px]', state === 'done' ? 'border-(--adm-teal)/30 bg-(--adm-teal)/5' : state === 'current' ? 'border-(--adm-link)/60 bg-(--adm-link)/10' : 'border-(--adm-border) text-(--adm-dim)')}
            >
              <span className="w-5 shrink-0 text-right text-(--adm-dim)">{index + 1}</span>
              <span className={cn('min-w-0 flex-1 truncate', state !== 'locked' && 'text-(--adm-fg)')}>{level.title}</span>
              {row ? (
                <span className="shrink-0 text-(--adm-warning)" aria-label={`${row.stars} of 3 stars`}>{'★'.repeat(row.stars)}<span className="text-(--adm-track)">{'★'.repeat(3 - row.stars)}</span></span>
              ) : state === 'current' ? (
                <span className="shrink-0 text-(--adm-link)">now</span>
              ) : null}
              {row && <span className="shrink-0 text-(--adm-dim)">{day(row.completedAt)}</span>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
