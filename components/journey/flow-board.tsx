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
    <div className={cn('rounded-md border bg-[#1f1f1f] p-3 text-left', tone === 'right' ? 'border-[#89d185]/60' : tone === 'wrong' ? 'border-[#f14c4c]/70' : 'border-[#3c3c3c]')}>
      <div className="text-[13px] font-semibold text-[#e7e7e7]">{node.label}</div>
      <p className="mt-0.5 text-[12px] leading-5 text-[#9d9d9d]">{node.role}</p>
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
              className="ide-mono inline-flex cursor-pointer items-center gap-1 rounded bg-[#2b2b2b] px-1.5 py-0.5 text-[11px] text-[#cccccc] hover:bg-[#37373d]"
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
        <div className="mb-4 text-[11px] font-bold tracking-wide text-[#89d185]">THE FINAL ARCHITECTURE</div>
        <ol className="flex flex-col items-stretch">
          {level.nodes.map((node, index) => (
            <li key={node.id} className="flex flex-col items-center">
              <div className="w-full">
                <NodeCard node={node} onOpenFile={onOpenFile} tone="right" />
              </div>
              {index < level.nodes.length - 1 && <ArrowDown aria-hidden className="my-1 size-4 text-[#3794ff]" />}
            </li>
          ))}
        </ol>
        {level.returnTrip && <p className="mt-4 rounded-md border border-[#3794ff]/40 bg-[#3794ff]/10 p-3 text-[12px] leading-5 text-[#cccccc]">{level.returnTrip}</p>}
      </div>
    )
  }

  return (
    <div className="grid gap-6 p-5 lg:grid-cols-2">
      <section aria-label="Request path">
        <div className="mb-2 text-[11px] font-bold tracking-wide text-[#bbbbbb]">THE REQUEST, IN ORDER</div>
        <ol className="flex flex-col gap-2">
          {arrangement.map((id, position) => {
            const node = byId(id)
            const right = checked && id === level.nodes[position].id
            return (
              <li key={position} className="flex items-start gap-2">
                <span className={cn('mt-2.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px]', right ? 'bg-[#89d185]/20 text-[#89d185]' : checked && node ? 'bg-[#f14c4c]/20 text-[#f48771]' : 'bg-[#2b2b2b] text-[#cccccc]')}>
                  {checked && node ? right ? <Check className="size-3" /> : <CircleX className="size-3" /> : position + 1}
                </span>
                {node ? (
                  <button type="button" onClick={() => onRemove(position)} className="group relative min-w-0 flex-1" aria-label={`${node.label}, step ${position + 1}. Click to take it back.`}>
                    <NodeCard node={node} onOpenFile={onOpenFile} tone={checked ? (right ? 'right' : 'wrong') : 'idle'} />
                    <Undo2 aria-hidden className="absolute right-2 top-2 hidden size-3.5 text-[#9d9d9d] group-hover:block" />
                  </button>
                ) : (
                  <div className="flex h-12 min-w-0 flex-1 items-center rounded-md border border-dashed border-[#454545] px-3 text-[12px] italic text-[#6a9955]">
                    {position === 0 ? 'Where does the request start?' : 'What comes next?'}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </section>
      <section aria-label="Stops to place">
        <div className="mb-2 text-[11px] font-bold tracking-wide text-[#bbbbbb]">STOPS</div>
        {pool.length ? (
          <div className="flex flex-col gap-2">
            {pool.map((node) => (
              <button key={node.id} type="button" onClick={() => onPlace(node.id)} className="rounded-md text-left outline-none ring-[#0078d4] hover:ring-1 focus-visible:ring-1" aria-label={`Place ${node.label} next`}>
                <NodeCard node={node} onOpenFile={onOpenFile} />
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-[#3c3c3c] p-4 text-center text-[12px] text-[#9d9d9d]">Every stop is placed. Check the order.</p>
        )}
      </section>
    </div>
  )
}
