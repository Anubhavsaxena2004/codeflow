'use client'

import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CircleCheck, GripVertical, Hand } from 'lucide-react'
import type { Block } from '@/data/challenges'
import { cn } from '@/lib/utils'
import { CodeLines } from './code'

/** The card itself, shared by the palette and the drag overlay. */
export function BlockCard({ label, code, language, lifted = false }: { label: string; code: string; language: string; lifted?: boolean }) {
  return (
    <div className={cn('overflow-hidden rounded-md border bg-(--ide-bg) text-left', lifted ? 'rotate-1 border-[#0078d4] shadow-[0_12px_32px_rgba(0,0,0,0.55)]' : 'border-(--ide-border-strong)')}>
      <div className="flex items-center gap-1.5 border-b border-(--ide-border) bg-(--ide-bg-alt) px-2 py-1 font-sans text-[11px] text-(--ide-fg)">
        <GripVertical aria-hidden className="size-3.5 shrink-0 text-(--ide-icon)" />
        <span className="truncate">{label}</span>
      </div>
      <div className="ide-mono px-2.5 py-1.5 text-[12px] leading-5">
        <CodeLines code={code} language={language} wrap />
      </div>
    </div>
  )
}

function PaletteBlock({ block, code, language, dimmed, active, onPlace, onHover }: {
  block: Block
  code: string
  language: string
  dimmed: boolean
  active: boolean
  onPlace: () => void
  onHover: (blockId: string | null) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `palette:${block.id}`, data: { blockId: block.id } })

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={onPlace}
      onMouseEnter={() => onHover(block.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(block.id)}
      onBlur={() => onHover(null)}
      aria-label={`${block.label}. Drag into the editor, or press Enter to fill the next empty line.`}
      className={cn(
        'block w-full cursor-grab rounded-md outline-none transition [touch-action:manipulation] focus-visible:ring-1 focus-visible:ring-[#0078d4] active:cursor-grabbing',
        active && 'ring-1 ring-[#0078d4]',
        dimmed && 'opacity-35',
        isDragging && 'opacity-30',
      )}
    >
      <BlockCard label={block.label} code={code} language={language} />
    </button>
  )
}

interface BlockPaletteProps {
  blocks: Block[]
  total: number
  /** Blocks in slots. Defaults to total minus the blocks left, which only holds when no distractors are shown. */
  placedCount?: number
  language: string
  codeFor: (blockId: string) => string
  activeBlock: string | null
  relatedTo: (blockId: string) => boolean
  inspected: Block | null
  completed: boolean
  onPlace: (blockId: string) => void
  onHover: (blockId: string | null) => void
}

export function BlockPalette({ blocks, total, placedCount = total - blocks.length, language, codeFor, activeBlock, relatedTo, inspected, completed, onPlace, onHover }: BlockPaletteProps) {
  const { setNodeRef, isOver, active } = useDroppable({ id: 'palette' })
  const draggingPlaced = typeof active?.id === 'string' && active.id.startsWith('placed:')

  return (
    <div className="flex h-full min-h-0 flex-col text-[13px] text-(--ide-fg)">
      <div className="flex h-9 shrink-0 items-center justify-between px-4 text-[11px] tracking-wide text-(--ide-fg-title)">
        <span>BLOCKS</span>
        <span className="rounded-full bg-(--ide-border) px-2 py-0.5 text-[10px] text-(--ide-fg)">{placedCount}/{total} placed</span>
      </div>

      <div
        ref={setNodeRef}
        className={cn('min-h-0 flex-1 overflow-y-auto px-3 pb-3', draggingPlaced && 'bg-[#0078d4]/5', isOver && 'bg-[#0078d4]/10 outline outline-1 -outline-offset-1 outline-[#0078d4]')}
      >
        <p className="mb-3 flex items-start gap-2 font-sans text-[12px] leading-5 text-(--ide-muted)">
          <Hand aria-hidden className="mt-0.5 size-3.5 shrink-0 text-(--ide-link)" />
          Grab a block and drop it on an empty line. Click a block to fill the next empty line.
        </p>

        {blocks.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {blocks.map((block) => (
              <PaletteBlock
                key={block.id}
                block={block}
                code={codeFor(block.id)}
                language={language}
                dimmed={!relatedTo(block.id)}
                active={activeBlock === block.id}
                onPlace={() => onPlace(block.id)}
                onHover={onHover}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-(--ide-border-strong) p-4 text-center text-[12px] leading-5 text-(--ide-muted)">
            <CircleCheck className="mx-auto mb-2 size-5 text-(--ide-success)" />
            {completed ? 'Solved. Open “Run it” to test the flow.' : 'Every block is placed. Press Check to verify the order.'}
          </div>
        )}

        {draggingPlaced && <div className="mt-3 rounded-md border border-dashed border-[#0078d4]/70 p-3 text-center text-[12px] text-(--ide-muted)">Drop here to send the block back</div>}
      </div>

      <section className="shrink-0 border-t border-(--ide-border) px-4 py-3">
        <div className="mb-1 text-[11px] font-bold tracking-wide">BLOCK DETAILS</div>
        {inspected ? (
          <div className="text-[12px] leading-5 text-(--ide-muted)">
            <div className="text-(--ide-fg)">{inspected.label}</div>
            <p className="mt-1">{inspected.what}</p>
            {completed && inspected.whyHere && <p className="mt-1 text-(--ide-success)">Why here: {inspected.whyHere}</p>}
          </div>
        ) : (
          <p className="text-[12px] text-(--ide-dim)">Hover a block to see what it does.</p>
        )}
      </section>
    </div>
  )
}
