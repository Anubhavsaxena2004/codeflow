'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, Sparkles, XCircle } from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import { useSound } from '@/components/ui/sound'
import { cn } from '@/lib/utils'

export type CheckStatus = 'idle' | 'checking' | 'success' | 'error'

export const PRAISE_WORDS = ['Nice!', 'Clean!', 'Nailed it!'] as const

export function getRandomPraise(): string {
  return PRAISE_WORDS[Math.floor(Math.random() * PRAISE_WORDS.length)]
}

export function useShake() {
  const [shaking, setShaking] = useState(false)
  const prefersReduced = useReducedMotion()

  const triggerShake = useCallback(() => {
    if (prefersReduced) return
    setShaking(true)
    const timer = setTimeout(() => setShaking(false), 360)
    return () => clearTimeout(timer)
  }, [prefersReduced])

  const shakeAnimation =
    shaking && !prefersReduced
      ? { x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.36 } }
      : { x: 0 }

  return { shaking, triggerShake, shakeAnimation }
}

export interface CheckFeedbackProps {
  status: CheckStatus
  message?: string | null
  praise?: string
  className?: string
  onOpenHint?: () => void
  consecutiveErrors?: number
}

export function CheckFeedback({
  status,
  message,
  praise,
  className,
  onOpenHint,
  consecutiveErrors = 0,
}: CheckFeedbackProps) {
  const chosenPraise = praise || 'Nailed it!'
  const showHintNudge = consecutiveErrors >= 2 && onOpenHint
  const { play } = useSound()
  const prevStatusRef = useRef(status)

  useEffect(() => {
    if (status !== prevStatusRef.current) {
      if (status === 'success') {
        play('success')
      } else if (status === 'error') {
        play('error')
      }
      prevStatusRef.current = status
    }
  }, [status, play])

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={cn('min-h-[24px] flex flex-col gap-1 transition-all', className)}
    >
      {status === 'checking' && (
        <div className="flex items-center gap-1.5 text-[12px] text-(--ide-muted)">
          <Loader2 className="size-3.5 animate-spin text-(--ide-link)" aria-hidden />
          <span>Checking...</span>
        </div>
      )}

      {status === 'success' && (
        <div className="flex items-start gap-1.5 text-[12px] text-(--ide-success-soft)">
          <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-[#22c55e] animate-star-pop" aria-hidden />
          <div>
            <div className="font-bold text-[#15803d] dark:text-[#4ade80] flex items-center gap-1">
              <span>{chosenPraise}</span>
              <Sparkles className="size-3" aria-hidden />
            </div>
            {message && <div className="mt-0.5 text-(--ide-fg)">{message}</div>}
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start gap-1.5 text-[12px] text-(--ide-error-soft)">
            <XCircle className="size-4 shrink-0 mt-0.5 text-[#ef4444]" aria-hidden />
            <div className="min-w-0">
              {message || 'Not quite. Check your solution and try again.'}
            </div>
          </div>
          {showHintNudge && (
            <div className="flex items-center gap-1.5 pl-5 text-[11px] text-(--ide-warning-soft)">
              <span>Stuck?</span>
              <button
                type="button"
                onClick={onOpenHint}
                className="font-medium underline hover:text-(--ide-heading) focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--focus-ring)"
              >
                Open a hint
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
