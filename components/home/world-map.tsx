'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, LockKeyhole, Skull } from 'lucide-react'
import { Stars, worldThemes, type WorldPalette } from '@/components/journey/level-meta'
import type { LevelProgress } from '@/lib/journeys/types'
import type { LevelSummary, ProjectSummary } from '@/lib/server/journeys'
import { cn } from '@/lib/utils'
import { IslandArt, ISLAND_H, ISLAND_W } from './island-art'
import { Mascot } from './mascot'

// The journey as a sea of islands: one island per world, joined by bridges in the order you play
// them, with each level on the island's path. Islands are laid out in rows that snake back and
// forth (3, 2 or 1 per row depending on the width), so a bridge always joins neighbours.

export type LevelState = 'done' | 'current' | 'open' | 'locked'

/** Sea around the islands, in map units. */
const PAD = 24

const columnsFor = (width: number) => (width >= 860 ? 3 : width >= 520 ? 2 : 1)
const pct = (value: number, total: number) => `${(value / total) * 100}%`

/** Where each level sits on its island: a zigzag row for up to five levels, snaking rows beyond. */
export function levelPoints(count: number) {
  const rows = Math.max(1, Math.ceil(count / 5))
  const perRow = Math.ceil(count / rows)
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / perRow)
    const step = index - row * perRow
    const inRow = Math.min(perRow, count - row * perRow)
    const spread = Math.min(232, (inRow - 1) * 64)
    const t = inRow === 1 ? 0.5 : row % 2 ? 1 - step / (inRow - 1) : step / (inRow - 1)
    const y = rows === 1 ? 156 : 128 + (82 * row) / (rows - 1)
    return { x: 206 - spread / 2 + spread * t, y: y + (step % 2 ? 22 : -16) * (rows === 1 ? 1 : 0.5) }
  })
}

interface Cell {
  x: number
  y: number
  row: number
}

export function mapLayout(count: number, columns: number) {
  const cols = Math.max(1, Math.min(columns, count))
  const rows = Math.max(1, Math.ceil(count / cols))
  const cells: Cell[] = Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / cols)
    const step = index % cols
    const col = row % 2 ? cols - 1 - step : step
    return { x: PAD + col * ISLAND_W, y: PAD + row * ISLAND_H, row }
  })
  return { cells, width: cols * ISLAND_W + PAD * 2, height: rows * ISLAND_H + PAD * 2 }
}

/** Bridge ends between two islands played one after the other. */
function bridgeEnds(a: Cell, b: Cell) {
  if (a.row === b.row) {
    const [left, right] = a.x < b.x ? [a, b] : [b, a]
    return [{ x: left.x + 350, y: left.y + 172 }, { x: right.x + 54, y: right.y + 172 }]
  }
  return [{ x: a.x + 205, y: a.y + 272 }, { x: b.x + 205, y: b.y + 90 }]
}

function Bridge({ from, to, faded }: { from: { x: number; y: number }; to: { x: number; y: number }; faded: boolean }) {
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI
  return (
    <g transform={`translate(${from.x} ${from.y}) rotate(${angle})`} opacity={faded ? 0.55 : 1}>
      <rect x="0" y="-4" width={length} height="18" fill="#04223a" opacity="0.15" />
      {Array.from({ length: Math.floor(length / 9) }, (_, index) => (
        <rect key={index} x={index * 9 + 1} y="-8" width="6.5" height="16" rx="1.2" fill={index % 2 ? '#c98243' : '#b56d30'} />
      ))}
      <line x1="0" y1="-9" x2={length} y2="-9" stroke="#6b3a17" strokeWidth="2.2" />
      <line x1="0" y1="9" x2={length} y2="9" stroke="#6b3a17" strokeWidth="2.2" />
    </g>
  )
}

/** Deterministic pseudo-random points, so the stars don't jump between renders. */
function scatter(count: number, width: number, height: number, seed: number) {
  let state = seed
  const next = () => {
    state = (state * 16807) % 2147483647
    return state / 2147483647
  }
  return Array.from({ length: count }, () => ({ x: next() * width, y: next() * height, r: 0.6 + next() * 1.6, o: 0.25 + next() * 0.6 }))
}

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#ffffff" opacity="0.6">
      <ellipse cx="0" cy="0" rx="34" ry="12" />
      <ellipse cx="-14" cy="-8" rx="16" ry="12" />
      <ellipse cx="10" cy="-11" rx="18" ry="14" />
    </g>
  )
}

function Boat({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-16 0 L16 0 L11 7 L-11 7 Z" fill="#92400e" />
      <path d="M0 0 L0 -26" stroke="#78350f" strokeWidth="1.8" />
      <path d="M1 -25 L15 -4 L1 -4 Z" fill="#ffffff" />
      <path d="M-1 -20 L-11 -4 L-1 -4 Z" fill="#fca5a5" />
      <path d="M-24 10 Q-12 6 0 10 T24 10" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.5" />
    </g>
  )
}

function LevelNode({ level, number, state, row, selected, palette, point, onSelect }: {
  level: LevelSummary
  number: number
  state: LevelState
  row?: LevelProgress
  selected: boolean
  palette: WorldPalette
  point: { x: number; y: number }
  onSelect: () => void
}) {
  const boss = !!level.boss
  const locked = state === 'locked'
  const fill = locked ? undefined : boss ? 'linear-gradient(145deg, #f87171, #b91c1c)' : state === 'done' ? `linear-gradient(145deg, ${palette.color}, ${palette.deep})` : '#ffffff'
  return (
    <div className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: pct(point.x, ISLAND_W), top: pct(point.y, ISLAND_H) }}>
      {state === 'current' && (
        <span className="pointer-events-none absolute bottom-full left-1/2 mb-2.5 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-white py-0.5 pl-0.5 pr-2 text-[10px] font-bold text-[#1b2140] shadow-md">
          <span className="grid size-5 place-items-center overflow-hidden rounded-full bg-[#dcfce7]">
            <Mascot className="size-5" />
          </span>
          You are here
          <span aria-hidden className="absolute left-1/2 top-full -translate-x-1/2 border-x-[5px] border-t-[5px] border-x-transparent border-t-white" />
        </span>
      )}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        title={level.title}
        aria-label={`Level ${number}: ${level.title}${boss ? ' (boss)' : ''}, ${state === 'done' ? 'passed' : state === 'current' ? 'next up' : state === 'open' ? 'open' : 'locked'}`}
        className={cn(
          'relative grid place-items-center rounded-full border-[3px] font-extrabold shadow-[0_4px_10px_rgb(0_0_0/0.25)] transition hover:-translate-y-0.5 hover:scale-105 focus-visible:outline-none',
          boss ? 'size-12 text-base' : 'size-10 text-sm',
          locked ? 'border-white/70 bg-slate-300 text-slate-500 dark:border-slate-400/40 dark:bg-slate-600 dark:text-slate-300' : boss || state === 'done' ? 'border-white text-white' : '',
          selected ? 'outline-[3px] outline-offset-[3px] outline-(--cf-text) outline-solid' : 'focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-(--cf-text) focus-visible:outline-solid',
        )}
        style={{ background: fill, ...(!locked && !boss && state !== 'done' ? { borderColor: palette.color, color: palette.deep } : {}) }}
      >
        {state === 'current' && (
          <span aria-hidden className="absolute -inset-2 animate-ping rounded-full border-2 motion-reduce:animate-none" style={{ borderColor: boss ? '#ef4444' : palette.color }} />
        )}
        {boss ? <Skull className="size-6" /> : locked ? <LockKeyhole className="size-4" /> : number}
      </button>
      {(boss || row) && (
        <span className="pointer-events-none absolute left-1/2 top-full mt-1 flex -translate-x-1/2 flex-col items-center gap-0.5">
          {boss && <span className="rounded bg-[#dc2626] px-1.5 text-[9px] font-extrabold leading-4 tracking-wider text-white shadow">BOSS</span>}
          {row && (
            <span className="rounded-full bg-white/90 px-1 leading-none shadow-sm dark:bg-[#0a1022]/75">
              <Stars count={row.stars} />
            </span>
          )}
        </span>
      )}
    </div>
  )
}

interface WorldMapProps {
  journey: ProjectSummary
  done: Record<string, LevelProgress>
  stateOf: (index: number) => LevelState
  selectedId: string | null
  onSelect: (levelId: string) => void
}

export function WorldMap({ journey, done, stateOf, selectedId, onSelect }: WorldMapProps) {
  const uid = useId().replace(/:/g, '')
  const wrapper = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(3)

  useEffect(() => {
    const element = wrapper.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setColumns(columnsFor(entry.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const { cells, width, height } = mapLayout(journey.worlds.length, columns)
  const worlds = journey.worlds.map((world, worldIndex) => {
    const levels = journey.levels.map((level, index) => ({ level, index })).filter(({ level }) => level.world === world.id)
    return {
      world,
      worldIndex,
      levels,
      palette: worldThemes[world.theme],
      reached: levels.some(({ index }) => stateOf(index) !== 'locked'),
      complete: levels.length > 0 && levels.every(({ level }) => done[level.id]),
    }
  })
  const stars = scatter(70, width, height, 7)

  return (
    <div ref={wrapper} className="relative overflow-hidden rounded-3xl border border-(--cf-border) shadow-(--cf-shadow)">
      <div className="relative w-full" style={{ aspectRatio: `${width} / ${height}` }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 size-full" aria-hidden>
          <defs>
            <linearGradient id={`${uid}-sea`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#8be4ff" />
              <stop offset="0.55" stopColor="#3cc0f2" />
              <stop offset="1" stopColor="#1d9bdc" />
            </linearGradient>
            <linearGradient id={`${uid}-night`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0a1430" />
              <stop offset="0.6" stopColor="#0b2446" />
              <stop offset="1" stopColor="#0d3356" />
            </linearGradient>
            <radialGradient id={`${uid}-shallow`}>
              <stop offset="0.55" stopColor="#c9f4ff" stopOpacity="0.75" />
              <stop offset="1" stopColor="#c9f4ff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`${uid}-glow`}>
              <stop offset="0.3" stopColor="#38bdf8" stopOpacity="0.32" />
              <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
            </radialGradient>
            <pattern id={`${uid}-waves`} width="80" height="44" patternUnits="userSpaceOnUse">
              <path d="M6 14 q8 -6 16 0 t16 0" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
              <path d="M46 36 q6 -5 12 0 t12 0" fill="none" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />
            </pattern>
            <pattern id={`${uid}-ripples`} width="80" height="44" patternUnits="userSpaceOnUse">
              <path d="M6 14 q8 -6 16 0 t16 0" fill="none" stroke="#7dd3fc" strokeOpacity="0.16" strokeWidth="2" strokeLinecap="round" />
              <path d="M46 36 q6 -5 12 0 t12 0" fill="none" stroke="#7dd3fc" strokeOpacity="0.1" strokeWidth="2" strokeLinecap="round" />
            </pattern>
          </defs>

          <rect width={width} height={height} fill={`url(#${uid}-sea)`} className="dark:hidden" />
          <rect width={width} height={height} fill={`url(#${uid}-night)`} className="hidden dark:inline" />
          <g className="animate-waves">
            <rect width={width + 80} height={height} fill={`url(#${uid}-waves)`} className="dark:hidden" />
            <rect width={width + 80} height={height} fill={`url(#${uid}-ripples)`} className="hidden dark:inline" />
          </g>
          <g className="hidden dark:inline">
            {stars.map((star, index) => (
              <circle key={index} cx={star.x} cy={star.y} r={star.r} fill="#e0f2fe" opacity={star.o} />
            ))}
          </g>

          {cells.map((cell, index) => (
            <g key={index}>
              <ellipse cx={cell.x + 205} cy={cell.y + 190} rx="200" ry="135" fill={`url(#${uid}-shallow)`} className="dark:hidden" />
              <ellipse cx={cell.x + 205} cy={cell.y + 190} rx="210" ry="145" fill={`url(#${uid}-glow)`} className="hidden dark:inline" />
            </g>
          ))}

          <g className="dark:hidden">
            <Cloud x={width * 0.16} y={PAD + 8} s={0.9} />
            <Cloud x={width * 0.7} y={height - 18} s={1.1} />
            {cells.length > 1 && <Boat x={width - 46} y={height - 30} />}
          </g>

          {cells.slice(1).map((cell, index) => {
            const [from, to] = bridgeEnds(cells[index], cell)
            return <Bridge key={index} from={from} to={to} faded={!worlds[index + 1].reached} />
          })}
        </svg>

        {worlds.map(({ world, worldIndex, levels, palette, reached, complete }) => {
          const cell = cells[worldIndex]
          const points = levelPoints(levels.length)
          const WorldIcon = palette.icon
          return (
            <div
              key={world.id}
              id={`island-${world.id}`}
              className="animate-island absolute scroll-mt-24"
              style={{ left: pct(cell.x, width), top: pct(cell.y, height), width: pct(ISLAND_W, width), height: pct(ISLAND_H, height), animationDelay: `${-worldIndex * 1.4}s` }}
            >
              <svg viewBox={`0 0 ${ISLAND_W} ${ISLAND_H}`} className={cn('absolute inset-0 size-full overflow-visible', !reached && 'opacity-90 saturate-[0.55]')} aria-hidden>
                <IslandArt theme={world.theme} palette={palette} uid={`${uid}-${worldIndex}`} />
                {points.slice(1).map((point, index) => {
                  const from = points[index]
                  const walked = !!done[levels[index].level.id] && !!done[levels[index + 1].level.id]
                  const d = `M${from.x} ${from.y} Q${(from.x + point.x) / 2} ${(from.y + point.y) / 2 - 12} ${point.x} ${point.y}`
                  return (
                    <g key={index}>
                      <path d={d} fill="none" stroke="#000000" strokeOpacity="0.12" strokeWidth="8" strokeLinecap="round" />
                      <path d={d} fill="none" stroke={walked ? '#fde047' : '#ffffff'} strokeOpacity="0.95" strokeWidth="4" strokeLinecap="round" strokeDasharray={walked ? undefined : '1 9'} />
                    </g>
                  )
                })}
              </svg>

              <div
                className="absolute left-[4%] top-0 z-20 flex max-w-[64%] items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2.5 text-white shadow-lg ring-1 ring-white/35"
                style={{ background: `linear-gradient(135deg, ${palette.color}, ${palette.deep})` }}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/20">
                  <WorldIcon className="size-4" />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider opacity-85">World {worldIndex + 1}</span>
                  <span className="block truncate text-[13px] font-bold">{world.title}</span>
                </span>
                {complete ? <Check aria-label="World complete" className="size-4 shrink-0" /> : !reached ? <LockKeyhole aria-label="Locked" className="size-3.5 shrink-0 opacity-90" /> : null}
              </div>

              {levels.map(({ level, index }, position) => (
                <LevelNode
                  key={level.id}
                  level={level}
                  number={index + 1}
                  state={stateOf(index)}
                  row={done[level.id]}
                  selected={selectedId === level.id}
                  palette={palette}
                  point={points[position]}
                  onSelect={() => onSelect(level.id)}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
