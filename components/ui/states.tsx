'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, Inbox, Loader2, RefreshCw } from 'lucide-react'
import { Mascot } from '@/components/home/mascot'
import { GameButton } from '@/components/ui/game'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------------------------------
 * Skeleton
 * -----------------------------------------------------------------------------------------------*/
export interface SkeletonProps {
  shape?: 'block' | 'line' | 'circle'
  scope?: 'cf' | 'ide' | 'adm'
  className?: string
  style?: CSSProperties
}

export function Skeleton({
  shape = 'block',
  scope = 'cf',
  className,
  style,
}: SkeletonProps) {
  const shapeClasses = {
    block: 'rounded-[var(--radius-md,14px)]',
    line: 'h-4 w-full rounded-full',
    circle: 'rounded-full shrink-0',
  }[shape]

  const scopeClass = {
    cf: 'skeleton-cf',
    ide: 'skeleton-ide',
    adm: 'skeleton-adm',
  }[scope]

  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn('skeleton-shimmer', shapeClasses, scopeClass, className)}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * SkeletonText
 * -----------------------------------------------------------------------------------------------*/
export interface SkeletonTextProps {
  lines?: number
  scope?: 'cf' | 'ide' | 'adm'
  className?: string
  lineClassName?: string
}

export function SkeletonText({
  lines = 3,
  scope = 'cf',
  className,
  lineClassName,
}: SkeletonTextProps) {
  return (
    <div aria-hidden="true" className={cn('flex flex-col gap-2.5 w-full', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          shape="line"
          scope={scope}
          className={cn(
            i === lines - 1 && lines > 1 ? 'w-[60%]' : 'w-full',
            lineClassName,
          )}
        />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------------------------------
 * LoadingState
 * -----------------------------------------------------------------------------------------------*/
export interface LoadingStateProps {
  label?: string
  children?: ReactNode
  className?: string
}

export function LoadingState({
  label = 'Loading your journey…',
  children,
  className,
}: LoadingStateProps) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn('relative w-full', className)}
    >
      <span className="sr-only" role="status">
        {label}
      </span>
      {children ?? (
        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center text-(--cf-muted)">
          <InlineSpinner className="size-8 text-[#22c55e]" />
          <p className="font-display font-bold text-sm text-(--cf-text)">{label}</p>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------------------------------
 * EmptyState
 * -----------------------------------------------------------------------------------------------*/
export interface EmptyStateProps {
  mascot?: boolean
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({
  mascot = true,
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-6 text-center select-none',
        className,
      )}
    >
      {/* Icon or Mascot */}
      {mascot ? (
        <div className="mb-3 grid size-16 place-items-center">
          <Mascot expression="idle" className="size-14 sm:size-16 drop-shadow-xs" />
        </div>
      ) : icon ? (
        <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-(--cf-surface-2) text-(--cf-muted)">
          {icon}
        </div>
      ) : (
        <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-(--cf-surface-2) text-(--cf-muted)">
          <Inbox className="size-6" />
        </div>
      )}

      {/* Title */}
      <h3 className="font-display text-base font-bold text-(--cf-text) leading-snug">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-(--cf-muted)">
          {description}
        </p>
      )}

      {/* Optional Action */}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* -------------------------------------------------------------------------------------------------
 * ErrorState
 * -----------------------------------------------------------------------------------------------*/
export interface ErrorStateProps {
  title?: string
  message: ReactNode
  details?: string | null
  onRetry?: () => void
  retryText?: string
  className?: string
}

export function ErrorState({
  title = 'Something went sideways',
  message,
  details,
  onRetry,
  retryText = 'Try again',
  className,
}: ErrorStateProps) {
  const [openDetails, setOpenDetails] = useState(false)

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-[#fecaca] bg-[#fff5f5] p-6 text-center dark:border-[#ef4444]/30 dark:bg-[#ef4444]/10 select-none',
        className,
      )}
    >
      {/* Red-tinted alert tile */}
      <div className="grid size-12 place-items-center rounded-2xl bg-[#fee2e2] text-[#dc2626] shadow-xs dark:bg-[#7f1d1d]/40 dark:text-[#f87171]">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>

      {/* Title */}
      <h3 className="mt-3.5 font-display text-base font-extrabold text-[#991b1b] dark:text-[#fca5a5]">
        {title}
      </h3>

      {/* Error message */}
      <div className="mt-1 max-w-md text-xs leading-relaxed text-[#b91c1c] dark:text-[#f87171]">
        {message}
      </div>

      {/* Collapsible Details */}
      {details && (
        <div className="mt-3 w-full max-w-md text-left">
          <button
            type="button"
            onClick={() => setOpenDetails((v) => !v)}
            className="flex items-center gap-1 text-[11px] font-bold text-[#b91c1c] hover:underline dark:text-[#fca5a5]"
          >
            {openDetails ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            <span>Details</span>
          </button>
          {openDetails && (
            <pre className="mt-1.5 max-h-36 overflow-auto rounded-lg bg-black/10 p-2 font-mono text-[10px] text-(--cf-text) dark:bg-black/40">
              {details}
            </pre>
          )}
        </div>
      )}

      {/* Retry Action */}
      <div className="mt-4">
        <GameButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleRetry}
          icon={<RefreshCw className="size-3.5" />}
          className="font-display font-bold text-xs"
        >
          {retryText}
        </GameButton>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------------------------------
 * InlineSpinner
 * -----------------------------------------------------------------------------------------------*/
export function InlineSpinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn('inline-block size-4 animate-spin text-current', className)}
      aria-hidden="true"
    />
  )
}
