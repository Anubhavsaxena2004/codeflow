'use client'

import { ArrowDown, Check, CircleX, Undo2 } from 'lucide-react'
import type { ArchitectureLevel, ArchitectureNode } from '@/lib/journeys/types'
import { cn } from '@/lib/utils'
import { FileIcon } from '../ide/code'

interface FlowBoardProps {
  level: ArchitectureLevel
  /** Node id per position, or null when empty. */
  arrangement: (string | null)[]
  checked: boolean
  passed: boolean
  onPlace: (nodeId: string) => void
  onRemove: (position: number) => void
  onOpenFile: (path: string) => void
}

/** Stable, never-solved shuffle so server and client render the same pool. */
export function shuffledNodes(nodes: ArchitectureNode[]) {
  const score = (id: string) => id.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 0) % 13
  const shuffled = [...nodes].sort((a, b) => score(a.id) - score(b.id) || a.id.localeCompare(b.id))
  return shuffled.every((node, index) => node.id === nodes[index].id) ? shuffled.reverse() : shuffled
}

function NodeCard({ node, onOpenFile, tone = 'idle' }: { node: ArchitectureNode; onOpenFile: (path: string) => void; tone?: 'idle' | 'right' | 'wrong' }) {
  return (
    <div className={cn('rounded-md border bg-(--ide-bg) p-3 text-left', tone === 'right' ? 'border-(--ide-success)/60' : tone === 'wrong' ? 'border-(--ide-error)/70' : 'border-(--ide-border-strong)')}>
      <div className="text-[13px] font-semibold text-(--ide-fg-strong)">{node.label}</div>
      <p className="mt-0.5 text-[12px] leading-5 text-(--ide-muted)">{node.role}</p>
      {node.files.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {node.files.map((path) => (
            <span
              key={path}
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation()
                onOpenFile(path)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onOpenFile(path)
              }}
              className="ide-mono inline-flex cursor-pointer items-center gap-1 rounded bg-(--ide-border) px-1.5 py-0.5 text-[11px] text-(--ide-fg) hover:bg-(--ide-active)"
            >
              <FileIcon path={path} className="size-3" />
              {path.split('/').pop()}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function FlowBoard({ level, arrangement, checked, passed, onPlace, onRemove, onOpenFile }: FlowBoardProps) {
  const byId = (id: string | null) => level.nodes.find((node) => node.id === id)
  const pool = shuffledNodes(level.nodes).filter((node) => !arrangement.includes(node.id))

  if (passed) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="mb-4 text-[11px] font-bold tracking-wide text-(--ide-success)">THE FINAL ARCHITECTURE</div>
        <ol className="flex flex-col items-stretch">
          {level.nodes.map((node, index) => (
            <li key={node.id} className="flex flex-col items-center">
              <div className="w-full">
                <NodeCard node={node} onOpenFile={onOpenFile} tone="right" />
              </div>
              {index < level.nodes.length - 1 && <ArrowDown aria-hidden className="my-1 size-4 text-(--ide-link)" />}
            </li>
          ))}
        </ol>
        {level.returnTrip && <p className="mt-4 rounded-md border border-(--ide-link)/40 bg-(--ide-link)/10 p-3 text-[12px] leading-5 text-(--ide-fg)">{level.returnTrip}</p>}
      </div>
    )
  }

  return (
    <div className="grid gap-6 p-5 lg:grid-cols-2">
      <section aria-label="Request path">
        <div className="mb-2 text-[11px] font-bold tracking-wide text-(--ide-fg-title)">THE REQUEST, IN ORDER</div>
        <ol className="flex flex-col gap-2">
          {arrangement.map((id, position) => {
            const node = byId(id)
            const right = checked && id === level.nodes[position].id
            return (
              <li key={position} className="flex items-start gap-2">
                <span className={cn('mt-2.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px]', right ? 'bg-(--ide-success)/20 text-(--ide-success)' : checked && node ? 'bg-(--ide-error)/20 text-(--ide-error-soft)' : 'bg-(--ide-border) text-(--ide-fg)')}>
                  {checked && node ? right ? <Check className="size-3" /> : <CircleX className="size-3" /> : position + 1}
                </span>
                {node ? (
                  <button type="button" onClick={() => onRemove(position)} className="group relative min-w-0 flex-1" aria-label={`${node.label}, step ${position + 1}. Click to take it back.`}>
                    <NodeCard node={node} onOpenFile={onOpenFile} tone={checked ? (right ? 'right' : 'wrong') : 'idle'} />
                    <Undo2 aria-hidden className="absolute right-2 top-2 hidden size-3.5 text-(--ide-muted) group-hover:block" />
                  </button>
                ) : (
                  <div className="flex h-12 min-w-0 flex-1 items-center rounded-md border border-dashed border-(--ide-scrollbar) px-3 text-[12px] italic text-(--ide-comment)">
                    {position === 0 ? 'Where does the request start?' : 'What comes next?'}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </section>
      <section aria-label="Stops to place">
        <div className="mb-2 text-[11px] font-bold tracking-wide text-(--ide-fg-title)">STOPS</div>
        {pool.length ? (
          <div className="flex flex-col gap-2">
            {pool.map((node) => (
              <button key={node.id} type="button" onClick={() => onPlace(node.id)} className="rounded-md text-left outline-none ring-[#0078d4] hover:ring-1 focus-visible:ring-1" aria-label={`Place ${node.label} next`}>
                <NodeCard node={node} onOpenFile={onOpenFile} />
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-(--ide-border-strong) p-4 text-center text-[12px] text-(--ide-muted)">Every stop is placed. Check the order.</p>
        )}
      </section>
    </div>
  )
}
