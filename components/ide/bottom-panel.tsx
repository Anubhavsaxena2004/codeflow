'use client'

import { useState } from 'react'
import { CircleCheck, CircleX, Info, Lightbulb, TriangleAlert, X } from 'lucide-react'
import type { Challenge } from '@/data/challenges'
import { cn } from '@/lib/utils'

export type PanelTab = 'problems' | 'architecture' | 'glossary' | 'reflect'

export interface Problem {
  severity: 'error' | 'warning' | 'hint' | 'success' | 'info'
  message: string
  detail?: string
  line?: number
}

const problemIcons = {
  error: <CircleX className="size-3.5 text-[#f14c4c]" />,
  warning: <TriangleAlert className="size-3.5 text-[#cca700]" />,
  hint: <Lightbulb className="size-3.5 text-[#cca700]" />,
  success: <CircleCheck className="size-3.5 text-[#89d185]" />,
  info: <Info className="size-3.5 text-[#3794ff]" />,
}

interface BottomPanelProps {
  tab: PanelTab
  onTab: (tab: PanelTab) => void
  onClose: () => void
  problems: Problem[]
  problemCount: number
  fileName: string
  challenge: Challenge
  showReflect: boolean
  architecture: ArchitectureProps
}

export function BottomPanel({ tab: requestedTab, onTab, onClose, problems, problemCount, fileName, challenge, showReflect, architecture }: BottomPanelProps) {
  const tab = requestedTab === 'reflect' && !showReflect ? 'problems' : requestedTab
  const tabs: { id: PanelTab; label: string; badge?: number }[] = [
    { id: 'problems', label: 'PROBLEMS', badge: problemCount },
    { id: 'architecture', label: 'ARCHITECTURE' },
    { id: 'glossary', label: 'GLOSSARY' },
    ...(showReflect ? [{ id: 'reflect' as const, label: 'EXPLAIN IT BACK' }] : []),
  ]

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#181818] text-[13px] text-[#cccccc]">
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

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        {tab === 'problems' && (
          problems.length === 0 ? (
            <p className="py-1 text-[12px] text-[#9d9d9d]">No problems have been detected yet. Press Check to verify the order.</p>
          ) : (
            <ul className="flex flex-col">
              {problems.map((problem, index) => (
                <li key={index} className="flex items-start gap-2 rounded px-1 py-0.5 text-[12px] leading-5 hover:bg-[#2a2d2e]">
                  <span className="mt-[3px] shrink-0">{problemIcons[problem.severity]}</span>
                  <span className="min-w-0">
                    <span className={problem.severity === 'success' ? 'text-[#89d185]' : undefined}>{problem.message}</span>
                    {problem.detail && <span className="ml-2 text-[#9d9d9d]">{problem.detail}</span>}
                    {problem.line && <span className="ml-2 text-[#6e7681]">{fileName} [Ln {problem.line}]</span>}
                  </span>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === 'architecture' && <ArchitectureMap {...architecture} />}

        {tab === 'glossary' && (
          <dl className="grid gap-x-6 gap-y-2 py-1 sm:grid-cols-2 xl:grid-cols-3">
            {challenge.glossary.map((item) => (
              <div key={item.term} className="text-[12px] leading-5">
                <dt className="ide-mono text-[#9cdcfe]">{item.term}</dt>
                <dd className="text-[#9d9d9d]">{item.definition}</dd>
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
      <p className="mb-3 text-[12px] text-[#9d9d9d]">Hover a block to see where it runs. Click a node to highlight the blocks that belong to it.</p>
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
                  node.kind === 'database' ? 'border-[#cca700]/60' : 'border-[#3794ff]/60',
                  activeMapping?.nodeIds.includes(node.id) || isLit(node.id) ? 'bg-[#0078d4]/20 text-white shadow-[0_0_14px_rgba(0,120,212,0.35)]' : pulsedNode === node.id ? 'animate-pulse bg-[#cca700]/15' : 'bg-[#1f1f1f]',
                  focusedNode === node.id && 'ring-1 ring-white/70',
                )}
              >
                {node.label}
                {isLit(node.id) && <span className="ml-1 text-[#89d185]">✓</span>}
              </button>
              {index < nodes.length - 1 && (
                <span className={cn('text-lg text-[#6e7681]', arrow && (activeMapping?.arrowIds?.includes(arrow.id) || arrowLit(arrow.id)) && 'text-[#3794ff]')}>→</span>
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
      <p className="mb-3 text-[12px] text-[#9d9d9d]">Not auto-graded. Write your reasoning, then compare it with the model answer.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {reflections.map((item, index) => (
          <div key={item.question}>
            <label htmlFor={`reflect-${index}`} className="text-[12px] text-[#e2c08d]">{item.question}</label>
            <textarea
              id={`reflect-${index}`}
              value={answers[index] ?? ''}
              onChange={(event) => setAnswers((current) => current.map((answer, position) => (position === index ? event.target.value : answer)))}
              className="mt-2 min-h-20 w-full rounded border border-[#3c3c3c] bg-[#1f1f1f] p-2 text-[12px] text-[#cccccc] outline-none focus:border-[#0078d4]"
              placeholder="Write your explanation…"
            />
            {submitted && (
              <div className="mt-2 rounded border border-[#89d185]/30 bg-[#89d185]/10 p-2 text-[12px] text-[#b5e2b0]">
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
