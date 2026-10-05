import type { ReactNode } from 'react'
import type { WorldPalette } from '@/components/journey/level-meta'
import type { WorldTheme } from '@/lib/journeys/types'

// The islands of the journey map, drawn in a 400 × 330 box. The world's banner sits in the top
// strip, the grass spans roughly x 40–370 and y 55–250, and the cliff hangs below it. The map puts
// the levels in the middle band (y 115–215), so decorations stay at the back and on the sides.

export const ISLAND_W = 400
export const ISLAND_H = 330

const TOP = 'M 42 152 C 36 112 78 74 132 64 C 168 56 186 66 210 60 C 262 50 334 72 360 116 C 378 148 366 196 330 220 C 296 242 250 248 204 246 C 150 246 96 238 64 212 C 46 198 44 172 42 152 Z'
const CLIFF =
  'M 42 150 C 44 172 46 198 64 212 C 96 238 150 246 204 246 C 250 248 296 242 330 220 C 366 196 372 170 368 150 L 362 196 C 352 236 318 262 282 274 L 268 296 L 252 279 C 230 285 206 287 186 285 L 170 306 L 156 283 C 120 279 86 263 66 241 C 52 225 44 200 42 150 Z'

type Leaf = [string, string]

const at = (x: number, y: number, scale = 1) => `translate(${x} ${y}) scale(${scale})`

function Tree({ x, y, s = 1, leaf }: { x: number; y: number; s?: number; leaf: Leaf }) {
  return (
    <g transform={at(x, y, s)}>
      <rect x="-2.5" y="-4" width="5" height="13" rx="2" fill="#7c4a1e" />
      <circle cx="0" cy="-14" r="11" fill={leaf[1]} />
      <circle cx="-7" cy="-8" r="8" fill={leaf[1]} />
      <circle cx="7" cy="-9" r="8" fill={leaf[1]} />
      <circle cx="-3" cy="-17" r="7" fill={leaf[0]} />
      <circle cx="4" cy="-11" r="4" fill={leaf[0]} opacity="0.8" />
    </g>
  )
}

function Pine({ x, y, s = 1, leaf }: { x: number; y: number; s?: number; leaf: Leaf }) {
  return (
    <g transform={at(x, y, s)}>
      <rect x="-2.5" y="-3" width="5" height="10" fill="#6b3f1d" />
      <path d="M0 -24 L17 0 L-17 0 Z" fill={leaf[1]} />
      <path d="M0 -34 L14 -12 L-14 -12 Z" fill={leaf[1]} />
      <path d="M0 -42 L10 -24 L-10 -24 Z" fill={leaf[0]} />
    </g>
  )
}

function House({ x, y, s = 1, roof = '#ef4444' }: { x: number; y: number; s?: number; roof?: string }) {
  return (
    <g transform={at(x, y, s)}>
      <rect x="8" y="-38" width="6" height="12" fill="#9a3412" />
      <rect x="-17" y="-20" width="34" height="22" rx="2" fill="#fff7d6" />
      <path d="M-22 -18 L0 -38 L22 -18 Z" fill={roof} />
      <path d="M0 -38 L22 -18 L0 -18 Z" fill="#000000" opacity="0.1" />
      <rect x="-4" y="-10" width="8" height="12" rx="1.5" fill="#92400e" />
      <rect x="-14" y="-14" width="7" height="6" rx="1" fill="#38bdf8" />
      <rect x="7" y="-14" width="7" height="6" rx="1" fill="#38bdf8" />
    </g>
  )
}

function Castle({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const wall = '#f5f3ff'
  const flag = (fx: number, fy: number) => (
    <g>
      <path d={`M${fx} ${fy} L${fx} ${fy - 12}`} stroke="#4c1d95" strokeWidth="1.5" />
      <path d={`M${fx} ${fy - 12} L${fx + 10} ${fy - 8} L${fx} ${fy - 4} Z`} fill="#ef4444" />
    </g>
  )
  return (
    <g transform={at(x, y, s)}>
      <rect x="-36" y="-46" width="16" height="48" fill="#ddd6fe" />
      <rect x="20" y="-46" width="16" height="48" fill="#ddd6fe" />
      <path d="M-39 -46 L-28 -66 L-17 -46 Z" fill="#7c3aed" />
      <path d="M17 -46 L28 -66 L39 -46 Z" fill="#7c3aed" />
      {flag(-28, -66)}
      {flag(28, -66)}
      <rect x="-22" y="-36" width="44" height="38" fill={wall} />
      {[0, 1, 2, 3, 4].map((index) => (
        <rect key={index} x={-22 + index * 9.5} y="-41" width="5" height="6" fill={wall} />
      ))}
      <rect x="-8" y="-60" width="16" height="24" fill="#ede9fe" />
      <path d="M-11 -60 L0 -84 L11 -60 Z" fill="#a855f7" />
      {flag(0, -84)}
      <path d="M-7 2 L-7 -10 A7 7 0 0 1 7 -10 L7 2 Z" fill="#4c1d95" />
      <rect x="-31" y="-34" width="5" height="7" rx="1" fill="#c4b5fd" />
      <rect x="26" y="-34" width="5" height="7" rx="1" fill="#c4b5fd" />
      <rect x="-3" y="-54" width="6" height="7" rx="1" fill="#c4b5fd" />
    </g>
  )
}

function Database({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={at(x, y, s)}>
      <path d="M-22 -40 L-22 0 A22 7 0 0 0 22 0 L22 -40 Z" fill="#6b5a8e" />
      <path d="M-22 -27 A22 7 0 0 0 22 -27" fill="none" stroke="#f97316" strokeWidth="2.5" />
      <path d="M-22 -13 A22 7 0 0 0 22 -13" fill="none" stroke="#f97316" strokeWidth="2.5" />
      <ellipse cx="0" cy="-40" rx="22" ry="7" fill="#9a89c2" />
      <ellipse cx="0" cy="-40" rx="13" ry="3.5" fill="#fdba74" opacity="0.65" />
    </g>
  )
}

function Crystal({ x, y, s = 1, color }: { x: number; y: number; s?: number; color: string }) {
  return (
    <g transform={at(x, y, s)}>
      <path d="M0 -26 L8 -10 L4 4 L-4 4 L-8 -10 Z" fill={color} />
      <path d="M0 -26 L8 -10 L0 -8 Z" fill="#ffffff" opacity="0.4" />
      <path d="M-10 4 L-14 -6 L-8 -12 L-5 4 Z" fill={color} opacity="0.75" />
    </g>
  )
}

function Torch({ x, y }: { x: number; y: number }) {
  return (
    <g transform={at(x, y)}>
      <rect x="-1.5" y="-14" width="3" height="16" fill="#78350f" />
      <path d="M0 -27 C5 -21 4 -16 0 -14 C-4 -16 -5 -21 0 -27 Z" fill="#fb923c" />
      <path d="M0 -22 C2 -19 2 -16 0 -15 C-2 -16 -2 -19 0 -22 Z" fill="#fde047" />
    </g>
  )
}

function Lab({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={at(x, y, s)}>
      <rect x="-1.5" y="-50" width="3" height="14" fill="#0e7490" />
      <circle cx="0" cy="-52" r="3" fill="#f43f5e" />
      <path d="M-22 -16 A22 22 0 0 1 22 -16 Z" fill="#7dd3fc" opacity="0.92" />
      <path d="M-14 -24 A15 15 0 0 1 3 -34" fill="none" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="-28" y="-17" width="56" height="19" rx="3" fill="#e0f2fe" />
      <rect x="-5" y="-11" width="10" height="13" rx="1.5" fill="#0e7490" />
      <rect x="-22" y="-12" width="10" height="6" rx="1" fill="#22d3ee" />
      <rect x="12" y="-12" width="10" height="6" rx="1" fill="#22d3ee" />
    </g>
  )
}

function Flask({ x, y, s = 1, color }: { x: number; y: number; s?: number; color: string }) {
  return (
    <g transform={at(x, y, s)}>
      <path d="M-4 -24 L4 -24 L4 -14 L12 2 C13 5 11 7 8 7 L-8 7 C-11 7 -13 5 -12 2 L-4 -14 Z" fill="#f0f9ff" />
      <path d="M-9 -3 L9 -3 L12 2 C12 5 11 6 8 6 L-8 6 C-11 6 -12 5 -12 2 Z" fill={color} />
      <circle cx="-2" cy="-9" r="1.6" fill={color} />
      <circle cx="3" cy="-14" r="1.2" fill={color} />
      <circle cx="6" cy="-30" r="2.5" fill={color} opacity="0.6" />
      <circle cx="-3" cy="-36" r="1.8" fill={color} opacity="0.45" />
    </g>
  )
}

/** A building with a grid of windows, some lit. */
function Tower({ x, base, w, h, color }: { x: number; base: number; w: number; h: number; color: string }) {
  const windows: ReactNode[] = []
  for (let row = 0; row * 9 + 8 < h - 4; row++) {
    for (let col = 0; col * 7 + 6 < w - 2; col++) {
      const lit = (row * 3 + col * 5 + Math.round(x)) % 4 !== 0
      windows.push(<rect key={`${row}-${col}`} x={x + 3 + col * 7} y={base - h + 5 + row * 9} width="4" height="5" rx="0.8" fill={lit ? '#fde68a' : '#1e1b4b'} opacity={lit ? 0.95 : 0.35} />)
    }
  }
  return (
    <g>
      <rect x={x} y={base - h} width={w} height={h} rx="2" fill={color} />
      <rect x={x} y={base - h} width={w / 2.6} height={h} rx="2" fill="#ffffff" opacity="0.12" />
      {windows}
    </g>
  )
}

function Flowers({ points }: { points: [number, number, string][] }) {
  return (
    <g>
      {points.map(([x, y, color]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="2.6" fill={color} />
          <circle cx={x} cy={y} r="1" fill="#fef9c3" />
        </g>
      ))}
    </g>
  )
}

function decorations(theme: WorldTheme, leaf: Leaf): ReactNode {
  switch (theme) {
    case 'village':
      return (
        <>
          <Tree x={112} y={96} s={0.85} leaf={leaf} />
          <Tree x={150} y={84} s={0.7} leaf={leaf} />
          <House x={278} y={100} s={1.15} />
          <Tree x={62} y={158} leaf={leaf} />
          <Tree x={80} y={202} s={0.85} leaf={leaf} />
          <Tree x={354} y={158} leaf={leaf} />
          <Tree x={334} y={204} s={0.8} leaf={leaf} />
          <Flowers points={[[200, 92, '#f472b6'], [214, 98, '#facc15'], [96, 222, '#f472b6'], [300, 230, '#facc15'], [238, 84, '#ffffff']]} />
        </>
      )
    case 'forest':
      return (
        <>
          <path d="M116 238 L132 240 L136 304 L114 304 Z" fill="#7dd3fc" opacity="0.92" />
          <path d="M120 250 L121 300 M127 246 L129 302" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.5" />
          <ellipse cx="125" cy="306" rx="16" ry="4" fill="#e0f2fe" opacity="0.9" />
          <Pine x={102} y={104} s={0.95} leaf={leaf} />
          <Pine x={134} y={88} s={0.8} leaf={leaf} />
          <Pine x={268} y={84} s={0.85} leaf={leaf} />
          <Pine x={302} y={92} s={1} leaf={leaf} />
          <Pine x={338} y={112} s={0.9} leaf={leaf} />
          <Pine x={62} y={166} leaf={leaf} />
          <Pine x={78} y={206} s={0.85} leaf={leaf} />
          <Pine x={356} y={166} leaf={leaf} />
          <Pine x={338} y={208} s={0.85} leaf={leaf} />
        </>
      )
    case 'dungeon':
      return (
        <>
          <path d="M112 96 L118 84 L130 82 L138 94 Z M146 86 L151 77 L160 78 L164 88 Z" fill="#4c3a73" />
          <Torch x={226} y={94} />
          <Database x={272} y={102} />
          <Torch x={318} y={100} />
          <Crystal x={66} y={170} color="#c084fc" />
          <Crystal x={88} y={208} s={0.8} color="#22d3ee" />
          <Crystal x={352} y={170} color="#f0abfc" />
          <Crystal x={336} y={210} s={0.8} color="#fb923c" />
        </>
      )
    case 'castle':
      return (
        <>
          <Castle x={258} y={104} s={1.05} />
          <Tree x={112} y={98} s={0.8} leaf={leaf} />
          <Tree x={64} y={166} s={0.9} leaf={leaf} />
          <Tree x={82} y={206} s={0.8} leaf={leaf} />
          <Tree x={354} y={168} s={0.9} leaf={leaf} />
          <Tree x={336} y={208} s={0.75} leaf={leaf} />
        </>
      )
    case 'lab':
      return (
        <>
          <Lab x={266} y={100} s={1.05} />
          <Tree x={110} y={98} s={0.8} leaf={leaf} />
          <Tree x={146} y={86} s={0.65} leaf={leaf} />
          <Flask x={66} y={182} color="#a3e635" />
          <Flask x={354} y={182} color="#f472b6" />
          <Tree x={84} y={214} s={0.7} leaf={leaf} />
          <Tree x={334} y={214} s={0.7} leaf={leaf} />
        </>
      )
    case 'city':
      return (
        <>
          <Tower x={198} base={106} w={22} h={44} color="#6366f1" />
          <Tower x={224} base={106} w={26} h={64} color="#3b82f6" />
          <Tower x={254} base={106} w={20} h={40} color="#8b5cf6" />
          <Tower x={278} base={106} w={28} h={74} color="#2563eb" />
          <rect x="291" y="20" width="2" height="12" fill="#c7d2fe" />
          <circle cx="292" cy="19" r="2.5" fill="#f43f5e" />
          <Tower x={310} base={110} w={22} h={50} color="#7c3aed" />
          <Tree x={112} y={98} s={0.75} leaf={leaf} />
          <Tree x={64} y={170} s={0.9} leaf={leaf} />
          <Tree x={84} y={210} s={0.75} leaf={leaf} />
          <Tree x={356} y={172} s={0.85} leaf={leaf} />
        </>
      )
  }
}

/** One island: shadow, cliff, grass and the world's landmark. `uid` keeps gradient ids unique. */
export function IslandArt({ theme, palette, uid, locked = false }: { theme: WorldTheme; palette: WorldPalette; uid: string; locked?: boolean }) {
  return (
    <g style={locked ? { filter: 'saturate(0.25) brightness(0.95)' } : undefined}>
      <defs>
        <linearGradient id={`${uid}-top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.top[0]} />
          <stop offset="1" stopColor={palette.top[1]} />
        </linearGradient>
        <linearGradient id={`${uid}-cliff`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.cliff[0]} />
          <stop offset="1" stopColor={palette.cliff[1]} />
        </linearGradient>
      </defs>
      {/* Soft shadow ellipse on water */}
      <ellipse cx="205" cy="314" rx="150" ry="14" fill="#04223a" opacity="0.22" />
      {/* Cliff base */}
      <path d={CLIFF} fill={`url(#${uid}-cliff)`} />
      <path d="M78 248 C120 262 160 266 200 264 M232 266 C268 262 300 252 330 236 M110 268 C140 276 170 278 196 278" fill="none" stroke="#000000" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" />
      {/* 8px darker cliff band beneath top face */}
      <path d={TOP} transform="translate(0 8)" fill={palette.cliff[1]} />
      {/* Top face */}
      <path d={TOP} fill={`url(#${uid}-top)`} />
      {/* Lighter rim highlight along the top edge */}
      <path d={TOP} fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="2.5" />
      <ellipse cx="185" cy="112" rx="120" ry="36" fill="#ffffff" opacity="0.13" />
      {decorations(theme, palette.leaf)}

      {/* Cloud cluster overlay and lock badge if locked */}
      {locked && (
        <g>
          <g opacity="0.88">
            <ellipse cx="205" cy="180" rx="90" ry="32" fill="#cbd5e1" opacity="0.8" />
            <circle cx="160" cy="165" r="40" fill="#e2e8f0" opacity="0.85" />
            <circle cx="210" cy="155" r="50" fill="#f1f5f9" opacity="0.9" />
            <circle cx="255" cy="168" r="38" fill="#e2e8f0" opacity="0.85" />
          </g>
          <g transform="translate(205 170)">
            <circle cx="0" cy="0" r="22" fill="#0f172a" opacity="0.85" />
            <path d="M-6 -2 L-6 -8 C-6 -13 6 -13 6 -8 L6 -2" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            <rect x="-9" y="-2" width="18" height="14" rx="3" fill="#ffffff" />
            <circle cx="0" cy="4" r="2" fill="#0f172a" />
          </g>
        </g>
      )}
    </g>
  )
}
