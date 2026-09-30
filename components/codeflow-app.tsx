'use client'

import { useMemo, useState } from 'react'
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronRight, GripVertical, Info, Lightbulb, LockKeyhole, RotateCcw, Terminal } from 'lucide-react'
import { signupChallenge, correctOrder, type Block } from '@/data/challenges/signup'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const challenge = signupChallenge

function codeAccent(code: string) {
  return code.split(/(\b(?:const|return|if|await|new|async|try|catch)\b|\b\d{3}\b|"[^"\n]*")/g).map((part, index) => {
    if (/^(const|return|if|await|new|async|try|catch)$/.test(part)) return <span key={index} className="text-[#c586c0]">{part}</span>
    if (/^\d{3}$/.test(part)) return <span key={index} className="text-[#d7ba7d]">{part}</span>
    if (/^"/.test(part)) return <span key={index} className="text-[#ce9178]">{part}</span>
    return <span key={index}>{part}</span>
  })
}

function BlockCard({ block, placed, status, hinted, dimmed, onRemove, onHover }: { block: Block; placed?: boolean; status?: string; hinted?: boolean; dimmed?: boolean; onRemove?: () => void; onHover?: (id: string | null) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: block.id })
  const explanation = status === 'correct' && block.whyHere ? `${block.what} Why here: ${block.whyHere}` : block.what
  return <motion.button title={explanation} aria-label={`${block.label}. ${explanation}`} ref={setNodeRef} layout whileHover={{ y: -2 }} {...listeners} {...attributes} onMouseEnter={() => onHover?.(block.id)} onMouseLeave={() => onHover?.(null)} onDoubleClick={onRemove} className={cn('group w-full cursor-grab rounded-lg border bg-[#17191f] p-3 text-left shadow-sm transition active:cursor-grabbing', isDragging && 'opacity-30', status === 'correct' && 'border-[#4ec9b0]/80', status === 'wrong' && 'border-[#f14c4c]/80 animate-shake', status === 'misplaced' && 'border-[#d7ba7d]/80', dimmed && 'opacity-35')}>
    <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-[#d4d4d4]"><GripVertical className="size-3.5 text-[#6b7280]" />{block.label}{hinted && <Lightbulb className="size-3 text-[#d7ba7d]" aria-label="Placed by hint" />}<Info className="ml-auto size-3 text-[#6b7280] opacity-0 transition group-hover:opacity-100" /></div>
    <pre className="overflow-hidden whitespace-pre-wrap font-mono text-[11px] leading-[1.55] text-[#9cdcfe]">{codeAccent(block.code)}</pre>
    {status === 'wrong' && <div className="mt-2 border-t border-[#f14c4c]/20 pt-2 text-[10px] leading-relaxed text-[#f48771]">{block.whyWrong}</div>}
    {status === 'misplaced' && <div className="mt-2 border-t border-[#d7ba7d]/20 pt-2 text-[10px] text-[#d7ba7d]">Right idea, wrong place.</div>}
    {placed && status === 'correct' && <div className="mt-2 flex items-center gap-1 text-[10px] text-[#4ec9b0]"><Check className="size-3" /> Correct placement</div>}
  </motion.button>
}

function ArchitectureStrip({ activeBlock, litNodes, litArrows, pulseNode, onNodeClick }: { activeBlock: string | null; litNodes: Set<string>; litArrows: Set<string>; pulseNode?: string | null; onNodeClick: (id: string) => void }) {
  const [collapsed, setCollapsed] = useState(false)
  const nodes = challenge.architecture.nodes
  const arrows = challenge.architecture.arrows
  const related = activeBlock ? challenge.architecture.mappings[activeBlock] : undefined
  const nodeLit = (id: string) => litNodes.has(id) || !!related?.nodeIds.includes(id)
  const arrowLit = (id: string) => litArrows.has(id) || !!related?.arrowIds?.includes(id)
  return <section className="mb-5 rounded-lg border border-[#292d35] bg-[#111318] p-4 shadow-xl" aria-label="Signup architecture">
    <button onClick={() => setCollapsed((value) => !value)} className="mb-3 flex w-full items-center justify-between text-left"><div><h2 className="text-xs font-bold uppercase tracking-widest text-[#f0f0f0]">Architecture strip</h2><p className="mt-1 text-[10px] text-[#6e7480]">Hover blocks or click a node to trace the flow</p></div><span className="rounded border border-[#343a46] px-2 py-1 text-[9px] text-[#858c98]">{collapsed ? 'EXPAND' : 'COLLAPSE'}</span></button>
    {!collapsed && <><div className="flex flex-wrap items-center justify-center gap-2 md:flex-nowrap">
      {nodes.map((node, index) => <div key={node.id} className="contents"><motion.button onClick={() => onNodeClick(node.id)} onMouseEnter={() => onNodeClick(node.id)} onMouseLeave={() => onNodeClick('')} animate={pulseNode === node.id ? { boxShadow: ['0 0 4px rgba(215,186,125,.3)', '0 0 24px rgba(215,186,125,.95)', '0 0 4px rgba(215,186,125,.3)'] } : nodeLit(node.id) ? { boxShadow: '0 0 18px rgba(78,201,176,.55)' } : { boxShadow: '0 0 0 rgba(0,0,0,0)' }} className={cn('rounded-xl border-2 border-dashed px-3 py-3 text-center transition', nodeLit(node.id) ? 'border-[#4ec9b0] bg-[#16332e] text-[#d8fff4]' : 'border-[#656b76] bg-[#191c22] text-[#d4d4d4]')}><div className="text-[11px] font-bold">{node.label}</div><div className="mt-1 text-[9px] uppercase tracking-widest text-[#858c98]">{node.kind}</div></motion.button>{index < nodes.length - 1 && <span className={cn('px-1 text-lg text-[#656b76]', arrowLit(arrows[index]?.id) && 'text-[#4ec9b0] drop-shadow-[0_0_6px_#4ec9b0]')}>→</span>}</div>)}
    </div>
    <div className="mt-3 flex justify-center gap-4 text-[9px] text-[#858c98]"><span className={cn(arrowLit('database-logic-read') && 'text-[#4ec9b0]')}>↔ read</span><span className={cn(arrowLit('logic-database-write') && 'text-[#4ec9b0]')}>→ write</span><span className={cn(arrowLit('logic-client-response') && 'text-[#4ec9b0]')}>← response</span></div></>}
  </section>
}

function Slot({ index, block, status, hinted, onRemove, onHover }: { index: number; block?: Block; status?: string; hinted?: boolean; onRemove: () => void; onHover: (id: string | null) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${index}` })
  return <div ref={setNodeRef} className={cn('min-h-[74px] rounded-md border border-dashed transition-colors', block ? 'border-transparent' : 'border-[#3d424d] bg-[#101217]/60', isOver && 'border-[#569cd6] bg-[#569cd6]/10', status === 'correct' && 'border-[#4ec9b0]/70 bg-[#4ec9b0]/5', status === 'wrong' && 'border-[#f14c4c]/70 bg-[#f14c4c]/5 animate-shake', status === 'misplaced' && 'border-[#d7ba7d]/70 bg-[#d7ba7d]/5')}>{block ? <BlockCard block={block} placed status={status} hinted={hinted} onRemove={onRemove} onHover={onHover} /> : <div className="flex h-full min-h-[74px] items-center justify-center gap-2 text-[11px] text-[#6b7280]"><span className="rounded border border-[#3d424d] px-2 py-1">SLOT {index}</span><span>Drop block here</span></div>}</div>
}

export default function CodeFlowApp() {
  const [slots, setSlots] = useState<(string | undefined)[]>(Array(6).fill(undefined))
  const [checked, setChecked] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [hintLevel, setHintLevel] = useState<Record<number, number>>({})
  const [hintsUsed, setHintsUsed] = useState(0)
  const [hintedSlots, setHintedSlots] = useState<Set<number>>(new Set())
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const blocks = useMemo(() => new Map(challenge.blocks.map((block) => [block.id, block])), [])
  const placed = slots.filter(Boolean) as string[]
  const available = challenge.blocks.filter((block) => !placed.includes(block.id))
  const activeBlock = activeId ? blocks.get(activeId) : undefined
  const statusFor = (index: number) => { if (!checked || !slots[index]) return undefined; return slots[index] === correctOrder[index] ? 'correct' : correctOrder.includes(slots[index]!) ? 'misplaced' : 'wrong' }
  const completed = checked && slots.every((id, index) => id === correctOrder[index])
  const litNodes = new Set<string>(selectedNode ? [selectedNode] : [])
  const litArrows = new Set<string>()
  slots.forEach((id, index) => { if (id === correctOrder[index]) { const map = challenge.architecture.mappings[id!]; map.nodeIds.forEach((node) => litNodes.add(node)); map.arrowIds?.forEach((arrow) => litArrows.add(arrow)) } })
  if (completed) challenge.architecture.nodes.forEach((node) => litNodes.add(node.id))

  function onDragEnd({ active, over }: DragEndEvent) { setActiveId(null); if (!over) return; const id = String(active.id); if (over.id === 'palette') { setSlots(slots.map((slot) => slot === id ? undefined : slot)); return } const target = String(over.id).startsWith('slot-') ? Number(String(over.id).replace('slot-', '')) - 1 : -1; if (target < 0 || target > 5) return; setSlots((current) => { const next = [...current]; const old = next.indexOf(id); if (old >= 0) next[old] = next[target]; next[target] = id; return next }); setChecked(false) }
  function check() { setAttempts((value) => value + 1); setChecked(true) }
  function reset() { setSlots(Array(6).fill(undefined)); setChecked(false); setAttempts(0); setHintLevel({}); setHintsUsed(0); setHintedSlots(new Set()) }
  function hint() { const index = slots.findIndex((id, slotIndex) => id !== correctOrder[slotIndex]); const target = index < 0 ? -1 : index; if (target < 0) return; const nextLevel = (hintLevel[target] || 0) + 1; setHintLevel({ ...hintLevel, [target]: nextLevel }); setHintsUsed((value) => value + 1); if (nextLevel >= 3) { setSlots((current) => { const next = [...current]; const existing = next.indexOf(correctOrder[target]); if (existing >= 0) next[existing] = next[target]; next[target] = correctOrder[target]; return next }); setHintedSlots((current) => new Set(current).add(target)); setChecked(false) } }
  function copyCode() { navigator.clipboard?.writeText(slots.map((id) => blocks.get(id!)?.code ?? '').join('\n')) }
  const firstTarget = slots.findIndex((id, index) => id !== correctOrder[index])
  const activeHint = firstTarget >= 0 ? challenge.architecture.mappings[correctOrder[firstTarget]]?.hint : ''

  return <div className="min-h-screen bg-[#0d0f12] font-mono text-[#d4d4d4]"><header className="flex min-h-[64px] items-center justify-between border-b border-[#292d35] bg-[#111318] px-5"><div className="flex items-center gap-4"><div className="flex items-center gap-2 text-sm font-bold text-white"><div className="flex size-7 items-center justify-center rounded bg-[#007acc] text-xs">{'<>'}</div> CodeFlow</div><ChevronRight className="size-4 text-[#555b66]" /><div className="text-xs text-[#9da3ad]">{challenge.title}</div></div><div className="flex items-center gap-3"><div className="hidden text-xs text-[#858c98] sm:block"><span className="text-[#4ec9b0]">{placed.length}</span>/6 slots filled</div><div className="hidden text-xs text-[#d7ba7d] sm:block">Hints used: {hintsUsed}</div><div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#282d36]"><div className="h-full bg-[#007acc] transition-all" style={{ width: `${(placed.length / 6) * 100}%` }} /></div><Button size="sm" variant="ghost" className="text-[#9da3ad]" onClick={reset}><RotateCcw data-icon="inline-start" />Reset</Button><Button size="sm" variant="outline" disabled={completed} className="border-[#d7ba7d]/50 text-[#d7ba7d]" onClick={hint}><Lightbulb data-icon="inline-start" />Hint</Button><Button size="sm" className="bg-[#007acc] text-white hover:bg-[#168ad4]" onClick={check}><Check data-icon="inline-start" />Check</Button></div></header><DndContext sensors={sensors} onDragStart={({ active }) => setActiveId(String(active.id))} onDragEnd={onDragEnd}><div className="grid min-h-[calc(100vh-64px)] grid-cols-[300px_1fr]"><aside id="palette" className="border-r border-[#292d35] bg-[#15171d] p-4"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xs font-bold uppercase tracking-widest text-[#f0f0f0]">Blocks</h2><p className="mt-1 text-[10px] text-[#6e7480]">Drag in the right order</p></div><Terminal className="size-4 text-[#569cd6]" /></div><div className="flex flex-col gap-2.5">{available.map((block) => <BlockCard key={block.id} block={block} status={checked && block.whyWrong ? 'wrong' : undefined} onHover={setSelectedNode} />)}</div><div className="mt-6 rounded-md border border-[#292d35] bg-[#111318] p-3 text-[10px] leading-relaxed text-[#717884]"><span className="text-[#569cd6]">Tip:</span> Hover a block to trace its architecture node. Double-click a placed block to remove it.</div></aside><main className="relative overflow-auto bg-[#0d0f12] p-5 lg:p-8"><div className="mx-auto max-w-[980px]"><ArchitectureStrip activeBlock={selectedNode && blocks.has(selectedNode) ? selectedNode : null} litNodes={litNodes} litArrows={litArrows} onNodeClick={(id) => setSelectedNode(id || null)} />{activeHint && hintLevel[firstTarget] === 1 && <div className="mb-4 rounded-md border border-[#d7ba7d]/30 bg-[#211e16] px-4 py-3 text-[11px] text-[#d7ba7d]"><Lightbulb className="mr-2 inline size-3" />{activeHint}</div>}<div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2 text-xs text-[#858c98]"><span className="rounded-t border border-b-0 border-[#292d35] bg-[#17191f] px-4 py-2 text-[#d4d4d4]">{challenge.fileName}</span><span className="text-[#555b66]">●</span></div><Button variant="ghost" size="sm" onClick={copyCode} className="text-[10px] text-[#858c98]">Copy code</Button></div><div className="overflow-hidden rounded-lg border border-[#292d35] bg-[#111318] shadow-2xl"><div className="flex items-center gap-2 border-b border-[#292d35] px-4 py-2"><span className="size-2 rounded-full bg-[#f14c4c]" /><span className="size-2 rounded-full bg-[#d7ba7d]" /><span className="size-2 rounded-full bg-[#4ec9b0]" /><span className="ml-3 text-[10px] text-[#555b66]">signupController.js</span></div><div className="p-4"><div className="grid grid-cols-[40px_1fr] text-[12px] leading-6">{challenge.scaffold.map((line, index) => line.type === 'line' ? <div key={index} className="contents"><span className="select-none pr-4 text-right text-[#4f5560]">{index + 1}</span><div className={cn('whitespace-pre text-[#9da3ad]', line.text === '' && 'h-6')}>{line.text && <><LockKeyhole className="mr-2 inline size-3 text-[#555b66]" />{codeAccent(line.text)}</>}</div></div> : <div key={index} className="contents"><span className="select-none pr-4 text-right text-[#4f5560]">{index + 1}</span><div className="py-1"><Slot index={line.slot!} block={slots[line.slot! - 1] ? blocks.get(slots[line.slot! - 1]!) : undefined} status={statusFor(line.slot! - 1)} hinted={hintedSlots.has(line.slot! - 1)} onRemove={() => setSlots(slots.map((slot) => slot === slots[line.slot! - 1] ? undefined : slot))} onHover={setSelectedNode} /></div></div>)}</div></div></div><AnimatePresence>{completed && <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-lg border border-[#4ec9b0]/40 bg-[#112522] p-5 text-sm text-[#c8fff3]"><div className="font-bold">Flow complete.</div><p className="mt-1 text-xs text-[#91cfc0]">Every block is in the right place and the architecture is lit.</p></motion.div>}</AnimatePresence></div></main></div><DragOverlay>{activeBlock ? <div className="w-[260px] rotate-2 rounded-lg border border-[#569cd6] bg-[#1e2430] p-3 shadow-2xl"><div className="text-xs font-semibold text-white">{activeBlock.label}</div><pre className="mt-2 whitespace-pre-wrap text-[10px] text-[#9cdcfe]">{activeBlock.code}</pre></div> : null}</DragOverlay></DndContext></div>
}
