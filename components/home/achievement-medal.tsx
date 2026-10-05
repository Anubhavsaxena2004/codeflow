'use client'

import type { ComponentType } from 'react'
import { Bug, Lock, Network, Skull, Star, Terminal, Trophy } from 'lucide-react'
import { Pill } from '@/components/ui/game'
import { cn } from '@/lib/utils'

export type AchievementIconKind = 'trophy' | 'bug' | 'terminal' | 'star' | 'network' | 'skull'

export interface AchievementItem {
  id: string
  title: string
  description: string
  icon: AchievementIconKind
  current: number
  target: number
}

export const achievementStyles: Record<
  AchievementIconKind,
  { icon: ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; bg: string }
> = {
  trophy: { icon: Trophy, color: '#f59e0b', bg: '#fef3c7' },
  bug: { icon: Bug, color: '#ef4444', bg: '#fee2e2' },
  terminal: { icon: Terminal, color: '#06b6d4', bg: '#cffafe' },
  star: { icon: Star, color: '#eab308', bg: '#fef9c3' },
  network: { icon: Network, color: '#8b5cf6', bg: '#ede9fe' },
  skull: { icon: Skull, color: '#dc2626', bg: '#fee2e2' },
}

export interface AchievementMedalProps {
  achievement: AchievementItem
  size?: 40 | 64 | 88
  isNew?: boolean
  showDescription?: boolean
  hideTitle?: boolean
  className?: string
}

export function AchievementMedal({
  achievement,
  size = 64,
  isNew = false,
  showDescription = false,
  hideTitle = false,
  className,
}: AchievementMedalProps) {
  const isEarned = achievement.current >= achievement.target
  const styleInfo = achievementStyles[achievement.icon] ?? achievementStyles.trophy
  const Icon = styleInfo.icon

  const sizeConfig = {
    40: {
      wrapperW: 'w-16 min-w-[64px]',
      medalBoxW: 'w-10 h-[46px]',
      discTop: 'top-0',
      discSize: 'size-10',
      iconSize: 'size-4',
      nameText: 'text-[11px]',
      lockBadge: 'size-3.5',
      lockIcon: 'size-2',
    },
    64: {
      wrapperW: 'w-24 min-w-[96px]',
      medalBoxW: 'w-16 h-[74px]',
      discTop: 'top-0',
      discSize: 'size-16',
      iconSize: 'size-6',
      nameText: 'text-xs',
      lockBadge: 'size-4.5',
      lockIcon: 'size-2.5',
    },
    88: {
      wrapperW: 'w-32 min-w-[128px]',
      medalBoxW: 'w-[88px] h-[100px]',
      discTop: 'top-0',
      discSize: 'size-[88px]',
      iconSize: 'size-8',
      nameText: 'text-sm',
      lockBadge: 'size-5',
      lockIcon: 'size-3',
    },
  }[size]

  return (
    <div
      className={cn(
        'group relative flex flex-col items-center select-none focus-visible:outline-none',
        sizeConfig.wrapperW,
        className,
      )}
      tabIndex={0}
      role="group"
      aria-label={`${achievement.title}: ${isEarned ? 'Earned' : 'Locked'}`}
    >
      {/* Medal SVG & Coin Container */}
      <div className={cn('relative flex justify-center', sizeConfig.medalBoxW)}>
        {/* "NEW" Pill */}
        {isNew && isEarned && (
          <Pill
            tone="xp"
            size="sm"
            className="absolute -top-1.5 -right-1 z-20 shadow-xs font-display font-extrabold"
          >
            NEW
          </Pill>
        )}

        {/* SVG Ribbon and Coin Rim */}
        <svg
          viewBox="0 0 100 114"
          className="absolute inset-0 size-full drop-shadow-xs"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`gold-rim-${size}-${achievement.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f5b301" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id={`gold-ribbon-${size}-${achievement.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
            <linearGradient id={`locked-rim-${size}-${achievement.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
          </defs>

          {/* Ribbon Tails */}
          <path
            d="M 28 50 L 16 104 L 32 94 L 46 104 L 46 64 Z"
            fill={isEarned ? `url(#gold-ribbon-${size}-${achievement.id})` : '#64748b'}
            opacity={isEarned ? 0.95 : 0.45}
            className="transition-colors"
          />
          <path
            d="M 72 50 L 84 104 L 68 94 L 54 104 L 54 64 Z"
            fill={isEarned ? `url(#gold-ribbon-${size}-${achievement.id})` : '#64748b'}
            opacity={isEarned ? 0.95 : 0.45}
            className="transition-colors"
          />

          {/* Outer Round Rim */}
          {isEarned ? (
            <>
              <circle
                cx="50"
                cy="46"
                r="40"
                fill={`url(#gold-rim-${size}-${achievement.id})`}
                stroke="#b45309"
                strokeWidth="2.5"
                className="stroke-[#b45309] dark:stroke-[#fbbf24]"
              />
              <circle
                cx="50"
                cy="46"
                r="35"
                fill="none"
                stroke="#b45309"
                strokeWidth="1"
                strokeDasharray="3 2"
                opacity="0.4"
              />
            </>
          ) : (
            <>
              <circle
                cx="50"
                cy="46"
                r="40"
                fill={`url(#locked-rim-${size}-${achievement.id})`}
                className="opacity-35"
              />
              <circle
                cx="50"
                cy="46"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-(--cf-border) opacity-80"
              />
            </>
          )}
        </svg>

        {/* Circular Inner Disc & Icon (Contains Shine Sweep) */}
        <div
          className={cn(
            'absolute left-1/2 -translate-x-1/2 rounded-full flex items-center justify-center overflow-hidden transition-all',
            sizeConfig.discTop,
            sizeConfig.discSize,
            isEarned
              ? 'medal-shine shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]'
              : 'bg-slate-300/40 dark:bg-slate-800/60',
          )}
          style={
            isEarned
              ? {
                  backgroundColor: `${styleInfo.color}22`,
                }
              : undefined
          }
        >
          <Icon
            aria-hidden="true"
            className={cn(
              sizeConfig.iconSize,
              'transition-all',
              isEarned
                ? 'drop-shadow-xs'
                : 'opacity-35 text-slate-500 dark:text-slate-400 grayscale',
            )}
            style={isEarned ? { color: styleInfo.color } : undefined}
          />
        </div>

        {/* Lock Badge for Locked Medals */}
        {!isEarned && (
          <div
            className={cn(
              'absolute bottom-1 right-0 grid place-items-center rounded-full border border-(--cf-border) bg-(--cf-surface) shadow-xs z-10',
              sizeConfig.lockBadge,
            )}
            title="Locked"
          >
            <Lock className={cn('text-(--cf-muted)', sizeConfig.lockIcon)} aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Screen-reader Status */}
      <span className="sr-only">{isEarned ? 'Earned' : 'Locked'}</span>

      {/* Name and description (unless hideTitle is true) */}
      {!hideTitle && (
        <>
          <span
            className={cn(
              'mt-2 block font-display font-bold leading-tight text-center text-(--cf-text) line-clamp-2',
              sizeConfig.nameText,
            )}
          >
            {achievement.title}
          </span>

          {showDescription && (
            <span className="mt-1 block text-xs leading-snug text-center text-(--cf-muted) line-clamp-2">
              {achievement.description}
            </span>
          )}

          {!isEarned && (
            <>
              {achievement.target > 1 ? (
                <div className="mt-1.5 flex w-full flex-col items-center gap-1">
                  <div className="h-1.5 w-full max-w-[64px] overflow-hidden rounded-full bg-(--cf-track)">
                    <div
                      className="h-full rounded-full bg-[#f5b301]"
                      style={{
                        width: `${Math.min(100, (achievement.current / achievement.target) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-(--cf-muted) num">
                    {achievement.current}/{achievement.target}
                  </span>
                </div>
              ) : (
                !showDescription && (
                  <span className="mt-0.5 block text-[10px] leading-tight text-center text-(--cf-muted) line-clamp-2">
                    {achievement.description}
                  </span>
                )
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
