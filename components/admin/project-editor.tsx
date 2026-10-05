'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowLeft, ArrowUp, Braces, CircleAlert, CircleCheck, Download, Eye, LoaderCircle, Plus, Save, Settings2, Skull, Trash2, Undo2 } from 'lucide-react'
import type { ProjectFile } from '@/data/challenges'
import { FileExplorer } from '@/components/ide/file-explorer'
import { JourneyWorkspace } from '@/components/journey/journey-workspace'
import { kindIcons } from '@/components/journey/level-meta'
import { runChecks } from '@/lib/journeys/checks'
import { filesBefore } from '@/lib/journeys/snapshot'
import { kindLabels, trackIds, tracks, type CommandStep, type Level, type LevelKind, type Project, type WorldTheme } from '@/lib/journeys/types'
import { validateProject } from '@/lib/journeys/validate'
import type { CatalogEntry } from '@/lib/server/journeys'
import { cn } from '@/lib/utils'
import { Field, FileListEditor, inputClass, JsonField, TextArea, TextInput, Toggle } from './fields'
import { levelTemplate } from './level-templates'

const THEMES: WorldTheme[] = ['village', 'forest', 'dungeon', 'castle', 'lab', 'city']
const KINDS = Object.keys(kindLabels) as LevelKind[]
const sourceLabels = { bundled: 'Bundled (not edited yet)', edited: 'Bundled, edited in admin', custom: 'Created in admin' }

type CodeLevel = Extract<Level, { kind: 'edit' | 'bugfix' }>

function uniqueId(base: string, taken: string[]) {
  let id = base
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`
  return id
}

export function ProjectEditor({ initial }: { initial: CatalogEntry }) {
  const router = useRouter()
  const [draft, setDraft] = useState<Project>(initial.project)
  const [published, setPublished] = useState(initial.published)
  const [source, setSource] = useState(initial.source)
  // Index of the level being edited; null is the project settings. By position, so renaming an id is safe.
  const [selected, setSelected] = useState<number | null>(null)
  const [raw, setRaw] = useState(false)
  const [newKind, setNewKind] = useState<LevelKind>('edit')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [serverErrors, setServerErrors] = useState<string[]>([])
  const [preview, setPreview] = useState<string | null>(null)

  const validation = useMemo(() => validateProject(draft), [draft])
  const errors = validation.ok ? [] : validation.errors
  const levelIndex = selected ?? -1
  const level = selected === null ? undefined : draft.levels[selected]

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const change = (next: Project) => {
    setDraft(next)
    setDirty(true)
    setNotice(null)
  }
  const updateLevel = (index: number, patch: Partial<Level>) => change({ ...draft, levels: draft.levels.map((item, at) => (at === index ? ({ ...item, ...patch } as Level) : item)) })
  const replaceLevel = (index: number, next: Level) => change({ ...draft, levels: draft.levels.map((item, at) => (at === index ? next : item)) })

  const move = (at: number, delta: -1 | 1) => {
    const levels = [...draft.levels]
    const to = at + delta
    if (to < 0 || to >= levels.length) return
    // Crossing a world boundary moves the level into that world rather than past its levels.
    if (levels[to].world !== levels[at].world) levels[at] = { ...levels[at], world: levels[to].world } as Level
    else {
      ;[levels[at], levels[to]] = [levels[to], levels[at]]
      if (selected === at) setSelected(to)
      else if (selected === to) setSelected(at)
    }
    change({ ...draft, levels })
  }

  const addLevel = () => {
    const world = level?.world ?? draft.worlds[draft.worlds.length - 1]?.id ?? 'world-1'
    const id = uniqueId(`new-${newKind}`, draft.levels.map((item) => item.id))
    const levels = [...draft.levels]
    const at = levelIndex >= 0 ? levelIndex + 1 : levels.length
    levels.splice(at, 0, levelTemplate(newKind, id, world))
    change({ ...draft, levels })
    setSelected(at)
  }

  const removeLevel = (index: number) => {
    if (!window.confirm(`Delete level "${draft.levels[index].id}"? Learners who passed it keep their progress row, but it no longer counts.`)) return
    change({ ...draft, levels: draft.levels.filter((_, at) => at !== index) })
    setSelected(null)
  }

  const save = async () => {
    setSaving(true)
    setServerErrors([])
    const response = await fetch(`/api/admin/projects/${draft.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ definition: draft, published }) }).catch(() => null)
    const data = await response?.json().catch(() => null)
    setSaving(false)
    if (!response?.ok) {
      setServerErrors(data?.errors ?? [data?.error ?? 'Could not reach the server.'])
      setNotice({ ok: false, text: 'Not saved.' })
      return
    }
    setSource(data.source)
    setDirty(false)
    setNotice({ ok: true, text: published ? 'Saved and live for learners.' : 'Saved as a draft. Learners will not see it until you publish.' })
  }

  const revert = async () => {
    const message = source === 'custom' ? 'Delete this journey for everyone? This cannot be undone.' : 'Throw away every admin edit and go back to the bundled version?'
    if (!window.confirm(message)) return
    const response = await fetch(`/api/admin/projects/${draft.id}`, { method: 'DELETE' }).catch(() => null)
    const data = await response?.json().catch(() => null)
    if (!response?.ok) return setNotice({ ok: false, text: data?.error ?? 'Could not delete.' })
    if (!data.entry) return router.push('/admin')
    setDraft(data.entry.project)
    setPublished(data.entry.published)
    setSource(data.entry.source)
    setDirty(false)
    setSelected(null)
    setNotice({ ok: true, text: 'Back to the bundled version.' })
  }

  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${draft.id}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const treeAfter = useMemo(() => {
    try {
      return [...filesBefore(draft, levelIndex >= 0 ? levelIndex + 1 : draft.levels.length).values()]
    } catch {
      return null
    }
  }, [draft, levelIndex])

  if (preview && validation.ok) {
    return <JourneyWorkspace key={preview} project={validation.project} levelId={preview} preview onNavigate={setPreview} onExit={() => setPreview(null)} />
  }

  const levelErrors = level ? errors.filter((error) => error.includes(`(${level.id})`)) : errors.filter((error) => !error.startsWith('levels['))

  return (
    <main className="flex min-h-dvh flex-col bg-[#0d0f12] text-[13px] text-[#d4d4d4] lg:h-dvh">
      <header className="flex flex-wrap items-center gap-2 border-b border-[#292d35] bg-[#111318] px-4 py-2.5">
        <Link href="/admin" className="flex items-center gap-1.5 rounded px-2 py-1 text-[12px] text-[#9da5b4] hover:bg-[#1c1f26]">
          <ArrowLeft className="size-3.5" /> Journeys
        </Link>
        <div className="min-w-0">
          <div className="truncate font-semibold text-white">{draft.title} <span className="font-normal text-[#6e7681]">· {draft.id}</span></div>
          <div className="text-[11px] text-[#6e7681]">{sourceLabels[source]} · {tracks[draft.track].label} · {draft.levels.length} levels</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {notice && <span className={cn('text-[12px]', notice.ok ? 'text-[#4ec9b0]' : 'text-[#f48771]')}>{notice.text}</span>}
          {dirty && <span className="text-[12px] text-[#e2c08d]">Unsaved changes</span>}
          <Toggle label="Published" checked={published} onChange={(value) => { setPublished(value); setDirty(true) }} />
          <button type="button" onClick={exportJson} className="flex items-center gap-1.5 rounded border border-[#343a46] px-2.5 py-1 text-[12px] hover:bg-[#1c1f26]"><Download className="size-3.5" /> Export</button>
          {source !== 'bundled' && (
            <button type="button" onClick={() => void revert()} className="flex items-center gap-1.5 rounded border border-[#343a46] px-2.5 py-1 text-[12px] hover:bg-[#1c1f26]">
              {source === 'custom' ? <Trash2 className="size-3.5" /> : <Undo2 className="size-3.5" />} {source === 'custom' ? 'Delete' : 'Revert to bundled'}
            </button>
          )}
          <button type="button" onClick={() => void save()} disabled={saving || !validation.ok} title={validation.ok ? undefined : 'Fix the problems first'} className="flex items-center gap-1.5 rounded bg-[#007acc] px-3 py-1 text-[12px] font-semibold text-white hover:bg-[#0062a3] disabled:opacity-40">
            {saving ? <LoaderCircle className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        {/* Outline */}
        <nav aria-label="Outline" className="min-h-0 overflow-y-auto border-r border-[#292d35] bg-[#111318] p-2">
          <button type="button" onClick={() => setSelected(null)} className={cn('flex w-full items-center gap-2 rounded px-2 py-1.5 text-left', selected === null ? 'bg-[#1f2a37] text-white' : 'hover:bg-[#1c1f26]')}>
            <Settings2 className="size-4 text-[#9da5b4]" /> Project and worlds
          </button>
          {draft.worlds.map((world, worldNumber) => (
            <div key={world.id} className="mt-3">
              <div className="px-2 text-[10px] font-bold tracking-wider text-[#6e7681]">WORLD {worldNumber + 1} · {world.title.toUpperCase()}</div>
              <ul className="mt-1">
                {draft.levels.map((item, index) => {
                  if (item.world !== world.id) return null
                  const Icon = kindIcons[item.kind]
                  const broken = errors.some((error) => error.includes(`(${item.id})`))
                  return (
                    <li key={index} className={cn('group flex items-center rounded', selected === index ? 'bg-[#1f2a37]' : 'hover:bg-[#1c1f26]')}>
                      <button type="button" onClick={() => setSelected(index)} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left">
                        <span className="w-5 shrink-0 text-right text-[11px] text-[#6e7681]">{index + 1}</span>
                        <Icon className={cn('size-3.5 shrink-0', broken ? 'text-[#f48771]' : 'text-[#9cdcfe]')} />
                        <span className={cn('truncate', selected === index && 'text-white')}>{item.title}</span>
                        {item.boss && <Skull aria-label="boss" className="size-3 shrink-0 text-[#f48771]" />}
                      </button>
                      <span className="hidden shrink-0 pr-1 group-hover:flex">
                        <button type="button" onClick={() => move(index, -1)} aria-label="Move up" className="rounded p-0.5 hover:bg-[#2b2f37]"><ArrowUp className="size-3" /></button>
                        <button type="button" onClick={() => move(index, 1)} aria-label="Move down" className="rounded p-0.5 hover:bg-[#2b2f37]"><ArrowDown className="size-3" /></button>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          <div className="mt-4 flex gap-1.5 border-t border-[#292d35] px-1 pt-3">
            <select value={newKind} onChange={(event) => setNewKind(event.target.value as LevelKind)} aria-label="Kind of level to add" className={cn(inputClass, 'w-auto flex-1')}>
              {KINDS.map((kind) => <option key={kind} value={kind}>{kindLabels[kind]}</option>)}
            </select>
            <button type="button" onClick={addLevel} className="flex items-center gap-1 rounded bg-[#007acc] px-2.5 text-[12px] text-white hover:bg-[#0062a3]"><Plus className="size-3.5" /> Level</button>
          </div>
          <p className="px-1 pt-2 text-[11px] leading-4 text-[#6e7681]">New levels go after the selected one. Learners unlock levels top to bottom.</p>
        </nav>

        {/* Editor */}
        <section className="min-h-0 overflow-y-auto p-5">
          {!level ? (
            <ProjectSettings draft={draft} onChange={change} />
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              <div className="flex items-center gap-2">
                <h1 className="text-[15px] font-semibold text-white">{kindLabels[level.kind]} level</h1>
                <span className="ml-auto flex gap-2">
                  <button type="button" onClick={() => setRaw((value) => !value)} className={cn('flex items-center gap-1.5 rounded border px-2.5 py-1 text-[12px]', raw ? 'border-[#007acc] text-white' : 'border-[#343a46] hover:bg-[#1c1f26]')}><Braces className="size-3.5" /> JSON</button>
                  <button type="button" onClick={() => setPreview(level.id)} disabled={!validation.ok} title={validation.ok ? 'Play this level as a learner' : 'Fix the problems to preview'} className="flex items-center gap-1.5 rounded border border-[#343a46] px-2.5 py-1 text-[12px] hover:bg-[#1c1f26] disabled:opacity-40"><Eye className="size-3.5" /> Preview</button>
                  <button type="button" onClick={() => removeLevel(levelIndex)} className="flex items-center gap-1.5 rounded border border-[#343a46] px-2.5 py-1 text-[12px] hover:border-[#f48771] hover:text-[#f48771]"><Trash2 className="size-3.5" /> Delete</button>
                </span>
              </div>
              {raw ? (
                <JsonField key={`${levelIndex}-raw`} label="Level JSON" rows={30} value={level} onChange={(value) => value && typeof value === 'object' && replaceLevel(levelIndex, value as Level)} />
              ) : (
                <LevelForm key={levelIndex} draft={draft} level={level} onPatch={(patch) => updateLevel(levelIndex, patch)} onReplace={(next) => replaceLevel(levelIndex, next)} />
              )}
            </div>
          )}
        </section>

        {/* Problems and files */}
        <aside className="min-h-0 overflow-y-auto border-l border-[#292d35] bg-[#111318]">
          <div className="border-b border-[#292d35] p-3">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold tracking-wide text-[#9da5b4]">
              {validation.ok ? <CircleCheck className="size-3.5 text-[#4ec9b0]" /> : <CircleAlert className="size-3.5 text-[#f48771]" />}
              {validation.ok ? 'NO PROBLEMS' : `${errors.length} PROBLEM${errors.length === 1 ? '' : 'S'}`}
            </div>
            {[...serverErrors, ...(levelErrors.length ? levelErrors : errors)].slice(0, 12).map((error) => (
              <p key={error} className="mb-1.5 text-[12px] leading-5 text-[#f48771]">{error}</p>
            ))}
            {validation.ok && <p className="text-[12px] leading-5 text-[#6e7681]">Every level is solvable: solutions pass their checks, starters don&apos;t, and each terminal step accepts its own command.</p>}
          </div>
          <div className="h-[28rem] lg:h-[calc(100%-8rem)]">
            {treeAfter ? (
              <FileExplorer key={selected ?? 'all'} projectName={`${draft.projectName} · after ${level ? `level ${levelIndex + 1}` : 'every level'}`} files={treeAfter} folders={draft.folders} activePath={null} onOpen={() => undefined} />
            ) : (
              <p className="p-3 text-[12px] text-[#6e7681]">Fix the problems to see the file tree.</p>
            )}
          </div>
        </aside>
      </div>
    </main>
  )
}

function ProjectSettings({ draft, onChange }: { draft: Project; onChange: (project: Project) => void }) {
  const set = (patch: Partial<Project>) => onChange({ ...draft, ...patch })
  const setWorld = (index: number, patch: Partial<Project['worlds'][number]>) => set({ worlds: draft.worlds.map((world, at) => (at === index ? { ...world, ...patch } : world)) })
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-[15px] font-semibold text-white">Project</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput label="Id" value={draft.id} readOnly hint="Fixed once created. It is also the GitHub repo link key." />
        <Field label="Track">
          <select value={draft.track} onChange={(event) => set({ track: event.target.value as Project['track'] })} className={inputClass}>
            {trackIds.map((track) => <option key={track} value={track}>{tracks[track].label}</option>)}
          </select>
        </Field>
        <TextInput label="Title" value={draft.title} onChange={(event) => set({ title: event.target.value })} />
        <TextInput label="Root folder name" value={draft.projectName} onChange={(event) => set({ projectName: event.target.value })} />
      </div>
      <TextArea label="Summary" rows={2} value={draft.summary} onChange={(event) => set({ summary: event.target.value })} />

      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-white">Worlds</h2>
        <button type="button" onClick={() => set({ worlds: [...draft.worlds, { id: `world-${draft.worlds.length + 1}`, title: 'New world', subtitle: '', theme: THEMES[draft.worlds.length % THEMES.length] }] })} className="flex items-center gap-1 rounded px-2 py-1 text-[12px] text-[#9cdcfe] hover:bg-[#1c1f26]"><Plus className="size-3.5" /> World</button>
      </div>
      <ul className="flex flex-col gap-2">
        {draft.worlds.map((world, index) => {
          const used = draft.levels.some((level) => level.world === world.id)
          return (
            <li key={index} className="grid gap-2 rounded border border-[#2b2f37] p-3 sm:grid-cols-[1fr_1.4fr_2fr_auto_auto]">
              <TextInput label="Id" value={world.id} readOnly={used} onChange={(event) => setWorld(index, { id: event.target.value })} hint={used ? 'Used by levels' : undefined} />
              <TextInput label="Title" value={world.title} onChange={(event) => setWorld(index, { title: event.target.value })} />
              <TextInput label="Subtitle" value={world.subtitle} onChange={(event) => setWorld(index, { subtitle: event.target.value })} />
              <Field label="Theme">
                <select value={world.theme} onChange={(event) => setWorld(index, { theme: event.target.value as WorldTheme })} className={inputClass}>
                  {THEMES.map((theme) => <option key={theme} value={theme}>{theme}</option>)}
                </select>
              </Field>
              <button type="button" disabled={used} onClick={() => set({ worlds: draft.worlds.filter((_, at) => at !== index) })} aria-label={`Remove ${world.title}`} title={used ? 'Move or delete its levels first' : 'Remove world'} className="self-end rounded p-1.5 text-[#9da5b4] hover:text-[#f48771] disabled:opacity-30"><Trash2 className="size-4" /></button>
            </li>
          )
        })}
      </ul>
      <JsonField key={`${draft.id}-folders`} label="Folder explanations" hint='Folder path → what lives there, e.g. { "server/models": "What a todo looks like." }' value={draft.folders} onChange={(value) => value && typeof value === 'object' && set({ folders: value as Record<string, string> })} rows={8} />
      <JsonField
        key={`${draft.id}-glossary`}
        label="Glossary"
        hint='Shown in each level&apos;s Glossary tab when the term appears in its code: [{ "term": "req.body", "definition": "…", "match": ["req.body"] }]. match is optional and defaults to the term.'
        value={draft.glossary ?? []}
        onChange={(value) => Array.isArray(value) && set({ glossary: value as Project['glossary'] })}
        rows={12}
      />
    </div>
  )
}

function LevelForm({ draft, level, onPatch, onReplace }: { draft: Project; level: Level; onPatch: (patch: Partial<Level>) => void; onReplace: (level: Level) => void }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput label="Id" value={level.id} onChange={(event) => onPatch({ id: event.target.value })} hint="Progress is stored against it: don't rename a published level." />
        <Field label="World">
          <select value={level.world} onChange={(event) => onPatch({ world: event.target.value })} className={inputClass}>
            {draft.worlds.map((world) => <option key={world.id} value={world.id}>{world.title}</option>)}
          </select>
        </Field>
        <TextInput label="Title" value={level.title} onChange={(event) => onPatch({ title: event.target.value })} />
        <TextInput label="XP" type="number" min={0} placeholder="Default for the kind" value={level.xp ?? ''} onChange={(event) => onPatch({ xp: event.target.value === '' ? undefined : Number(event.target.value) })} />
      </div>
      <TextInput label="Summary" value={level.summary} onChange={(event) => onPatch({ summary: event.target.value })} hint="One line on the map." />
      <TextArea label="Lesson" rows={7} value={level.lesson} onChange={(event) => onPatch({ lesson: event.target.value })} hint='Blank line = new paragraph, "- " = bullet, `backticks` = code.' />
      <Toggle label="Boss level (bonus XP, shown with a skull on the map)" checked={!!level.boss} onChange={(boss) => onPatch({ boss: boss || undefined })} />
      <hr className="border-[#292d35]" />
      {level.kind === 'explore' && <ExploreFields level={level} onPatch={onPatch} />}
      {level.kind === 'command' && <CommandFields level={level} onPatch={onPatch} />}
      {(level.kind === 'edit' || level.kind === 'bugfix') && <CodeFields level={level} onPatch={onPatch} />}
      {level.kind === 'build' && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label="File path" value={level.path} onChange={(event) => onPatch({ path: event.target.value })} />
            <TextInput label="About the file" value={level.about} onChange={(event) => onPatch({ about: event.target.value })} />
          </div>
          <JsonField key={`${level.id}-scaffold`} label="Scaffold" hint='Lines of the file: { "type": "line", "text": "…" } or { "type": "slot", "slot": 1, "indent": 4 }.' value={level.scaffold} onChange={(scaffold) => onReplace({ ...level, scaffold: scaffold as typeof level.scaffold })} rows={12} />
          <JsonField key={`${level.id}-blocks`} label="Blocks" hint='The answer blocks in order, then distractors whose id starts with "bad-" (give them a whyWrong).' value={level.blocks} onChange={(blocks) => onReplace({ ...level, blocks: blocks as typeof level.blocks })} rows={12} />
          <JsonField key={`${level.id}-steps`} label="Slot guide" hint="One { kind, goal } per slot." value={level.steps ?? []} onChange={(steps) => onReplace({ ...level, steps: steps as typeof level.steps })} rows={6} />
        </>
      )}
      {level.kind === 'architecture' && (
        <>
          <JsonField key={`${level.id}-nodes`} label="Stops, in the correct order" hint="{ id, label, role, files: [paths] } for each stop of the request." value={level.nodes} onChange={(nodes) => onReplace({ ...level, nodes: nodes as typeof level.nodes })} rows={14} />
          <TextArea label="Return trip" rows={3} value={level.returnTrip ?? ''} onChange={(event) => onPatch({ returnTrip: event.target.value || undefined })} />
        </>
      )}
    </>
  )
}

function ExploreFields({ level, onPatch }: { level: Extract<Level, { kind: 'explore' }>; onPatch: (patch: Partial<Level>) => void }) {
  const quiz = level.quiz
  const setQuiz = (patch: Partial<NonNullable<typeof quiz>>) => quiz && onPatch({ quiz: { ...quiz, ...patch } })
  return (
    <>
      <FileListEditor label="Files this level unlocks" files={level.adds} onChange={(adds) => onPatch({ adds })} />
      <Toggle label="Ask a question at the end" checked={!!quiz} onChange={(on) => onPatch({ quiz: on ? { question: 'Your question?', options: ['Wrong', 'Right'], answer: 1, explain: 'Why.' } : undefined })} />
      {quiz && (
        <div className="flex flex-col gap-3 rounded border border-[#2b2f37] p-3">
          <TextInput label="Question" value={quiz.question} onChange={(event) => setQuiz({ question: event.target.value })} />
          <TextArea label="Options (one per line)" rows={4} value={quiz.options.join('\n')} onChange={(event) => setQuiz({ options: event.target.value.split('\n') })} />
          <Field label="Right answer">
            <select value={quiz.answer} onChange={(event) => setQuiz({ answer: Number(event.target.value) })} className={inputClass}>
              {quiz.options.map((option, index) => <option key={index} value={index}>{option || `Option ${index + 1}`}</option>)}
            </select>
          </Field>
          <TextArea label="Explanation (shown after the right answer)" rows={2} value={quiz.explain} onChange={(event) => setQuiz({ explain: event.target.value })} />
        </div>
      )}
    </>
  )
}

function CommandFields({ level, onPatch }: { level: Extract<Level, { kind: 'command' }>; onPatch: (patch: Partial<Level>) => void }) {
  const setStep = (index: number, patch: Partial<CommandStep>) => onPatch({ steps: level.steps.map((step, at) => (at === index ? { ...step, ...patch } : step)) })
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput label="Starts in folder" value={level.cwd ?? ''} placeholder="(project root)" onChange={(event) => onPatch({ cwd: event.target.value })} />
        <TextInput label="Prompt prefix" value={level.env ?? ''} placeholder="e.g. (venv)" onChange={(event) => onPatch({ env: event.target.value || undefined })} />
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-white">Steps</h2>
        <button type="button" onClick={() => onPatch({ steps: [...level.steps, { goal: 'What to do next', hint: 'A clue', accept: ['echo done'] }] })} className="flex items-center gap-1 rounded px-2 py-1 text-[12px] text-[#9cdcfe] hover:bg-[#1c1f26]"><Plus className="size-3.5" /> Step</button>
      </div>
      <ol className="flex flex-col gap-3">
        {level.steps.map((step, index) => (
          <li key={index} className="flex flex-col gap-3 rounded border border-[#2b2f37] p-3">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-white">
              Step {index + 1}
              <button type="button" onClick={() => onPatch({ steps: level.steps.filter((_, at) => at !== index) })} disabled={level.steps.length === 1} aria-label={`Remove step ${index + 1}`} className="ml-auto rounded p-1 text-[#9da5b4] hover:text-[#f48771] disabled:opacity-30"><Trash2 className="size-3.5" /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput label="Goal" value={step.goal} onChange={(event) => setStep(index, { goal: event.target.value })} hint="What to achieve, without the command." />
              <TextInput label="Hint" value={step.hint} onChange={(event) => setStep(index, { hint: event.target.value })} />
            </div>
            <TextArea label="Accepted commands (one per line)" code rows={3} value={step.accept.join('\n')} onChange={(event) => setStep(index, { accept: event.target.value.split('\n') })} hint="The first one is revealed by the second hint. npm/pip installs match in any package order." />
            <div className="grid gap-3 sm:grid-cols-3">
              <TextInput label="Or a pattern (regex)" value={step.pattern ?? ''} onChange={(event) => setStep(index, { pattern: event.target.value || undefined })} />
              <TextInput label="Folder afterwards" value={step.cwd ?? ''} placeholder="(unchanged)" onChange={(event) => setStep(index, { cwd: event.target.value === '' ? undefined : event.target.value })} />
              <TextInput label="Prompt prefix afterwards" value={step.env ?? ''} placeholder="(unchanged)" onChange={(event) => setStep(index, { env: event.target.value === '' ? undefined : event.target.value })} />
            </div>
            <TextArea label="Terminal output" code rows={4} value={step.output ?? ''} onChange={(event) => setStep(index, { output: event.target.value || undefined })} />
            <TextInput label="Explanation after it runs" value={step.explain ?? ''} onChange={(event) => setStep(index, { explain: event.target.value || undefined })} />
            <FileListEditor label="Files this command generates" files={step.adds ?? []} onChange={(adds: ProjectFile[]) => setStep(index, { adds: adds.length ? adds : undefined })} />
          </li>
        ))}
      </ol>
    </>
  )
}

function CodeFields({ level, onPatch }: { level: CodeLevel; onPatch: (patch: Partial<Level>) => void }) {
  const starterPasses = useMemo(() => safeCount(level, level.starter), [level])
  const solutionPasses = useMemo(() => safeCount(level, level.solution), [level])
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput label="File path" value={level.path} onChange={(event) => onPatch({ path: event.target.value })} />
        <TextInput label="About the file" value={level.about} onChange={(event) => onPatch({ about: event.target.value })} />
      </div>
      <TextArea label={level.kind === 'bugfix' ? 'Buggy starter (what learners get)' : 'Starter with TODOs (what learners get)'} code rows={14} value={level.starter} onChange={(event) => onPatch({ starter: event.target.value })} hint={starterPasses === null ? undefined : `Passes ${starterPasses}/${level.checks.length} checks (must fail at least one).`} />
      <TextArea label="Solution (becomes the file once passed)" code rows={14} value={level.solution} onChange={(event) => onPatch({ solution: event.target.value })} hint={solutionPasses === null ? undefined : `Passes ${solutionPasses}/${level.checks.length} checks (must pass all).`} />
      <JsonField
        key={`${level.id}-checks`}
        label="Checks (the tests)"
        hint='{ id, name, hint, type: "includes" | "excludes" | "matches" | "notMatches", value, flags? }. includes ignores spaces and quote style; matches is a regex. Comments never count.'
        value={level.checks}
        onChange={(checks) => onPatch({ checks: checks as CodeLevel['checks'] })}
        rows={14}
      />
    </>
  )
}

function safeCount(level: CodeLevel, code: string) {
  try {
    return runChecks(code, level.path, level.checks).filter((result) => result.passed).length
  } catch {
    return null
  }
}
