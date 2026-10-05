'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, CircleCheck, CircleDashed, CircleX, Lightbulb, Lock, Map as MapIcon, Skull, Sparkles } from 'lucide-react'
import type { CheckResult } from '@/lib/journeys/checks'
import { kindLabels, type Check as CheckDefinition, type CommandStep, type LevelKind, type Quiz } from '@/lib/journeys/types'
import { cn } from '@/lib/utils'
import { FileIcon } from '../ide/code'
import { kindIcons, Stars } from './level-meta'

export function MissionSection({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="border-t border-[#2b2b2b] px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-[11px] font-bold tracking-wide text-[#bbbbbb]">
        {title}
        {aside}
      </div>
      {children}
    </section>
  )
}

export function MissionHeader({ place, kind, boss, title, summary, stars }: { place: string; kind: LevelKind; boss?: boolean; title: string; summary: string; stars: number | null }) {
  const Icon = kindIcons[kind]
  return (
    <header className="px-4 pb-3 pt-3">
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold tracking-wide text-[#9d9d9d]">
        <span>{place}</span>
        <span className="inline-flex items-center gap-1 rounded-sm bg-[#2b2b2b] px-1.5 py-0.5 text-[#cccccc]">
          <Icon aria-hidden className="size-3" />
          {kindLabels[kind].toUpperCase()}
        </span>
        {boss && (
          <span className="inline-flex items-center gap-1 rounded-sm bg-[#f14c4c]/15 px-1.5 py-0.5 text-[#f48771]">
            <Skull aria-hidden className="size-3" /> BOSS
          </span>
        )}
        {stars !== null && <Stars count={stars} className="ml-auto" />}
      </div>
      <h1 className="mt-2 text-[15px] font-semibold text-white">{title}</h1>
      <p className="mt-1 text-[12px] leading-5 text-[#9d9d9d]">{summary}</p>
    </header>
  )
}

export function HintNote({ text }: { text: string }) {
  return (
    <div className="mx-4 mb-3 flex gap-2 rounded border border-[#cca700]/40 bg-[#cca700]/10 p-2.5 text-[12px] leading-5 text-[#e2c08d]">
      <Lightbulb aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span>{text}</span>
    </div>
  )
}

export function CompletionCard({ stars, xp, next, mapHref, onNext }: { stars: number; xp: number; next: { title: string; href?: string } | null; mapHref: string; onNext?: () => void }) {
  const button = 'flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-[12px] font-semibold'
  return (
    <div className="mx-4 mb-3 rounded-md border border-[#89d185]/40 bg-[#89d185]/10 p-3" role="status">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-[#b5e2b0]">
        <Sparkles aria-hidden className="size-4" />
        {next ? 'Level complete!' : 'Journey complete!'}
        <Stars count={stars} className="ml-auto" />
      </div>
      <p className="mt-1 text-[12px] text-[#cccccc]">+{xp} XP{next ? ` · Next: ${next.title}` : ' · You built the whole project.'}</p>
      <div className="mt-3 flex gap-2">
        <Link href={mapHref} className={cn(button, 'border border-[#3c3c3c] text-[#cccccc] hover:bg-[#2b2b2b]')}>
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

export function CommandSteps({ steps, current, typed }: { steps: CommandStep[]; current: number; typed: string[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {steps.map((step, index) => {
        const done = index < current
        const active = index === current
        return (
          <li key={index} className={cn('flex gap-2 text-[12px] leading-5', !done && !active && 'opacity-50')}>
            <span className={cn('mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[10px]', done ? 'bg-[#89d185]/20 text-[#89d185]' : active ? 'bg-[#0078d4] text-white' : 'bg-[#2b2b2b] text-[#cccccc]')}>
              {done ? <Check aria-hidden className="size-3" /> : index + 1}
            </span>
            <div className="min-w-0">
              <div className={active ? 'text-white' : 'text-[#cccccc]'}>{step.goal}</div>
              {done && <code className="ide-mono block truncate text-[11px] text-[#89d185]">$ {typed[index]}</code>}
              {done && step.explain && <p className="text-[11px] text-[#9d9d9d]">{step.explain}</p>}
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
          return (
            <li key={check.id} className="flex gap-2 text-[12px] leading-5">
              {!result ? (
                <CircleDashed aria-label="not run yet" className="mt-0.5 size-3.5 shrink-0 text-[#6e7681]" />
              ) : result.passed ? (
                <CircleCheck aria-label="passing" className="mt-0.5 size-3.5 shrink-0 text-[#89d185]" />
              ) : (
                <CircleX aria-label="failing" className="mt-0.5 size-3.5 shrink-0 text-[#f14c4c]" />
              )}
              <span className={cn(result?.passed ? 'text-[#b5e2b0]' : 'text-[#cccccc]')}>{check.name}</span>
            </li>
          )
        })}
      </ul>
      {results && (
        <p className={cn('mt-2 text-[11px]', passed === checks.length ? 'text-[#89d185]' : 'text-[#9d9d9d]')}>
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
          <button type="button" onClick={() => onOpen(file.path)} className="flex w-full items-start gap-2 rounded px-1 py-1 text-left text-[12px] leading-5 hover:bg-[#2a2d2e]">
            {opened.has(file.path) ? <CircleCheck aria-label="opened" className="mt-0.5 size-3.5 shrink-0 text-[#89d185]" /> : <CircleDashed aria-label="not opened yet" className="mt-0.5 size-3.5 shrink-0 text-[#6e7681]" />}
            <FileIcon path={file.path} className="mt-0.5 size-3.5" />
            <span className="min-w-0">
              <span className="ide-mono block truncate text-[#cccccc]">{file.path}</span>
              <span className="block text-[11px] text-[#9d9d9d]">{file.about}</span>
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
      <p className="flex items-center gap-2 text-[12px] text-[#9d9d9d]">
        <Lock aria-hidden className="size-3.5" /> Open every new file to unlock the question.
      </p>
    )
  }
  return (
    <fieldset>
      <legend className="mb-2 text-[12px] leading-5 text-white">{quiz.question}</legend>
      <div className="flex flex-col gap-1.5">
        {quiz.options.map((option, index) => (
          <label
            key={index}
            className={cn(
              'flex cursor-pointer items-start gap-2 rounded border px-2 py-1.5 text-[12px] leading-5',
              answer === index ? 'border-[#0078d4] bg-[#0078d4]/10 text-white' : 'border-[#3c3c3c] text-[#cccccc] hover:bg-[#2a2d2e]',
              eliminated.has(index) && 'pointer-events-none line-through opacity-40',
              result === 'right' && index === quiz.answer && 'border-[#89d185]/60 bg-[#89d185]/10',
            )}
          >
            <input type="radio" name="quiz" checked={answer === index} disabled={eliminated.has(index) || result === 'right'} onChange={() => onAnswer(index)} className="mt-1 accent-[#0078d4]" />
            {option}
          </label>
        ))}
      </div>
      {result === 'wrong' && <p className="mt-2 text-[12px] text-[#f48771]">Not quite. Re-read the files and try again.</p>}
      {result === 'right' ? (
        <p className="mt-2 text-[12px] leading-5 text-[#b5e2b0]">{quiz.explain}</p>
      ) : (
        <button type="button" onClick={onCheck} disabled={answer === null} className="mt-3 w-full rounded-sm bg-[#0078d4] py-1.5 text-[12px] font-semibold text-white hover:bg-[#026ec1] disabled:opacity-40">
          Check answer
        </button>
      )}
    </fieldset>
  )
}
