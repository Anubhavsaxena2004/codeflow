'use client'

import { useState } from 'react'
import { Check, CircleCheck, CircleX, Info, Lightbulb, TriangleAlert, Trophy, X } from 'lucide-react'
import type { Challenge } from '@/data/challenges'
import { cn } from '@/lib/utils'
import type { SlotStatus } from './code-editor'

export type PanelTab = 'steps' | 'problems' | 'architecture' | 'glossary' | 'reflect'

export interface SlotGuideRow {
  kind: string
  goal: string
  /** Label of the block currently in the slot. */
  placed?: string
  status: SlotStatus
}

export interface Problem {
  severity: 'error' | 'warning' | 'hint' | 'success' | 'info'
  message: string
  detail?: string
  line?: number
}

export const problemIcons = {
  error: <CircleX className="size-3.5 text-(--ide-error)" />,
  warning: <TriangleAlert className="size-3.5 text-(--ide-warning)" />,
  hint: <Lightbulb className="size-3.5 text-(--ide-warning)" />,
  success: <CircleCheck className="size-3.5 text-(--ide-success)" />,
  info: <Info className="size-3.5 text-(--ide-link)" />,
}

interface BottomPanelProps {
  tab: PanelTab
  onTab: (tab: PanelTab) => void
  onClose: () => void
  steps: SlotGuideRow[]
  onStepClick: (index: number) => void
  problems: Problem[]
  problemCount: number
  fileName: string
  challenge: Challenge
  showReflect: boolean
  architecture: ArchitectureProps
}

export function BottomPanel({ tab: requestedTab, onTab, onClose, steps, onStepClick, problems, problemCount, fileName, challenge, showReflect, architecture }: BottomPanelProps) {
  const tab = requestedTab === 'reflect' && !showReflect ? 'problems' : requestedTab
  const tabs: { id: PanelTab; label: string; badge?: number }[] = [
    { id: 'steps', label: 'SLOT GUIDE' },
    { id: 'problems', label: 'PROBLEMS', badge: problemCount },
    { id: 'architecture', label: 'ARCHITECTURE' },
    { id: 'glossary', label: 'GLOSSARY' },
    ...(showReflect ? [{ id: 'reflect' as const, label: 'EXPLAIN IT BACK' }] : []),
  ]

  return (
    <div className="flex h-full min-h-0 flex-col bg-(--ide-bar) text-[13px] text-(--ide-fg)">
      <div className="flex h-9 shrink-0 items-center gap-1 overflow-x-auto px-2" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => onTab(item.id)}
            className={cn('flex h-full shrink-0 items-center gap-1.5 border-b px-2 text-[11px] tracking-wide', tab === item.id ? 'border-[#0078d4] text-(--ide-fg-strong)' : 'border-transparent text-(--ide-muted) hover:text-(--ide-fg)')}
          >
            {item.label}
            {!!item.badge && <span className="rounded-full bg-[#616161] px-1.5 text-[10px] leading-4 text-white">{item.badge}</span>}
          </button>
        ))}
        <button type="button" onClick={onClose} aria-label="Close panel" className="ml-auto rounded p-1 text-(--ide-muted) hover:bg-(--ide-border) hover:text-(--ide-fg)">
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        {tab === 'steps' && (
          <div className="py-1">
            <p className="mb-2 text-[12px] text-(--ide-muted)">What kind of code belongs in each slot of {fileName}. Click a step to jump to it.</p>
            <ol className="flex flex-col gap-1">
              {steps.map((step, index) => (
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => onStepClick(index)}
                    className={cn(
                      'relative grid w-full grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-x-3 rounded-lg px-2 py-1.5 text-left text-[12px] leading-5 transition-colors hover:bg-(--ide-hover) md:grid-cols-[1.5rem_9rem_minmax(0,1fr)_minmax(0,14rem)]',
                      step.status === 'empty' && 'before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-[#a855f7]',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid size-5 place-items-center rounded-full text-[11px] font-bold transition-all',
                        step.status === 'correct'
                          ? 'bg-[#22c55e] text-white animate-pop'
                          : step.status === 'wrong'
                          ? 'bg-[#ef4444] text-white'
                          : 'border border-(--ide-border-strong) bg-(--ide-bg) text-(--ide-muted)',
                      )}
                    >
                      {step.status === 'correct' ? <Check className="size-3" strokeWidth={3} /> : index + 1}
                    </span>
                    <span className="ide-mono text-(--ide-code)">{step.kind}</span>
                    <span className="col-start-2 text-(--ide-muted) md:col-start-auto">{step.goal}</span>
                    <span className="col-start-2 flex min-w-0 items-center gap-1.5 md:col-start-auto">
                      {step.status === 'correct' && <Check className="size-3.5 shrink-0 text-(--ide-success)" />}
                      {step.status === 'wrong' && <CircleX className="size-3.5 shrink-0 text-(--ide-error)" />}
                      {step.status === 'empty' && <TriangleAlert className="size-3.5 shrink-0 text-(--ide-warning)" />}
                      {step.placed ? <span className="truncate text-(--ide-fg)">{step.placed}</span> : <span className="italic text-(--ide-dim)">empty</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}

        {tab === 'problems' && (
          problems.length === 0 ? (
            <p className="py-1 text-[12px] text-(--ide-muted)">No problems have been detected yet. Press Check to verify the order.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {problems.map((problem, index) => {
                if (problem.severity === 'hint') {
                  return (
                    <li
                      key={index}
                      className="flex flex-col gap-1 rounded-xl border border-dashed border-[#b45309] bg-[#fef3c7]/20 p-3 text-[12px] leading-5 dark:border-[#fbbf24] dark:bg-[#78350f]/20"
                    >
                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#b45309] dark:text-[#fbbf24]">
                        <Lightbulb className="size-3.5" />
                        <span>Hint</span>
                      </div>
                      <div className="text-(--ide-fg)">{problem.message}</div>
                    </li>
                  )
                }

                if (problem.severity === 'success') {
                  return (
                    <li
                      key={index}
                      className="flex flex-col gap-2 rounded-xl border border-[#22c55e]/40 bg-[#22c55e]/10 p-4 text-[12px] leading-5 dark:border-[#22c55e]/30 dark:bg-[#22c55e]/10"
                    >
                      <div className="flex items-center gap-2">
                        <Trophy className="size-5 text-[#f59e0b]" />
                        <span className="font-display font-extrabold text-sm text-(--ide-success)">Challenge Complete!</span>
                      </div>
                      <p className="text-(--ide-fg)">{problem.message}</p>
                    </li>
                  )
                }

                return (
                  <li key={index} className="flex items-start gap-2 rounded px-1 py-0.5 text-[12px] leading-5 hover:bg-(--ide-hover)">
                    <span className="mt-[3px] shrink-0">{problemIcons[problem.severity]}</span>
                    <span className="min-w-0">
                      <span>{problem.message}</span>
                      {problem.detail && <span className="ml-2 text-(--ide-muted)">{problem.detail}</span>}
                      {problem.line && <span className="ml-2 text-(--ide-dim)">{fileName} [Ln {problem.line}]</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
          )
        )}

        {tab === 'architecture' && <ArchitectureMap {...architecture} />}

        {tab === 'glossary' && (
          <dl className="grid gap-x-6 gap-y-2 py-1 sm:grid-cols-2 xl:grid-cols-3">
            {challenge.glossary.map((item) => (
              <div key={item.term} className="text-[12px] leading-5">
                <dt className="ide-mono text-(--ide-code)">{item.term}</dt>
                <dd className="text-(--ide-muted)">{item.definition}</dd>
              </div>
            ))}
          </dl>
        )}

        {/* Stays mounted so answers survive switching tabs */}
        {showReflect && (
          <div hidden={tab !== 'reflect'}>
            <Reflection challenge={challenge} />
          </div>
        )}
      </div>
    </div>
  )
}

export interface ArchitectureProps {
  challenge: Challenge
  activeBlock: string | null
  confirmed: string[]
  pulsedNode: string | null
  focusedNode: string | null
  onNodeClick: (id: string) => void
}

function ArchitectureMap({ challenge, activeBlock, confirmed, pulsedNode, focusedNode, onNodeClick }: ArchitectureProps) {
  const { nodes, arrows, mappings } = challenge.architecture
  const activeMapping = activeBlock ? mappings[activeBlock] : undefined
  const isLit = (id: string) => confirmed.some((block) => mappings[block]?.nodeIds.includes(id))
  const arrowLit = (id: string) => confirmed.some((block) => mappings[block]?.arrowIds?.includes(id))

  return (
    <div className="py-1">
      <p className="mb-3 text-[12px] text-(--ide-muted)">Hover a block to see where it runs. Click a node to highlight the blocks that belong to it.</p>
      <div className="flex flex-wrap items-center gap-2">
        {nodes.map((node, index) => {
          const arrow = arrows[index]
          return (
            <div key={node.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNodeClick(node.id)}
                aria-pressed={focusedNode === node.id}
                className={cn(
                  'ide-mono min-w-[120px] rounded border px-3 py-2 text-[12px] transition',
                  node.kind === 'database' ? 'border-(--ide-warning)/60' : 'border-(--ide-link)/60',
                  activeMapping?.nodeIds.includes(node.id) || isLit(node.id) ? 'bg-[#0078d4]/20 text-(--ide-heading) shadow-[0_0_14px_rgba(0,120,212,0.35)]' : pulsedNode === node.id ? 'animate-pulse bg-(--ide-warning)/15' : 'bg-(--ide-bg)',
                  focusedNode === node.id && 'ring-1 ring-white/70',
                )}
              >
                {node.label}
                {isLit(node.id) && <span className="ml-1 text-(--ide-success)">✓</span>}
              </button>
              {index < nodes.length - 1 && (
                <span className={cn('text-lg text-(--ide-dim)', arrow && (activeMapping?.arrowIds?.includes(arrow.id) || arrowLit(arrow.id)) && 'text-(--ide-link)')}>→</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Reflection({ challenge }: { challenge: Challenge }) {
  const reflections = challenge.reflections ?? []
  const [answers, setAnswers] = useState<string[]>(() => reflections.map(() => ''))
  const [submitted, setSubmitted] = useState(false)

  return (
    <div className="py-1">
      <p className="mb-3 text-[12px] text-(--ide-muted)">Not auto-graded. Write your reasoning, then compare it with the model answer.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {reflections.map((item, index) => (
          <div key={item.question}>
            <label htmlFor={`reflect-${index}`} className="text-[12px] text-(--ide-warning-soft)">{item.question}</label>
            <textarea
              id={`reflect-${index}`}
              value={answers[index] ?? ''}
              onChange={(event) => setAnswers((current) => current.map((answer, position) => (position === index ? event.target.value : answer)))}
              className="mt-2 min-h-20 w-full rounded border border-(--ide-border-strong) bg-(--ide-bg) p-2 text-[12px] text-(--ide-fg) outline-none focus:border-[#0078d4]"
              placeholder="Write your explanation…"
            />
            {submitted && (
              <div className="mt-2 rounded border border-(--ide-success)/30 bg-(--ide-success)/10 p-2 text-[12px] text-(--ide-success-soft)">
                <strong>Model answer</strong>
                <p className="mt-1">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      {reflections.length > 0 && (
        <button
          type="button"
          onClick={() => setSubmitted(true)}
          disabled={answers.some((answer) => !answer.trim())}
          className="mt-3 rounded-sm bg-[#0078d4] px-3 py-1 text-[12px] text-white hover:bg-[#026ec1] disabled:opacity-40"
        >
          Compare answers
        </button>
      )}
    </div>
  )
}
