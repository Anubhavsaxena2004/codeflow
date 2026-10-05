'use client'

import { useRef, type KeyboardEvent } from 'react'
import { Info } from 'lucide-react'
import { CodeLines } from './code'

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
}

/**
 * A plain-textarea code editor: the highlighted code is drawn underneath and an invisible
 * textarea with the same metrics sits on top, so typing, selection and undo are native.
 */
export function EditableCode({ value, language, about, instruction, readOnly, onChange, onSave }: EditableCodeProps) {
  const textarea = useRef<HTMLTextAreaElement>(null)
  const lineCount = value.split('\n').length

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
      <div className="flex items-start gap-2 border-b border-[#2b2b2b] bg-[#1f1f1f] px-4 py-2 font-sans text-[12px] leading-5 text-[#9d9d9d]">
        <Info className="mt-0.5 size-3.5 shrink-0 text-[#3794ff]" />
        <div>
          {about} {instruction && <span className="text-[#cccccc]">{instruction}</span>}
          {readOnly && <span className="text-[#6e7681]"> · read-only</span>}
        </div>
      </div>
      <div className="ide-mono flex py-2 text-[13px] leading-5" onClick={() => textarea.current?.focus()}>
        <div className="w-15 shrink-0 select-none pr-3 text-right text-[#6e7681]">
          {Array.from({ length: lineCount }, (_, index) => (
            <div key={index} className="h-5">{index + 1}</div>
          ))}
        </div>
        <div className="relative min-w-0 flex-1 overflow-x-auto pl-3 pr-6">
          <div className="relative w-max min-w-full [tab-size:2]">
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
              className="ide-mono absolute inset-0 size-full resize-none overflow-hidden whitespace-pre bg-transparent p-0 text-[13px] leading-5 text-transparent caret-[#aeafad] outline-none selection:bg-[#264f78]/60"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
