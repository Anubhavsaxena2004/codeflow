'use client'

import { useState, type ReactNode } from 'react'
import { ArrowRight, Check, CircleX, TriangleAlert, X } from 'lucide-react'
import type { ArchitectureNode, JourneyTerm } from '@/lib/journeys/types'
import { cn } from '@/lib/utils'
import { problemIcons, type Problem, type SlotGuideRow } from '../ide/bottom-panel'
import { FileIcon } from '../ide/code'
import { Pill } from '@/components/ui/game'

export type JourneyTab = 'terminal' | 'steps' | 'problems' | 'glossary' | 'architecture'

export interface FlowContext {
  nodes: ArchitectureNode[]
  /** Stops whose files this level works on. */
  current: Set<string>
  returnTrip?: string
}

interface JourneyPanelProps {
  tab: JourneyTab
  onTab: (tab: JourneyTab) => void
  onClose: () => void
  terminal: ReactNode
  /** The build level's slots; null hides the tab. */
  steps: SlotGuideRow[] | null
  fileName: string
  onStepClick: (index: number) => void
  problems: Problem[]
  terms: JourneyTerm[]
  allTerms: JourneyTerm[]
  /** The journey's request flow; null hides the tab (no architecture level, or this is it). */
  flow: FlowContext | null
  onOpenFile: (path: string) => void
}

/** The bottom panel of a level: the terminal plus the same helpers the challenges have. */
export function JourneyPanel({ tab: requested, onTab, onClose, terminal, steps, fileName, onStepClick, problems, terms, allTerms, flow, onOpenFile }: JourneyPanelProps) {
  const [showAllTerms, setShowAllTerms] = useState(false)
  const tab = (requested === 'steps' && !steps) || (requested === 'architecture' && !flow) || (requested === 'glossary' && !allTerms.length) ? 'terminal' : requested
  const problemCount = problems.filter((problem) => problem.severity === 'error' || problem.severity === 'warning').length
  const tabs: { id: JourneyTab; label: string; badge?: number }[] = [
    { id: 'terminal', label: 'TERMINAL' },
    ...(steps ? [{ id: 'steps' as const, label: 'SLOT GUIDE' }] : []),
    { id: 'problems', label: 'PROBLEMS', badge: problemCount },
    ...(allTerms.length ? [{ id: 'glossary' as const, label: 'GLOSSARY', badge: terms.length || undefined }] : []),
    ...(flow ? [{ id: 'architecture' as const, label: 'ARCHITECTURE' }] : []),
  ]
  const shownTerms = showAllTerms || !terms.length ? allTerms : terms

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-1 overflow-x-auto px-2" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => onTab(item.id)}
            className={cn(
              'flex h-full shrink-0 items-center gap-1.5 px-3 text-[11px] font-medium tracking-wide transition-colors border-t-2',
              tab === item.id
                ? 'border-t-(--ide-accent) bg-(--ide-bg) text-(--ide-fg-strong)'
                : 'border-t-transparent text-(--ide-muted) hover:text-(--ide-fg) hover:bg-(--ide-hover)/50'
            )}
          >
            {item.label}
            {!!item.badge && (
              <Pill
                size="sm"
                tone={item.id === 'problems' && problemCount > 0 ? 'boss' : 'neutral'}
                className="px-1.5 py-0 text-[10px] leading-tight font-semibold"
              >
                {item.badge}
              </Pill>
            )}
          </button>
        ))}
        <button type="button" onClick={onClose} aria-label="Close panel" className="ml-auto rounded p-1 text-(--ide-muted) hover:bg-(--ide-border) hover:text-(--ide-fg)">
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {/* The terminal stays mounted so its history and input survive switching tabs */}
        <div hidden={tab !== 'terminal'} className="h-full">{terminal}</div>

        {tab !== 'terminal' && (
          <div className="h-full overflow-y-auto px-4 pb-3 text-[12px] leading-5 text-(--ide-fg)">
            {tab === 'steps' && steps && (
              <div className="py-1">
                <p className="mb-2 text-(--ide-muted)">What kind of code belongs in each slot of {fileName}. Click a step to jump to it.</p>
                <ol className="flex flex-col">
                  {steps.map((step, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        onClick={() => onStepClick(index)}
                        className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-x-3 rounded px-1 py-1 text-left hover:bg-(--ide-hover) md:grid-cols-[1.25rem_9rem_minmax(0,1fr)_minmax(0,14rem)]"
                      >
                        <span className="mt-0.5 grid size-5 place-items-center rounded-full bg-(--ide-border) text-[11px]">{index + 1}</span>
                        <span className="ide-mono text-(--ide-code)">{step.kind}</span>
                        <span className="col-start-2 text-(--ide-muted) md:col-start-auto">{step.goal}</span>
                        <span className="col-start-2 flex min-w-0 items-center gap-1.5 md:col-start-auto">
                          {step.status === 'correct' && <Check className="size-3.5 shrink-0 text-(--ide-success)" />}
                          {step.status === 'wrong' && <CircleX className="size-3.5 shrink-0 text-(--ide-error)" />}
                          {step.status === 'empty' && <TriangleAlert className="size-3.5 shrink-0 text-(--ide-warning)" />}
                          {step.placed ? <span className="truncate">{step.placed}</span> : <span className="italic text-(--ide-dim)">empty</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {tab === 'problems' &&
              (problems.length === 0 ? (
                <p className="py-1 text-(--ide-muted)">No problems yet. They show up here when a test, a check or an answer fails.</p>
              ) : (
                <ul className="flex flex-col py-1">
                  {problems.map((problem, index) => (
                    <li key={index} className="flex items-start gap-2 rounded px-1 py-0.5 hover:bg-(--ide-hover)">
                      <span className="mt-[3px] shrink-0">{problemIcons[problem.severity]}</span>
                      <span className="min-w-0">
                        <span className={problem.severity === 'success' ? 'text-(--ide-success)' : undefined}>{problem.message}</span>
                        {problem.detail && <span className="ml-2 text-(--ide-muted)">{problem.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              ))}

            {tab === 'glossary' && (
              <div className="py-1">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-(--ide-muted)">
                  {terms.length ? (showAllTerms ? `All ${allTerms.length} terms of this journey.` : `The ${terms.length} terms used in this level's code.`) : `This level uses none of the journey's terms; here are all ${allTerms.length}.`}
                  {terms.length > 0 && (
                    <button type="button" onClick={() => setShowAllTerms((value) => !value)} className="text-(--ide-link) hover:underline">
                      {showAllTerms ? 'Only this level' : 'Show all terms'}
                    </button>
                  )}
                </div>
                <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
                  {shownTerms.map((item) => (
                    <div key={item.term}>
                      <dt className="ide-mono text-(--ide-code)">{item.term}</dt>
                      <dd className="text-(--ide-muted)">{item.definition}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {tab === 'architecture' && flow && (
              <div className="py-1">
                <p className="mb-3 text-(--ide-muted)">
                  How one request travels through the project.{' '}
                  {flow.current.size ? 'The highlighted stop is where this level’s code runs.' : 'This level sets things up around the request.'}
                </p>
                <ol className="flex flex-wrap items-stretch gap-2">
                  {flow.nodes.map((node, index) => {
                    const current = flow.current.has(node.id)
                    return (
                      <li key={node.id} className="flex items-center gap-2">
                        <div className={cn('ide-mono min-w-[120px] max-w-[220px] rounded border px-3 py-2', current ? 'border-(--ide-link) bg-[#0078d4]/20 shadow-[0_0_14px_rgba(0,120,212,0.35)]' : 'border-(--ide-border-strong) bg-(--ide-bg)')}>
                          <div className={cn('text-[12px]', current ? 'text-(--ide-heading)' : 'text-(--ide-fg)')}>
                            {node.label}
                            {current && <span className="ml-1.5 font-sans text-[10px] text-(--ide-link)">this level</span>}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {node.files.map((path) => (
                              <button key={path} type="button" onClick={() => onOpenFile(path)} title={path} className="inline-flex items-center gap-1 rounded bg-(--ide-border) px-1.5 text-[10px] text-(--ide-fg) hover:bg-(--ide-active)">
                                <FileIcon path={path} className="size-3" />
                                {path.split('/').pop()}
                              </button>
                            ))}
                          </div>
                        </div>
                        {index < flow.nodes.length - 1 && <ArrowRight aria-hidden className="size-4 shrink-0 text-(--ide-dim)" />}
                      </li>
                    )
                  })}
                </ol>
                {flow.returnTrip && <p className="mt-3 text-(--ide-muted)">{flow.returnTrip}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
