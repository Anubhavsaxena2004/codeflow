'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, LockKeyhole, Skull, Star } from 'lucide-react'
import { Stars, worldThemes, type WorldPalette } from '@/components/journey/level-meta'
import { kindLabels, type LevelProgress } from '@/lib/journeys/types'
import type { LevelSummary, ProjectSummary } from '@/lib/server/journeys'
import { cn } from '@/lib/utils'
import { IslandArt, ISLAND_H, ISLAND_W } from './island-art'
import { Mascot } from './mascot'
import { LevelPin } from './level-pin'
import { GameTooltip } from '@/components/ui/game'

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
  const ariaLabel = `Level ${number}: ${level.title}${boss ? ' (boss)' : ''}, ${state === 'done' ? 'passed' : state === 'current' ? 'next up' : state === 'open' ? 'open' : 'locked'}`
  const tooltipContent = `${level.title} · ${kindLabels[level.kind] || level.kind}${boss ? ' (Boss)' : ''}`

  return (
    <div className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: pct(point.x, ISLAND_W), top: pct(point.y, ISLAND_H) }}>
      {state === 'current' && (
        <div className="pointer-events-none absolute bottom-full left-1/2 mb-3 flex -translate-x-1/2 flex-col items-center">
          <div className="flex animate-[bounce_3s_ease-in-out_infinite] motion-reduce:animate-none flex-col items-center">
            <div className="mb-0.5 grid size-6 place-items-center overflow-hidden rounded-full bg-[#dcfce7] shadow-sm">
              <Mascot className="size-5" />
            </div>
            <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-white px-2.5 py-0.5 text-[10px] font-display font-extrabold text-[#0f172a] shadow-md ring-1 ring-black/10 dark:bg-[#0f172a] dark:text-white dark:ring-white/20">
              You are here
            </span>
            <span className="-mt-0.5 size-0 border-x-4 border-x-transparent border-t-4 border-t-white dark:border-t-[#0f172a]" />
          </div>
        </div>
      )}
      <GameTooltip content={tooltipContent} side="top">
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={ariaLabel}
          className={cn(
            'group relative min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center transition-transform duration-[var(--dur-fast,160ms)] ease-[var(--ease-pop)]',
            'hover:scale-110 focus-visible:scale-110',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--focus-ring)]',
          )}
        >
          <LevelPin
            number={number}
            kind={level.kind}
            state={state}
            isBoss={boss}
            stars={row?.stars ?? 0}
            selected={selected}
            accentColor={palette.color}
            deepColor={palette.deep}
          />
        </button>
      </GameTooltip>
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
  const stars = useMemo(
    () =>
      scatter(40, width, height, 7).map((star, index) => ({
        ...star,
        period: 2 + (index % 4) * 0.9,
        delay: (index * 0.35) % 2.5,
      })),
    [width, height],
  )

  return (
    <div ref={wrapper} className="relative overflow-hidden rounded-3xl border border-(--cf-border) shadow-(--cf-shadow)">
      <div className="relative w-full" style={{ aspectRatio: `${width} / ${height}` }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 size-full" aria-hidden>
          <defs>
            <linearGradient id={`${uid}-sea`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#bfe9ff" />
              <stop offset="1" stopColor="#7dd3fc" />
            </linearGradient>
            <linearGradient id={`${uid}-night`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b1026" />
              <stop offset="1" stopColor="#172554" />
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
            <rect width={width + 80} height={height} fill={`url(#${uid}-waves)`} className="dark:hidden" opacity="0.10" />
            <rect width={width + 80} height={height} fill={`url(#${uid}-ripples)`} className="hidden dark:inline" opacity="0.08" />
          </g>
          <g className="hidden dark:inline">
            {stars.map((star, index) => (
              <circle
                key={index}
                cx={star.x}
                cy={star.y}
                r={star.r}
                fill="#e0f2fe"
                className="animate-pulse motion-reduce:animate-none"
                style={{
                  animationDuration: `${star.period}s`,
                  animationDelay: `${star.delay}s`,
                  opacity: star.o,
                }}
              />
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
          const doneCount = levels.filter(({ level }) => done[level.id]).length
          const totalCount = levels.length

          return (
            <div
              key={world.id}
              id={`island-${world.id}`}
              className="animate-island absolute scroll-mt-24"
              style={{ left: pct(cell.x, width), top: pct(cell.y, height), width: pct(ISLAND_W, width), height: pct(ISLAND_H, height), animationDelay: `${-worldIndex * 1.4}s` }}
            >
              <svg viewBox={`0 0 ${ISLAND_W} ${ISLAND_H}`} className={cn('absolute inset-0 size-full overflow-visible', !reached && 'opacity-90')} aria-hidden>
                <IslandArt theme={world.theme} palette={palette} uid={`${uid}-${worldIndex}`} locked={!reached} />
                {points.slice(1).map((point, index) => {
                  const from = points[index]
                  const walked = !!done[levels[index].level.id] && !!done[levels[index + 1].level.id]
                  const d = `M${from.x} ${from.y} Q${(from.x + point.x) / 2} ${(from.y + point.y) / 2 - 12} ${point.x} ${point.y}`
                  return (
                    <g key={index}>
                      {walked ? (
                        <>
                          <path
                            d={d}
                            fill="none"
                            stroke={palette.deep}
                            strokeWidth="4"
                            strokeLinecap="round"
                            className="animate-path-draw"
                          />
                          <path
                            d={d}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeOpacity="0.85"
                            className="animate-path-draw"
                          />
                        </>
                      ) : (
                        <path
                          d={d}
                          fill="none"
                          stroke="#94a3b8"
                          strokeOpacity="0.65"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray="2 10"
                        />
                      )}
                    </g>
                  )
                })}
              </svg>

              <div
                className="absolute left-[4%] top-0 z-20 flex max-w-[70%] items-center gap-2 px-3 py-1.5 text-white shadow-lg"
                style={{
                  backgroundColor: palette.deep,
                  clipPath: 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%, 8px 50%)',
                }}
              >
                <span className="grid size-6 shrink-0 place-items-center rounded bg-white/20">
                  <WorldIcon className="size-3.5" />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block text-[9px] font-display font-extrabold uppercase tracking-wider text-white/80">World {worldIndex + 1}</span>
                  <span className="block truncate font-display text-[12px] font-extrabold text-white drop-shadow-sm">{world.title}</span>
                </span>
                {complete ? (
                  <Check aria-label="World complete" className="size-3.5 shrink-0" />
                ) : !reached ? (
                  <LockKeyhole aria-label="Locked" className="size-3 shrink-0 opacity-90" />
                ) : (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-white/90">
                    <Star aria-hidden="true" className="size-2.5 fill-[#f5b301] text-[#f5b301]" />
                    <span>{doneCount}/{totalCount}</span>
                  </span>
                )}
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
