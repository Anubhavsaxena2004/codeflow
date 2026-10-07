'use client'

import { useEffect, useRef, type KeyboardEvent } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CodeLines } from './code'

/** A numbered badge in the gutter over a run of lines (1-based), e.g. a gap's TODO line. */
export interface LineMark {
  line: number
  span: number
  label: string
  active: boolean
}

/** Lines to flash and scroll to (1-based). A new `key` replays it. */
export interface LineReveal {
  line: number
  span: number
  key: number
}

const LINE_HEIGHT = 20

/** The bar that flashes over revealed lines, scrolled into view when it appears. */
export function RevealBar({ reveal }: { reveal: LineReveal }) {
  const bar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bar.current?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [reveal.key])
  return <div ref={bar} aria-hidden className="animate-file-in pointer-events-none absolute inset-x-0" style={{ top: (reveal.line - 1) * LINE_HEIGHT, height: reveal.span * LINE_HEIGHT }} />
}

/** Inserts text at the caret through the browser's editing pipeline, so Ctrl+Z still works. */
function insertText(textarea: HTMLTextAreaElement, text: string) {
  textarea.focus()
  if (!document.execCommand('insertText', false, text)) textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, 'end')
}

interface EditableCodeProps {
  value: string
  language: string
  about: string
  /** Shown after `about`, e.g. what to do in this file. */
  instruction?: string
  readOnly?: boolean
  onChange: (value: string) => void
  /** Ctrl/Cmd+S. */
  onSave?: () => void
  marks?: LineMark[]
  onMark?: (label: string) => void
  reveal?: LineReveal | null
}

/**
 * A plain-textarea code editor: the highlighted code is drawn underneath and an invisible
 * textarea with the same metrics sits on top, so typing, selection and undo are native.
 */
export function EditableCode({ value, language, about, instruction, readOnly, onChange, onSave, marks = [], onMark, reveal }: EditableCodeProps) {
  const textarea = useRef<HTMLTextAreaElement>(null)
  const lineCount = value.split('\n').length
  const markAt = new Map(marks.map((mark) => [mark.line, mark]))

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      onSave?.()
      return
    }
    if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault()
      insertText(target, '  ')
      return
    }
    if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey) {
      // Keep the current line's indentation, one level deeper after an opening bracket or a Python colon.
      const before = target.value.slice(0, target.selectionStart)
      const current = before.slice(before.lastIndexOf('\n') + 1)
      const indent = current.match(/^\s*/)![0]
      const deeper = /[{[(]\s*$/.test(current) ? '  ' : language === 'python' && /:\s*$/.test(current) ? '    ' : ''
      event.preventDefault()
      insertText(target, `\n${indent}${deeper}`)
    }
  }

  return (
    <div>
      <div className="flex items-start gap-2 border-b border-(--ide-border) bg-(--ide-bg) px-4 py-2 font-sans text-[12px] leading-5 text-(--ide-muted)">
        <Info className="mt-0.5 size-3.5 shrink-0 text-(--ide-link)" />
        <div>
          {about} {instruction && <span className="text-(--ide-fg)">{instruction}</span>}
          {readOnly && <span className="text-(--ide-dim)"> · read-only</span>}
        </div>
      </div>
      <div className="ide-mono flex py-2 text-[13px] leading-5" onClick={() => textarea.current?.focus()}>
        <div className="w-15 shrink-0 select-none pr-3 text-right text-(--ide-dim)">
          {Array.from({ length: lineCount }, (_, index) => {
            const mark = markAt.get(index + 1)
            return (
              <div key={index} className="relative h-5">
                {mark && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onMark?.(mark.label)
                    }}
                    aria-label={`Gap ${mark.label}: show what goes here`}
                    title={`Gap ${mark.label}: show what goes here`}
                    className={cn(
                      'absolute left-1.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 font-sans text-[10px] font-bold leading-none',
                      mark.active ? 'bg-(--ide-warning) text-(--ide-bg)' : 'bg-(--ide-warning)/25 text-(--ide-warning-soft) hover:bg-(--ide-warning)/40',
                    )}
                  >
                    {mark.label}
                  </button>
                )}
                {index + 1}
              </div>
            )
          })}
        </div>
        <div className="relative min-w-0 flex-1 overflow-x-auto pl-3 pr-6">
          <div className="relative w-max min-w-full [tab-size:2]">
            {marks.map((mark) => (
              <div
                key={`${mark.label}-${mark.line}`}
                aria-hidden
                className={cn('pointer-events-none absolute -left-3 right-0 border-l-2', mark.active ? 'border-(--ide-warning) bg-(--ide-warning)/15' : 'border-(--ide-warning)/40 bg-(--ide-warning)/7')}
                style={{ top: (mark.line - 1) * LINE_HEIGHT, height: mark.span * LINE_HEIGHT }}
              />
            ))}
            {reveal && <RevealBar key={reveal.key} reveal={reveal} />}
            <div aria-hidden className="pointer-events-none">
              <CodeLines code={value} language={language} />
            </div>
            <textarea
              ref={textarea}
              value={value}
              readOnly={readOnly}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              wrap="off"
              aria-label="Code editor"
              className="ide-mono absolute inset-0 size-full resize-none overflow-hidden whitespace-pre bg-transparent p-0 text-[13px] leading-5 text-transparent caret-(--ide-caret) outline-none selection:bg-(--ide-selection)/60"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
