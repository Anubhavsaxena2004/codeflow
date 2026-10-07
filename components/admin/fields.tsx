'use client'

import { useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { AlertCircle, ChevronDown, ChevronRight, ListTree, Plus, Trash2 } from 'lucide-react'
import type { ProjectFile } from '@/data/challenges'
import { parseTree } from '@/lib/journeys/tree'
import { cn } from '@/lib/utils'

export const inputClass =
  'w-full h-10 rounded-lg border border-(--adm-border-strong) bg-(--adm-panel) px-3 text-[13px] text-(--adm-fg-strong) placeholder:text-(--adm-dim) outline-none focus:border-[#15803d] focus:ring-1 focus:ring-[#15803d]/30 transition-colors duration-150'

export function Field({
  label,
  hint,
  error,
  id,
  children,
  className,
}: {
  label: string
  hint?: string
  error?: string | null
  id?: string
  children: ReactNode
  className?: string
}) {
  const hintId = id ? `${id}-hint` : undefined
  const errorId = id ? `${id}-error` : undefined

  return (
    <label htmlFor={id} className={cn('flex flex-col gap-1.5 text-[12px] font-semibold tracking-wide text-(--adm-fg-strong)', className)}>
      <span>{label}</span>
      {children}
      {hint && !error && (
        <span id={hintId} className="text-[11px] font-normal tracking-normal text-(--adm-muted)">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} role="alert" className="flex items-center gap-1.5 text-[11px] font-normal text-(--adm-error)">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{error}</span>
        </span>
      )}
    </label>
  )
}

export function TextInput({
  label,
  hint,
  error,
  id,
  className,
  ...input
}: {
  label: string
  hint?: string
  error?: string | null
} & InputHTMLAttributes<HTMLInputElement>) {
  const hintId = id ? `${id}-hint` : undefined
  const errorId = id ? `${id}-error` : undefined
  const describedBy = [error && errorId, hint && hintId, input['aria-describedby']].filter(Boolean).join(' ') || undefined

  return (
    <Field label={label} hint={hint} error={error} id={id} className={className}>
      <input
        id={id}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : undefined}
        {...input}
        className={cn(inputClass, error && 'border-(--adm-error) focus:border-(--adm-error)')}
      />
    </Field>
  )
}

export function TextArea({
  label,
  hint,
  error,
  code,
  id,
  className,
  ...area
}: {
  label: string
  hint?: string
  error?: string | null
  code?: boolean
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const hintId = id ? `${id}-hint` : undefined
  const errorId = id ? `${id}-error` : undefined
  const describedBy = [error && errorId, hint && hintId, area['aria-describedby']].filter(Boolean).join(' ') || undefined

  return (
    <Field label={label} hint={hint} error={error} id={id} className={className}>
      <textarea
        id={id}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : undefined}
        spellCheck={code ? false : area.spellCheck}
        {...area}
        className={cn(
          inputClass,
          'h-auto min-h-20 resize-y py-2.5 leading-5',
          code && 'ide-mono whitespace-pre text-(--adm-code)',
          error && 'border-(--adm-error) focus:border-(--adm-error)',
        )}
      />
    </Field>
  )
}

/** Edits a value as JSON. Only valid JSON reaches onChange; mount with a key per value owner. */
export function JsonField({
  label,
  hint,
  value,
  onChange,
  rows = 10,
}: {
  label: string
  hint?: string
  value: unknown
  onChange: (value: unknown) => void
  rows?: number
}) {
  const [text, setText] = useState(() => JSON.stringify(value ?? null, null, 2))
  const [error, setError] = useState<string | null>(null)

  return (
    <Field label={label} hint={hint} error={error ? `Not saved until it is valid JSON: ${error}` : undefined}>
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
        className={cn(
          inputClass,
          'h-auto ide-mono resize-y whitespace-pre py-2.5 leading-5 text-(--adm-code)',
          error && 'border-(--adm-error) focus:border-(--adm-error)',
        )}
      />
    </Field>
  )
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-(--adm-fg) select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 rounded border-(--adm-border-strong) accent-[#15803d]"
      />
      <span>{label}</span>
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[12px] font-semibold tracking-wide text-(--adm-muted)">
        <span>{label} ({files.length})</span>
        <span className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setTree(tree === null ? '' : null)}
            className="flex items-center gap-1 rounded-md border border-(--adm-border-strong) bg-(--adm-panel) px-2 py-1 text-[11px] font-medium text-(--adm-fg) hover:bg-(--adm-hover) transition-colors duration-150"
          >
            <ListTree className="size-3.5" /> From tree
          </button>
          <button
            type="button"
            onClick={() => { onChange([...files, { path: 'new-file.js', about: '', content: '' }]); setOpen(files.length) }}
            className="flex items-center gap-1 rounded-md border border-(--adm-border-strong) bg-(--adm-panel) px-2 py-1 text-[11px] font-medium text-(--adm-fg) hover:bg-(--adm-hover) transition-colors duration-150"
          >
            <Plus className="size-3.5" /> File
          </button>
        </span>
      </div>
      {tree !== null && (
        <div className="rounded-lg border border-(--adm-border-strong) bg-(--adm-panel) p-3">
          <textarea
            value={tree}
            onChange={(event) => setTree(event.target.value)}
            rows={6}
            spellCheck={false}
            placeholder={'server/\n├── models/\n│   └── Todo.js   # Mongoose schema\n└── server.js     # entry point'}
            className={cn(inputClass, 'h-auto ide-mono whitespace-pre py-2')}
          />
          <button
            type="button"
            onClick={importTree}
            className="mt-2.5 rounded-lg bg-[#15803d] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#166534] transition-colors duration-150"
          >
            Add these files
          </button>
        </div>
      )}
      <ul className="flex flex-col gap-1.5">
        {files.map((file, index) => (
          <li key={index} className="rounded-lg border border-(--adm-border) bg-(--adm-panel) transition-colors duration-150">
            <div className="flex h-10 items-center gap-2 px-2.5">
              <button
                type="button"
                onClick={() => setOpen(open === index ? null : index)}
                aria-label={open === index ? 'Collapse' : 'Expand'}
                className="rounded p-1 text-(--adm-muted) hover:bg-(--adm-hover) transition-colors duration-150"
              >
                {open === index ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
              </button>
              <input
                value={file.path}
                onChange={(event) => update(index, { path: event.target.value })}
                aria-label="Path"
                className="ide-mono min-w-0 flex-1 bg-transparent text-[12px] text-(--adm-fg-strong) outline-none"
              />
              {file.generated && <span className="rounded bg-(--adm-border) px-1.5 py-0.5 text-[10px] text-(--adm-muted)">generated</span>}
              {file.unused && <span className="rounded bg-(--adm-border) px-1.5 py-0.5 text-[10px] text-(--adm-muted)">unused</span>}
              <button
                type="button"
                onClick={() => onChange(files.filter((_, at) => at !== index))}
                aria-label={`Remove ${file.path}`}
                className="rounded p-1 text-(--adm-muted) hover:bg-(--adm-hover) hover:text-(--adm-error) transition-colors duration-150"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            {open === index && (
              <div className="flex flex-col gap-2.5 border-t border-(--adm-border) p-3">
                <TextInput label="About" value={file.about} onChange={(event) => update(index, { about: event.target.value })} hint="One line, shown in the explorer." />
                {!file.path.endsWith('/') && <TextArea label="Content" code rows={8} value={file.content ?? ''} onChange={(event) => update(index, { content: event.target.value })} />}
                <Toggle label="Generated by a tool (dimmed, never pushed to GitHub)" checked={!!file.generated} onChange={(generated) => update(index, { generated: generated || undefined })} />
                {!file.path.endsWith('/') && <Toggle label="Not used by this project (shown locked, never opened; still pushed)" checked={!!file.unused} onChange={(unused) => update(index, { unused: unused || undefined })} />}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
