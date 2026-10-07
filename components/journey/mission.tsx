'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, ChevronRight, CircleCheck, CircleDashed, CircleX, Lightbulb, Lock, Map as MapIcon, RotateCcw, Skull, Sparkles, Star as StarIcon, Trophy } from 'lucide-react'
import type { CheckResult } from '@/lib/journeys/checks'
import { kindLabels, type Check as CheckDefinition, type CommandStep, type LevelKind, type Quiz } from '@/lib/journeys/types'
import { cn } from '@/lib/utils'
import { FileIcon } from '../ide/code'
import { kindIcons, Stars } from './level-meta'
import { GameButton, gameButtonClasses, Pill } from '@/components/ui/game'
import { useSound } from '@/components/ui/sound'
import { useShake, CheckFeedback, getRandomPraise } from './feedback'

/**
 * A collapsible block of the mission panel, so the parts that matter right now get the room.
 * With `storageKey` the open/closed choice is remembered in this browser across levels.
 */
export function MissionSection({ title, children, aside, defaultOpen = true, storageKey }: { title: string; children: ReactNode; aside?: ReactNode; defaultOpen?: boolean; storageKey?: string }) {
  const [open, setOpenState] = useState(defaultOpen)
  const id = useId()
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    if (!storageKey) return
    try {
      const saved = window.localStorage.getItem(`codeflow-section:${storageKey}`)
      if (saved !== null) setOpenState(saved === 'open')
    } catch {
      // storage unavailable: use the default
    }
  }, [storageKey])

  const setOpen = (update: (value: boolean) => boolean) =>
    setOpenState((value) => {
      const next = update(value)
      if (storageKey) {
        try {
          window.localStorage.setItem(`codeflow-section:${storageKey}`, next ? 'open' : 'closed')
        } catch {
          // storage unavailable: the choice lasts for this visit
        }
      }
      return next
    })

  return (
    <section className="border-t border-(--ide-border) px-4 py-2">
      <div className="flex items-center justify-between gap-2 text-[11px] font-bold tracking-wide text-(--ide-fg-title)">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={id}
          className="-ml-1 flex flex-1 items-center gap-1.5 rounded py-1 text-left hover:text-(--ide-heading) transition-colors"
        >
          <ChevronRight
            aria-hidden
            className={cn('size-3.5 transition-transform duration-(--dur-fast) ease-out', open && 'rotate-90')}
          />
          <span>{title}</span>
        </button>
        {aside}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={prefersReduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={prefersReduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={prefersReduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden pb-1 pt-1.5"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

export function MissionHeader({ place, kind, boss, title, summary, stars, worldColor }: { place: string; kind: LevelKind; boss?: boolean; title: string; summary: string; stars: number | null; worldColor?: string }) {
  const Icon = kindIcons[kind]
  const tileColor = boss ? '#ef4444' : (worldColor ?? '#0078d4')

  return (
    <header className="sticky top-0 z-10 border-b border-(--ide-border) bg-(--ide-bar)/95 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold tracking-wide text-(--ide-muted)">
        <span className="uppercase tracking-wider">Quest · {place}</span>
        <span className="inline-flex items-center gap-1 rounded-sm bg-(--ide-border) px-1.5 py-0.5 text-(--ide-fg)">
          <Icon aria-hidden className="size-3" />
          {kindLabels[kind].toUpperCase()}
        </span>
        {boss && (
          <span className="inline-flex items-center gap-1 rounded-sm bg-(--ide-error)/15 px-1.5 py-0.5 text-(--ide-error-soft)">
            <Skull aria-hidden className="size-3" /> BOSS
          </span>
        )}
        {stars !== null && <Stars count={stars} className="ml-auto" />}
      </div>
      <div className="mt-2.5 flex items-start gap-2.5">
        <div
          className="grid size-7 shrink-0 place-items-center rounded-md text-white shadow-sm"
          style={{ backgroundColor: tileColor }}
          aria-hidden
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[15px] font-semibold text-(--ide-heading) leading-tight truncate">{title}</h1>
          <p className="mt-0.5 text-[12px] leading-5 text-(--ide-muted) truncate">{summary}</p>
        </div>
      </div>
    </header>
  )
}

/** What the learner has to do in a level of this kind, step by step. */
export function howToPlay(kind: LevelKind, quiz: boolean, gaps = false): ReactNode[] {
  switch (kind) {
    case 'explore':
      return [
        <>Open every file under <b>NEW FILES</b> below (or click it in the explorer on the left).</>,
        <>Read each one. The <b>ABOUT</b> box under the explorer explains what a file or folder is for.</>,
        quiz ? <>Answer the <b>QUESTION</b> and press <b>Check answer</b>.</> : <>Press <b>Complete level</b>.</>,
      ]
    case 'command':
      return [
        <>Read the goal of the highlighted step under <b>STEPS</b> below.</>,
        <>Click the <b>TERMINAL</b> at the bottom, type the command for that step and press <b>Enter</b>.</>,
        <>Each right command ticks the step and its files appear in the explorer.</>,
        <>Stuck? Type <code className="ide-mono">hint</code> in the terminal, or press <b>Hint</b> at the top.</>,
      ]
    case 'edit':
      if (gaps)
        return [
          <>Every <code className="ide-mono">TODO</code> in the file is a numbered gap. The number sits next to its line in the editor.</>,
          <>Open a gap under <b>MISSING CODE</b>. It says what the code must do, where each name in it comes from, and where its result goes.</>,
          <>Pick the right code out of three: it is written into the file. A wrong pick tells you why. You can also type the code yourself.</>,
          <>When every gap is filled, press <b>Run tests</b>.</>,
        ]
      return [
        <>The file to complete is open in the editor. Look for the <code className="ide-mono">TODO</code> comments.</>,
        <>Write the missing code right in the editor.</>,
        <>Press <b>Run tests</b> (or <b>Ctrl+S</b>). The <b>TESTS</b> list shows what still fails.</>,
        <>Fix and run again until every test passes.</>,
      ]
    case 'bugfix':
      return [
        <>The open file has bugs planted in it. Read it carefully.</>,
        <>Press <b>Run tests</b> to see which checks fail.</>,
        <>Fix the code in the editor and run the tests again until they all pass.</>,
      ]
    case 'build':
      return [
        <>Read the code blocks under <b>BLOCKS</b>. They have no names, so work out what each one does.</>,
        <>Open <b>SLOT GUIDE</b> at the bottom: it says what kind of code each empty line needs.</>,
        <>Drag a block onto an empty line, or click a block to fill the next empty line. Some blocks are decoys.</>,
        <>Press <b>Check</b>. Wrong lines are marked, and <b>PROBLEMS</b> explains why.</>,
      ]
    case 'architecture':
      return [
        <>The <b>Architecture</b> tab shows the stops of a request, shuffled.</>,
        <>Click the stops in the order a request travels through them. Click a placed stop to take it back.</>,
        <>Press <b>Check order</b> when every place is filled.</>,
      ]
  }
}

export function HowToPlay({ steps }: { steps: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-1.5">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-2 text-[12px] leading-5 text-(--ide-fg)">
          <span className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full bg-(--ide-border) text-[10px] font-bold text-(--ide-heading)">{index + 1}</span>
          <span className="min-w-0 [&_b]:font-semibold [&_b]:text-(--ide-heading)">{step}</span>
        </li>
      ))}
    </ol>
  )
}

/** Shown when a passed level is reopened: the learner's finished work, with replay and next. */
export function PassedCard({ stars, next, onReplay, worldColor }: { stars: number; next: ReactNode; onReplay: () => void; worldColor?: string }) {
  return (
    <div className="mx-4 mb-3 rounded-xl border border-(--ide-border-strong) bg-(--ide-bg) p-3" style={{ borderTop: `3px solid ${worldColor ?? '#16a34a'}` }}>
      <div className="flex items-center gap-2">
        <CircleCheck aria-hidden className="size-4 shrink-0 text-(--ide-success)" />
        <span className="text-[12px] font-semibold text-(--ide-heading)">You passed this level</span>
        <Stars count={stars} className="ml-auto" />
      </div>
      <p className="mt-1 text-[12px] leading-5 text-(--ide-muted)">This is your finished work. Replay it to try for more stars; XP is only earned once.</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button type="button" onClick={onReplay} className={cn(gameButtonClasses({ variant: 'secondary', size: 'sm' }), 'flex-1')}>
          <RotateCcw aria-hidden className="mr-1.5 size-3.5" /> Replay
        </button>
        {next}
      </div>
    </div>
  )
}

export function HintNote({
  text,
  onClose,
  onNextHint,
}: {
  text: string
  onClose?: () => void
  onNextHint?: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <motion.div
      initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
      animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="mx-4 mb-3 rounded-xl border-2 border-dashed border-[#b45309] dark:border-[#fbbf24] bg-amber-500/10 dark:bg-amber-500/15 p-3 text-[12px] leading-5 text-(--ide-fg)"
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#b45309] dark:text-[#fbbf24]">
          <Lightbulb aria-hidden className="size-3.5 shrink-0" />
          <h4 ref={headingRef} tabIndex={-1} className="outline-none">Hint</h4>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close hint"
            className="rounded p-0.5 text-(--ide-muted) hover:text-(--ide-fg) hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <span className="text-[12px] leading-none">✕</span>
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[12px] font-medium text-(--ide-fg) leading-relaxed">{text}</p>
      {onNextHint && (
        <div className="mt-2 pt-2 border-t border-amber-500/20 flex justify-end">
          <button
            type="button"
            onClick={onNextHint}
            className="text-[11px] font-bold text-[#b45309] dark:text-[#fbbf24] hover:underline cursor-pointer"
          >
            Still stuck? Reveal solution →
          </button>
        </div>
      )}
    </motion.div>
  )
}

/** Counts from 0 up to `target` over about a second (instantly with reduced motion). */
function useCountUp(target: number) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setValue(target)
    const started = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / 900)
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])
  return value
}

export function CompletionCard({
  stars,
  xp,
  next,
  mapHref,
  onNext,
  worldColor,
}: {
  stars: number
  xp: number
  next: { title: string; href?: string } | null
  mapHref: string
  onNext?: () => void
  worldColor?: string
}) {
  const accent = worldColor ?? '#16a34a'
  const shownXp = useCountUp(xp)
  const prefersReduced = useReducedMotion()
  const { play } = useSound()

  useEffect(() => {
    play('levelUp')
  }, [play])

  return (
    <div
      className="animate-rise mx-4 mb-3 rounded-xl border border-(--ide-border-strong) bg-(--ide-bg) p-4 shadow-md"
      role="status"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div className="flex items-center gap-2">
        <div
          className="grid size-7 shrink-0 place-items-center rounded-lg text-white"
          style={{ backgroundColor: accent }}
        >
          <Trophy className="size-4" aria-hidden />
        </div>
        <div>
          <h3 className="font-display font-bold text-[14px] text-(--ide-heading)">
            {next ? 'Level complete!' : 'Journey complete!'}
          </h3>
          <p className="text-[11px] text-(--ide-muted)">
            {next ? `Next: ${next.title}` : 'You built the whole project.'}
          </p>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between rounded-lg bg-(--ide-bar) p-2.5">
        {/* Stars */}
        <div
          className="flex items-center gap-1.5"
          aria-label={`${stars} of 3 stars`}
        >
          {[0, 1, 2].map((index) => {
            const earned = index < stars
            return (
              <span key={index} className="relative inline-flex items-center justify-center">
                <StarIcon
                  aria-hidden
                  className={cn(
                    'size-6 transition-all',
                    earned
                      ? 'fill-[#f5b301] text-[#f5b301] animate-star-pop'
                      : 'fill-transparent text-(--ide-border-strong) stroke-1'
                  )}
                  style={
                    !prefersReduced && earned
                      ? { ['--delay' as string]: `${index * 180}ms` }
                      : undefined
                  }
                />
              </span>
            )
          })}
          <span className="sr-only">{stars} of 3 stars</span>
        </div>

        {/* XP */}
        <Pill tone="xp" size="md">
          <span className="num font-bold">+{shownXp} XP</span>
        </Pill>
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          href={mapHref}
          className={cn(gameButtonClasses({ variant: 'secondary', size: 'md' }), 'flex-1')}
        >
          <MapIcon aria-hidden className="size-3.5 mr-1.5" /> Map
        </Link>
        {next &&
          (next.href ? (
            <Link
              href={next.href}
              className={cn(gameButtonClasses({ variant: 'primary', size: 'md' }), 'flex-1')}
              autoFocus
            >
              Next level <ArrowRight aria-hidden className="size-3.5 ml-1.5" />
            </Link>
          ) : (
            <GameButton
              variant="primary"
              size="md"
              sound
              onClick={onNext}
              className="flex-1"
              autoFocus
            >
              Next level <ArrowRight aria-hidden className="size-3.5 ml-1.5" />
            </GameButton>
          ))}
      </div>
    </div>
  )
}

export function CommandSteps({ steps, current, typed, worldColor }: { steps: CommandStep[]; current: number; typed: string[]; worldColor?: string }) {
  const accent = worldColor ?? '#0078d4'
  return (
    <ol className="flex flex-col gap-2">
      {steps.map((step, index) => {
        const done = index < current
        const active = index === current
        return (
          <li
            key={index}
            className={cn(
              'relative flex gap-2.5 rounded px-2 py-1.5 text-[12px] leading-5 transition-colors',
              active && 'bg-(--ide-hover)',
              !done && !active && 'opacity-60'
            )}
            style={active ? { borderLeft: `3px solid ${accent}` } : { borderLeft: '3px solid transparent' }}
          >
            <span
              className={cn(
                'mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full text-[10px] font-semibold transition-all',
                done && 'bg-[#15803d] text-white',
                active && 'border-2 text-(--ide-heading)',
                !done && !active && 'border border-(--ide-border-strong) text-(--ide-muted)'
              )}
              style={active ? { borderColor: accent } : undefined}
            >
              {done ? (
                <Check aria-hidden className="size-3 stroke-[3] animate-star-pop" />
              ) : (
                <span>{index + 1}</span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className={cn(active ? 'font-medium text-(--ide-heading)' : done ? 'text-(--ide-muted)' : 'text-(--ide-fg)')}>
                {step.goal}
                {done && <span className="sr-only"> (completed)</span>}
              </div>
              {done && <code className="ide-mono block truncate text-[11px] text-(--ide-success)">$ {typed[index]}</code>}
              {done && step.explain && <p className="text-[11px] text-(--ide-muted)">{step.explain}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function TestList({ checks, results }: { checks: CheckDefinition[]; results: CheckResult[] | null }) {
  const passed = results?.filter((result) => result.passed).length ?? 0
  return (
    <>
      <ul className="flex flex-col gap-1.5">
        {checks.map((check) => {
          const result = results?.find((item) => item.id === check.id)
          const isPass = result?.passed === true
          const isFail = result && !result.passed
          const isPending = !result

          return (
            <li
              key={check.id}
              className={cn(
                'flex items-center gap-2 rounded px-2 py-1 text-[12px] leading-5 transition-colors',
                isFail && 'border-l-2 border-[#ef4444] bg-(--ide-error)/5',
                !isFail && 'border-l-2 border-transparent'
              )}
            >
              {isPending && (
                <>
                  <CircleDashed aria-label="not run yet" className="size-3.5 shrink-0 text-(--ide-dim)" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-(--ide-dim)">pending</span>
                </>
              )}
              {isPass && (
                <>
                  <CircleCheck aria-label="passing" className="size-3.5 shrink-0 text-[#22c55e]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#15803d] dark:text-[#4ade80]">pass</span>
                </>
              )}
              {isFail && (
                <>
                  <CircleX aria-label="failing" className="size-3.5 shrink-0 text-[#ef4444]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#b91c1c] dark:text-[#f87171]">fail</span>
                </>
              )}
              <span className={cn('min-w-0 flex-1 truncate', isPass ? 'text-(--ide-success-soft)' : 'text-(--ide-fg)')}>
                {check.name}
              </span>
            </li>
          )
        })}
      </ul>
      {results && (
        <p className={cn('mt-2 text-[11px] font-medium', passed === checks.length ? 'text-[#15803d] dark:text-[#4ade80]' : 'text-(--ide-muted)')}>
          {passed}/{checks.length} passing
        </p>
      )}
    </>
  )
}

export function NewFiles({ files, opened, onOpen }: { files: { path: string; about: string }[]; opened: Set<string>; onOpen: (path: string) => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {files.map((file) => (
        <li key={file.path}>
          <button type="button" onClick={() => onOpen(file.path)} className="flex w-full items-start gap-2 rounded px-1 py-1 text-left text-[12px] leading-5 hover:bg-(--ide-hover)">
            {opened.has(file.path) ? <CircleCheck aria-label="opened" className="mt-0.5 size-3.5 shrink-0 text-(--ide-success)" /> : <CircleDashed aria-label="not opened yet" className="mt-0.5 size-3.5 shrink-0 text-(--ide-dim)" />}
            <FileIcon path={file.path} className="mt-0.5 size-3.5" />
            <span className="min-w-0">
              <span className="ide-mono block truncate text-(--ide-fg)">{file.path}</span>
              <span className="block text-[11px] text-(--ide-muted)">{file.about}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

interface QuizCardProps {
  quiz: Quiz
  locked: boolean
  answer: number | null
  eliminated: Set<number>
  result: 'right' | 'wrong' | null
  onAnswer: (index: number) => void
  onCheck: () => void
  worldColor?: string
  onOpenHint?: () => void
}

export function QuizCard({ quiz, locked, answer, eliminated, result, onAnswer, onCheck, worldColor, onOpenHint }: QuizCardProps) {
  const { triggerShake, shakeAnimation } = useShake()
  const [consecutiveWrong, setConsecutiveWrong] = useState(0)
  const [praiseWord, setPraiseWord] = useState('Nice!')

  useEffect(() => {
    if (result === 'wrong') {
      triggerShake()
      setConsecutiveWrong((c) => c + 1)
    } else if (result === 'right') {
      setPraiseWord(getRandomPraise())
      setConsecutiveWrong(0)
    }
  }, [result, triggerShake])

  if (locked) {
    return (
      <p className="flex items-center gap-2 text-[12px] text-(--ide-muted)">
        <Lock aria-hidden className="size-3.5" /> Open every new file to unlock the question.
      </p>
    )
  }

  return (
    <motion.fieldset animate={shakeAnimation} className="min-w-0">
      <legend className="mb-2 text-[12px] font-medium leading-5 text-(--ide-heading)">{quiz.question}</legend>
      <div className="flex flex-col gap-1.5">
        {quiz.options.map((option, index) => {
          const isSelected = answer === index
          const isCorrect = result === 'right' && index === quiz.answer
          const isWrong = result === 'wrong' && isSelected

          return (
            <label
              key={index}
              style={
                isSelected && result === null
                  ? { borderColor: worldColor ?? '#0078d4', boxShadow: `0 0 0 1px ${worldColor ?? '#0078d4'}` }
                  : undefined
              }
              className={cn(
                'relative flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-[12px] leading-5 transition-all',
                !isSelected && 'border-(--ide-border-strong) text-(--ide-fg) hover:bg-(--ide-hover)',
                isSelected && result === null && 'bg-(--ide-active)/20 text-(--ide-heading)',
                eliminated.has(index) && 'pointer-events-none line-through opacity-40',
                isCorrect && 'border-[#22c55e] bg-[#22c55e]/15 text-[#15803d] dark:text-[#4ade80]',
                isWrong && 'border-[#ef4444] bg-[#ef4444]/15 text-[#b91c1c] dark:text-[#f87171]',
              )}
            >
              <input
                type="radio"
                name="quiz"
                checked={isSelected}
                disabled={eliminated.has(index) || result === 'right'}
                onChange={() => onAnswer(index)}
                className="mt-1 accent-[#0078d4]"
              />
              <span className="flex-1">{option}</span>
              {isCorrect && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#15803d] dark:text-[#4ade80]">
                  <Check className="size-3.5" aria-hidden /> Correct
                </span>
              )}
              {isWrong && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#b91c1c] dark:text-[#f87171]">
                  <CircleX className="size-3.5" aria-hidden /> Incorrect
                </span>
              )}
            </label>
          )
        })}
      </div>

      <div className="mt-3">
        {result === 'wrong' && (
          <CheckFeedback
            status="error"
            message="Not quite. Re-read the files and try again."
            consecutiveErrors={consecutiveWrong}
            onOpenHint={onOpenHint}
          />
        )}
        {result === 'right' && (
          <CheckFeedback
            status="success"
            praise={praiseWord}
            message={quiz.explain}
          />
        )}
        {result !== 'right' && (
          <div className="mt-2">
            <GameButton
              variant="primary"
              size="md"
              fullWidth
              onClick={onCheck}
              disabled={answer === null}
            >
              Check answer
            </GameButton>
          </div>
        )}
      </div>
    </motion.fieldset>
  )
}
