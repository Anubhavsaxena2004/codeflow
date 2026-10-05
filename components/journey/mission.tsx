'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, ChevronRight, CircleCheck, CircleDashed, CircleX, Lightbulb, Lock, Map as MapIcon, Skull, Sparkles, Star as StarIcon } from 'lucide-react'
import type { CheckResult } from '@/lib/journeys/checks'
import { kindLabels, type Check as CheckDefinition, type CommandStep, type LevelKind, type Quiz } from '@/lib/journeys/types'
import { cn } from '@/lib/utils'
import { FileIcon } from '../ide/code'
import { kindIcons, Stars } from './level-meta'

/** A collapsible block of the mission panel, so the parts that matter right now get the room. */
export function MissionSection({ title, children, aside, defaultOpen = true }: { title: string; children: ReactNode; aside?: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  const prefersReduced = useReducedMotion()

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

export function HintNote({ text }: { text: string }) {
  return (
    <div className="mx-4 mb-3 flex gap-2 rounded border border-(--ide-warning)/40 bg-(--ide-warning)/10 p-2.5 text-[12px] leading-5 text-(--ide-warning-soft)">
      <Lightbulb aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span>{text}</span>
    </div>
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

export function CompletionCard({ stars, xp, next, mapHref, onNext }: { stars: number; xp: number; next: { title: string; href?: string } | null; mapHref: string; onNext?: () => void }) {
  const button = 'flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-[12px] font-semibold'
  const shownXp = useCountUp(xp)
  return (
    <div className="animate-rise mx-4 mb-3 rounded-md border border-(--ide-success)/40 bg-(--ide-success)/10 p-3" role="status">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-(--ide-success-soft)">
        <Sparkles aria-hidden className="size-4" />
        {next ? 'Level complete!' : 'Journey complete!'}
        <span className="ml-auto flex items-center gap-0.5 text-[#f5b301]" aria-label={`${stars} of 3 stars`}>
          {[0, 1, 2].map((index) => (
            <StarIcon key={index} aria-hidden className={cn('animate-star-pop size-5', index < stars ? 'fill-current' : 'opacity-30')} style={{ ['--delay' as string]: `${250 + index * 220}ms` }} />
          ))}
        </span>
      </div>
      <p className="mt-1 text-[12px] text-(--ide-fg)">
        <span className="font-bold text-(--ide-success-soft)">+{shownXp} XP</span>
        {next ? ` · Next: ${next.title}` : ' · You built the whole project.'}
      </p>
      <div className="mt-3 flex gap-2">
        <Link href={mapHref} className={cn(button, 'border border-(--ide-border-strong) text-(--ide-fg) hover:bg-(--ide-border)')}>
          <MapIcon aria-hidden className="size-3.5" /> Map
        </Link>
        {next &&
          (next.href ? (
            <Link href={next.href} className={cn(button, 'bg-[#2ea043] text-white hover:bg-[#3fb950]')}>
              Next level <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          ) : (
            <button type="button" onClick={onNext} className={cn(button, 'bg-[#2ea043] text-white hover:bg-[#3fb950]')}>
              Next level <ArrowRight aria-hidden className="size-3.5" />
            </button>
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
}

export function QuizCard({ quiz, locked, answer, eliminated, result, onAnswer, onCheck }: QuizCardProps) {
  if (locked) {
    return (
      <p className="flex items-center gap-2 text-[12px] text-(--ide-muted)">
        <Lock aria-hidden className="size-3.5" /> Open every new file to unlock the question.
      </p>
    )
  }
  return (
    <fieldset>
      <legend className="mb-2 text-[12px] leading-5 text-(--ide-heading)">{quiz.question}</legend>
      <div className="flex flex-col gap-1.5">
        {quiz.options.map((option, index) => (
          <label
            key={index}
            className={cn(
              'flex cursor-pointer items-start gap-2 rounded border px-2 py-1.5 text-[12px] leading-5',
              answer === index ? 'border-[#0078d4] bg-[#0078d4]/10 text-(--ide-heading)' : 'border-(--ide-border-strong) text-(--ide-fg) hover:bg-(--ide-hover)',
              eliminated.has(index) && 'pointer-events-none line-through opacity-40',
              result === 'right' && index === quiz.answer && 'border-(--ide-success)/60 bg-(--ide-success)/10',
            )}
          >
            <input type="radio" name="quiz" checked={answer === index} disabled={eliminated.has(index) || result === 'right'} onChange={() => onAnswer(index)} className="mt-1 accent-[#0078d4]" />
            {option}
          </label>
        ))}
      </div>
      {result === 'wrong' && <p className="mt-2 text-[12px] text-(--ide-error-soft)">Not quite. Re-read the files and try again.</p>}
      {result === 'right' ? (
        <p className="mt-2 text-[12px] leading-5 text-(--ide-success-soft)">{quiz.explain}</p>
      ) : (
        <button type="button" onClick={onCheck} disabled={answer === null} className="mt-3 w-full rounded-sm bg-[#0078d4] py-1.5 text-[12px] font-semibold text-white hover:bg-[#026ec1] disabled:opacity-40">
          Check answer
        </button>
      )}
    </fieldset>
  )
}
