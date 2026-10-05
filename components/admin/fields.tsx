'use client'

import { useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { ChevronDown, ChevronRight, ListTree, Plus, Trash2 } from 'lucide-react'
import type { ProjectFile } from '@/data/challenges'
import { parseTree } from '@/lib/journeys/tree'
import { cn } from '@/lib/utils'

export const inputClass = 'w-full rounded border border-(--adm-border-strong) bg-(--adm-panel) px-2.5 py-1.5 text-[12px] text-(--adm-fg-strong) outline-none focus:border-[#007acc]'

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('flex flex-col gap-1 text-[11px] font-semibold tracking-wide text-(--adm-muted)', className)}>
      {label}
      {children}
      {hint && <span className="font-normal tracking-normal text-(--adm-dim)">{hint}</span>}
    </label>
  )
}

export function TextInput({ label, hint, className, ...input }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} hint={hint} className={className}>
      <input {...input} className={inputClass} />
    </Field>
  )
}

export function TextArea({ label, hint, code, className, ...area }: { label: string; hint?: string; code?: boolean } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} hint={hint} className={className}>
      <textarea {...area} spellCheck={code ? false : area.spellCheck} className={cn(inputClass, 'min-h-20 resize-y leading-5', code && 'ide-mono whitespace-pre text-(--adm-code)')} />
    </Field>
  )
}

/** Edits a value as JSON. Only valid JSON reaches onChange; mount with a key per value owner. */
export function JsonField({ label, hint, value, onChange, rows = 10 }: { label: string; hint?: string; value: unknown; onChange: (value: unknown) => void; rows?: number }) {
  const [text, setText] = useState(() => JSON.stringify(value ?? null, null, 2))
  const [error, setError] = useState<string | null>(null)
  return (
    <Field label={label} hint={error ? undefined : hint}>
      <textarea
        value={text}
        rows={rows}
        spellCheck={false}
        onChange={(event) => {
          setText(event.target.value)
          try {
            onChange(JSON.parse(event.target.value))
            setError(null)
          } catch (problem) {
            setError(problem instanceof Error ? problem.message : 'Invalid JSON')
          }
        }}
        className={cn(inputClass, 'ide-mono resize-y whitespace-pre leading-5 text-(--adm-code)', error && 'border-(--adm-error)')}
      />
      {error && <span className="font-normal tracking-normal text-(--adm-error)">Not saved until it is valid JSON: {error}</span>}
    </Field>
  )
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[12px] text-(--adm-fg)">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="accent-[#007acc]" />
      {label}
    </label>
  )
}

/** The files a level or command step creates. Paste a folder tree to add many at once. */
export function FileListEditor({ files, onChange, label = 'Files' }: { files: ProjectFile[]; onChange: (files: ProjectFile[]) => void; label?: string }) {
  const [open, setOpen] = useState<number | null>(null)
  const [tree, setTree] = useState<string | null>(null)
  const update = (index: number, patch: Partial<ProjectFile>) => onChange(files.map((file, at) => (at === index ? { ...file, ...patch } : file)))

  const importTree = () => {
    const parsed = parseTree(tree ?? '')
    const known = new Set(files.map((file) => file.path))
    const added = parsed.entries
      .filter((entry) => !entry.folder || !parsed.entries.some((other) => other.path.startsWith(`${entry.path}/`)))
      .map((entry): ProjectFile => (entry.folder ? { path: `${entry.path}/`, about: entry.about } : { path: entry.path, about: entry.about, content: '' }))
      .filter((file) => !known.has(file.path))
    onChange([...files, ...added])
    setTree(null)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[11px] font-semibold tracking-wide text-(--adm-muted)">
        {label} ({files.length})
        <span className="flex gap-1">
          <button type="button" onClick={() => setTree(tree === null ? '' : null)} className="flex items-center gap-1 rounded px-1.5 py-0.5 font-normal text-(--adm-code) hover:bg-(--adm-hover)">
            <ListTree className="size-3.5" /> From tree
          </button>
          <button type="button" onClick={() => { onChange([...files, { path: 'new-file.js', about: '', content: '' }]); setOpen(files.length) }} className="flex items-center gap-1 rounded px-1.5 py-0.5 font-normal text-(--adm-code) hover:bg-(--adm-hover)">
            <Plus className="size-3.5" /> File
          </button>
        </span>
      </div>
      {tree !== null && (
        <div className="rounded border border-(--adm-border-strong) p-2">
          <textarea value={tree} onChange={(event) => setTree(event.target.value)} rows={6} spellCheck={false} placeholder={'server/\n├── models/\n│   └── Todo.js   # Mongoose schema\n└── server.js     # entry point'} className={cn(inputClass, 'ide-mono whitespace-pre')} />
          <button type="button" onClick={importTree} className="mt-2 rounded bg-[#007acc] px-2.5 py-1 text-[12px] text-white hover:bg-[#0062a3]">Add these files</button>
        </div>
      )}
      <ul className="flex flex-col gap-1">
        {files.map((file, index) => (
          <li key={index} className="rounded border border-(--adm-border)">
            <div className="flex items-center gap-1 px-1.5 py-1">
              <button type="button" onClick={() => setOpen(open === index ? null : index)} aria-label={open === index ? 'Collapse' : 'Expand'} className="rounded p-0.5 text-(--adm-muted) hover:bg-(--adm-hover)">
                {open === index ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
              </button>
              <input value={file.path} onChange={(event) => update(index, { path: event.target.value })} aria-label="Path" className="ide-mono min-w-0 flex-1 bg-transparent text-[12px] text-(--adm-fg-strong) outline-none" />
              {file.generated && <span className="rounded bg-(--adm-border) px-1 text-[10px] text-(--adm-muted)">generated</span>}
              <button type="button" onClick={() => onChange(files.filter((_, at) => at !== index))} aria-label={`Remove ${file.path}`} className="rounded p-0.5 text-(--adm-muted) hover:bg-(--adm-hover) hover:text-(--adm-error)">
                <Trash2 className="size-3.5" />
              </button>
            </div>
            {open === index && (
              <div className="flex flex-col gap-2 border-t border-(--adm-border) p-2">
                <TextInput label="About" value={file.about} onChange={(event) => update(index, { about: event.target.value })} hint="One line, shown in the explorer." />
                {!file.path.endsWith('/') && <TextArea label="Content" code rows={8} value={file.content ?? ''} onChange={(event) => update(index, { content: event.target.value })} />}
                <Toggle label="Generated by a tool (dimmed, never pushed to GitHub)" checked={!!file.generated} onChange={(generated) => update(index, { generated: generated || undefined })} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
