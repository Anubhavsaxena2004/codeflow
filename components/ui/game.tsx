'use client'

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSound } from './sound'

export { GameTooltip, type GameTooltipProps } from './game-tooltip'
export { ModalShell, type ModalShellProps } from './game-modal'

/* -------------------------------------------------------------------------------------------------
 * GamePanel
 * -----------------------------------------------------------------------------------------------*/
export interface GamePanelProps {
  as?: 'div' | 'section' | 'article' | 'aside'
  tone?: 'default' | 'raised' | 'inset' | 'accent'
  accentColor?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  title?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  className?: string
  children?: ReactNode
  style?: CSSProperties
  id?: string
}

export const GamePanel = forwardRef<HTMLDivElement, GamePanelProps>(function GamePanel(
  {
    as: Tag = 'div',
    tone = 'default',
    accentColor,
    padding = 'md',
    title,
    icon,
    action,
    className,
    children,
    style,
    ...props
  },
  ref,
) {
  const toneClasses = {
    default:
      'border border-(--cf-border) bg-(--cf-surface) shadow-(--elev-2) dark:bg-gradient-to-b dark:from-[var(--cf-surface)] dark:to-[var(--cf-surface-2)]',
    raised:
      'border border-(--cf-border) bg-(--cf-surface) shadow-(--elev-3) dark:bg-gradient-to-b dark:from-[var(--cf-surface)] dark:to-[var(--cf-surface-2)]',
    inset: 'border border-(--cf-border) bg-(--cf-surface-2) shadow-none',
    accent:
      'relative overflow-hidden border border-(--cf-border) bg-(--cf-surface) shadow-(--elev-2) dark:bg-gradient-to-b dark:from-[var(--cf-surface)] dark:to-[var(--cf-surface-2)]',
  }[tone]

  const padClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6',
  }[padding]

  const customStyle: CSSProperties = {
    ...style,
    ...(accentColor && tone === 'accent' ? ({ '--panel-accent': accentColor } as CSSProperties) : {}),
  }

  const Component = Tag as any

  return (
    <Component
      ref={ref}
      style={customStyle}
      className={cn('rounded-[var(--radius-lg,20px)]', toneClasses, padClasses, className)}
      {...props}
    >
      {tone === 'accent' && (
        <span
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: accentColor || 'var(--panel-accent, #22c55e)' }}
          aria-hidden="true"
        />
      )}
      {(title || icon || action) && (
        <div className="mb-3.5 flex items-center gap-2">
          {icon && <div className="shrink-0">{icon}</div>}
          {title && (
            <h2 className="font-display text-[15px] font-bold text-(--cf-text) leading-tight">
              {title}
            </h2>
          )}
          {action && <div className="ml-auto shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </Component>
  )
})

/* -------------------------------------------------------------------------------------------------
 * GameButton & gameButtonClasses
 * -----------------------------------------------------------------------------------------------*/
export interface GameButtonClassesProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  className?: string
}

export function gameButtonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: GameButtonClassesProps = {}) {
  const base =
    'relative inline-flex items-center justify-center font-display font-semibold select-none cursor-pointer tracking-[0.02em] transition-all rounded-[var(--radius-md,14px)] outline-none duration-[var(--dur-fast,160ms)] active:duration-[var(--dur-press,90ms)] disabled:pointer-events-none disabled:opacity-55 disabled:saturate-50 disabled:shadow-none aria-disabled:pointer-events-none aria-disabled:opacity-55 aria-disabled:saturate-50 aria-disabled:shadow-none'

  const sizeClasses = {
    sm: 'h-9 px-3.5 text-xs gap-1.5 active:translate-y-[var(--depth-sm,3px)]',
    md: 'h-11 px-5 text-sm gap-2 active:translate-y-[var(--depth-md,4px)]',
    lg: 'h-13 px-6 text-base gap-2.5 active:translate-y-[var(--depth-lg,6px)]',
  }[size]

  const variantClasses = {
    primary:
      'bg-gradient-to-b from-[#15803d] to-[#166534] text-white shadow-[inset_0_1px_0_#22c55e,0_var(--depth-md,4px)_0_#14532d] hover:-translate-y-[1px] hover:brightness-105 hover:shadow-[inset_0_1px_0_#22c55e,0_var(--depth-md,4px)_0_#14532d,0_0_16px_rgb(34_197_94/0.35)] active:shadow-[inset_0_1px_0_#22c55e] btn-shine',
    danger:
      'bg-gradient-to-b from-[#b91c1c] to-[#991b1b] text-white shadow-[inset_0_1px_0_#ef4444,0_var(--depth-md,4px)_0_#7f1d1d] hover:-translate-y-[1px] hover:brightness-105 hover:shadow-[inset_0_1px_0_#ef4444,0_var(--depth-md,4px)_0_#7f1d1d,0_0_16px_rgb(239_68_68/0.35)] active:shadow-[inset_0_1px_0_#ef4444]',
    secondary:
      'border border-(--cf-border) bg-(--cf-surface) text-(--cf-text) shadow-[0_var(--depth-md,4px)_0_var(--cf-border)] hover:-translate-y-[1px] hover:bg-(--cf-surface-2) active:shadow-none',
    ghost:
      'bg-transparent text-(--cf-muted) hover:text-(--cf-text) hover:bg-(--cf-surface-2) shadow-none active:translate-y-0',
  }[variant]

  return cn(base, sizeClasses, variantClasses, fullWidth && 'w-full', className)
}

export interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  loading?: boolean
  fullWidth?: boolean
  sound?: boolean
}

export const GameButton = forwardRef<HTMLButtonElement, GameButtonProps>(function GameButton(
  {
    variant = 'primary',
    size = 'md',
    leftIcon,
    rightIcon,
    loading = false,
    fullWidth = false,
    sound = false,
    className,
    children,
    disabled,
    onClick,
    ...props
  },
  ref,
) {
  const iconSize = size === 'sm' ? 'size-3.5' : size === 'lg' ? 'size-5' : 'size-4'
  const { play } = useSound()

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (sound) play('click')
    onClick?.(event)
  }

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
      className={gameButtonClasses({ variant, size, fullWidth, className })}
      onClick={handleClick}
      {...props}
    >
      {loading ? (
        <Loader2 className={cn('animate-spin shrink-0', iconSize)} />
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}
      <span>{children}</span>
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  )
})

/* -------------------------------------------------------------------------------------------------
 * Pill
 * -----------------------------------------------------------------------------------------------*/
export interface PillProps {
  tone?: 'neutral' | 'success' | 'xp' | 'streak' | 'star' | 'boss' | 'info' | 'world'
  size?: 'sm' | 'md'
  icon?: ReactNode
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function Pill({
  tone = 'neutral',
  size = 'md',
  icon,
  children,
  className,
  style,
}: PillProps) {
  const toneClasses = {
    neutral: 'bg-(--cf-surface-2) text-(--cf-muted) border border-(--cf-border)',
    success: 'bg-[#22c55e]/15 text-[#15803d] dark:text-[#86efac]',
    xp: 'bg-[#a855f7]/15 text-[#6d28d9] dark:text-[#d8b4fe]',
    streak: 'bg-[#f97316]/15 text-[#c2410c] dark:text-[#fdba74]',
    star: 'bg-[#f5b301]/18 text-[#b45309] dark:text-[#fde047]',
    boss: 'bg-[#ef4444]/15 text-[#b91c1c] dark:text-[#fca5a5]',
    info: 'bg-[#0284c7]/15 text-[#0369a1] dark:text-[#7dd3fc]',
    world: 'bg-[var(--pill-color,#22c55e)]/15 text-[var(--pill-color,#15803d)]',
  }[tone]

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  }[size]

  return (
    <span
      style={style}
      className={cn(
        'inline-flex items-center font-display font-semibold rounded-[var(--radius-pill,999px)] leading-none select-none',
        toneClasses,
        sizeClasses,
        className,
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  )
}

/* -------------------------------------------------------------------------------------------------
 * SegmentedProgress
 * -----------------------------------------------------------------------------------------------*/
export interface SegmentedProgressProps {
  value: number
  max: number
  segments?: number
  tone?: 'xp' | 'success' | 'streak' | 'world'
  label: string
  showValue?: boolean
  className?: string
  accentColor?: string
}

export function SegmentedProgress({
  value,
  max,
  segments: requestedSegments,
  tone = 'xp',
  label,
  showValue = false,
  className,
  accentColor,
}: SegmentedProgressProps) {
  const safeMax = Math.max(1, max)
  const safeVal = Math.min(safeMax, Math.max(0, value))
  const segments = requestedSegments ?? Math.min(safeMax, 10)
  const pct = (safeVal / safeMax) * 100

  const toneFill = {
    xp: 'linear-gradient(90deg, #a855f7, #6d28d9)',
    success: 'linear-gradient(90deg, #22c55e, #15803d)',
    streak: 'linear-gradient(90deg, #f97316, #ea580c)',
    world: accentColor || '#22c55e',
  }[tone]

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={safeVal}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      className={cn('flex flex-col gap-1', className)}
    >
      <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-[var(--radius-pill,999px)] bg-(--cf-track) p-[2px] shadow-inner">
        {Array.from({ length: segments }, (_, i) => {
          const segStart = (i / segments) * 100
          const segEnd = ((i + 1) / segments) * 100
          let fillPct = 0
          if (pct >= segEnd) fillPct = 100
          else if (pct > segStart) fillPct = ((pct - segStart) / (segEnd - segStart)) * 100

          return (
            <div key={i} className="relative flex-1 overflow-hidden rounded-[var(--radius-pill,999px)] bg-black/5 dark:bg-white/5">
              <div
                className="h-full rounded-[var(--radius-pill,999px)] transition-[width] duration-[var(--dur-count,900ms)] ease-[var(--ease-out)]"
                style={{
                  width: `${fillPct}%`,
                  background: toneFill,
                }}
              />
            </div>
          )
        })}
      </div>
      {showValue && (
        <div className="flex justify-between text-[11px] font-semibold text-(--cf-muted)">
          <span>{label}</span>
          <span className="num">{safeVal} / {safeMax}</span>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------------------------------
 * LevelEmblem: the player level (from XP) on a hexagon shield
 * -----------------------------------------------------------------------------------------------*/
export interface LevelEmblemProps {
  level: number
  size?: number
  glow?: boolean
  className?: string
}

export function LevelEmblem({
  level,
  size = 40,
  glow = false,
  className,
}: LevelEmblemProps) {
  const fontSize = size <= 28 ? 12 : size <= 32 ? 14 : size <= 40 ? 17 : size <= 64 ? 26 : 38

  return (
    <div
      role="img"
      aria-label={`Level ${level}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={cn('relative inline-flex shrink-0 items-center justify-center select-none', className)}
    >
      {glow && (
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full blur-md opacity-60"
          style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }}
        />
      )}
      <svg
        viewBox="0 0 100 100"
        className="size-full drop-shadow-sm"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`level-grad-${level}-${size}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="35%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>
          <linearGradient id={`level-bevel-${level}-${size}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.45" />
            <stop offset="100%" stopColor="black" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        {/* Hexagon Shield */}
        <polygon
          points="50,4 92,26 92,74 50,96 8,74 8,26"
          fill={`url(#level-grad-${level}-${size})`}
        />
        {/* Inner Bevel Rim */}
        <polygon
          points="50,9 86,28 86,72 50,91 14,72 14,28"
          fill="none"
          stroke={`url(#level-bevel-${level}-${size})`}
          strokeWidth="3.5"
        />
        {/* Core Shield */}
        <polygon
          points="50,14 81,30 81,70 50,86 19,70 19,30"
          fill="#581c87"
          opacity="0.25"
        />
        {/* Level number */}
        <text
          x="50"
          y="54"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#ffffff"
          fontWeight="700"
          fontSize={fontSize * 2.1}
          fontFamily="var(--font-display, sans-serif)"
        >
          {level}
        </text>
      </svg>
    </div>
  )
}

/* -------------------------------------------------------------------------------------------------
 * StatTile
 * -----------------------------------------------------------------------------------------------*/
export interface StatTileProps {
  icon: ReactNode
  label: string
  value: ReactNode
  tone?: 'xp' | 'streak' | 'success' | 'star' | 'default'
  sublabel?: string
  as?: 'div' | 'button' | 'a'
  href?: string
  onClick?: () => void
  className?: string
}

export function StatTile({
  icon,
  label,
  value,
  tone = 'default',
  sublabel,
  as: Tag = 'div',
  href,
  onClick,
  className,
}: StatTileProps) {
  const isInteractive = Tag === 'button' || Tag === 'a' || !!onClick || !!href

  const toneIconStyles = {
    default: 'bg-(--cf-surface-2) text-(--cf-muted)',
    xp: 'bg-[#a855f7]/15 text-[#7c3aed] dark:text-[#c4b5fd]',
    streak: 'bg-[#f97316]/15 text-[#ea580c] dark:text-[#fdba74]',
    success: 'bg-[#22c55e]/15 text-[#15803d] dark:text-[#86efac]',
    star: 'bg-[#f5b301]/18 text-[#b45309] dark:text-[#fde047]',
  }[tone]

  const Component = Tag as any

  return (
    <Component
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3.5 rounded-[var(--radius-md,14px)] border border-(--cf-border) bg-(--cf-surface) p-3 text-left transition-all',
        isInteractive &&
          'hover:-translate-y-0.5 hover:shadow-(--elev-2) hover:border-(--cf-border-strong,var(--cf-border)) cursor-pointer',
        className,
      )}
    >
      <div className={cn('grid size-10 shrink-0 place-items-center rounded-xl', toneIconStyles)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="num font-display text-lg font-bold text-(--cf-text) leading-tight">
          {value}
        </div>
        <div className="text-[12px] font-medium text-(--cf-muted) leading-tight mt-0.5 truncate">
          {label}
        </div>
        {sublabel && (
          <div className="text-[11px] text-(--cf-faint) mt-0.5 truncate">
            {sublabel}
          </div>
        )}
      </div>
    </Component>
  )
}
