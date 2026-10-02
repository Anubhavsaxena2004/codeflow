'use client'

import type { ReactNode } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Check, CircleX, Info, Lightbulb, TriangleAlert, X } from 'lucide-react'
import type { ProjectFile, ScaffoldLine } from '@/data/challenges'
import { cn } from '@/lib/utils'
import { CodeLines, commentPrefix } from './code'

export type SlotStatus = 'correct' | 'wrong' | 'empty' | null

function Gutter({ from, count, glyph, className }: { from: number; count: number; glyph?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex shrink-0 select-none', className)}>
      <div className="flex w-6 justify-center pt-0.5">{glyph}</div>
      <div className="w-9 pr-3 text-right text-[#6e7681]">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="h-5">{from + index}</div>
        ))}
      </div>
    </div>
  )
}

function InfoBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 border-b border-[#2b2b2b] bg-[#1f1f1f] px-4 py-2 font-sans text-[12px] leading-5 text-[#9d9d9d]">
      <Info className="mt-0.5 size-3.5 shrink-0 text-[#3794ff]" />
      <div>{children}</div>
    </div>
  )
}

/** A read-only project file with line numbers. */
export function FileView({ file, language }: { file: ProjectFile; language: string }) {
  const code = file.content ?? ''
  return (
    <div>
      <InfoBar>
        {file.about} <span className="text-[#6e7681]">· read-only</span>
      </InfoBar>
      <div className="ide-mono flex py-2 text-[13px] leading-5">
        <Gutter from={1} count={code.split('\n').length} />
        <div className="min-w-0 flex-1 pl-3 pr-6">
          <CodeLines code={code} language={language} />
        </div>
      </div>
    </div>
  )
}

interface ChallengeEditorProps {
  about: string
  scaffold: ScaffoldLine[]
  language: string
  slots: (string | null)[]
  statuses: SlotStatus[]
  hinted: Set<number>
  activeBlock: string | null
  codeFor: (blockId: string) => string
  onRemove: (index: number) => void
  onHover: (blockId: string | null) => void
}

/** The file being built: scaffold lines are fixed, slot lines accept dropped blocks. */
export function ChallengeEditor({ about, scaffold, language, slots, statuses, hinted, activeBlock, codeFor, onRemove, onHover }: ChallengeEditorProps) {
  let lineNumber = 1

  return (
    <div>
      <InfoBar>
        {about} Drag blocks from the right into the empty lines, then press <span className="text-[#cccccc]">Check</span>.
      </InfoBar>
      <div className="ide-mono py-2 text-[13px] leading-5">
        {scaffold.map((line, row) => {
          if (line.type === 'line') {
            const number = lineNumber++
            return (
              <div key={row} className="flex">
                <Gutter from={number} count={1} />
                <div className="min-w-0 flex-1 pl-3 pr-6">
                  <CodeLines code={line.text ?? ''} language={language} />
                </div>
              </div>
            )
          }

          const index = (line.slot ?? 1) - 1
          const blockId = slots[index] ?? null
          const code = blockId ? codeFor(blockId) : ''
          const from = lineNumber
          lineNumber += blockId ? code.split('\n').length : 1

          return (
            <SlotRow
              key={row}
              index={index}
              indent={line.indent ?? 0}
              from={from}
              blockId={blockId}
              code={code}
              language={language}
              status={statuses[index] ?? null}
              hinted={hinted.has(index)}
              active={!!blockId && activeBlock === blockId}
              onRemove={() => onRemove(index)}
              onHover={onHover}
            />
          )
        })}
      </div>
    </div>
  )
}

interface SlotRowProps {
  index: number
  indent: number
  from: number
  blockId: string | null
  code: string
  language: string
  status: SlotStatus
  hinted: boolean
  active: boolean
  onRemove: () => void
  onHover: (blockId: string | null) => void
}

function SlotRow({ index, indent, from, blockId, code, language, status, hinted, active, onRemove, onHover }: SlotRowProps) {
  const { setNodeRef, isOver, active: dragging } = useDroppable({ id: `slot-${index}`, data: { slot: index } })
  const glyph =
    status === 'wrong' ? <CircleX className="size-3.5 text-[#f14c4c]" /> :
    status === 'empty' ? <TriangleAlert className="size-3.5 text-[#cca700]" /> :
    status === 'correct' ? <Check className="size-3.5 text-[#89d185]" /> :
    hinted ? <Lightbulb className="size-3.5 text-[#cca700]" /> : null

  return (
    <div ref={setNodeRef} data-slot={index} className="flex">
      <Gutter from={from} count={blockId ? code.split('\n').length : 1} glyph={glyph} className={blockId ? undefined : 'items-center'} />
      <div className="min-w-0 flex-1 pr-6" style={{ paddingLeft: `calc(0.75rem + ${indent}ch)` }}>
        {blockId ? (
          <PlacedBlock blockId={blockId} code={code} language={language} status={status} active={active} isOver={isOver} onRemove={onRemove} onHover={onHover} />
        ) : (
          <div
            className={cn(
              'my-1 flex h-8 items-center rounded-sm border border-dashed px-3 italic transition-colors',
              isOver ? 'border-[#0078d4] bg-[#0078d4]/15 text-[#cccccc]' : dragging ? 'border-[#0078d4]/60 bg-[#0078d4]/5 text-[#8b949e]' : 'border-[#454545] text-[#6a9955]',
              status === 'empty' && !isOver && 'border-[#cca700]/70',
            )}
          >
            {commentPrefix(language)} step {index + 1}: drop a block here
          </div>
        )}
      </div>
    </div>
  )
}

function PlacedBlock({ blockId, code, language, status, active, isOver, onRemove, onHover }: {
  blockId: string
  code: string
  language: string
  status: SlotStatus
  active: boolean
  isOver: boolean
  onRemove: () => void
  onHover: (blockId: string | null) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `placed:${blockId}`, data: { blockId } })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Placed block. Drag to move, Delete to send back.`}
      onMouseEnter={() => onHover(blockId)}
      onMouseLeave={() => onHover(null)}
      onKeyDown={(event) => {
        if (event.key === 'Delete' || event.key === 'Backspace') onRemove()
      }}
      className={cn(
        'group relative cursor-grab rounded-sm outline-none transition-colors hover:bg-[#2a2d2e] focus-visible:ring-1 focus-visible:ring-[#0078d4] active:cursor-grabbing',
        active && 'bg-[#264f78]/40 hover:bg-[#264f78]/40',
        status === 'correct' && 'bg-[#89d185]/10',
        isOver && 'ring-1 ring-[#0078d4]',
        isDragging && 'opacity-30',
      )}
    >
      <CodeLines code={code} language={language} lineClassName={status === 'wrong' ? 'squiggle' : undefined} />
      <button
        type="button"
        onClick={onRemove}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        aria-label="Send block back to the palette"
        title="Send back"
        className="absolute right-1 top-0.5 hidden size-4 cursor-pointer items-center justify-center rounded-sm text-[#cccccc] hover:bg-[#3c3c3c] group-hover:flex"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}
