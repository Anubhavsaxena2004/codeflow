'use client'

import { Component, useEffect, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { Box, Map as MapIcon } from 'lucide-react'
import type { LevelProgress } from '@/lib/journeys/types'
import type { ProjectSummary } from '@/lib/server/journeys'
import { cn } from '@/lib/utils'
import { GameTooltip } from '@/components/ui/game'
import { WorldMap, type LevelState } from './world-map'

// Picks between the 3D world (three.js, loaded only when it is shown) and the 2D island map. The
// 2D map is the fallback without WebGL, with reduced motion, while 3D loads, and if 3D crashes.

import { InlineSpinner } from '@/components/ui/states'

function MapSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="relative grid h-[clamp(420px,62vh,620px)] w-full place-items-center overflow-hidden rounded-3xl border border-(--cf-border) bg-gradient-to-b from-[#bfe9ff] to-[#7dd3fc] dark:from-[#0b1026] dark:to-[#172554]"
    >
      {/* Island silhouettes */}
      <div className="absolute inset-0 flex items-center justify-around px-8 opacity-40">
        <div className="h-44 w-56 rounded-full bg-white/40 blur-sm dark:bg-white/10" />
        <div className="h-52 w-64 rounded-full bg-white/40 blur-sm dark:bg-white/10" />
        <div className="hidden h-40 w-52 rounded-full bg-white/40 blur-sm md:block dark:bg-white/10" />
      </div>
      {/* Shimmer sweep */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent motion-reduce:hidden" />
      <div className="relative z-10 flex flex-col items-center gap-2.5 rounded-2xl bg-black/45 px-6 py-3.5 text-white shadow-xl backdrop-blur-md">
        <InlineSpinner className="size-5 text-white" />
        <span className="font-display text-sm font-bold tracking-wide">Loading world…</span>
      </div>
    </div>
  )
}

const WorldMap3D = dynamic(() => import('./world-map-3d'), {
  ssr: false,
  loading: () => <MapSkeleton />,
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
      <div className="flex justify-end">
        <div
          role="radiogroup"
          aria-label="Map view"
          className="relative inline-flex h-9 items-center rounded-xl border border-(--cf-border) bg-(--cf-surface) p-0.5 shadow-sm"
        >
          {canUse3d ? (
            <button
              type="button"
              role="radio"
              aria-checked={mode === '3d'}
              onClick={() => choose('3d')}
              className={cn(
                'relative z-10 flex h-full items-center gap-1.5 rounded-lg px-3 text-xs font-display font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)',
                mode === '3d' ? 'text-white' : 'text-(--cf-muted) hover:text-(--cf-text)',
              )}
            >
              {mode === '3d' && (
                <motion.div
                  layoutId="map-mode-thumb"
                  className="absolute inset-0 rounded-lg bg-[#16a34a] shadow-sm"
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
              <Box className="relative z-10 size-3.5" />
              <span className="relative z-10">3D world</span>
            </button>
          ) : (
            <GameTooltip content="3D needs WebGL" side="top">
              <button
                type="button"
                role="radio"
                aria-checked={false}
                disabled
                aria-label="3D world (3D needs WebGL)"
                className="relative z-10 flex h-full cursor-not-allowed items-center gap-1.5 rounded-lg px-3 text-xs font-display font-bold opacity-45 text-(--cf-muted)"
              >
                <Box className="size-3.5" />
                <span>3D world</span>
              </button>
            </GameTooltip>
          )}

          <button
            type="button"
            role="radio"
            aria-checked={mode === '2d'}
            onClick={() => choose('2d')}
            className={cn(
              'relative z-10 flex h-full items-center gap-1.5 rounded-lg px-3 text-xs font-display font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)',
              mode === '2d' ? 'text-white' : 'text-(--cf-muted) hover:text-(--cf-text)',
            )}
          >
            {mode === '2d' && (
              <motion.div
                layoutId="map-mode-thumb"
                className="absolute inset-0 rounded-lg bg-[#16a34a] shadow-sm"
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
            <MapIcon className="relative z-10 size-3.5" />
            <span className="relative z-10">2D map</span>
          </button>
        </div>
      </div>

      {mode === '3d' ? (
        <Fallback onError={() => setMode('2d')}>
          <WorldMap3D {...props} night={night} motion={!reduced} />
        </Fallback>
      ) : mode === '2d' ? (
        <WorldMap journey={props.journey} done={props.done} stateOf={props.stateOf} selectedId={props.selectedId} onSelect={props.onSelect} />
      ) : (
        <MapSkeleton />
      )}
    </div>
  )
}
