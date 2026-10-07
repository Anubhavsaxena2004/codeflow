'use client'

import { useCallback, useEffect, useState } from 'react'
import { isTrack, type LevelProgress, type Track } from '@/lib/journeys/types'
import { useSession } from '@/lib/use-session'

// The learner's stack and journey progress. Signed-in learners read and write the server;
// guests keep both in localStorage so they can still play (it just stays in this browser).

const GUEST_TRACK_KEY = 'codeflow-track'
const GUEST_LEVELS_KEY = 'codeflow-journeys'

export interface ChallengeProgress {
  challengeId: string
  bestScore: number | null
  completedAt: string | null
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? 'null') ?? fallback
  } catch {
    return fallback
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable (private mode): progress stays in memory for this visit
  }
}

const isLevelRow = (row: unknown): row is LevelProgress =>
  !!row && typeof row === 'object' && typeof (row as LevelProgress).projectId === 'string' && typeof (row as LevelProgress).levelId === 'string'

export function useLearner() {
  const session = useSession()
  const [track, setTrackState] = useState<Track | null>(null)
  const [levels, setLevels] = useState<LevelProgress[]>([])
  const [challenges, setChallenges] = useState<ChallengeProgress[]>([])
  const [ready, setReady] = useState(false)
  const signedIn = session.status === 'signed-in'
  const userTrack = session.user?.track ?? null
  const { updateUser } = session

  useEffect(() => {
    if (session.status === 'loading') return
    if (session.status === 'guest') {
      const saved = readLocal<unknown>(GUEST_TRACK_KEY, null)
      setTrackState(isTrack(saved) ? saved : null)
      setLevels(readLocal<unknown[]>(GUEST_LEVELS_KEY, []).filter(isLevelRow))
      setChallenges([])
      setReady(true)
      return
    }

    setTrackState(userTrack)
    let alive = true
    fetch('/api/progress')
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data: { progress: ChallengeProgress[]; levels: LevelProgress[] }) => {
        if (!alive) return
        setChallenges(data.progress ?? [])
        setLevels(data.levels ?? [])
      })
      .catch(() => undefined)
      .finally(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [session.status, userTrack])

  /** Learners choose their stack once; after that only an admin can change it. */
  const trackLocked = !!track && !session.user?.isAdmin

  /** Saves the stack. Resolves to an error message when it could not be changed. */
  const setTrack = useCallback(
    async (next: Track): Promise<string | null> => {
      if (!signedIn) {
        setTrackState(next)
        writeLocal(GUEST_TRACK_KEY, next)
        return null
      }
      const previous = track
      setTrackState(next)
      const response = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ track: next }) }).catch(() => null)
      const data = await response?.json().catch(() => null)
      if (response?.ok && data?.user) {
        updateUser(data.user)
        return null
      }
      setTrackState(previous)
      return data?.error ?? 'Could not save your stack. Check your connection and try again.'
    },
    [signedIn, track, updateUser],
  )

  /** Adds or improves a passed level in local state (and in localStorage for guests). */
  const recordLevel = useCallback(
    (row: LevelProgress) => {
      setLevels((current) => {
        const existing = current.find((item) => item.projectId === row.projectId && item.levelId === row.levelId)
        const merged = existing ? { ...existing, stars: Math.max(existing.stars, row.stars) } : row
        const next = [...current.filter((item) => item !== existing), merged]
        if (!signedIn) writeLocal(GUEST_LEVELS_KEY, next)
        return next
      })
    },
    [signedIn],
  )

  return { session, track, setTrack, trackLocked, levels, challenges, recordLevel, ready }
}
