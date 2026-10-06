'use client'

import { useCallback, useEffect, useMemo, useState, type ComponentType, type CSSProperties } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Blocks,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Clock3,
  Cloud,
  CloudOff,
  Files,
  GitBranch,
  Lightbulb,
  LoaderCircle,
  LogOut,
  Network,
  PanelBottom,
  Play,
  Puzzle,
  RotateCcw,
  Star,
  TriangleAlert,
  Trophy,
  UserRound,
  X,
} from 'lucide-react'
import { availableStacks, signupChallenge, solutionOrder, stackLabels, workspaceFor, type Challenge, type Stack } from '@/data/challenges'
import { computeScore, starsFor } from '@/lib/scoring'
import { loginHref, useSession } from '@/lib/use-session'
import { cn } from '@/lib/utils'
import { CheckFeedback, getRandomPraise, useShake, type CheckStatus } from '@/components/journey/feedback'
import { Celebration } from '@/components/effects/celebration'
import { ThemeToggle } from '@/components/theme-toggle'
import { BlockCard, BlockPalette } from './ide/block-palette'
import { BottomPanel, type PanelTab, type Problem, type SlotGuideRow } from './ide/bottom-panel'
import { ChallengeEditor, FileView, type SlotStatus } from './ide/code-editor'
import { FileIcon, languageFor } from './ide/code'
import { FileExplorer } from './ide/file-explorer'
import { GithubPanel, type GithubRepo, type ProjectSaveState } from './ide/github-panel'
import { RunDrawer } from './ide/run-drawer'
import { Sash } from './ide/sash'

type Slots = (string | null)[]
type SyncState = 'idle' | 'saving' | 'saved' | 'error'
type IconType = ComponentType<{ className?: string; strokeWidth?: number }>

const GUEST_PROGRESS_KEY = 'codeflow-progress'
const LAYOUT_KEY = 'codeflow-layout'

// Pane sizes in px (desktop only; the stacked mobile layout uses fixed heights).
type Layout = { explorer: number; palette: number; panel: number }
const DEFAULT_LAYOUT: Layout = { explorer: 240, palette: 320, panel: 224 }
const LAYOUT_MIN: Layout = { explorer: 170, palette: 240, panel: 100 }
const EDITOR_MIN_WIDTH = 360
const EDITOR_MIN_HEIGHT = 160
const CHROME_HEIGHT = 40 + 24 + 36 + 24 // title bar, status bar, tabs, breadcrumbs
const JSON_HEADERS = { 'Content-Type': 'application/json' }

// The pointer position is the most precise signal for inline drop lines; overlap is the fallback between targets.
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  return hits.length ? hits : rectIntersection(args)
}

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
const indentCode = (code: string, spaces: number) => code.split('\n').map((line) => ' '.repeat(spaces) + line).join('\n')

function ToolButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  busy,
  variant = 'ghost',
}: {
  icon: IconType
  label: string
  onClick: () => void
  disabled?: boolean
  busy?: boolean
  variant?: 'ghost' | 'primary' | 'run'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy ? 'true' : undefined}
      aria-label={label}
      className={cn(
        'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold transition-all disabled:pointer-events-none disabled:opacity-40 select-none',
        variant === 'primary'
          ? 'bg-[#0078d4] text-white hover:bg-[#026ec1] shadow-xs active:translate-y-0.5'
          : variant === 'run'
          ? 'bg-[#2ea043] text-white hover:bg-[#3fb950] shadow-xs active:translate-y-0.5'
          : 'text-(--ide-fg) hover:bg-(--ide-border)',
      )}
    >
      {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function ActivityItem({ icon: Icon, label, active, onClick, disabled, indicator }: { icon: IconType; label: string; active?: boolean; onClick?: () => void; disabled?: boolean; indicator?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn('relative flex size-12 items-center justify-center text-(--ide-icon) hover:text-(--ide-fg) disabled:opacity-40 disabled:hover:text-(--ide-icon)', active && 'text-(--ide-fg-strong)')}
    >
      {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-[#0078d4]" />}
      <Icon className="size-6" strokeWidth={1.5} />
      {indicator && <span className="absolute bottom-2.5 right-2.5 size-1.5 rounded-full bg-[#2ea043]" />}
    </button>
  )
}

export default function CodeFlowApp({ challenge = signupChallenge, sync = true, initialStack }: { challenge?: Challenge; sync?: boolean; initialStack?: Stack }) {
  const pathname = usePathname()
  const session = useSession()
  const stacks = useMemo(() => availableStacks(challenge), [challenge])
  const order = useMemo(() => solutionOrder(challenge), [challenge])

  const [stack, setStack] = useState<Stack>(initialStack && stacks.includes(initialStack) ? initialStack : stacks[0])
  const workspace = useMemo(() => workspaceFor(challenge, stack), [challenge, stack])
  const language = languageFor(workspace.challengePath)
  const challengeFileName = workspace.challengePath.split('/').pop() ?? workspace.challengePath

  const [slots, setSlots] = useState<Slots>(() => Array(order.length).fill(null))
  const [checked, setChecked] = useState(false)
  const [wrongChecks, setWrongChecks] = useState(0)
  const { triggerShake, shakeAnimation } = useShake()
  const [checking, setChecking] = useState(false)
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle')
  const [praise, setPraise] = useState('Nice!')
  const [showCelebration, setShowCelebration] = useState(false)
  const [hints, setHints] = useState(0)
  const [hintLevels, setHintLevels] = useState<Record<number, number>>({})
  const [hintNotes, setHintNotes] = useState<Problem[]>([])
  const [hinted, setHinted] = useState<Set<number>>(() => new Set())
  const [pulsedNode, setPulsedNode] = useState<string | null>(null)
  const [focusedNode, setFocusedNode] = useState<string | null>(null)
  const [predictions, setPredictions] = useState({ correct: 0, total: 0 })
  const [bestScore, setBestScore] = useState<number | null>(null)
  const [started, setStarted] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [hovered, setHovered] = useState<string | null>(null)
  const [inspected, setInspected] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [runOpen, setRunOpen] = useState(false)
  const [explorerOpen, setExplorerOpen] = useState(true)
  const [paletteOpen, setPaletteOpen] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)
  const [panelTab, setPanelTab] = useState<PanelTab>('steps')
  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT)
  const [tabs, setTabs] = useState<string[]>([workspace.challengePath])
  const [activePath, setActivePath] = useState<string | null>(workspace.challengePath)
  const [syncState, setSyncState] = useState<SyncState>('idle')
  // JSON of the draft the server already has; null until it has been loaded, so nothing is saved over it first.
  const [savedDraft, setSavedDraft] = useState<string | null>(null)
  const [sidebarView, setSidebarView] = useState<'explorer' | 'github'>('explorer')
  const [github, setGithub] = useState<{ loading: boolean; connected: boolean; login: string | null; repo: GithubRepo | null }>({
    loading: false,
    connected: false,
    login: null,
    repo: null,
  })
  const [projectState, setProjectState] = useState<ProjectSaveState>('idle')

  const canSync = sync && session.status === 'signed-in'
  const completed = checked && slots.every((id, index) => id === order[index])
  const score = computeScore({ wrongChecks, hints })
  const stars = starsFor(score)
  const confirmed = slots.filter((id, index): id is string => id !== null && id === order[index])
  const blockById = (id: string | null) => challenge.blocks.find((block) => block.id === id)

  // ---- GitHub connection status -----------------------------------------
  const [githubOauth, setGithubOauth] = useState(true)
  const refreshGithub = useCallback(() => {
    if (!canSync) {
      setGithub({ loading: false, connected: false, login: null, repo: null })
      return
    }
    setGithub((current) => ({ ...current, loading: true }))
    fetch(`/api/github/status?journeyId=${encodeURIComponent(challenge.id)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data: { oauth?: boolean; connected?: boolean; login?: string | null; repo?: GithubRepo | null }) => {
        setGithubOauth(data.oauth !== false)
        setGithub({ loading: false, connected: !!data.connected, login: data.login ?? null, repo: data.repo ?? null })
      })
      .catch(() => setGithub({ loading: false, connected: false, login: null, repo: null }))
  }, [canSync, challenge.id])

  useEffect(() => {
    refreshGithub()
  }, [refreshGithub])

  // After the OAuth round-trip (?github=connected|error) land on the GitHub view
  // so the learner sees the result and the panel can tidy the URL.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('github')) {
      setSidebarView('github')
      setExplorerOpen(true)
    }
  }, [])

  // Deterministic shuffle so server and client render the same palette.
  const paletteOrder = useMemo(
    () =>
      challenge.blocks
        .filter((block) => !block.id.startsWith('bad-'))
        .sort(
          (a, b) =>
            (a.id.split('').reduce((n, c) => n + c.charCodeAt(0), 0) % 7) - (b.id.split('').reduce((n, c) => n + c.charCodeAt(0), 0) % 7) || a.id.localeCompare(b.id),
        ),
    [challenge],
  )
  const unplaced = paletteOrder.filter((block) => !slots.includes(block.id))

  const mappings = challenge.architecture.mappings
  const relatedTo = (blockId: string) => !focusedNode || !!mappings[blockId]?.nodeIds.includes(focusedNode)
  const activeBlock = hovered ?? (focusedNode ? paletteOrder.find((block) => mappings[block.id]?.nodeIds.includes(focusedNode))?.id ?? null : null)

  // ---- timer -------------------------------------------------------------
  useEffect(() => {
    setStarted(Date.now())
  }, [])
  useEffect(() => {
    if (!started || completed) return
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => window.clearInterval(id)
  }, [started, completed])

  // ---- persistence: server for signed-in users, localStorage for guests ----
  useEffect(() => {
    if (session.status !== 'guest') return
    try {
      const saved = JSON.parse(window.localStorage.getItem(GUEST_PROGRESS_KEY) ?? 'null')
      if (saved?.predictions) setPredictions(saved.predictions)
    } catch {
      // ignore malformed local progress
    }
  }, [session.status])

  useEffect(() => {
    if (!canSync) {
      setSavedDraft(null)
      return
    }
    let alive = true
    fetch(`/api/challenges/${challenge.id}/progress`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then(({ progress }) => {
        if (!alive) return
        const empty: Slots = Array(order.length).fill(null)
        const draft: Slots = progress?.draftSlots?.length === order.length ? progress.draftSlots : empty
        setSlots((current) => (current.every((slot) => slot === null) ? draft : current))
        setSavedDraft(JSON.stringify(draft))
        setPredictions({ correct: progress?.predictionsCorrect ?? 0, total: progress?.predictionsTotal ?? 0 })
        setBestScore(progress?.bestScore ?? null)
        setSyncState('saved')
      })
      .catch(() => alive && setSyncState('error'))
    return () => {
      alive = false
    }
  }, [canSync, challenge.id, order.length])

  // Debounced draft save: one small write after the learner stops moving blocks, and none if nothing changed.
  useEffect(() => {
    if (!canSync || savedDraft === null) return
    const body = JSON.stringify(slots)
    if (body === savedDraft) return
    const timer = window.setTimeout(() => {
      setSyncState('saving')
      fetch(`/api/challenges/${challenge.id}/progress`, { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify({ slots }) })
        .then((response) => {
          if (!response.ok) throw response
          setSavedDraft(body)
          setSyncState('saved')
        })
        .catch(() => setSyncState('error'))
    }, 800)
    return () => window.clearTimeout(timer)
  }, [slots, canSync, savedDraft, challenge.id])

  // ---- pane sizes: a per-browser preference ------------------------------
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(LAYOUT_KEY) ?? 'null')
      if (!saved || typeof saved !== 'object') return
      const pick = (key: keyof Layout) => (Number.isFinite(saved[key]) ? Math.max(LAYOUT_MIN[key], saved[key]) : DEFAULT_LAYOUT[key])
      setLayout({ explorer: pick('explorer'), palette: pick('palette'), panel: pick('panel') })
    } catch {
      // ignore unreadable preferences
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout))
      } catch {
        // storage unavailable; sizes just won't persist
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [layout])

  const resize = (key: keyof Layout) => (value: number) => setLayout((current) => ({ ...current, [key]: value }))
  const resetSize = (key: keyof Layout) => () => setLayout((current) => ({ ...current, [key]: DEFAULT_LAYOUT[key] }))
  // Each pane may grow until the editor would drop below its minimum size, and never past the
  // viewport-relative caps in the class names (lg:max-w-[40vw], lg:max-w-[45vw], lg:max-h-[60vh]).
  const maxSideWidth = (other: number, viewportShare: number) => () =>
    Math.min(window.innerWidth * viewportShare, window.innerWidth - 48 - other - EDITOR_MIN_WIDTH)
  const maxPanelHeight = () => Math.min(window.innerHeight * 0.6, window.innerHeight - CHROME_HEIGHT - EDITOR_MIN_HEIGHT)

  // ---- block moves -------------------------------------------------------
  /** Moves a block into a step (swapping with whatever is there) or, with `to = null`, back to the palette. */
  const moveBlock = (blockId: string, to: number | null) => {
    const from = slots.indexOf(blockId)
    if (from === to || (to === null && from < 0)) return
    const next = [...slots]
    if (to === null) {
      next[from] = null
    } else {
      // From another step: swap. From the palette: a displaced block simply returns to the palette.
      if (from >= 0) next[from] = next[to]
      next[to] = blockId
    }
    setSlots(next)
    setChecked(false)
  }

  const placeNext = (blockId: string) => {
    const empty = slots.indexOf(null)
    if (empty >= 0) moveBlock(blockId, empty)
  }

  const hover = (blockId: string | null) => {
    setHovered(blockId)
    if (blockId) setInspected(blockId)
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
  )

  const finishDrag = () => {
    setDragging(null)
    document.body.classList.remove('is-dragging')
  }
  useEffect(() => () => document.body.classList.remove('is-dragging'), [])

  const onDragStart = ({ active }: DragStartEvent) => {
    setDragging((active.data.current?.blockId as string | undefined) ?? null)
    document.body.classList.add('is-dragging')
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    finishDrag()
    const blockId = active.data.current?.blockId as string | undefined
    if (!blockId || !over) return
    if (over.id === 'palette') moveBlock(blockId, null)
    else if (typeof over.data.current?.slot === 'number') moveBlock(blockId, over.data.current.slot)
  }

  // ---- toolbar actions ---------------------------------------------------
  const showPanel = (tab: PanelTab) => {
    setPanelOpen(true)
    setPanelTab(tab)
  }

  // The activity bar swaps the left slot between the file tree and GitHub.
  const showSidebar = (view: 'explorer' | 'github') => {
    if (explorerOpen && sidebarView === view) {
      setExplorerOpen(false)
      return
    }
    setSidebarView(view)
    setExplorerOpen(true)
  }

  const check = () => {
    setChecking(true)
    setCheckStatus('checking')
    const correct = slots.every((id, index) => id === order[index])
    const nextWrongChecks = correct ? wrongChecks : wrongChecks + 1
    setChecked(true)
    setWrongChecks(nextWrongChecks)
    showPanel('problems')

    if (correct) {
      setCheckStatus('success')
      setPraise(getRandomPraise())
      setShowCelebration(true)
    } else {
      setCheckStatus('error')
      triggerShake()
    }
    setChecking(false)

    if (!canSync) return

    fetch(`/api/challenges/${challenge.id}/attempts`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ order: slots, stack, hints, wrongChecks: nextWrongChecks, elapsedSeconds: elapsed }),
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => setBestScore(data.progress?.bestScore ?? null))
      .catch(() => setSyncState('error'))
  }

  const hint = () => {
    const index = slots.findIndex((id, position) => id !== order[position])
    if (index < 0) return
    const blockId = order[index]
    const level = (hintLevels[index] ?? 0) + 1
    const mapping = mappings[blockId]
    const note = (message: string) => setHintNotes((notes) => [...notes, { severity: 'hint', message }])

    setHintLevels((levels) => ({ ...levels, [index]: level }))
    setHints((count) => count + 1)
    setChecked(false)

    if (level === 1) {
      note(`Hint for step ${index + 1}: ${mapping?.hint ?? 'Think about what has to happen at this point in the request.'}`)
      showPanel('problems')
    } else if (level === 2) {
      const node = challenge.architecture.nodes.find((item) => item.id === mapping?.nodeIds[0])
      setPulsedNode(node?.id ?? null)
      note(node ? `Hint for step ${index + 1}: it happens in “${node.label}”, pulsing on the architecture map.` : `Hint for step ${index + 1}: look at the architecture map.`)
      showPanel('architecture')
    } else {
      moveBlock(blockId, index)
      setHinted((current) => new Set(current).add(index))
      setPulsedNode(null)
      note(`Step ${index + 1} was filled in for you: ${blockById(blockId)?.label ?? blockId}.`)
      showPanel('problems')
    }
  }

  const reset = () => {
    setSlots(Array(order.length).fill(null))
    setChecked(false)
    setCheckStatus('idle')
    setShowCelebration(false)
    setWrongChecks(0)
    setHints(0)
    setHintLevels({})
    setHintNotes([])
    setHinted(new Set())
    setPulsedNode(null)
    setFocusedNode(null)
    setStarted(Date.now())
    setElapsed(0)
  }

  const recordPrediction = (correct: boolean) => {
    const next = { correct: predictions.correct + (correct ? 1 : 0), total: predictions.total + 1 }
    setPredictions(next)
    if (canSync) {
      fetch(`/api/challenges/${challenge.id}/predictions`, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ correct }) })
        .then((response) => (response.ok ? response.json() : Promise.reject(response)))
        .then((data) => setPredictions(data.predictions))
        .catch(() => setSyncState('error'))
      return
    }
    try {
      window.localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify({ predictions: next, completed: true, score, stars, elapsed }))
    } catch {
      // storage unavailable (private mode); stats stay in memory
    }
  }

  const changeStack = (next: Stack) => {
    const path = workspaceFor(challenge, next).challengePath
    setStack(next)
    setTabs([path])
    setActivePath(path)
    setChecked(false)
  }

  // ---- editor tabs -------------------------------------------------------
  const openFile = (path: string) => {
    setTabs((current) => (current.includes(path) ? current : [...current, path]))
    setActivePath(path)
  }

  const closeTab = (path: string) => {
    const next = tabs.filter((tab) => tab !== path)
    setTabs(next)
    if (activePath === path) setActivePath(next[Math.max(0, tabs.indexOf(path) - 1)] ?? null)
  }

  const activeFile = workspace.files.find((file) => file.path === activePath)

  // ---- derived panels ----------------------------------------------------
  const statuses: SlotStatus[] = slots.map((id, index) => (!checked ? null : id === null ? 'empty' : id === order[index] ? 'correct' : 'wrong'))

  const slotLines = useMemo(() => {
    const lines: number[] = []
    let number = 1
    for (const line of workspace.scaffold) {
      if (line.type === 'line') {
        number += 1
        continue
      }
      const index = (line.slot ?? 1) - 1
      lines[index] = number
      const id = slots[index]
      number += id ? workspace.codeFor(id).split('\n').length : 1
    }
    return lines
  }, [workspace, slots])

  const problems: Problem[] = []
  if (completed) {
    problems.push({ severity: 'success', message: `All ${order.length} steps are in the right order. Score ${score}.` })
    order.forEach((id, index) => {
      const block = blockById(id)
      if (block?.whyHere) problems.push({ severity: 'info', message: `Step ${index + 1} · ${block.label}`, detail: block.whyHere })
    })
  } else if (checked) {
    statuses.forEach((status, index) => {
      if (status === 'empty') problems.push({ severity: 'warning', message: `Step ${index + 1} is empty.`, line: slotLines[index] })
      if (status === 'wrong') problems.push({ severity: 'error', message: `“${blockById(slots[index])?.label}” doesn't belong at step ${index + 1}.`, line: slotLines[index] })
    })
  }
  problems.push(...hintNotes)
  const errorCount = problems.filter((problem) => problem.severity === 'error').length
  const warningCount = problems.filter((problem) => problem.severity === 'warning').length

  // Challenges without a written guide (e.g. from mentor mode) fall back to their architecture map.
  const slotGuide: SlotGuideRow[] = order.map((id, index) => {
    const mapping = mappings[id]
    const node = challenge.architecture.nodes.find((item) => item.id === mapping?.nodeIds[0])
    const guide = challenge.steps?.[index] ?? { kind: node?.label ?? `Step ${index + 1}`, goal: mapping?.hint ?? '' }
    return { ...guide, placed: blockById(slots[index])?.label, status: statuses[index] }
  })

  const focusStep = (index: number) => {
    openFile(workspace.challengePath)
    // Wait for the challenge file to render if another tab was active.
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => document.querySelector(`[data-slot="${index}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })),
    )
  }

  const solvedCode = useMemo(
    () => workspace.scaffold.map((line) => (line.type === 'line' ? line.text ?? '' : indentCode(workspace.codeFor(order[(line.slot ?? 1) - 1]), line.indent ?? 0))).join('\n'),
    [workspace, order],
  )

  // The solved workspace as pushable files: the challenge file is built from the
  // solution, the rest are read-only project files. Saving on solve keeps
  // user_project_files in lockstep with what the editor shows.
  const projectFiles = useMemo(
    () =>
      completed
        ? workspace.files
            .map((file) => ({ path: file.path, content: file.challenge ? solvedCode : file.content ?? '' }))
            .filter((file) => file.content.length > 0)
        : [],
    [completed, workspace, solvedCode],
  )

  useEffect(() => {
    if (!canSync || !completed || projectFiles.length === 0) return
    const timer = window.setTimeout(() => {
      setProjectState('saving')
      fetch('/api/github/project', {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify({ journeyId: challenge.id, files: projectFiles }),
      })
        .then((response) => (response.ok ? response.json() : Promise.reject(response)))
        .then(() => setProjectState('saved'))
        .catch(() => setProjectState('error'))
    }, 800)
    return () => window.clearTimeout(timer)
  }, [canSync, completed, projectFiles, challenge.id])

  const draggedBlock = blockById(dragging)
  const inspectedBlock = blockById(inspected) ?? null
  const initials = session.user?.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={finishDrag}>
        <div
          className="flex min-h-dvh flex-col bg-(--ide-bg) font-sans text-[13px] text-(--ide-fg) lg:h-dvh lg:min-h-0"
          style={{ '--explorer-w': `${layout.explorer}px`, '--palette-w': `${layout.palette}px`, '--panel-h': `${layout.panel}px` } as CSSProperties}
        >
          {/* Title bar - 48px height */}
          <header className="relative flex h-12 shrink-0 items-center gap-2.5 border-b border-(--ide-border) bg-(--ide-bar) px-3">
            <Link
              href="/"
              aria-label="Back to map"
              className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-(--ide-fg) transition-colors hover:bg-(--ide-border)"
            >
              <ChevronLeft className="size-4" />
              <span className="hidden sm:inline">Map</span>
            </Link>

            {/* 4px vertical stripe in purple */}
            <span className="h-5 w-1 shrink-0 rounded-full bg-[#a855f7]" aria-hidden="true" />

            {/* Kind pill: Logic challenge with Puzzle icon */}
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#a855f7]/15 px-2.5 py-1 text-xs font-bold text-[#6d28d9] dark:text-[#d8b4fe]">
              <Puzzle className="size-3.5" />
              <span className="hidden sm:inline">Logic challenge</span>
            </span>

            {/* Title and subtitle */}
            <div className="flex min-w-0 items-baseline gap-2 truncate">
              <h1 className="truncate font-display text-sm font-extrabold text-(--ide-heading) sm:text-base">
                {challenge.title}
              </h1>
              <span className="hidden truncate text-xs text-(--ide-muted) xl:inline">
                {workspace.projectName} · Arrange validation, hashing, persistence and a safe response
              </span>
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              {stacks.length > 1 && (
                <select
                  value={stack}
                  onChange={(event) => changeStack(event.target.value as Stack)}
                  aria-label="Language and framework"
                  className="h-8 rounded-lg border border-(--ide-border-strong) bg-(--ide-input) px-2 text-[12px] font-semibold text-(--ide-fg) outline-none focus:border-[#0078d4]"
                >
                  {stacks.map((item) => (
                    <option key={item} value={item}>{stackLabels[item]}</option>
                  ))}
                </select>
              )}
              <ToolButton icon={RotateCcw} label="Reset" onClick={reset} />
              <ToolButton icon={Lightbulb} label="Hint" onClick={hint} disabled={completed} />
              <motion.div animate={shakeAnimation}>
                <ToolButton
                  icon={Check}
                  label="Check"
                  onClick={check}
                  disabled={completed || checking}
                  busy={checking}
                  variant="primary"
                />
              </motion.div>
              <ToolButton icon={Play} label="Run it" onClick={() => setRunOpen(true)} disabled={!completed} variant="run" />
              <div className="ml-1 flex items-center gap-1 border-l border-(--ide-border) pl-2">
                <ThemeToggle className="size-8 rounded-lg text-(--ide-muted) hover:bg-(--ide-border) hover:text-(--ide-heading)" iconClassName="size-4" />
                {session.status === 'signed-in' ? (
                  <>
                    <span title={`${session.user.name} · ${session.user.email}`} className="grid size-6 place-items-center rounded-full bg-[#0078d4] text-[10px] font-semibold text-white">{initials}</span>
                    <button type="button" onClick={session.signOut} aria-label="Sign out" title="Sign out" className="rounded p-1 text-(--ide-muted) hover:bg-(--ide-border) hover:text-(--ide-heading)">
                      <LogOut className="size-3.5" />
                    </button>
                  </>
                ) : session.status === 'guest' ? (
                  <Link href={loginHref(pathname)} className="flex h-7 items-center rounded px-2 text-[12px] text-(--ide-fg) hover:bg-(--ide-border)">Sign in</Link>
                ) : null}
              </div>
            </div>
          </header>

          {/* Persistent Check Feedback Region */}
          {checkStatus !== 'idle' && (
            <div className="border-b border-(--ide-border) bg-(--ide-bar) px-4 py-1.5">
              <CheckFeedback
                status={checkStatus}
                praise={praise}
                message={
                  checkStatus === 'success'
                    ? `All ${order.length} steps are in the right order.`
                    : `Check detected issues. Review the Slot Guide or Problems panel.`
                }
                consecutiveErrors={wrongChecks}
                onOpenHint={hint}
              />
            </div>
          )}

          <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
            {/* Activity bar */}
            <nav aria-label="Views" className="hidden w-12 shrink-0 flex-col border-r border-(--ide-border) bg-(--ide-bar) lg:flex">
              <ActivityItem icon={Files} label="Explorer" active={explorerOpen && sidebarView === 'explorer'} onClick={() => showSidebar('explorer')} />
              <ActivityItem icon={Blocks} label="Blocks" active={paletteOpen} onClick={() => setPaletteOpen((open) => !open)} />
              <ActivityItem icon={Network} label="Architecture map" active={panelOpen && panelTab === 'architecture'} onClick={() => showPanel('architecture')} />
              <ActivityItem icon={PanelBottom} label="Toggle panel" active={panelOpen} onClick={() => setPanelOpen((open) => !open)} />
              {sync && (
                <ActivityItem
                  icon={GitBranch}
                  label={github.connected ? `GitHub — @${github.login}` : 'GitHub'}
                  active={explorerOpen && sidebarView === 'github'}
                  onClick={() => showSidebar('github')}
                  indicator={github.connected}
                />
              )}
              <div className="mt-auto">
                {session.status === 'guest' ? (
                  <Link href={loginHref(pathname)} aria-label="Sign in" title="Sign in" className="flex size-12 items-center justify-center text-(--ide-icon) hover:text-(--ide-fg)">
                    <UserRound className="size-6" strokeWidth={1.5} />
                  </Link>
                ) : (
                  <ActivityItem icon={UserRound} label={session.user ? `${session.user.name} (${session.user.email})` : 'Account'} />
                )}
              </div>
            </nav>

            {/* Explorer */}
            {explorerOpen && (
              <aside className="relative h-72 shrink-0 border-b border-(--ide-border) bg-(--ide-bar) lg:h-auto lg:w-(--explorer-w) lg:max-w-[40vw] lg:border-b-0 lg:border-r">
                <Sash
                  axis="x"
                  label="Resize explorer"
                  value={layout.explorer}
                  min={LAYOUT_MIN.explorer}
                  max={maxSideWidth(paletteOpen ? layout.palette : 0, 0.4)}
                  onChange={resize('explorer')}
                  onReset={resetSize('explorer')}
                  className="right-0 translate-x-1/2"
                />
                {sidebarView === 'github' ? (
                  <GithubPanel
                    signedIn={session.status === 'signed-in'}
                    login={github.login}
                    oauthAvailable={githubOauth}
                    repo={github.repo}
                    loading={github.loading}
                    journeyId={challenge.id}
                    projectName={workspace.projectName}
                    challengeId={challenge.id}
                    challengeTitle={challenge.title}
                    challengePath={workspace.challengePath}
                    completed={completed}
                    saveState={projectState}
                    signInHref={loginHref(pathname)}
                    onChanged={refreshGithub}
                  />
                ) : (
                  <FileExplorer
                    projectName={workspace.projectName}
                    files={workspace.files}
                    folders={workspace.folders}
                    activePath={activePath}
                    challengeBadge={completed ? '✓' : `${order.length - unplaced.length}/${order.length}`}
                    onOpen={openFile}
                  />
                )}
              </aside>
            )}

            {/* Editor group */}
            <main className="flex min-w-0 flex-1 flex-col lg:min-h-0">
              <div role="tablist" aria-label="Open files" className="flex h-9 shrink-0 overflow-x-auto border-b border-(--ide-border) bg-(--ide-bar)">
                {tabs.map((path) => {
                  const file = workspace.files.find((item) => item.path === path)
                  const isActive = path === activePath
                  return (
                    <div
                      key={path}
                      className={cn(
                        'group flex shrink-0 items-center gap-1.5 border-r border-(--ide-border) pl-3 pr-1 text-[13px]',
                        isActive ? 'border-t border-t-[#0078d4] bg-(--ide-bg) text-(--ide-heading)' : 'border-t border-t-transparent text-(--ide-muted) hover:bg-(--ide-bg)/60',
                      )}
                    >
                      <button type="button" role="tab" aria-selected={isActive} onClick={() => setActivePath(path)} className="flex h-full items-center gap-1.5">
                        <FileIcon path={path} />
                        <span className={cn(file?.challenge && 'text-(--ide-warning-soft)')}>{path.split('/').pop()}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => closeTab(path)}
                        aria-label={`Close ${path.split('/').pop()}`}
                        className={cn('rounded p-0.5 hover:bg-(--ide-border-strong)', isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>

              {activePath && (
                <div className="flex h-6 shrink-0 items-center gap-0.5 overflow-x-auto px-3 text-[12px] text-(--ide-muted)">
                  {activePath.split('/').map((part, index, parts) => (
                    <span key={index} className="flex shrink-0 items-center gap-0.5">
                      {index === parts.length - 1 && <FileIcon path={part} className="size-3.5" />}
                      <span className={index === parts.length - 1 ? 'text-(--ide-fg)' : undefined}>{part}</span>
                      {index < parts.length - 1 && <ChevronRight className="size-3.5" />}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex-1 overflow-auto bg-(--ide-bg) lg:min-h-0">
                {activeFile?.challenge ? (
                  <ChallengeEditor
                    about={activeFile.about}
                    scaffold={workspace.scaffold}
                    language={language}
                    slots={slots}
                    statuses={statuses}
                    hinted={hinted}
                    activeBlock={activeBlock}
                    codeFor={workspace.codeFor}
                    onRemove={(index) => {
                      const id = slots[index]
                      if (id) moveBlock(id, null)
                    }}
                    onHover={hover}
                  />
                ) : activeFile ? (
                  <FileView file={activeFile} language={languageFor(activeFile.path)} />
                ) : (
                  <div className="grid h-full min-h-60 place-items-center p-6 text-center text-[13px] text-(--ide-dim)">
                    <div>
                      <Files className="mx-auto mb-3 size-10" strokeWidth={1} />
                      Open a file from the explorer.
                      <button type="button" onClick={() => openFile(workspace.challengePath)} className="mt-2 block w-full text-(--ide-link) hover:underline">
                        Open {challengeFileName}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {panelOpen && (
                <div className="relative h-64 shrink-0 border-t border-(--ide-border) lg:h-(--panel-h) lg:max-h-[60vh]">
                  <Sash
                    axis="y"
                    invert
                    label="Resize panel"
                    value={layout.panel}
                    min={LAYOUT_MIN.panel}
                    max={maxPanelHeight}
                    onChange={resize('panel')}
                    onReset={resetSize('panel')}
                    className="top-0 -translate-y-1/2"
                  />
                  <BottomPanel
                    tab={panelTab}
                    onTab={setPanelTab}
                    onClose={() => setPanelOpen(false)}
                    steps={slotGuide}
                    onStepClick={focusStep}
                    problems={problems}
                    problemCount={errorCount + warningCount}
                    fileName={challengeFileName}
                    challenge={challenge}
                    showReflect={completed}
                    architecture={{
                      challenge,
                      activeBlock,
                      confirmed,
                      pulsedNode,
                      focusedNode,
                      onNodeClick: (id) => setFocusedNode((current) => (current === id ? null : id)),
                    }}
                  />
                </div>
              )}
            </main>

            {/* Block palette */}
            {paletteOpen && (
              <aside className="relative h-[32rem] shrink-0 border-t border-(--ide-border) bg-(--ide-bar) lg:h-auto lg:w-(--palette-w) lg:max-w-[45vw] lg:border-l lg:border-t-0">
                <Sash
                  axis="x"
                  invert
                  label="Resize blocks"
                  value={layout.palette}
                  min={LAYOUT_MIN.palette}
                  max={maxSideWidth(explorerOpen ? layout.explorer : 0, 0.45)}
                  onChange={resize('palette')}
                  onReset={resetSize('palette')}
                  className="left-0 -translate-x-1/2"
                />
                <BlockPalette
                  blocks={unplaced}
                  total={order.length}
                  language={language}
                  codeFor={workspace.codeFor}
                  activeBlock={activeBlock}
                  relatedTo={relatedTo}
                  inspected={inspectedBlock}
                  completed={completed}
                  onPlace={placeNext}
                  onHover={hover}
                />
              </aside>
            )}
          </div>

          {/* Status bar */}
          <footer className="flex h-6 shrink-0 items-center gap-3 overflow-x-auto whitespace-nowrap bg-[#007acc] px-2 text-[12px] text-white">
            <span className="flex items-center gap-1"><GitBranch className="size-3.5" />{workspace.projectName}</span>
            <button type="button" onClick={() => showPanel('problems')} className="flex items-center gap-1 rounded-sm px-1 hover:bg-white/15" aria-label={`${errorCount} errors, ${warningCount} warnings`}>
              <CircleX className="size-3.5" />{errorCount}
              <TriangleAlert className="ml-1 size-3.5" />{warningCount}
            </button>
            <div className="ml-auto flex items-center gap-3">
              <span>Score {score}</span>
              <span className="flex" aria-label={`${stars} of 3 stars`}>
                {[0, 1, 2].map((index) => <Star key={index} className={cn('size-3', index < stars ? 'fill-current' : 'opacity-40')} />)}
              </span>
              {bestScore !== null && <span>Best {bestScore}</span>}
              <span className="flex items-center gap-1"><Clock3 className="size-3.5" />{formatTime(elapsed)}</span>
              <span>Predictions {predictions.correct}/{predictions.total}</span>
              <span>Hints {hints}</span>
              <span className="hidden md:inline">{stackLabels[stack]}</span>
              {sync && session.status === 'guest' && (
                <Link href={loginHref(pathname)} className="flex items-center gap-1 rounded-sm px-1 hover:bg-white/15"><CloudOff className="size-3.5" />Sign in to save</Link>
              )}
              {canSync && (
                <span className="flex items-center gap-1">
                  {syncState === 'saving' ? <LoaderCircle className="size-3.5 animate-spin" /> : syncState === 'error' ? <CloudOff className="size-3.5" /> : <Cloud className="size-3.5" />}
                  {syncState === 'saving' ? 'Saving…' : syncState === 'error' ? 'Not saved' : 'Saved'}
                </span>
              )}
            </div>
          </footer>

          {/* Mobile bottom action bar for reachable controls at 390px */}
          <div className="sticky bottom-0 z-20 flex h-12 shrink-0 items-center justify-between border-t border-(--ide-border) bg-(--ide-bar) px-3 sm:hidden">
            <div className="flex items-center gap-1.5">
              <ToolButton icon={RotateCcw} label="Reset" onClick={reset} />
              <ToolButton icon={Lightbulb} label="Hint" onClick={hint} disabled={completed} />
            </div>
            <div className="flex items-center gap-1.5">
              <motion.div animate={shakeAnimation}>
                <ToolButton
                  icon={Check}
                  label="Check"
                  onClick={check}
                  disabled={completed || checking}
                  busy={checking}
                  variant="primary"
                />
              </motion.div>
              {completed && (
                <ToolButton icon={Play} label="Run it" onClick={() => setRunOpen(true)} variant="run" />
              )}
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {draggedBlock && (
            <div className="w-72 cursor-grabbing">
              <BlockCard label={draggedBlock.label} code={workspace.codeFor(draggedBlock.id)} language={language} lifted />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <AnimatePresence>
        {runOpen && (
          <RunDrawer
            key="run"
            stackLabel={stackLabels[stack]}
            fileName={challengeFileName}
            code={solvedCode}
            language={language}
            onClose={() => setRunOpen(false)}
            onPrediction={recordPrediction}
          />
        )}
      </AnimatePresence>

      {showCelebration && (
        <Celebration
          colors={['#a855f7', '#22c55e', '#f5b301']}
          onDismiss={() => setShowCelebration(false)}
        />
      )}
    </>
  )
}
