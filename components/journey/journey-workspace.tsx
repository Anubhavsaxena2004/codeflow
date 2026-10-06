'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from 'react'
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
import { ArrowLeft, BookOpen, Check, ChevronLeft, ChevronRight, Files, FlaskConical, GitBranch, Lightbulb, Lock, LogOut, Map as MapIcon, Network, PanelBottom, PanelRight, Play, RotateCcw, Skull, SquareTerminal, Star, Target, UserRound, X } from 'lucide-react'
import { GameButton, GameTooltip } from '@/components/ui/game'
import { LoadingState, Skeleton, SkeletonText } from '@/components/ui/states'
import { LessonText } from '@/components/lesson-text'
import { runChecks, type CheckResult } from '@/lib/journeys/checks'
import { termsFor } from '@/lib/journeys/glossary'
import { matchesStep } from '@/lib/journeys/commands'
import { indexProgress, isUnlocked, levelStars, rankFor, xpFor } from '@/lib/journeys/progress'
import { buildOrder, filesBefore, layer, outputOf } from '@/lib/journeys/snapshot'
import { kindLabels, tracks, type Level, type LevelProgress, type Project, type Submission } from '@/lib/journeys/types'
import { verifyLevel } from '@/lib/journeys/verify'
import { useLearner } from '@/lib/use-learner'
import { loginHref } from '@/lib/use-session'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import { SoundToggle } from '@/components/ui/sound'
import { BlockCard, BlockPalette } from '../ide/block-palette'
import type { Problem, SlotGuideRow } from '../ide/bottom-panel'
import { ChallengeEditor, FileView, type SlotStatus } from '../ide/code-editor'
import { FileIcon, languageFor } from '../ide/code'
import { EditableCode } from '../ide/editable-code'
import { FileExplorer } from '../ide/file-explorer'
import { GithubPanel, type GithubRepo } from '../ide/github-panel'
import { Sash } from '../ide/sash'
import { Terminal, type TerminalLine } from '../ide/terminal'
import { FlowBoard } from './flow-board'
import { JourneyPanel, type FlowContext, type JourneyTab } from './journey-panel'
import { Celebration } from '@/components/effects/celebration'
import { CommandSteps, CompletionCard, HintNote, MissionHeader, MissionSection, NewFiles, QuizCard, TestList } from './mission'
import { kindIcons, worldThemes } from './level-meta'

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>
type Phase = 'playing' | 'saving' | 'passed'
type Layout = { explorer: number; mission: number; panel: number }

const LAYOUT_KEY = 'codeflow-journey-layout'
const DEFAULT_LAYOUT: Layout = { explorer: 240, mission: 340, panel: 220 }
const LAYOUT_MIN: Layout = { explorer: 170, mission: 280, panel: 100 }
const EDITOR_MIN_WIDTH = 360
const EDITOR_MIN_HEIGHT = 160
const CHROME_HEIGHT = 40 + 24 + 36 + 24 // title bar, status bar, tabs, breadcrumbs
const JSON_HEADERS = { 'Content-Type': 'application/json' }
const LESSON_TAB = '#lesson'
const FLOW_TAB = '#flow'

const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  return hits.length ? hits : rectIntersection(args)
}

const isCodeLevel = (level: Level) => level.kind === 'edit' || level.kind === 'bugfix'
const draftKey = (projectId: string, levelId: string) => `codeflow-draft:${projectId}:${levelId}`

/** Resolves `cat ../x` style paths against the terminal's folder. */
function resolvePath(cwd: string, target: string) {
  const parts = cwd ? cwd.split('/') : []
  for (const part of target.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

function ToolButton({ icon: Icon, label, onClick, disabled, variant = 'ghost' }: { icon: IconType; label: string; onClick: () => void; disabled?: boolean; variant?: 'ghost' | 'primary' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'flex h-7 shrink-0 items-center gap-1.5 rounded px-2 text-[12px] transition-colors disabled:pointer-events-none disabled:opacity-40',
        variant === 'primary' ? 'bg-[#0078d4] text-white hover:bg-[#026ec1]' : 'text-(--ide-fg) hover:bg-(--ide-border)',
      )}
    >
      <Icon className="size-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function ActivityItem({ icon: Icon, label, active, onClick, indicator }: { icon: IconType; label: string; active?: boolean; onClick?: () => void; indicator?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn('relative flex size-12 items-center justify-center text-(--ide-icon) hover:text-(--ide-fg)', active && 'text-(--ide-fg-strong)')}
    >
      {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-[#0078d4]" />}
      <Icon className="size-6" strokeWidth={1.5} />
      {indicator && <span className="absolute bottom-2.5 right-2.5 size-1.5 rounded-full bg-[#2ea043]" />}
    </button>
  )
}

interface JourneyWorkspaceProps {
  project: Project
  levelId: string
  /** Admin preview: every level open, nothing saved, navigation stays in place. */
  preview?: boolean
  onNavigate?: (levelId: string) => void
  onExit?: () => void
}

/** One level of a journey, in the same VS Code-style workspace as the challenges. Mount it with key={levelId}. */
export function JourneyWorkspace({ project, levelId, preview = false, onNavigate, onExit }: JourneyWorkspaceProps) {
  const pathname = usePathname()
  const learner = useLearner()
  const { session } = learner
  const signedIn = !preview && session.status === 'signed-in'

  const index = Math.max(0, project.levels.findIndex((item) => item.id === levelId))
  const level = project.levels[index]
  const world = project.worlds.find((item) => item.id === level.world)
  const place = `WORLD ${project.worlds.indexOf(world!) + 1} · LEVEL ${index + 1}`
  const next = project.levels[index + 1] ?? null
  const done = useMemo(() => indexProgress(learner.levels)[project.id] ?? {}, [learner.levels, project.id])
  const unlocked = preview || isUnlocked(project, index, done, !!session.user?.allLevelsOpen)
  const blocking = project.levels.slice(0, index).find((item) => !done[item.id])
  const previous = done[level.id] ?? null
  const totalXp = learner.levels.reduce((sum, row) => sum + row.xp, 0)
  const rank = rankFor(totalXp)
  const levelHref = (id: string) => `/learn/${project.id}/${id}`
  const mapHref = preview ? '#' : `/?journey=${project.id}`

  // ---- shared level state --------------------------------------------------
  const [phase, setPhase] = useState<Phase>('playing')
  /** Set when the level is passed in this visit; rankUp is the new rank if the XP crossed one. */
  const [reward, setReward] = useState<{ stars: number; xp: number; rankUp: number | null } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pending, setPending] = useState<Submission | null>(null)
  const [wrong, setWrong] = useState(0)
  const [hints, setHints] = useState(0)
  const [hintLevel, setHintLevel] = useState(0)
  const [hintNote, setHintNote] = useState<string | null>(null)

  // explore
  const newFiles = useMemo(() => (level.kind === 'explore' ? level.adds.filter((file) => !file.path.endsWith('/') && !file.generated) : []), [level])
  const [opened, setOpened] = useState<Set<string>>(() => new Set())
  const [answer, setAnswer] = useState<number | null>(null)
  const [quizResult, setQuizResult] = useState<'right' | 'wrong' | null>(null)
  const [eliminated, setEliminated] = useState<Set<number>>(() => new Set())

  // command
  const startCwd = level.kind === 'command' ? level.cwd ?? '' : ''
  const startEnv = level.kind === 'command' ? level.env ?? '' : ''
  const [stepIndex, setStepIndex] = useState(0)
  const [typed, setTyped] = useState<string[]>([])
  const [cwd, setCwd] = useState(startCwd)
  const [env, setEnv] = useState(startEnv)

  // edit / bugfix
  const starter = isCodeLevel(level) ? (level as Extract<Level, { kind: 'edit' | 'bugfix' }>).starter : ''
  const [code, setCode] = useState(starter)
  const [results, setResults] = useState<CheckResult[] | null>(null)

  // build
  const order = useMemo(() => (level.kind === 'build' ? buildOrder(level) : []), [level])
  const [slots, setSlots] = useState<(string | null)[]>(() => Array(order.length).fill(null))
  const [buildChecked, setBuildChecked] = useState(false)
  const [hinted, setHinted] = useState<Set<number>>(() => new Set())
  const [hovered, setHovered] = useState<string | null>(null)
  const [inspected, setInspected] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)

  // architecture
  const [arrangement, setArrangement] = useState<(string | null)[]>(() => (level.kind === 'architecture' ? Array(level.nodes.length).fill(null) : []))
  const [flowChecked, setFlowChecked] = useState(false)

  // ---- layout --------------------------------------------------------------
  const [sidebar, setSidebar] = useState<'explorer' | 'github' | null>('explorer')
  const [missionOpen, setMissionOpen] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)
  const [panelTab, setPanelTab] = useState<JourneyTab>('terminal')
  // Commands the current step rejected, listed under Problems.
  const [rejected, setRejected] = useState<string[]>([])
  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT)
  const firstTab = isCodeLevel(level) || level.kind === 'build' ? (level as { path: string }).path : level.kind === 'architecture' ? FLOW_TAB : LESSON_TAB
  const [tabs, setTabs] = useState<string[]>(() => [...new Set([firstTab, ...(level.kind === 'architecture' ? [LESSON_TAB] : [])])])
  const [activeTab, setActiveTab] = useState<string | null>(firstTab)

  const welcome: TerminalLine[] = [
    {
      kind: 'info',
      text:
        level.kind === 'command'
          ? 'Type the command for each step and press Enter. Try ls, cat <file>, hint or help any time.'
          : isCodeLevel(level)
            ? 'Run the tests with the button above, Ctrl+S in the editor, or by typing npm test here.'
            : 'Look around with ls and cat <file>. Type help for more.',
    },
  ]
  const [terminal, setTerminal] = useState<TerminalLine[]>(welcome)
  const print = useCallback((...lines: TerminalLine[]) => setTerminal((current) => [...current, ...lines]), [])

  // ---- GitHub --------------------------------------------------------------
  const [github, setGithub] = useState<{ loading: boolean; connected: boolean; login: string | null; repo: GithubRepo | null }>({ loading: false, connected: false, login: null, repo: null })
  const [githubOauth, setGithubOauth] = useState(true)
  const refreshGithub = useCallback(() => {
    if (!signedIn) return setGithub({ loading: false, connected: false, login: null, repo: null })
    setGithub((current) => ({ ...current, loading: true }))
    fetch(`/api/github/status?journeyId=${encodeURIComponent(project.id)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data: { oauth?: boolean; connected?: boolean; login?: string | null; repo?: GithubRepo | null }) => {
        setGithubOauth(data.oauth !== false)
        setGithub({ loading: false, connected: !!data.connected, login: data.login ?? null, repo: data.repo ?? null })
      })
      .catch(() => setGithub({ loading: false, connected: false, login: null, repo: null }))
  }, [signedIn, project.id])
  useEffect(() => refreshGithub(), [refreshGithub])
  // Back from the OAuth round-trip (?github=connected|error): show the GitHub view.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('github')) setSidebar('github')
  }, [])

  // ---- persistence: pane sizes and code drafts are per-browser conveniences -
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(LAYOUT_KEY) ?? 'null')
      if (!saved || typeof saved !== 'object') return
      const pick = (key: keyof Layout) => (Number.isFinite(saved[key]) ? Math.max(LAYOUT_MIN[key], saved[key]) : DEFAULT_LAYOUT[key])
      setLayout({ explorer: pick('explorer'), mission: pick('mission'), panel: pick('panel') })
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

  useEffect(() => {
    if (!isCodeLevel(level) || preview) return
    try {
      const draft = window.localStorage.getItem(draftKey(project.id, level.id))
      if (draft !== null) setCode(draft)
    } catch {
      // no drafts in this browser
    }
  }, [level, project.id, preview])
  useEffect(() => {
    if (!isCodeLevel(level) || preview) return
    const timer = window.setTimeout(() => {
      try {
        if (code === starter) window.localStorage.removeItem(draftKey(project.id, level.id))
        else window.localStorage.setItem(draftKey(project.id, level.id), code)
      } catch {
        // storage unavailable
      }
    }, 500)
    return () => window.clearTimeout(timer)
  }, [code, starter, level, project.id, preview])

  const resize = (key: keyof Layout) => (value: number) => setLayout((current) => ({ ...current, [key]: value }))
  const resetSize = (key: keyof Layout) => () => setLayout((current) => ({ ...current, [key]: DEFAULT_LAYOUT[key] }))
  const maxSideWidth = (other: number, share: number) => () => Math.min(window.innerWidth * share, window.innerWidth - 48 - other - EDITOR_MIN_WIDTH)
  const maxPanelHeight = () => Math.min(window.innerHeight * 0.6, window.innerHeight - CHROME_HEIGHT - EDITOR_MIN_HEIGHT)

  // ---- the project tree at this point of the journey ----------------------
  const base = useMemo(() => filesBefore(project, index), [project, index])
  const files = useMemo(() => {
    switch (level.kind) {
      case 'explore':
        return layer(base, level.adds, true)
      case 'command':
        return layer(base, level.steps.slice(0, stepIndex).flatMap((step) => step.adds ?? []), true)
      case 'edit':
      case 'bugfix':
        return layer(base, [{ path: level.path, about: level.about, content: code, challenge: true }], true)
      case 'build':
        return layer(base, [{ path: level.path, about: level.about, challenge: true }], true)
      case 'architecture':
        return base
    }
  }, [base, level, stepIndex, code])
  const fileList = useMemo(() => [...files.values()], [files])
  const terms = useMemo(() => termsFor(project.glossary, level), [project.glossary, level])
  // The journey's request flow, with the stops this level's files belong to. Hidden on the architecture level itself.
  const flow = useMemo<FlowContext | null>(() => {
    const finale = project.levels.find((item) => item.kind === 'architecture')
    if (!finale || finale.kind !== 'architecture' || finale.id === level.id) return null
    const paths = new Set(outputOf(level).map((file) => file.path))
    return { nodes: finale.nodes, current: new Set(finale.nodes.filter((node) => node.files.some((path) => paths.has(path))).map((node) => node.id)), returnTrip: finale.returnTrip }
  }, [project, level])

  const openFile = (path: string) => {
    if (path.endsWith('/') || !files.has(path)) return
    setTabs((current) => (current.includes(path) ? current : [...current, path]))
    setActiveTab(path)
    if (newFiles.some((file) => file.path === path)) setOpened((current) => new Set(current).add(path))
  }
  const closeTab = (tab: string) => {
    const remaining = tabs.filter((item) => item !== tab)
    setTabs(remaining)
    if (activeTab === tab) setActiveTab(remaining[Math.max(0, tabs.indexOf(tab) - 1)] ?? null)
  }

  // ---- passing a level ----------------------------------------------------
  /** Checks locally for instant feedback, then saves. Returns whether the answer was right. */
  const submit = async (submission: Submission) => {
    if (!verifyLevel(level, submission).ok) {
      setWrong((count) => count + 1)
      return false
    }
    const stars = levelStars(wrong, hints)
    const xp = xpFor(level)
    // XP only counts the first time a level is passed, so a replay never ranks up.
    const rankAfter = rankFor(totalXp + (previous ? 0 : xp)).rank
    const rankUp = rankAfter > rank.rank ? rankAfter : null
    setPending(submission)
    setSaveError(null)
    setMissionOpen(true)

    if (signedIn) {
      setPhase('saving')
      const response = await fetch(`/api/journeys/${project.id}/levels/${level.id}`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ submission, wrongAttempts: wrong, hints }),
      }).catch(() => null)
      const data = await response?.json().catch(() => null)
      if (!response?.ok) {
        setPhase('playing')
        setSaveError(data?.error ?? 'Your answer is right, but it could not be saved. Check your connection and save again.')
        return true
      }
      learner.recordLevel(data.progress as LevelProgress)
      setReward({ stars: data.progress.stars, xp, rankUp })
    } else {
      if (!preview) learner.recordLevel({ projectId: project.id, levelId: level.id, stars, xp, completedAt: new Date().toISOString() })
      setReward({ stars, xp, rankUp })
    }
    setPhase('passed')
    return true
  }

  // ---- explore ---------------------------------------------------------------
  const allOpened = newFiles.every((file) => opened.has(file.path))
  const checkQuiz = async () => {
    if (level.kind !== 'explore' || !level.quiz || answer === null) return
    const right = await submit({ answer })
    setQuizResult(right ? 'right' : 'wrong')
  }

  // ---- edit / bugfix ---------------------------------------------------------
  const runTests = () => {
    if (!isCodeLevel(level)) return
    const codeLevel = level as Extract<Level, { kind: 'edit' | 'bugfix' }>
    const outcome = runChecks(code, codeLevel.path, codeLevel.checks)
    const failing = outcome.filter((result) => !result.passed)
    setResults(outcome)
    setPanelOpen(true)
    setPanelTab('terminal')
    print(
      { kind: 'input', prompt: prompt, text: 'npm test' },
      { kind: failing.length ? 'error' : 'success', text: `${failing.length ? ' FAIL ' : ' PASS '} ${codeLevel.path}` },
      ...outcome.map((result): TerminalLine => ({ kind: result.passed ? 'success' : 'error', text: `   ${result.passed ? '✓' : '✕'} ${result.name}` })),
      { kind: 'output', text: `\nTests: ${failing.length ? `${failing.length} failed, ` : ''}${outcome.length - failing.length} passed, ${outcome.length} total\n` },
    )
    if (failing.length) setWrong((count) => count + 1)
    else void submit({ code })
  }

  const showProblems = () => {
    setPanelOpen(true)
    setPanelTab('problems')
  }

  // ---- build -------------------------------------------------------------------
  const blocks = level.kind === 'build' ? level.blocks : []
  const blockById = (id: string | null) => blocks.find((block) => block.id === id)
  const codeFor = (id: string) => blockById(id)?.code ?? ''
  const paletteOrder = useMemo(
    () => [...blocks].sort((a, b) => (a.id.split('').reduce((n, c) => n + c.charCodeAt(0), 0) % 7) - (b.id.split('').reduce((n, c) => n + c.charCodeAt(0), 0) % 7) || a.id.localeCompare(b.id)),
    [blocks],
  )
  const unplaced = paletteOrder.filter((block) => !slots.includes(block.id))
  const buildSolved = phase === 'passed' && level.kind === 'build'
  const statuses: SlotStatus[] = slots.map((id, position) => (!buildChecked ? null : id === null ? 'empty' : id === order[position] ? 'correct' : 'wrong'))

  const moveBlock = (blockId: string, to: number | null) => {
    const from = slots.indexOf(blockId)
    if (from === to || (to === null && from < 0)) return
    const nextSlots = [...slots]
    if (to === null) nextSlots[from] = null
    else {
      if (from >= 0) nextSlots[from] = nextSlots[to]
      nextSlots[to] = blockId
    }
    setSlots(nextSlots)
    setBuildChecked(false)
  }
  const placeNext = (blockId: string) => {
    const empty = slots.indexOf(null)
    if (empty >= 0) moveBlock(blockId, empty)
  }
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 4 } }), useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }))
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
  const checkBuild = async () => {
    setBuildChecked(true)
    // Problems explains each wrong slot, including why a decoy block is wrong.
    if (!(await submit({ order: slots }))) showProblems()
  }

  // ---- architecture --------------------------------------------------------------
  const placeNode = (id: string) => {
    const empty = arrangement.indexOf(null)
    if (empty < 0) return
    setArrangement((current) => current.map((item, position) => (position === empty ? id : item)))
    setFlowChecked(false)
  }
  const removeNode = (position: number) => {
    setArrangement((current) => current.map((item, at) => (at === position ? null : item)))
    setFlowChecked(false)
  }
  const checkFlow = async () => {
    setFlowChecked(true)
    if (!(await submit({ order: arrangement }))) showProblems()
  }

  // ---- terminal ------------------------------------------------------------------
  const prompt = `${env ? `${env} ` : ''}${project.projectName}${cwd ? `/${cwd}` : ''} $`
  const listDir = (dir: string, all: boolean) => {
    const prefix = dir ? `${dir}/` : ''
    const names = new Set<string>()
    for (const path of files.keys()) {
      if (!path.startsWith(prefix) || path === prefix) continue
      const [first, ...rest] = path.slice(prefix.length).split('/')
      if (all || !first.startsWith('.')) names.add(rest.length ? `${first}/` : first)
    }
    return [...names].sort((a, b) => a.localeCompare(b))
  }

  const giveHint = () => {
    if (phase === 'passed') return
    const nextLevel = hintLevel + 1
    setHints((count) => count + 1)
    setHintLevel(nextLevel)
    switch (level.kind) {
      case 'explore': {
        if (!allOpened) return setHintNote('Open each new file from the list (or the explorer). The ABOUT box under the explorer explains every file and folder.')
        const wrongOption = level.quiz?.options.findIndex((_, option) => option !== level.quiz?.answer && !eliminated.has(option)) ?? -1
        if (wrongOption >= 0) setEliminated((current) => new Set(current).add(wrongOption))
        return setHintNote('One wrong answer is crossed out.')
      }
      case 'command': {
        const step = level.steps[stepIndex]
        if (!step) return
        return setHintNote(nextLevel === 1 ? step.hint : `Type: ${step.accept[0]}`)
      }
      case 'edit':
      case 'bugfix': {
        const outcome = runChecks(code, level.path, level.checks)
        const failing = outcome.find((result) => !result.passed)
        return setHintNote(failing ? `${failing.name}: ${failing.hint}` : 'Every check passes. Run the tests to finish the level.')
      }
      case 'build': {
        const position = slots.findIndex((id, at) => id !== order[at])
        if (position < 0) return setHintNote('Every block is in place. Press Check.')
        const guide = level.steps?.[position]
        if (nextLevel === 1 && guide) return setHintNote(`Step ${position + 1} is “${guide.kind}”: ${guide.goal}`)
        moveBlock(order[position], position)
        setHinted((current) => new Set(current).add(position))
        return setHintNote(`Step ${position + 1} was filled in for you: ${blockById(order[position])?.label}.`)
      }
      case 'architecture': {
        const position = arrangement.findIndex((id, at) => id !== level.nodes[at].id)
        if (position < 0) return setHintNote('Everything is in order. Press Check order.')
        const correct = level.nodes[position]
        setArrangement((current) => {
          const nextArrangement = current.map((id) => (id === correct.id ? null : id))
          nextArrangement[position] = correct.id
          return nextArrangement
        })
        return setHintNote(`Stop ${position + 1} is ${correct.label}: ${correct.role}`)
      }
    }
  }

  const runCommand = (raw: string) => {
    const command = raw.trim()
    const echo: TerminalLine = { kind: 'input', prompt, text: raw }
    if (!command) return print(echo)
    if (command === 'clear' || command === 'cls') return setTerminal([])
    print(echo)

    if (command === 'help') {
      return print({
        kind: 'info',
        text: 'This terminal runs the commands each level teaches, plus:\n  ls [-a]      list the current folder\n  cat <file>   print a file\n  pwd          show where you are\n  hint         a clue for the current step\n  clear        clear the screen',
      })
    }
    if (command === 'hint') return giveHint()
    if (command === 'pwd') return print({ kind: 'output', text: `/${project.projectName}${cwd ? `/${cwd}` : ''}` })
    const ls = /^(?:ls|dir)(?:\s+(-\w+))?(?:\s+(\S+))?$/.exec(command)
    if (ls) {
      const dir = ls[2] ? resolvePath(cwd, ls[2]) : cwd
      const entries = listDir(dir, !!ls[1]?.includes('a'))
      return print({ kind: 'output', text: entries.length ? entries.join('  ') : '' })
    }
    const cat = /^(?:cat|type)\s+(\S+)$/.exec(command)
    if (cat) {
      const file = files.get(resolvePath(cwd, cat[1]))
      if (!file || file.path.endsWith('/')) return print({ kind: 'error', text: `cat: ${cat[1]}: No such file or directory` })
      return print({ kind: 'output', text: file.content ?? '' })
    }

    if (level.kind === 'command' && phase === 'playing' && stepIndex < level.steps.length) {
      const step = level.steps[stepIndex]
      if (matchesStep(step, command)) {
        if (step.output) print({ kind: 'output', text: step.output })
        if (step.adds?.some((file) => !file.generated)) print({ kind: 'success', text: `✓ ${step.adds.filter((file) => !file.generated).map((file) => file.path).join(', ')}` })
        if (step.cwd !== undefined) setCwd(step.cwd)
        if (step.env !== undefined) setEnv(step.env)
        const nextTyped = [...typed, command]
        setTyped(nextTyped)
        setStepIndex(nextTyped.length)
        setHintLevel(0)
        setHintNote(null)
        setRejected([])
        if (nextTyped.length === level.steps.length) void submit({ commands: nextTyped })
        return
      }
      setWrong((count) => count + 1)
      setRejected((current) => [...current.slice(-4), command])
      const sameTool = command.split(' ')[0] === step.accept[0].split(' ')[0]
      return print({ kind: 'error', text: sameTool ? 'Right tool, but not quite the right arguments. Type hint for a clue.' : 'That is not what this step needs. Type hint for a clue.' })
    }

    if (isCodeLevel(level) && /^(?:npm (?:run )?test|npm t|npx jest|jest|pytest|python3? manage\.py test)$/.test(command)) {
      setTerminal((current) => current.slice(0, -1))
      return runTests()
    }
    print({ kind: 'error', text: `${command.split(' ')[0]}: this level does not need that command. Type help to see what this terminal can do.` })
  }

  // ---- reset -----------------------------------------------------------------------
  const reset = () => {
    setPhase('playing')
    setReward(null)
    setSaveError(null)
    setWrong(0)
    setHints(0)
    setHintLevel(0)
    setHintNote(null)
    setAnswer(null)
    setQuizResult(null)
    setEliminated(new Set())
    setStepIndex(0)
    setTyped([])
    setCwd(startCwd)
    setEnv(startEnv)
    setCode(starter)
    setResults(null)
    setSlots(Array(order.length).fill(null))
    setBuildChecked(false)
    setHinted(new Set())
    if (level.kind === 'architecture') setArrangement(Array(level.nodes.length).fill(null))
    setFlowChecked(false)
    setRejected([])
    setTerminal(welcome)
  }

  // ---- render ----------------------------------------------------------------------
  const initials = session.user?.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const passed = phase === 'passed'
  const activeFile = activeTab ? files.get(activeTab) : undefined

  // ---- bottom panel: slot guide and problems -----------------------------------------
  const slotGuide: SlotGuideRow[] | null =
    level.kind === 'build'
      ? order.map((_, index) => ({ kind: level.steps?.[index]?.kind ?? `Step ${index + 1}`, goal: level.steps?.[index]?.goal ?? '', placed: blockById(slots[index])?.label, status: statuses[index] }))
      : null
  const focusStep = (index: number) => {
    if (level.kind !== 'build') return
    openFile(level.path)
    // Wait for the file to render if another tab was active.
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => document.querySelector(`[data-slot="${index}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })))
  }
  const problems: Problem[] = []
  if (passed) problems.push({ severity: 'success', message: `${level.title}: passed.` })
  else {
    if (isCodeLevel(level)) for (const result of results ?? []) if (!result.passed) problems.push({ severity: 'error', message: `Failing test: ${result.name}` })
    if (level.kind === 'build' && buildChecked)
      statuses.forEach((status, index) => {
        if (status === 'empty') problems.push({ severity: 'warning', message: `Step ${index + 1} is empty.` })
        if (status === 'wrong') problems.push({ severity: 'error', message: `“${blockById(slots[index])?.label}” doesn't belong at step ${index + 1}.`, detail: blockById(slots[index])?.whyWrong })
      })
    if (level.kind === 'architecture' && flowChecked)
      arrangement.forEach((id, index) => {
        if (id && id !== level.nodes[index].id) problems.push({ severity: 'error', message: `Stop ${index + 1}: “${level.nodes.find((node) => node.id === id)?.label}” is not in the right place.` })
      })
    if (level.kind === 'explore' && quizResult === 'wrong') problems.push({ severity: 'error', message: 'That answer is not right yet.' })
    for (const command of rejected) problems.push({ severity: 'warning', message: `“${command}” is not what step ${stepIndex + 1} needs.` })
    if (hintNote) problems.push({ severity: 'hint', message: hintNote })
  }
  const primary =
    isCodeLevel(level) ? { label: 'Run tests', icon: Play, action: runTests } : level.kind === 'build' ? { label: 'Check', icon: Check, action: checkBuild } : level.kind === 'architecture' ? { label: 'Check order', icon: Check, action: checkFlow } : null
  const pushPath = isCodeLevel(level) || level.kind === 'build' ? (level as { path: string }).path : outputOf(level).filter((file) => !file.path.endsWith('/') && !file.generated).at(-1)?.path ?? 'README.md'

  const palette = world ? worldThemes[world.theme] : worldThemes.village
  const isBoss = !!level.boss
  const bestStars = previous ? previous.stars : null
  const KindIcon = kindIcons[level.kind]

  const objectiveCounts = useMemo(() => {
    if (level.kind === 'command') {
      const total = level.steps.length
      const doneCount = Math.min(total, stepIndex)
      return { done: doneCount, total }
    }
    if (level.kind === 'edit' || level.kind === 'bugfix') {
      const checks = (level as Extract<Level, { kind: 'edit' | 'bugfix' }>).checks
      const total = checks.length
      const doneCount = phase === 'passed' ? total : results ? results.filter((r) => r.passed).length : 0
      return { done: doneCount, total }
    }
    if (level.kind === 'build') {
      const total = order.length
      const doneCount = phase === 'passed' ? total : slots.filter((id, i) => id !== null && statuses[i] === 'correct').length
      return { done: doneCount, total }
    }
    if (level.kind === 'architecture') {
      const total = level.nodes.length
      const doneCount = phase === 'passed' ? total : arrangement.filter((id, i) => id === level.nodes[i].id).length
      return { done: doneCount, total }
    }
    if (level.kind === 'explore') {
      const total = newFiles.length + (level.quiz ? 1 : 0)
      const filesDone = opened.size
      const quizDone = phase === 'passed' || quizResult === 'right' ? 1 : 0
      return { done: Math.min(total, filesDone + quizDone), total }
    }
    return { done: phase === 'passed' ? 1 : 0, total: 1 }
  }, [level, stepIndex, phase, results, order.length, slots, statuses, arrangement, newFiles.length, opened.size, quizResult])

  const [objectiveFlashed, setObjectiveFlashed] = useState(false)
  const prevObjectiveDoneRef = useRef(objectiveCounts.done)
  useEffect(() => {
    if (objectiveCounts.done > prevObjectiveDoneRef.current) {
      setObjectiveFlashed(true)
      const timer = window.setTimeout(() => setObjectiveFlashed(false), 600)
      prevObjectiveDoneRef.current = objectiveCounts.done
      return () => window.clearTimeout(timer)
    }
    prevObjectiveDoneRef.current = objectiveCounts.done
  }, [objectiveCounts.done])

  const testCounts = useMemo(() => {
    if (!results) return null
    return { pass: results.filter((r) => r.passed).length, total: results.length }
  }, [results])
  const nextLink = next ? { title: next.title, href: preview ? undefined : levelHref(next.id) } : null

  if (!preview && !learner.ready) {
    return (
      <LoadingState label="Loading level…" className="min-h-dvh bg-(--ide-bg)">
        <div className="flex h-dvh flex-col overflow-hidden bg-(--ide-bg) text-(--ide-fg)">
          {/* Header bar skeleton */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-(--ide-border) bg-(--ide-title-bg) px-4">
            <div className="flex items-center gap-3">
              <Skeleton scope="ide" shape="line" className="h-4 w-16" />
              <div className="h-4 w-px bg-(--ide-border)" />
              <Skeleton scope="ide" shape="line" className="h-4 w-40" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton scope="ide" shape="line" className="h-4 w-20" />
            </div>
          </div>

          {/* Main workspace layout */}
          <div className="flex min-h-0 flex-1">
            {/* Activity bar skeleton */}
            <div className="flex w-12 shrink-0 flex-col items-center gap-4 border-r border-(--ide-border) bg-(--ide-activity-bg) py-3">
              <Skeleton scope="ide" shape="circle" className="size-6" />
              <Skeleton scope="ide" shape="circle" className="size-6" />
            </div>

            {/* Explorer pane skeleton */}
            <div className="hidden w-60 shrink-0 flex-col border-r border-(--ide-border) bg-(--ide-side-bg) p-3 sm:flex">
              <Skeleton scope="ide" shape="line" className="mb-4 h-3 w-20" />
              <div className="space-y-2.5">
                <Skeleton scope="ide" shape="line" className="h-3 w-32" />
                <Skeleton scope="ide" shape="line" className="h-3 w-40" />
                <Skeleton scope="ide" shape="line" className="h-3 w-28" />
                <Skeleton scope="ide" shape="line" className="h-3 w-36" />
              </div>
            </div>

            {/* Center: Editor tabs and content */}
            <div className="flex min-w-0 flex-1 flex-col bg-(--ide-editor-bg)">
              {/* Tabs */}
              <div className="flex h-9 border-b border-(--ide-border) bg-(--ide-tab-bg) px-2">
                <div className="flex items-center gap-2 border-r border-(--ide-border) px-3">
                  <Skeleton scope="ide" shape="line" className="h-3 w-24" />
                </div>
              </div>
              {/* Editor lines */}
              <div className="flex-1 p-6">
                <SkeletonText scope="ide" lines={8} lineClassName="h-3.5" />
              </div>
            </div>

            {/* Right: Mission panel skeleton */}
            <div className="hidden w-80 shrink-0 flex-col border-l border-(--ide-border) bg-(--ide-side-bg) p-5 lg:flex">
              <div className="space-y-3">
                <Skeleton scope="ide" shape="line" className="h-3 w-16" />
                <Skeleton scope="ide" shape="line" className="h-5 w-48" />
                <Skeleton scope="ide" shape="line" className="h-3.5 w-full" />
              </div>
              <div className="mt-8 space-y-4">
                <Skeleton scope="ide" shape="line" className="h-3 w-24" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton scope="ide" shape="circle" className="size-4" />
                      <Skeleton scope="ide" shape="line" className="h-3 flex-1" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Status bar skeleton */}
          <div className="flex h-6 shrink-0 items-center justify-between border-t border-(--ide-border) bg-(--ide-status-bg) px-3">
            <Skeleton scope="ide" shape="line" className="h-2.5 w-32" />
            <Skeleton scope="ide" shape="line" className="h-2.5 w-24" />
          </div>
        </div>
      </LoadingState>
    )
  }

  if (!unlocked) {
    return (
      <main className="grid min-h-dvh place-items-center bg-(--ide-bg) p-6 text-center text-[13px] text-(--ide-fg)">
        <div className="max-w-sm">
          <Lock aria-hidden className="mx-auto mb-3 size-8 text-(--ide-dim)" />
          <h1 className="text-[16px] font-semibold text-(--ide-heading)">{level.title} is locked</h1>
          <p className="mt-2 text-(--ide-muted)">Levels open in order. Finish “{blocking?.title}” first.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/" className="rounded-sm border border-(--ide-border-strong) px-3 py-1.5 hover:bg-(--ide-border)">Back to the map</Link>
            {blocking && <Link href={levelHref(blocking.id)} className="rounded-sm bg-[#0078d4] px-3 py-1.5 text-white hover:bg-[#026ec1]">Go to {blocking.title}</Link>}
          </div>
        </div>
      </main>
    )
  }

  const lessonView = (
    <div className="mx-auto max-w-3xl px-6 py-6 text-[13px] leading-6 text-(--ide-fg)">
      <div className="text-[11px] font-semibold tracking-wide text-(--ide-muted)">{world?.title.toUpperCase()} · {kindLabels[level.kind].toUpperCase()}</div>
      <h2 className="mt-1 text-[20px] font-semibold text-(--ide-heading)">{level.title}</h2>
      <LessonText text={level.lesson} className="mt-4" />
      {level.kind === 'command' && (
        <p className="mt-6 flex items-center gap-2 rounded-md border border-(--ide-link)/40 bg-(--ide-link)/10 p-3 text-[12px] text-(--ide-fg)">
          <SquareTerminal aria-hidden className="size-4 shrink-0 text-(--ide-link)" /> Type in the terminal below. Each step&apos;s goal is in the mission panel on the right.
        </p>
      )}
    </div>
  )

  const editor = activeTab === LESSON_TAB ? (
    lessonView
  ) : activeTab === FLOW_TAB && level.kind === 'architecture' ? (
    <FlowBoard level={level} arrangement={arrangement} checked={flowChecked} passed={passed} onPlace={placeNode} onRemove={removeNode} onOpenFile={openFile} />
  ) : activeFile && isCodeLevel(level) && activeFile.path === (level as { path: string }).path ? (
    <EditableCode
      value={code}
      language={languageFor(activeFile.path)}
      about={activeFile.about}
      instruction={level.kind === 'bugfix' ? 'Find and fix the bugs, then run the tests.' : 'Complete the TODOs, then run the tests.'}
      readOnly={passed}
      onChange={setCode}
      onSave={runTests}
    />
  ) : activeFile && level.kind === 'build' && activeFile.path === level.path ? (
    <ChallengeEditor
      about={level.about}
      scaffold={level.scaffold}
      language={languageFor(level.path)}
      slots={slots}
      statuses={statuses}
      hinted={hinted}
      activeBlock={hovered}
      codeFor={codeFor}
      onRemove={(position) => {
        const id = slots[position]
        if (id) moveBlock(id, null)
      }}
      onHover={(id) => {
        setHovered(id)
        if (id) setInspected(id)
      }}
    />
  ) : activeFile ? (
    <FileView file={activeFile} language={languageFor(activeFile.path)} />
  ) : (
    <div className="grid h-full min-h-60 place-items-center p-6 text-center text-[13px] text-(--ide-dim)">
      <div>
        <Files className="mx-auto mb-3 size-10" strokeWidth={1} />
        Open a file from the explorer.
      </div>
    </div>
  )

  const tabLabel = (tab: string) => (tab === LESSON_TAB ? 'Lesson' : tab === FLOW_TAB ? 'Architecture' : tab.split('/').pop())
  const tabIcon = (tab: string) => (tab === LESSON_TAB ? <BookOpen aria-hidden className="size-4 text-[#519aba]" /> : tab === FLOW_TAB ? <Network aria-hidden className="size-4 text-(--ide-keyword)" /> : <FileIcon path={tab} />)

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={finishDrag}>
        <div
          className="flex min-h-dvh flex-col bg-(--ide-bg) font-sans text-[13px] text-(--ide-fg) lg:h-dvh lg:min-h-0"
          style={{ '--explorer-w': `${layout.explorer}px`, '--mission-w': `${layout.mission}px`, '--panel-h': `${layout.panel}px` } as CSSProperties}
        >
          {/* Level header / title bar */}
          <header className="relative flex h-11 shrink-0 items-center justify-between border-b border-(--ide-border) bg-(--ide-bar) px-2 sm:h-12 sm:px-3 overflow-hidden">
            {/* Faint wash across left 40% */}
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-2/5"
              style={{
                background: isBoss
                  ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.03) 70%, transparent 100%)'
                  : `linear-gradient(90deg, ${palette.color}1f 0%, ${palette.color}05 70%, transparent 100%)`,
              }}
              aria-hidden
            />

            {/* Left side */}
            <div className="relative z-1 flex min-w-0 items-center gap-2 sm:gap-2.5">
              {preview ? (
                <button
                  type="button"
                  onClick={onExit}
                  aria-label="Back to editor"
                  className="flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-[12px] font-medium text-(--ide-fg) hover:bg-(--ide-border) transition-colors"
                >
                  <ArrowLeft className="size-4" />
                  <span className="hidden sm:inline">Back to editor</span>
                </button>
              ) : (
                <Link
                  href={mapHref}
                  aria-label="Back to the map"
                  className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[12px] font-medium text-(--ide-fg) hover:bg-(--ide-border) transition-colors"
                  title="Back to the map"
                >
                  <ChevronLeft className="size-4" />
                  <span className="hidden sm:inline">Map</span>
                </Link>
              )}

              {/* 4px vertical stripe */}
              <span
                className="h-5 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: isBoss ? '#ef4444' : palette.color }}
                aria-hidden
              />

              {/* Kind or Boss pill */}
              {isBoss ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#ef4444]/30 bg-[#ef4444]/15 px-2 py-0.5 text-[11px] font-semibold text-[#ef4444]">
                  <Skull className="size-3" aria-hidden />
                  <span>BOSS</span>
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-(--ide-border-strong) bg-(--ide-bg) px-2 py-0.5 text-[11px] font-medium text-(--ide-fg)">
                  <KindIcon className="size-3" aria-hidden />
                  <span className="hidden xs:inline">{kindLabels[level.kind]}</span>
                </span>
              )}

              {/* Breadcrumb */}
              <span className="hidden text-[13px] text-(--ide-muted) truncate md:inline">
                {world?.title ?? 'World'} · Level {index + 1}
              </span>

              {/* Level title */}
              <h1
                className="font-display text-[16px] sm:text-[18px] font-semibold text-(--ide-heading) truncate max-w-[160px] sm:max-w-xs lg:max-w-md"
                title={level.title}
              >
                {level.title}
              </h1>
            </div>

            {/* Right side */}
            <div className="relative z-1 ml-auto flex shrink-0 items-center gap-1.5">
              {bestStars !== null && (
                <span
                  className="mr-1 hidden items-center gap-0.5 text-[#f5b301] sm:inline-flex"
                  aria-label={`Best score: ${bestStars} of 3 stars`}
                >
                  {[0, 1, 2].map((i) => (
                    <Star
                      key={i}
                      aria-hidden
                      className={cn('size-3.5', i < bestStars ? 'fill-current' : 'opacity-30')}
                    />
                  ))}
                </span>
              )}

              {preview && <span className="rounded-sm bg-(--ide-warning)/20 px-2 py-0.5 text-[11px] text-(--ide-warning-soft)">Preview</span>}
              <ToolButton icon={RotateCcw} label="Reset" onClick={reset} />
              <ToolButton icon={Lightbulb} label="Hint" onClick={giveHint} disabled={passed} />
              {primary && (
                <ToolButton
                  icon={primary.icon}
                  label={primary.label}
                  onClick={() => void primary.action()}
                  disabled={passed || phase === 'saving' || (level.kind === 'architecture' && arrangement.includes(null))}
                  variant="primary"
                />
              )}
              <div className="ml-1 flex items-center gap-1 border-l border-(--ide-border) pl-2">
                <SoundToggle variant="ide" className="size-7 rounded" />
                <ThemeToggle className="size-7 rounded text-(--ide-muted) hover:bg-(--ide-border) hover:text-(--ide-heading)" iconClassName="size-3.5" />
                {session.status === 'signed-in' ? (
                  <>
                    <Link href="/profile" title={`${session.user.name} · ${session.user.email}`} className="grid size-6 place-items-center rounded-full bg-[#0078d4] text-[10px] font-semibold text-white">{initials}</Link>
                    <button type="button" onClick={session.signOut} aria-label="Sign out" title="Sign out" className="rounded p-1 text-(--ide-muted) hover:bg-(--ide-border) hover:text-(--ide-heading)">
                      <LogOut className="size-3.5" />
                    </button>
                  </>
                ) : session.status === 'guest' && !preview ? (
                  <Link href={loginHref(pathname)} className="flex h-7 items-center rounded px-2 text-[12px] text-(--ide-fg) hover:bg-(--ide-border)">Sign in</Link>
                ) : null}
              </div>
            </div>
          </header>

          <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
            {/* Activity bar */}
            <nav aria-label="Views" className="hidden w-12 shrink-0 flex-col border-r border-(--ide-border) bg-(--ide-bar) lg:flex">
              <ActivityItem icon={Files} label="Explorer" active={sidebar === 'explorer'} onClick={() => setSidebar((current) => (current === 'explorer' ? null : 'explorer'))} />
              <ActivityItem icon={PanelRight} label="Mission" active={missionOpen} onClick={() => setMissionOpen((open) => !open)} />
              <ActivityItem icon={PanelBottom} label="Terminal" active={panelOpen} onClick={() => setPanelOpen((open) => !open)} />
              {!preview && (
                <ActivityItem icon={GitBranch} label={github.connected ? `GitHub — @${github.login}` : 'GitHub'} active={sidebar === 'github'} onClick={() => setSidebar((current) => (current === 'github' ? null : 'github'))} indicator={github.connected} />
              )}
              <div className="mt-auto">
                {session.status === 'guest' && !preview ? (
                  <Link href={loginHref(pathname)} aria-label="Sign in" title="Sign in" className="flex size-12 items-center justify-center text-(--ide-icon) hover:text-(--ide-fg)">
                    <UserRound className="size-6" strokeWidth={1.5} />
                  </Link>
                ) : (
                  <Link href="/profile" aria-label="Profile" title="Profile" className="flex size-12 items-center justify-center text-(--ide-icon) hover:text-(--ide-fg)">
                    <UserRound className="size-6" strokeWidth={1.5} />
                  </Link>
                )}
              </div>
            </nav>

            {/* Explorer / GitHub */}
            {sidebar && (
              <aside className="relative h-72 shrink-0 border-b border-(--ide-border) bg-(--ide-bar) lg:h-auto lg:w-(--explorer-w) lg:max-w-[40vw] lg:border-b-0 lg:border-r">
                <Sash axis="x" label="Resize explorer" value={layout.explorer} min={LAYOUT_MIN.explorer} max={maxSideWidth(missionOpen ? layout.mission : 0, 0.4)} onChange={resize('explorer')} onReset={resetSize('explorer')} className="right-0 translate-x-1/2" />
                {sidebar === 'github' ? (
                  <GithubPanel
                    signedIn={signedIn}
                    login={github.login}
                    oauthAvailable={githubOauth}
                    repo={github.repo}
                    loading={github.loading}
                    journeyId={project.id}
                    projectName={project.projectName}
                    challengeId={level.id}
                    challengeTitle={level.title}
                    challengePath={pushPath}
                    completed={passed || !!previous}
                    saveState={phase === 'saving' ? 'saving' : 'saved'}
                    lockedHint="Pass this level to unlock pushes. Every level you pass saves your project automatically."
                    signInHref={loginHref(pathname)}
                    onChanged={refreshGithub}
                  />
                ) : (
                  <FileExplorer
                    projectName={project.projectName}
                    files={fileList}
                    folders={project.folders}
                    activePath={activeTab}
                    challengeBadge={results ? `${results.filter((result) => result.passed).length}/${results.length}` : level.kind === 'build' ? `${slots.filter(Boolean).length}/${order.length}` : undefined}
                    onOpen={openFile}
                  />
                )}
              </aside>
            )}

            {/* Editor group */}
            <main className="flex min-w-0 flex-1 flex-col lg:min-h-0">
              <div role="tablist" aria-label="Open files" className="flex h-9 shrink-0 overflow-x-auto border-b border-(--ide-border) bg-(--ide-bar)">
                {tabs.map((tab) => {
                  const isActive = tab === activeTab
                  return (
                    <div key={tab} className={cn('group flex shrink-0 items-center gap-1.5 border-r border-(--ide-border) pl-3 pr-1 text-[13px]', isActive ? 'border-t border-t-[#0078d4] bg-(--ide-bg) text-(--ide-heading)' : 'border-t border-t-transparent text-(--ide-muted) hover:bg-(--ide-bg)/60')}>
                      <button type="button" role="tab" aria-selected={isActive} onClick={() => setActiveTab(tab)} className="flex h-full items-center gap-1.5">
                        {tabIcon(tab)}
                        <span className={cn(files.get(tab)?.challenge && 'text-(--ide-warning-soft)')}>{tabLabel(tab)}</span>
                      </button>
                      <button type="button" onClick={() => closeTab(tab)} aria-label={`Close ${tabLabel(tab)}`} className={cn('rounded p-0.5 hover:bg-(--ide-border-strong)', isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
                        <X className="size-3.5" />
                      </button>
                    </div>
                  )
                })}
                {!tabs.includes(LESSON_TAB) && (
                  <button type="button" onClick={() => { setTabs((current) => [...current, LESSON_TAB]); setActiveTab(LESSON_TAB) }} className="flex shrink-0 items-center gap-1.5 px-3 text-[12px] text-(--ide-muted) hover:text-(--ide-heading)">
                    <BookOpen aria-hidden className="size-3.5" /> Lesson
                  </button>
                )}
              </div>

              {activeTab && !activeTab.startsWith('#') && (
                <div className="flex h-6 shrink-0 items-center gap-0.5 overflow-x-auto px-3 text-[12px] text-(--ide-muted)">
                  {activeTab.split('/').map((part, position, parts) => (
                    <span key={position} className="flex shrink-0 items-center gap-0.5">
                      {position === parts.length - 1 && <FileIcon path={part} className="size-3.5" />}
                      <span className={position === parts.length - 1 ? 'text-(--ide-fg)' : undefined}>{part}</span>
                      {position < parts.length - 1 && <ChevronRight className="size-3.5" />}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex-1 overflow-auto bg-(--ide-bg) lg:min-h-0">{editor}</div>

              {panelOpen && (
                <div className="relative h-64 shrink-0 border-t border-(--ide-border) bg-(--ide-bar) lg:h-(--panel-h) lg:max-h-[60vh]">
                  <Sash axis="y" invert label="Resize panel" value={layout.panel} min={LAYOUT_MIN.panel} max={maxPanelHeight} onChange={resize('panel')} onReset={resetSize('panel')} className="top-0 -translate-y-1/2" />
                  <JourneyPanel
                    tab={panelTab}
                    onTab={setPanelTab}
                    onClose={() => setPanelOpen(false)}
                    terminal={<Terminal lines={terminal} prompt={prompt} onCommand={runCommand} autoFocus={level.kind === 'command'} placeholder={level.kind === 'command' && phase === 'playing' ? 'type a command…' : undefined} />}
                    steps={slotGuide}
                    fileName={level.kind === 'build' ? level.path.split('/').pop() ?? level.path : ''}
                    onStepClick={focusStep}
                    problems={problems}
                    terms={terms}
                    allTerms={project.glossary ?? []}
                    flow={flow}
                    onOpenFile={openFile}
                  />
                </div>
              )}
            </main>

            {/* Mission */}
            {missionOpen && (
              <aside aria-label="Mission" className="relative flex shrink-0 flex-col border-t border-(--ide-border) bg-(--ide-bar) lg:w-(--mission-w) lg:max-w-[45vw] lg:border-l lg:border-t-0">
                <Sash axis="x" invert label="Resize mission panel" value={layout.mission} min={LAYOUT_MIN.mission} max={maxSideWidth(sidebar ? layout.explorer : 0, 0.45)} onChange={resize('mission')} onReset={resetSize('mission')} className="left-0 -translate-x-1/2" />
                <div className={cn('flex min-h-0 flex-col', level.kind === 'build' ? 'lg:h-full' : 'overflow-y-auto lg:h-full')}>
                  <div className="flex h-9 shrink-0 items-center px-4 text-[11px] tracking-wide text-(--ide-fg-title)">MISSION</div>
                  <MissionHeader place={place} kind={level.kind} boss={level.boss} title={level.title} summary={level.summary} stars={reward?.stars ?? previous?.stars ?? null} worldColor={palette.color} />
                  {passed && reward && world && <Celebration key={level.id} colors={[worldThemes[world.theme].color, worldThemes[world.theme].deep]} boss={!!level.boss} rankUp={reward.rankUp} />}
                  {passed && reward && <CompletionCard stars={reward.stars} xp={reward.xp} next={nextLink} mapHref={mapHref} onNext={next && onNavigate ? () => onNavigate(next.id) : undefined} worldColor={palette.color} />}
                  {!passed && previous && (
                    <p className="mx-4 mb-3 rounded border border-(--ide-border-strong) p-2 text-[12px] leading-5 text-(--ide-muted)">
                      You passed this level before. Replay it, or{' '}
                      {next ? (preview ? <button type="button" onClick={() => onNavigate?.(next.id)} className="text-(--ide-link) hover:underline">go to the next one</button> : <Link href={levelHref(next.id)} className="text-(--ide-link) hover:underline">go to the next one</Link>) : 'head back to the map'}.
                    </p>
                  )}
                  {saveError && pending && (
                    <div className="mx-4 mb-3 rounded border border-(--ide-error)/50 bg-(--ide-error)/10 p-2.5 text-[12px] text-(--ide-error-soft)" role="alert">
                      {saveError}
                      <button type="button" onClick={() => void submit(pending)} className="mt-2 block rounded-sm bg-[#0078d4] px-2 py-1 text-white hover:bg-[#026ec1]">Save again</button>
                    </div>
                  )}
                  {hintNote && !passed && <HintNote text={hintNote} />}

                  {level.kind === 'explore' && (
                    <>
                      <MissionSection title={`NEW FILES ${newFiles.filter((file) => opened.has(file.path)).length}/${newFiles.length}`}>
                        <NewFiles files={newFiles} opened={opened} onOpen={openFile} />
                      </MissionSection>
                      <MissionSection title="QUESTION">
                        {level.quiz ? (
                          <QuizCard quiz={level.quiz} locked={!allOpened} answer={answer} eliminated={eliminated} result={passed || previous ? 'right' : quizResult} onAnswer={(option) => { setAnswer(option); setQuizResult(null) }} onCheck={() => void checkQuiz()} worldColor={palette.color} onOpenHint={giveHint} />
                        ) : (
                          <button type="button" disabled={!allOpened || passed} onClick={() => void submit({})} className="w-full rounded-sm bg-[#0078d4] py-1.5 text-[12px] font-semibold text-white hover:bg-[#026ec1] disabled:opacity-40">
                            {allOpened ? 'Complete level' : 'Open every new file first'}
                          </button>
                        )}
                      </MissionSection>
                    </>
                  )}

                  {level.kind === 'command' && (
                    <MissionSection title={`STEPS ${Math.min(stepIndex, level.steps.length)}/${level.steps.length}`}>
                      <CommandSteps steps={level.steps} current={stepIndex} typed={typed} worldColor={palette.color} />
                      {!panelOpen && (
                        <button type="button" onClick={() => { setPanelOpen(true); setPanelTab('terminal') }} className="mt-3 w-full rounded-sm border border-(--ide-border-strong) py-1.5 text-[12px] hover:bg-(--ide-border)">Open the terminal</button>
                      )}
                    </MissionSection>
                  )}

                  {isCodeLevel(level) && (
                    <>
                      <MissionSection title="LESSON">
                        <LessonText text={level.lesson} className="text-[12px] leading-5 text-(--ide-fg)" />
                      </MissionSection>
                      <MissionSection title="TESTS" aside={<button type="button" onClick={runTests} disabled={passed} className="rounded-sm bg-[#0078d4] px-2 py-0.5 text-[11px] font-normal tracking-normal text-white hover:bg-[#026ec1] disabled:opacity-40">Run tests</button>}>
                        <TestList checks={(level as Extract<Level, { kind: 'edit' | 'bugfix' }>).checks} results={results} />
                      </MissionSection>
                    </>
                  )}

                  {level.kind === 'architecture' && (
                    <MissionSection title="HOW TO PLAY">
                      <LessonText text={level.lesson} className="text-[12px] leading-5 text-(--ide-fg)" />
                      <p className="mt-2 text-[12px] text-(--ide-muted)">Click a stop to place it next; click a placed stop to take it back.</p>
                      {!passed && (
                        <GameButton
                          variant="primary"
                          size="md"
                          fullWidth
                          onClick={() => void checkFlow()}
                          disabled={arrangement.includes(null)}
                          className="mt-3"
                        >
                          Check order
                        </GameButton>
                      )}
                    </MissionSection>
                  )}

                  {level.kind === 'build' && (
                    <>
                      <MissionSection title="LESSON" defaultOpen={false}>
                        <LessonText text={level.lesson} className="text-[12px] leading-5 text-(--ide-fg)" />
                      </MissionSection>
                      <div className="h-[32rem] min-h-0 border-t border-(--ide-border) lg:h-auto lg:flex-1">
                        <BlockPalette
                          blocks={unplaced}
                          total={order.length}
                          placedCount={slots.filter(Boolean).length}
                          language={languageFor(level.path)}
                          codeFor={codeFor}
                          activeBlock={hovered}
                          relatedTo={() => true}
                          inspected={blockById(inspected) ?? null}
                          completed={buildSolved}
                          onPlace={placeNext}
                          onHover={(id) => {
                            setHovered(id)
                            if (id) setInspected(id)
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </aside>
            )}
          </div>

          {/* Status bar */}
          <footer className="flex h-6 shrink-0 items-center gap-3 overflow-x-auto whitespace-nowrap bg-[#007acc] px-2 text-[12px] text-white">
            <span className="flex items-center gap-1"><GitBranch className="size-3.5" />{project.projectName}</span>
            <span>{tracks[project.track].label}</span>
            <span className="hidden sm:inline">{kindLabels[level.kind]}</span>

            <div className="ml-auto flex items-center gap-3">
              {/* Game HUD items */}
              <div className="flex items-center gap-2 border-r border-white/20 pr-3">
                <GameTooltip content={`Objectives completed: ${objectiveCounts.done} of ${objectiveCounts.total}`}>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors duration-600',
                      objectiveFlashed && 'bg-[#22c55e] text-white shadow-sm'
                    )}
                  >
                    <Target className="size-3.5" aria-hidden />
                    <span className="num font-semibold">
                      Objectives {objectiveCounts.done}/{objectiveCounts.total}
                    </span>
                    <span className="sr-only">({objectiveCounts.done} of {objectiveCounts.total} objectives completed)</span>
                  </span>
                </GameTooltip>

                {testCounts && (
                  <div className="hidden sm:inline-flex">
                    <GameTooltip content={`Test checks passing: ${testCounts.pass} of ${testCounts.total}`}>
                      <span className="inline-flex items-center gap-1 px-1">
                        <FlaskConical className="size-3.5" aria-hidden />
                        <span className="num">Tests {testCounts.pass}/{testCounts.total}</span>
                        <span className="sr-only">({testCounts.pass} of {testCounts.total} tests passing)</span>
                      </span>
                    </GameTooltip>
                  </div>
                )}

                {bestStars !== null && (
                  <div className="hidden sm:inline-flex">
                    <GameTooltip content={`Best rating: ${bestStars} of 3 stars`}>
                      <span className="inline-flex items-center gap-1 px-1">
                        <Star className="size-3.5 fill-current text-[#f5b301]" aria-hidden />
                        <span className="num">Best {bestStars}/3</span>
                        <span className="sr-only">({bestStars} of 3 stars earned)</span>
                      </span>
                    </GameTooltip>
                  </div>
                )}
              </div>

              <span>Rank {rank.rank} · {totalXp} XP</span>
              <span>Level reward {xpFor(level)} XP</span>
              <span>Tries {wrong}</span>
              <span>Hints {hints}</span>
              <span className="hidden md:inline">{preview ? 'Preview: nothing is saved' : signedIn ? 'Progress saves to your account' : 'Progress saves in this browser'}</span>
            </div>
          </footer>
        </div>

        <DragOverlay dropAnimation={null}>
          {dragging && level.kind === 'build' && (
            <div className="w-72 cursor-grabbing">
              <BlockCard label={blockById(dragging)?.label ?? ''} code={codeFor(dragging)} language={languageFor(level.path)} lifted />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </>
  )
}
