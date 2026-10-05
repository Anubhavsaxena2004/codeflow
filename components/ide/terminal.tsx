'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

export interface TerminalLine {
  kind: 'input' | 'output' | 'error' | 'success' | 'info'
  text: string
  /** The prompt the input was typed at. */
  prompt?: string
}

const lineColors: Record<TerminalLine['kind'], string> = {
  input: 'text-[#cccccc]',
  output: 'text-[#cccccc]',
  error: 'text-[#f48771]',
  success: 'text-[#89d185]',
  info: 'text-[#9cdcfe]',
}

interface TerminalProps {
  lines: TerminalLine[]
  prompt: string
  onCommand: (command: string) => void
  placeholder?: string
  /** Focus the input when the terminal first appears. */
  autoFocus?: boolean
}

/** A bash-like prompt. The parent decides what each command does and appends the output. */
export function Terminal({ lines, prompt, onCommand, placeholder, autoFocus }: TerminalProps) {
  const [value, setValue] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [cursor, setCursor] = useState<number | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' })
  }, [lines])

  useEffect(() => {
    if (autoFocus) input.current?.focus({ preventScroll: true })
  }, [autoFocus])

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const command = value
      setValue('')
      setCursor(null)
      if (command.trim()) setHistory((current) => [...current, command])
      onCommand(command)
    } else if (event.key === 'ArrowUp' && history.length) {
      event.preventDefault()
      const next = cursor === null ? history.length - 1 : Math.max(0, cursor - 1)
      setCursor(next)
      setValue(history[next])
    } else if (event.key === 'ArrowDown' && cursor !== null) {
      event.preventDefault()
      const next = cursor + 1
      setCursor(next < history.length ? next : null)
      setValue(next < history.length ? history[next] : '')
    } else if (event.key === 'l' && event.ctrlKey) {
      event.preventDefault()
      onCommand('clear')
    }
  }

  return (
    <div className="ide-mono h-full min-h-0 cursor-text overflow-y-auto px-4 py-2 text-[12.5px] leading-5" onClick={() => input.current?.focus({ preventScroll: true })}>
      {lines.map((line, index) => (
        <div key={index} className={cn('whitespace-pre-wrap [overflow-wrap:anywhere]', lineColors[line.kind])}>
          {line.kind === 'input' && <span className="text-[#89d185]">{line.prompt} </span>}
          {line.text}
        </div>
      ))}
      <div className="flex items-center">
        <label htmlFor="terminal-input" className="shrink-0 whitespace-pre text-[#89d185]">
          {prompt}{' '}
        </label>
        <input
          ref={input}
          id="terminal-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          aria-label="Terminal input"
          className="ide-mono min-w-0 flex-1 bg-transparent text-[#e7e7e7] caret-[#e7e7e7] outline-none placeholder:text-[#5a5a5a]"
        />
      </div>
      <div ref={end} />
    </div>
  )
}
