'use client'

import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, CircleCheck, CornerDownRight, Play, X } from 'lucide-react'
import { findLine } from '@/lib/journeys/gaps'
import type { Gap, GapSource, GapSourceKind } from '@/lib/journeys/types'
import { cn } from '@/lib/utils'
import { CodeLines } from '../ide/code'
import { useShake } from './feedback'

// The MISSING CODE section of an edit level: one card per TODO. Each card says what the code must
// do, where every name in it comes from (with a jump to the line that defines it), where its result
// goes, and offers three versions of the code to pick from.

export interface GapState {
  filled: boolean
  /** 0-based line of the gap's TODO in the current code, or -1 once it is replaced. */
  line: number
}

const kindStyles: Record<GapSourceKind, { label: string; className: string; title: string }> = {
  import: { label: 'imported', className: 'border-(--ide-keyword)/40 text-(--ide-keyword)', title: 'Comes from a package, imported at the top of this file' },
  here: { label: 'this file', className: 'border-(--ide-link)/40 text-(--ide-link)', title: 'Defined in the file you are editing' },
  file: { label: 'your file', className: 'border-(--ide-added)/50 text-(--ide-added)', title: 'Defined in another file of your project' },
  param: { label: 'handed in', className: 'border-(--ide-warning)/50 text-(--ide-warning-soft)', title: 'The framework passes it in when it calls your code' },
  command: { label: 'a command', className: 'border-(--ide-code)/40 text-(--ide-code)', title: 'Made by a command you ran in the terminal' },
  builtin: { label: 'built in', className: 'border-(--ide-border-strong) text-(--ide-muted)', title: 'Part of the language or runtime: nothing to import' },
}

const LETTERS = ['A', 'B', 'C']

function Label({ children }: { children: string }) {
  return <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-(--ide-dim)">{children}</div>
}

interface SourceRowProps {
  source: GapSource
  levelPath: string
  code: string
  fileContent: (path: string) => string | undefined
  onGoTo: (path: string, line: number) => void
}

function SourceRow({ source, levelPath, code, fileContent, onGoTo }: SourceRowProps) {
  const path = source.path ?? levelPath
  const found = findLine(path === levelPath ? code : fileContent(path), source.find)
  const style = kindStyles[source.from]
  const where = path === levelPath ? `line ${(found?.index ?? 0) + 1}` : `${path.split('/').pop()} · line ${(found?.index ?? 0) + 1}`
  return (
    <li className="flex flex-col gap-1 rounded-md border border-(--ide-border) bg-(--ide-bg) px-2 py-1.5">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span title={style.title} className={cn('shrink-0 rounded-sm border px-1 text-[9px] font-bold uppercase leading-4 tracking-wider', style.className)}>
          {style.label}
        </span>
        <code className="ide-mono min-w-0 break-all text-[12px] font-semibold text-(--ide-heading)">{source.name}</code>
      </div>
      <p className="text-[11.5px] leading-[1.45] text-(--ide-fg)">{source.note}</p>
      {found && (
        <button
          type="button"
          onClick={() => onGoTo(path, found.index + 1)}
          title={`Go to definition: ${path}, line ${found.index + 1}`}
          className="group flex min-w-0 items-center gap-1.5 rounded-sm px-1 py-0.5 text-left text-[11px] text-(--ide-link) hover:bg-(--ide-hover)"
        >
          <CornerDownRight aria-hidden className="size-3 shrink-0" />
          <span className="shrink-0">{where}</span>
          <code className="ide-mono min-w-0 truncate text-(--ide-muted) group-hover:text-(--ide-fg)">{found.text}</code>
        </button>
      )}
    </li>
  )
}

interface GapCardProps {
  gap: Gap
  index: number
  state: GapState
  open: boolean
  misses: number[]
  locked: boolean
  levelPath: string
  language: string
  code: string
  fileContent: (path: string) => string | undefined
  onActivate: () => void
  onPick: (choice: number) => void
  onGoTo: (path: string, line: number) => void
}

function GapCard({ gap, index, state, open, misses, locked, levelPath, language, code, fileContent, onActivate, onPick, onGoTo }: GapCardProps) {
  const { triggerShake, shakeAnimation } = useShake()
  const right = gap.options[gap.answer]
  const canPick = !locked && !state.filled && state.line >= 0

  return (
    <motion.li id={`gap-card-${index}`} animate={shakeAnimation} className={cn('rounded-lg border bg-(--ide-bg)', open ? 'border-(--ide-warning)/60' : 'border-(--ide-border-strong)', state.filled && 'border-(--ide-success)/40')}>
      <button type="button" onClick={onActivate} aria-expanded={open} className="flex w-full items-start gap-2 px-2.5 py-2 text-left">
        {state.filled ? (
          <CircleCheck aria-label="filled" className="mt-0.5 size-4 shrink-0 text-(--ide-success)" />
        ) : (
          <span aria-label={`gap ${index + 1}`} className={cn('mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-bold', open ? 'bg-(--ide-warning) text-(--ide-bg)' : 'bg-(--ide-warning)/25 text-(--ide-warning-soft)')}>
            {index + 1}
          </span>
        )}
        <span className={cn('min-w-0 flex-1 text-[12px] leading-5', state.filled ? 'text-(--ide-muted)' : 'text-(--ide-heading)', !open && 'truncate')}>{gap.goal}</span>
        {!state.filled && state.line >= 0 && <span className="shrink-0 pt-px text-[11px] text-(--ide-dim)">line {state.line + 1}</span>}
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-(--ide-border) px-2.5 pb-3 pt-2.5">
          {gap.sources.length > 0 && (
            <section>
              <Label>Where the names come from</Label>
              <ul className="flex flex-col gap-1.5">
                {gap.sources.map((source) => (
                  <SourceRow key={`${source.name}-${source.from}`} source={source} levelPath={levelPath} code={code} fileContent={fileContent} onGoTo={onGoTo} />
                ))}
              </ul>
            </section>
          )}

          {gap.result && (
            <section>
              <Label>Where the result goes</Label>
              <p className="flex gap-1.5 text-[11.5px] leading-[1.45] text-(--ide-fg)">
                <ArrowDownRight aria-hidden className="mt-0.5 size-3.5 shrink-0 text-(--ide-success)" />
                <span>{gap.result}</span>
              </p>
            </section>
          )}

          {state.filled ? (
            <section>
              <Label>The code</Label>
              <div className="ide-mono rounded-md border border-(--ide-success)/40 bg-(--ide-success)/5 px-2 py-1.5 text-[11.5px]">
                <CodeLines code={right.code} language={language} wrap />
              </div>
              <p className="mt-1.5 text-[11.5px] leading-[1.45] text-(--ide-muted)">{right.why}</p>
            </section>
          ) : (
            <section>
              <Label>Pick the code that belongs here</Label>
              <ol className="flex flex-col gap-1.5">
                {gap.options.map((option, choice) => {
                  const crossed = misses.includes(choice)
                  return (
                    <li key={choice}>
                      <button
                        type="button"
                        disabled={!canPick || crossed}
                        onClick={() => {
                          if (choice !== gap.answer) triggerShake()
                          onPick(choice)
                        }}
                        aria-label={`Option ${LETTERS[choice]}${crossed ? ', ruled out' : ''}`}
                        className={cn(
                          'flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left text-[12px] leading-5 transition-colors',
                          crossed ? 'border-(--ide-error)/40 bg-(--ide-error)/5 opacity-75' : 'border-(--ide-border-strong) hover:border-(--ide-link) hover:bg-(--ide-hover)',
                          !canPick && !crossed && 'opacity-60',
                        )}
                      >
                        <span className={cn('mt-0.5 grid size-4 shrink-0 place-items-center rounded-sm text-[10px] font-bold', crossed ? 'bg-(--ide-error)/20 text-(--ide-error-soft)' : 'bg-(--ide-border) text-(--ide-heading)')}>
                          {crossed ? <X aria-hidden className="size-3" /> : LETTERS[choice]}
                        </span>
                        <span className="ide-mono min-w-0 flex-1 text-[11.5px]">
                          <CodeLines code={option.code} language={language} wrap />
                        </span>
                      </button>
                      {crossed && <p className="ml-6 mt-1 text-[11.5px] leading-[1.45] text-(--ide-error-soft)">{option.why}</p>}
                    </li>
                  )
                })}
              </ol>
              <p className="mt-2 flex gap-1.5 text-[11px] leading-[1.45] text-(--ide-dim)">
                <ArrowUpRight aria-hidden className="mt-px size-3 shrink-0" />
                {state.line >= 0
                  ? `Picking writes it over the TODO on line ${state.line + 1}. You can also type it there yourself.`
                  : 'The TODO line is gone, so type the code yourself, or press Reset to get it back.'}
              </p>
            </section>
          )}
        </div>
      )}
    </motion.li>
  )
}

interface GapListProps {
  gaps: Gap[]
  states: GapState[]
  /** The card that is open, or -1. */
  open: number
  misses: number[][]
  locked: boolean
  levelPath: string
  language: string
  code: string
  fileContent: (path: string) => string | undefined
  onActivate: (index: number) => void
  onPick: (index: number, choice: number) => void
  onGoTo: (path: string, line: number) => void
  onRunTests: () => void
}

export function GapList({ gaps, states, open, misses, locked, levelPath, language, code, fileContent, onActivate, onPick, onGoTo, onRunTests }: GapListProps) {
  const allFilled = states.every((state) => state.filled)
  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-1.5">
        {gaps.map((gap, index) => (
          <GapCard
            key={gap.marker}
            gap={gap}
            index={index}
            state={states[index]}
            open={open === index}
            misses={misses[index] ?? []}
            locked={locked}
            levelPath={levelPath}
            language={language}
            code={code}
            fileContent={fileContent}
            onActivate={() => onActivate(index)}
            onPick={(choice) => onPick(index, choice)}
            onGoTo={onGoTo}
          />
        ))}
      </ol>
      {allFilled && !locked && (
        <button type="button" onClick={onRunTests} className="flex items-center justify-center gap-1.5 rounded-md bg-[#0078d4] py-1.5 text-[12px] font-semibold text-white hover:bg-[#026ec1]">
          <Play aria-hidden className="size-3.5" /> Every gap is filled. Run the tests
        </button>
      )}
    </div>
  )
}
