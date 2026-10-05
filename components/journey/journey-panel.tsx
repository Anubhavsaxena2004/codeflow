'use client'

import { useState, type ReactNode } from 'react'
import { ArrowRight, Check, CircleX, TriangleAlert, X } from 'lucide-react'
import type { ArchitectureNode, JourneyTerm } from '@/lib/journeys/types'
import { cn } from '@/lib/utils'
import { problemIcons, type Problem, type SlotGuideRow } from '../ide/bottom-panel'
import { FileIcon } from '../ide/code'

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
            className={cn('flex h-full shrink-0 items-center gap-1.5 border-b px-2 text-[11px] tracking-wide', tab === item.id ? 'border-[#0078d4] text-[#e7e7e7]' : 'border-transparent text-[#9d9d9d] hover:text-[#cccccc]')}
          >
            {item.label}
            {!!item.badge && <span className="rounded-full bg-[#616161] px-1.5 text-[10px] leading-4 text-white">{item.badge}</span>}
          </button>
        ))}
        <button type="button" onClick={onClose} aria-label="Close panel" className="ml-auto rounded p-1 text-[#9d9d9d] hover:bg-[#2b2b2b] hover:text-[#cccccc]">
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {/* The terminal stays mounted so its history and input survive switching tabs */}
        <div hidden={tab !== 'terminal'} className="h-full">{terminal}</div>

        {tab !== 'terminal' && (
          <div className="h-full overflow-y-auto px-4 pb-3 text-[12px] leading-5 text-[#cccccc]">
            {tab === 'steps' && steps && (
              <div className="py-1">
                <p className="mb-2 text-[#9d9d9d]">What kind of code belongs in each slot of {fileName}. Click a step to jump to it.</p>
                <ol className="flex flex-col">
                  {steps.map((step, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        onClick={() => onStepClick(index)}
                        className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-x-3 rounded px-1 py-1 text-left hover:bg-[#2a2d2e] md:grid-cols-[1.25rem_9rem_minmax(0,1fr)_minmax(0,14rem)]"
                      >
                        <span className="mt-0.5 grid size-5 place-items-center rounded-full bg-[#2b2b2b] text-[11px]">{index + 1}</span>
                        <span className="ide-mono text-[#9cdcfe]">{step.kind}</span>
                        <span className="col-start-2 text-[#9d9d9d] md:col-start-auto">{step.goal}</span>
                        <span className="col-start-2 flex min-w-0 items-center gap-1.5 md:col-start-auto">
                          {step.status === 'correct' && <Check className="size-3.5 shrink-0 text-[#89d185]" />}
                          {step.status === 'wrong' && <CircleX className="size-3.5 shrink-0 text-[#f14c4c]" />}
                          {step.status === 'empty' && <TriangleAlert className="size-3.5 shrink-0 text-[#cca700]" />}
                          {step.placed ? <span className="truncate">{step.placed}</span> : <span className="italic text-[#6e7681]">empty</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {tab === 'problems' &&
              (problems.length === 0 ? (
                <p className="py-1 text-[#9d9d9d]">No problems yet. They show up here when a test, a check or an answer fails.</p>
              ) : (
                <ul className="flex flex-col py-1">
                  {problems.map((problem, index) => (
                    <li key={index} className="flex items-start gap-2 rounded px-1 py-0.5 hover:bg-[#2a2d2e]">
                      <span className="mt-[3px] shrink-0">{problemIcons[problem.severity]}</span>
                      <span className="min-w-0">
                        <span className={problem.severity === 'success' ? 'text-[#89d185]' : undefined}>{problem.message}</span>
                        {problem.detail && <span className="ml-2 text-[#9d9d9d]">{problem.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              ))}

            {tab === 'glossary' && (
              <div className="py-1">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[#9d9d9d]">
                  {terms.length ? (showAllTerms ? `All ${allTerms.length} terms of this journey.` : `The ${terms.length} terms used in this level's code.`) : `This level uses none of the journey's terms; here are all ${allTerms.length}.`}
                  {terms.length > 0 && (
                    <button type="button" onClick={() => setShowAllTerms((value) => !value)} className="text-[#3794ff] hover:underline">
                      {showAllTerms ? 'Only this level' : 'Show all terms'}
                    </button>
                  )}
                </div>
                <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
                  {shownTerms.map((item) => (
                    <div key={item.term}>
                      <dt className="ide-mono text-[#9cdcfe]">{item.term}</dt>
                      <dd className="text-[#9d9d9d]">{item.definition}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {tab === 'architecture' && flow && (
              <div className="py-1">
                <p className="mb-3 text-[#9d9d9d]">
                  How one request travels through the project.{' '}
                  {flow.current.size ? 'The highlighted stop is where this level’s code runs.' : 'This level sets things up around the request.'}
                </p>
                <ol className="flex flex-wrap items-stretch gap-2">
                  {flow.nodes.map((node, index) => {
                    const current = flow.current.has(node.id)
                    return (
                      <li key={node.id} className="flex items-center gap-2">
                        <div className={cn('ide-mono min-w-[120px] max-w-[220px] rounded border px-3 py-2', current ? 'border-[#3794ff] bg-[#0078d4]/20 shadow-[0_0_14px_rgba(0,120,212,0.35)]' : 'border-[#3c3c3c] bg-[#1f1f1f]')}>
                          <div className={cn('text-[12px]', current ? 'text-white' : 'text-[#cccccc]')}>
                            {node.label}
                            {current && <span className="ml-1.5 font-sans text-[10px] text-[#3794ff]">this level</span>}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {node.files.map((path) => (
                              <button key={path} type="button" onClick={() => onOpenFile(path)} title={path} className="inline-flex items-center gap-1 rounded bg-[#2b2b2b] px-1.5 text-[10px] text-[#cccccc] hover:bg-[#37373d]">
                                <FileIcon path={path} className="size-3" />
                                {path.split('/').pop()}
                              </button>
                            ))}
                          </div>
                        </div>
                        {index < flow.nodes.length - 1 && <ArrowRight aria-hidden className="size-4 shrink-0 text-[#6e7681]" />}
                      </li>
                    )
                  })}
                </ol>
                {flow.returnTrip && <p className="mt-3 text-[#9d9d9d]">{flow.returnTrip}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
