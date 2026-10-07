'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { isLearnerPath, MAX_LEARNER_FILES, readLearnerFiles, type LearnerFiles } from '@/lib/journeys/draft'

// Files and folders the learner creates in the explorer (New File / New Folder), for one journey
// or challenge. Signed-in learners keep them on the server (/api/learner-files), guests in
// localStorage. Saves are debounced, and flushed when the page is hidden or closed.

const EMPTY: LearnerFiles = { files: {}, folders: [] }
const localKey = (scope: string) => `codeflow-files:${scope}`

/**
 * `scope` is the journey id or "challenge:<id>"; null turns the hook off (admin preview).
 * `taken(path)` says whether the project itself already has that path.
 */
export function useLearnerFiles(scope: string | null, signedIn: boolean, sessionReady: boolean, taken: (path: string) => boolean) {
  const [state, setState] = useState<LearnerFiles>(EMPTY)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef<LearnerFiles | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    setState(EMPTY)
    setReady(false)
    if (!scope || !sessionReady) return
    if (!signedIn) {
      try {
        setState(readLearnerFiles(JSON.parse(window.localStorage.getItem(localKey(scope)) ?? 'null')))
      } catch {
        // unreadable: start empty
      }
      setReady(true)
      return
    }
    let alive = true
    fetch(`/api/learner-files?scope=${encodeURIComponent(scope)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => alive && setState(readLearnerFiles(data)))
      .catch(() => undefined)
      .finally(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [scope, signedIn, sessionReady])

  const flush = useCallback(
    (keepalive = false) => {
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = null
      const next = pending.current
      pending.current = null
      if (!next || !scope) return
      if (!signedIn) {
        try {
          window.localStorage.setItem(localKey(scope), JSON.stringify(next))
        } catch {
          setError('Your browser storage is full or blocked, so your files are not saved.')
        }
        return
      }
      fetch('/api/learner-files', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope, files: next }), keepalive })
        .then(async (response) => setError(response.ok ? null : ((await response.json().catch(() => null))?.error ?? 'Your files could not be saved.')))
        .catch(() => setError('Your files could not be saved. Check your connection.'))
    },
    [scope, signedIn],
  )

  useEffect(() => {
    const onHide = () => flush(true)
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      flush(true)
    }
  }, [flush])

  const commit = useCallback(
    (next: LearnerFiles) => {
      setState(next)
      pending.current = next
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => flush(), 700)
    },
    [flush],
  )

  /** Returns an error message, or null when the file or folder was created. Folders end in "/". */
  const create = (path: string): string | null => {
    const folder = path.endsWith('/')
    const bare = folder ? path.slice(0, -1) : path
    if (!isLearnerPath(bare)) return 'Use letters, numbers, dots, dashes and underscores, with "/" between folders.'
    const exists = taken(bare) || taken(`${bare}/`) || bare in state.files || state.folders.includes(`${bare}/`) || Object.keys(state.files).some((file) => file.startsWith(`${bare}/`))
    if (exists) return `A file or folder named ${bare.split('/').pop()} already exists here.`
    // A file can't sit where a file already is on the way (notes.md/x).
    const parents = bare.split('/').slice(0, -1).map((_, index, parts) => parts.slice(0, index + 1).join('/'))
    if (parents.some((parent) => parent in state.files || (taken(parent) && !taken(`${parent}/`)))) return 'A file with that name is in the way.'
    if (Object.keys(state.files).length + state.folders.length >= MAX_LEARNER_FILES) return `You can create up to ${MAX_LEARNER_FILES} files and folders here.`
    commit(folder ? { ...state, folders: [...state.folders, path] } : { ...state, files: { ...state.files, [bare]: '' } })
    return null
  }

  /** Removes a file, or a folder (ending in "/") with everything the learner put in it. */
  const remove = (path: string) => {
    const files = Object.fromEntries(Object.entries(state.files).filter(([file]) => (path.endsWith('/') ? !file.startsWith(path) : file !== path)))
    const folders = state.folders.filter((item) => (path.endsWith('/') ? !item.startsWith(path) : true))
    commit({ files, folders })
  }

  const write = (path: string, content: string) => {
    if (!(path in state.files)) return
    commit({ ...state, files: { ...state.files, [path]: content } })
  }

  return { files: state.files, folders: state.folders, ready, error, create, remove, write }
}
