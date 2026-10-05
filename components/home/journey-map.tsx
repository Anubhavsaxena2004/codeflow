'use client'

import { Component, useEffect, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { Box, Map as MapIcon } from 'lucide-react'
import type { LevelProgress } from '@/lib/journeys/types'
import type { ProjectSummary } from '@/lib/server/journeys'
import { cn } from '@/lib/utils'
import { WorldMap, type LevelState } from './world-map'

// Picks between the 3D world (three.js, loaded only when it is shown) and the 2D island map. The
// 2D map is the fallback without WebGL, with reduced motion, while 3D loads, and if 3D crashes.

const WorldMap3D = dynamic(() => import('./world-map-3d'), {
  ssr: false,
  loading: () => (
    <div className="grid h-[clamp(420px,62vh,620px)] place-items-center rounded-3xl border border-(--cf-border) bg-gradient-to-b from-[#bfe8ff] to-[#2fb5ec] text-sm font-bold text-white dark:from-[#081226] dark:to-[#0c2f52]">
      Building your world…
    </div>
  ),
})

type Mode = '3d' | '2d'
const MODE_KEY = 'codeflow-map-mode'

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/** Follows the light/dark class on <html>. */
function useNight() {
  const [night, setNight] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    const read = () => setNight(root.classList.contains('dark'))
    read()
    const observer = new MutationObserver(read)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return night
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const read = () => setReduced(query.matches)
    read()
    query.addEventListener('change', read)
    return () => query.removeEventListener('change', read)
  }, [])
  return reduced
}

/** If the 3D scene throws (lost WebGL context, an old GPU driver), fall back to the 2D map. */
class Fallback extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error('The 3D map failed, showing the 2D map instead:', error)
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

interface JourneyMapProps {
  journey: ProjectSummary
  done: Record<string, LevelProgress>
  stateOf: (index: number) => LevelState
  selectedId: string | null
  onSelect: (levelId: string) => void
  onSelectWorld: (worldId: string) => void
  focus: { worldId: string; nonce: number } | null
}

export function JourneyMap(props: JourneyMapProps) {
  const night = useNight()
  const reduced = useReducedMotion()
  const [mode, setMode] = useState<Mode | null>(null)
  const [canUse3d, setCanUse3d] = useState(false)

  useEffect(() => {
    const webgl = webglAvailable()
    setCanUse3d(webgl)
    let saved: string | null = null
    try {
      saved = window.localStorage.getItem(MODE_KEY)
    } catch {
      // storage unavailable: use the default
    }
    const prefersStill = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setMode(webgl && (saved === '3d' || (saved !== '2d' && !prefersStill)) ? '3d' : '2d')
  }, [])

  const choose = (next: Mode) => {
    setMode(next)
    try {
      window.localStorage.setItem(MODE_KEY, next)
    } catch {
      // storage unavailable: the choice lasts for this visit
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {canUse3d && (
        <div className="flex justify-end">
          <div role="radiogroup" aria-label="Map view" className="inline-flex rounded-xl border border-(--cf-border) bg-(--cf-surface) p-0.5 shadow-sm">
            {([['3d', '3D world', Box], ['2d', '2D map', MapIcon]] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                onClick={() => choose(value)}
                className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition', mode === value ? 'bg-[#16a34a] text-white shadow' : 'text-(--cf-muted) hover:text-(--cf-text)')}
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {mode === '3d' ? (
        <Fallback onError={() => setMode('2d')}>
          <WorldMap3D {...props} night={night} motion={!reduced} />
        </Fallback>
      ) : mode === '2d' ? (
        <WorldMap journey={props.journey} done={props.done} stateOf={props.stateOf} selectedId={props.selectedId} onSelect={props.onSelect} />
      ) : (
        <div className="h-[clamp(420px,62vh,620px)] rounded-3xl border border-(--cf-border) bg-(--cf-surface-2)" />
      )}
    </div>
  )
}
