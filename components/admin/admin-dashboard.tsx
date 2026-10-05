'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, CircleAlert, FileJson, LoaderCircle, PencilRuler, TriangleAlert, Wand2 } from 'lucide-react'
import { FileExplorer } from '@/components/ide/file-explorer'
import { kindIcons } from '@/components/journey/level-meta'
import { slugify } from '@/lib/journeys/scaffold'
import { filesBefore } from '@/lib/journeys/snapshot'
import { kindLabels, trackIds, tracks, type Project, type Track } from '@/lib/journeys/types'
import { cn } from '@/lib/utils'
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
    <main className="min-h-dvh bg-[#0d0f12] text-[13px] text-[#d4d4d4]">
      <header className="border-b border-[#292d35] bg-[#111318] px-5 py-3">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Link href="/" className="font-bold text-white">{'</>'} CodeFlow</Link>
          <span className="text-[#6e7681]">/ Admin</span>
          <nav className="ml-2 hidden gap-3 text-[12px] sm:flex">
            <a href="#learners" className="text-[#9da5b4] hover:text-white">Learners</a>
            <a href="#journeys" className="text-[#9da5b4] hover:text-white">Journeys</a>
          </nav>
          <Link href="/mentor" className="ml-auto flex items-center gap-1.5 rounded border border-[#343a46] px-2.5 py-1 text-[12px] hover:bg-[#1c1f26]"><PencilRuler className="size-3.5" /> Challenge sandbox</Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 p-5">
        <LearnersPanel />

        <section id="journeys" className="scroll-mt-4">
          <h2 className="text-xl font-bold text-white">Journeys</h2>
          <p className="mt-1 max-w-3xl text-[12px] leading-5 text-[#9da5b4]">
            Bundled journeys ship with the code (data/journeys). Editing one saves your version to the database, which then replaces it for every learner; “Revert to bundled” throws your edits away. New journeys you create live only in the database. Nothing is visible to learners until it is published.
          </p>
          {loadError && <p className="mt-3 text-[#f48771]">{loadError}</p>}
          {!rows && !loadError && <p className="mt-3 text-[#6e7681]">Loading…</p>}
          {rows && (
            <div className="mt-4 overflow-x-auto rounded border border-[#292d35]">
              <table className="w-full min-w-[640px] text-left text-[12px]">
                <thead className="bg-[#111318] text-[11px] tracking-wide text-[#9da5b4]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">JOURNEY</th>
                    <th className="px-3 py-2 font-semibold">STACK</th>
                    <th className="px-3 py-2 font-semibold">SIZE</th>
                    <th className="px-3 py-2 font-semibold">SOURCE</th>
                    <th className="px-3 py-2 font-semibold">STATUS</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-[#292d35]">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-white">{row.title}</div>
                        <div className="text-[#6e7681]">{row.id}</div>
                      </td>
                      <td className="px-3 py-2.5">{tracks[row.track].label}</td>
                      <td className="px-3 py-2.5">{row.worlds} worlds · {row.levels} levels</td>
                      <td className="px-3 py-2.5">{sourceBadges[row.source]}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn('rounded px-1.5 py-0.5 text-[11px]', row.published ? 'bg-[#4ec9b0]/15 text-[#4ec9b0]' : 'bg-[#e2c08d]/15 text-[#e2c08d]')}>{row.published ? 'Published' : 'Draft'}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link href={`/admin/projects/${row.id}`} className="inline-flex items-center gap-1 text-[#3794ff] hover:underline">Edit <ArrowRight className="size-3.5" /></Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-bold text-white">New journey</h2>
          <div className="mt-3 flex gap-1" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'generate'} onClick={() => setMode('generate')} className={cn('flex items-center gap-1.5 rounded px-3 py-1.5 text-[12px]', mode === 'generate' ? 'bg-[#1f2a37] text-white' : 'text-[#9da5b4] hover:bg-[#1c1f26]')}><Wand2 className="size-3.5" /> From a folder tree</button>
            <button type="button" role="tab" aria-selected={mode === 'import'} onClick={() => setMode('import')} className={cn('flex items-center gap-1.5 rounded px-3 py-1.5 text-[12px]', mode === 'import' ? 'bg-[#1f2a37] text-white' : 'text-[#9da5b4] hover:bg-[#1c1f26]')}><FileJson className="size-3.5" /> Import JSON</button>
          </div>

          {mode === 'generate' ? (
            <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="flex flex-col gap-3">
                <p className="text-[12px] leading-5 text-[#9da5b4]">
                  Give the topic, paste the folder structure (comments after <code className="text-[#ce9178]"># </code> become the explanations) and the request flow. The server places every file in its folder, turns each folder into a level ordered data-layer-first, and makes the flow the final architecture level. Then you turn levels into terminal steps, coding tasks and bug hunts in the editor.
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
                <button type="button" onClick={() => void generate()} disabled={busy} className="flex w-fit items-center gap-1.5 rounded bg-[#007acc] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#0062a3] disabled:opacity-50">
                  {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />} Generate draft
                </button>
              </div>

              <div className="min-w-0 rounded border border-[#292d35] bg-[#111318]">
                {!draft ? (
                  <p className="p-4 text-[12px] text-[#6e7681]">The generated journey shows up here: its worlds, levels and the finished file tree. Nothing is saved until you create it.</p>
                ) : (
                  <div className="flex h-full flex-col">
                    <div className="border-b border-[#292d35] p-3">
                      <div className="font-semibold text-white">{draft.project.title} <span className="font-normal text-[#6e7681]">· {draft.project.id}</span></div>
                      {[...draft.errors, ...draft.warnings].map((message) => (
                        <p key={message} className={cn('mt-1.5 flex gap-1.5 text-[12px] leading-5', draft.errors.includes(message) ? 'text-[#f48771]' : 'text-[#e2c08d]')}>
                          {draft.errors.includes(message) ? <CircleAlert className="mt-0.5 size-3.5 shrink-0" /> : <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />}
                          {message}
                        </p>
                      ))}
                    </div>
                    <div className="grid min-h-0 flex-1 sm:grid-cols-2">
                      <ol className="max-h-96 overflow-y-auto border-b border-[#292d35] p-3 sm:border-b-0 sm:border-r">
                        {draft.project.worlds.map((world, worldNumber) => (
                          <li key={world.id} className="mb-3">
                            <div className="text-[10px] font-bold tracking-wider text-[#6e7681]">WORLD {worldNumber + 1} · {world.title.toUpperCase()}</div>
                            <ul className="mt-1 flex flex-col gap-1">
                              {draft.project.levels.filter((level) => level.world === world.id).map((level) => {
                                const Icon = kindIcons[level.kind]
                                return (
                                  <li key={level.id} className="flex items-center gap-2 text-[12px]">
                                    <Icon className="size-3.5 shrink-0 text-[#9cdcfe]" aria-label={kindLabels[level.kind]} />
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
                    <div className="border-t border-[#292d35] p-3">
                      <button type="button" onClick={() => void create(draft.project)} disabled={busy || draft.errors.length > 0} className="flex items-center gap-1.5 rounded bg-[#2ea043] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#3fb950] disabled:opacity-50">
                        Create as draft and open the editor <ArrowRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 flex max-w-3xl flex-col gap-3">
              <p className="text-[12px] leading-5 text-[#9da5b4]">Paste a whole journey definition, for example one exported from the editor. It is validated in full before it is saved as a draft.</p>
              <TextArea label="Journey JSON" code rows={18} value={importText} onChange={(event) => setImportText(event.target.value)} />
              <button type="button" onClick={importJson} disabled={busy || !importText.trim()} className="flex w-fit items-center gap-1.5 rounded bg-[#007acc] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#0062a3] disabled:opacity-50">
                {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <FileJson className="size-3.5" />} Import as draft
              </button>
            </div>
          )}
          {problem && (
            <ul className="mt-3 flex flex-col gap-1 rounded border border-[#f48771]/40 bg-[#f48771]/10 p-3 text-[12px] text-[#f48771]" role="alert">
              {problem.map((message) => <li key={message}>{message}</li>)}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
