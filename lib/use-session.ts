'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Track } from '@/lib/journeys/types'

export interface SessionUser {
  id: string
  name: string
  email: string
  track: Track | null
  isAdmin: boolean
}

type SessionState = { status: 'loading'; user: null } | { status: 'guest'; user: null } | { status: 'signed-in'; user: SessionUser }

export function useSession() {
  const [state, setState] = useState<SessionState>({ status: 'loading', user: null })

  useEffect(() => {
    let alive = true
    fetch('/api/auth/me')
      .then((response) => (response.ok ? response.json() : { user: null }))
      .then((data: { user: SessionUser | null }) => {
        if (alive) setState(data.user ? { status: 'signed-in', user: data.user } : { status: 'guest', user: null })
      })
      // No database configured or offline: the app still works, just without saving.
      .catch(() => alive && setState({ status: 'guest', user: null }))
    return () => {
      alive = false
    }
  }, [])

  const signOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    setState({ status: 'guest', user: null })
  }, [])

  /** Replaces the signed-in user after a profile change. */
  const updateUser = useCallback((user: SessionUser) => setState({ status: 'signed-in', user }), [])

  return { ...state, signOut, updateUser }
}

/** Login link that brings the user back to the current page afterwards. */
export function loginHref(path: string) {
  return `/login?next=${encodeURIComponent(path)}`
}
