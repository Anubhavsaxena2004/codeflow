'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CircleAlert, CircleCheck, Clock, FileJson, LoaderCircle, PencilRuler, TriangleAlert, Wand2, ArrowRight } from 'lucide-react'
import { Pill } from '@/components/ui/game'
import { FileExplorer } from '@/components/ide/file-explorer'
import { kindIcons } from '@/components/journey/level-meta'
import { slugify } from '@/lib/journeys/scaffold'
import { filesBefore } from '@/lib/journeys/snapshot'
import { kindLabels, trackIds, tracks, type Project, type Track } from '@/lib/journeys/types'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import { Field, inputClass, TextArea, TextInput } from './fields'
import { LearnersPanel } from './learners-panel'

type Row = { id: string; track: Track; title: string; summary: string; worlds: number; levels: number; published: boolean; source: 'bundled' | 'edited' | 'custom'; updatedAt: string | null }

const EXAMPLE_TREE = `todo-app/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # UI pieces
│   │   │   ├── TodoForm.jsx
│   │   │   └── TodoList.jsx
│   │   ├── services/
│   │   │   └── api.js       # axios calls to backend
│   │   └── App.jsx
│   └── package.json
├── server/                  # Node + Express backend
│   ├── config/
│   │   └── db.js            # MongoDB connection
│   ├── models/
│   │   └── Todo.js          # Mongoose schema
│   ├── controllers/
│   │   └── todoController.js
│   ├── routes/
│   │   └── todoRoutes.js
│   ├── package.json
│   └── server.js            # entry point
└── README.md`

const EXAMPLE_FLOW = 'React component → api.js → route → controller → model → MongoDB, then back the same way.'

const sourceBadges = { bundled: 'Bundled', edited: 'Edited', custom: 'Custom' }

export function AdminDashboard() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mode, setMode] = useState<'generate' | 'import'>('generate')

  const [title, setTitle] = useState('Kanban Board')
  const [track, setTrack] = useState<Track>('mern')
  const [id, setId] = useState('')
  const [tree, setTree] = useState(EXAMPLE_TREE)
  const [flow, setFlow] = useState(EXAMPLE_FLOW)
  const [importText, setImportText] = useState('')
  const [draft, setDraft] = useState<{ project: Project; warnings: string[]; errors: string[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string[] | null>(null)

  const projectId = id || slugify(`${track} ${title}`)

  useEffect(() => {
    fetch('/api/admin/projects')
      .then(async (response) => (response.ok ? response.json() : Promise.reject((await response.json().catch(() => null))?.error ?? 'Could not load journeys.')))
      .then((data: { projects: Row[] }) => setRows(data.projects))
      .catch((error) => setLoadError(String(error)))
  }, [])

  const generate = async () => {
    setBusy(true)
    setProblem(null)
    const response = await fetch('/api/admin/scaffold', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: projectId, track, title, tree, flow }) }).catch(() => null)
    const data = await response?.json().catch(() => null)
    setBusy(false)
    if (!response?.ok) return setProblem([data?.error ?? 'Could not reach the server.'])
    setDraft(data)
  }

  const create = async (definition: unknown) => {
    setBusy(true)
    setProblem(null)
    const response = await fetch('/api/admin/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ definition, published: false }) }).catch(() => null)
    const data = await response?.json().catch(() => null)
    setBusy(false)
    if (!response?.ok) return setProblem(data?.errors ?? [data?.error ?? 'Could not reach the server.'])
    router.push(`/admin/projects/${data.id}`)
  }

  const importJson = () => {
    try {
      void create(JSON.parse(importText))
    } catch (error) {
      setProblem([error instanceof Error ? error.message : 'Invalid JSON'])
    }
  }

  return (
    <main className="min-h-dvh bg-(--adm-bg) text-[13px] text-(--adm-fg)">
      <header className="border-b border-(--adm-border) bg-(--adm-panel) px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3">
          <Link href="/" className="font-display text-lg font-bold tracking-tight text-(--adm-heading)">
            {'</>'} CodeFlow
          </Link>
          <span className="text-(--adm-dim)">/ Admin</span>
          <nav className="ml-3 hidden gap-4 text-[12px] font-medium sm:flex">
            <a href="#learners" className="text-(--adm-muted) transition-colors duration-150 hover:text-(--adm-heading)">Learners</a>
            <a href="#journeys" className="text-(--adm-muted) transition-colors duration-150 hover:text-(--adm-heading)">Journeys</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/mentor"
              className="flex items-center gap-1.5 rounded-lg border border-(--adm-border-strong) bg-(--adm-panel) px-3 py-1.5 text-[12px] font-medium text-(--adm-fg) hover:bg-(--adm-hover) transition-colors duration-150"
            >
              <PencilRuler className="size-3.5" /> Challenge sandbox
            </Link>
            <ThemeToggle className="size-8 rounded-lg border border-(--adm-border-strong) text-(--adm-muted) hover:bg-(--adm-hover) hover:text-(--adm-heading) transition-colors duration-150" iconClassName="size-3.5" />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 p-4 md:p-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[length:var(--fs-h2)] font-black tracking-tight text-(--adm-heading)">
            Game Studio Dashboard
          </h1>
          <p className="text-[13px] text-(--adm-muted)">
            Manage curriculum tracks, monitor learner island progress, and author new challenge levels.
          </p>
        </div>

        <LearnersPanel />

        <section id="journeys" className="scroll-mt-4">
          <h2 className="font-display text-xl font-bold tracking-tight text-(--adm-heading)">Journeys</h2>
          <p className="mt-1 max-w-3xl text-[12px] leading-5 text-(--adm-muted)">
            Bundled journeys ship with the code (data/journeys). Editing one saves your version to the database, which then replaces it for every learner; “Revert to bundled” throws your edits away. New journeys you create live only in the database. Nothing is visible to learners until it is published.
          </p>
          {loadError && <p className="mt-3 text-(--adm-error)">{loadError}</p>}
          {!rows && !loadError && <p className="mt-3 text-(--adm-dim)">Loading…</p>}
          {rows && (
            <div className="mt-4 overflow-x-auto rounded-lg border border-(--adm-border)">
              <table className="w-full min-w-[640px] text-left text-[12px]">
                <thead className="sticky top-0 z-10 border-b border-(--adm-border) bg-(--adm-panel) text-[11px] font-semibold tracking-wide text-(--adm-muted)">
                  <tr className="h-10">
                    <th className="px-3 py-2 font-semibold">JOURNEY</th>
                    <th className="px-3 py-2 font-semibold">STACK</th>
                    <th className="px-3 py-2 font-semibold">SIZE</th>
                    <th className="px-3 py-2 font-semibold">SOURCE</th>
                    <th className="px-3 py-2 font-semibold">STATUS</th>
                    <th className="px-3 py-2 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="h-11 border-t border-(--adm-border) transition-colors duration-150 hover:bg-(--adm-row-hover)">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-(--adm-heading)">{row.title}</div>
                        <div className="text-[11px] text-(--adm-dim)">{row.id}</div>
                      </td>
                      <td className="px-3 py-2.5">{tracks[row.track].label}</td>
                      <td className="num px-3 py-2.5">{row.worlds} worlds · {row.levels} levels</td>
                      <td className="px-3 py-2.5">{sourceBadges[row.source]}</td>
                      <td className="px-3 py-2.5">
                        {row.published ? (
                          <Pill tone="success" size="sm" icon={<CircleCheck className="size-3" />}>Published</Pill>
                        ) : (
                          <Pill tone="neutral" size="sm" icon={<Clock className="size-3" />}>Draft</Pill>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link href={`/admin/projects/${row.id}`} className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-(--adm-link) hover:underline transition-colors duration-150">
                          Edit <ArrowRight className="size-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-(--adm-border) bg-(--adm-panel) p-4 md:p-6">
          <h2 className="font-display text-lg font-bold tracking-tight text-(--adm-heading)">New journey</h2>
          <div className="mt-3 flex gap-1.5" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'generate'}
              onClick={() => setMode('generate')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors duration-150',
                mode === 'generate'
                  ? 'border-(--adm-border-strong) bg-(--adm-selected) text-(--adm-heading)'
                  : 'border-transparent text-(--adm-muted) hover:bg-(--adm-hover)'
              )}
            >
              <Wand2 className="size-3.5" /> From a folder tree
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'import'}
              onClick={() => setMode('import')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors duration-150',
                mode === 'import'
                  ? 'border-(--adm-border-strong) bg-(--adm-selected) text-(--adm-heading)'
                  : 'border-transparent text-(--adm-muted) hover:bg-(--adm-hover)'
              )}
            >
              <FileJson className="size-3.5" /> Import JSON
            </button>
          </div>

          {mode === 'generate' ? (
            <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="flex flex-col gap-3.5">
                <p className="text-[12px] leading-5 text-(--adm-muted)">
                  Give the topic, paste the folder structure (comments after <code className="text-(--adm-string)"># </code> become the explanations) and the request flow. The server places every file in its folder, turns each folder into a level ordered data-layer-first, and makes the flow the final architecture level. Then you turn levels into terminal steps, coding tasks and bug hunts in the editor.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <TextInput label="Topic" value={title} onChange={(event) => setTitle(event.target.value)} />
                  <Field label="Stack">
                    <select value={track} onChange={(event) => setTrack(event.target.value as Track)} className={inputClass}>
                      {trackIds.map((item) => <option key={item} value={item}>{tracks[item].label}</option>)}
                    </select>
                  </Field>
                  <TextInput label="Id" value={id} placeholder={projectId} onChange={(event) => setId(event.target.value)} />
                </div>
                <TextArea label="Folder tree" code rows={16} value={tree} onChange={(event) => setTree(event.target.value)} hint="tree output, an indented outline, or one path per line all work." />
                <TextArea label="Request flow" rows={2} value={flow} onChange={(event) => setFlow(event.target.value)} hint="Stops separated by → or ->. A trailing sentence becomes the return trip." />
                <button
                  type="button"
                  onClick={() => void generate()}
                  disabled={busy}
                  className="flex w-fit items-center gap-1.5 rounded-lg bg-[#15803d] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#166534] disabled:opacity-50 transition-colors duration-150"
                >
                  {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />} Generate draft
                </button>
              </div>

              <div className="min-w-0 rounded-lg border border-(--adm-border) bg-(--adm-panel-deep)">
                {!draft ? (
                  <p className="p-4 text-[12px] text-(--adm-dim)">The generated journey shows up here: its worlds, levels and the finished file tree. Nothing is saved until you create it.</p>
                ) : (
                  <div className="flex h-full flex-col">
                    <div className="border-b border-(--adm-border) p-3">
                      <div className="font-semibold text-(--adm-heading)">{draft.project.title} <span className="font-normal text-(--adm-dim)">· {draft.project.id}</span></div>
                      {[...draft.errors, ...draft.warnings].map((message) => (
                        <p key={message} className={cn('mt-1.5 flex gap-1.5 text-[12px] leading-5', draft.errors.includes(message) ? 'text-(--adm-error)' : 'text-(--adm-warning)')}>
                          {draft.errors.includes(message) ? <CircleAlert className="mt-0.5 size-3.5 shrink-0" /> : <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />}
                          {message}
                        </p>
                      ))}
                    </div>
                    <div className="grid min-h-0 flex-1 sm:grid-cols-2">
                      <ol className="max-h-96 overflow-y-auto border-b border-(--adm-border) p-3 sm:border-b-0 sm:border-r">
                        {draft.project.worlds.map((world, worldNumber) => (
                          <li key={world.id} className="mb-3">
                            <div className="text-[10px] font-bold tracking-wider text-(--adm-dim)">WORLD {worldNumber + 1} · {world.title.toUpperCase()}</div>
                            <ul className="mt-1 flex flex-col gap-1">
                              {draft.project.levels.filter((level) => level.world === world.id).map((level) => {
                                const Icon = kindIcons[level.kind]
                                return (
                                  <li key={level.id} className="flex items-center gap-2 text-[12px]">
                                    <Icon className="size-3.5 shrink-0 text-(--adm-code)" aria-label={kindLabels[level.kind]} />
                                    <span className="truncate">{level.title}</span>
                                  </li>
                                )
                              })}
                            </ul>
                          </li>
                        ))}
                      </ol>
                      <div className="h-96">
                        <FileExplorer projectName={draft.project.projectName} files={[...filesBefore(draft.project, draft.project.levels.length).values()]} folders={draft.project.folders} activePath={null} onOpen={() => undefined} />
                      </div>
                    </div>
                    <div className="border-t border-(--adm-border) p-3">
                      <button
                        type="button"
                        onClick={() => void create(draft.project)}
                        disabled={busy || draft.errors.length > 0}
                        className="flex items-center gap-1.5 rounded-lg bg-[#15803d] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#166534] disabled:opacity-50 transition-colors duration-150"
                      >
                        Create as draft and open the editor <ArrowRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-5 flex max-w-3xl flex-col gap-3.5">
              <p className="text-[12px] leading-5 text-(--adm-muted)">Paste a whole journey definition, for example one exported from the editor. It is validated in full before it is saved as a draft.</p>
              <TextArea label="Journey JSON" code rows={18} value={importText} onChange={(event) => setImportText(event.target.value)} />
              <button
                type="button"
                onClick={importJson}
                disabled={busy || !importText.trim()}
                className="flex w-fit items-center gap-1.5 rounded-lg bg-[#15803d] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#166534] disabled:opacity-50 transition-colors duration-150"
              >
                {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <FileJson className="size-3.5" />} Import as draft
              </button>
            </div>
          )}
          {problem && (
            <ul className="mt-3 flex flex-col gap-1 rounded-lg border border-(--adm-error)/40 bg-(--adm-error)/10 p-3 text-[12px] text-(--adm-error)" role="alert">
              {problem.map((message) => <li key={message}>{message}</li>)}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}

