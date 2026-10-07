'use client'

import { useId, useState } from 'react'
import { Check, Sparkles, User, Palette } from 'lucide-react'
import { motion } from 'framer-motion'
import { Mascot } from '@/components/home/mascot'
import { GameButton } from '@/components/ui/game'
import { cn } from '@/lib/utils'

export interface AvatarOption {
  id: string
  name: string
  title: string
  tagline: string
  hoodie: string
  darkHoodie: string
  headphoneColor: string
  hairColor: string
  glowColor: string
  borderGradient: string
  bgTone: string
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: 'mascot-green',
    name: 'Emerald Coder',
    title: 'Code Builder',
    tagline: 'Clean syntax & pragmatic problem solving',
    hoodie: '#16a34a',
    darkHoodie: '#14532d',
    headphoneColor: '#22c55e',
    hairColor: '#3b2314',
    glowColor: '#22c55e',
    borderGradient: 'from-[#4ade80] to-[#15803d]',
    bgTone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'mascot-purple',
    name: 'Cyber Hacker',
    title: 'Logic Master',
    tagline: 'Midnight debugging & deep flow state',
    hoodie: '#9333ea',
    darkHoodie: '#581c87',
    headphoneColor: '#a855f7',
    hairColor: '#1e1b4b',
    glowColor: '#c084fc',
    borderGradient: 'from-[#c084fc] to-[#6b21a8]',
    bgTone: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  },
  {
    id: 'mascot-blue',
    name: 'Cloud Architect',
    title: 'Systems Pro',
    tagline: 'Scalable APIs & reliable backends',
    hoodie: '#2563eb',
    darkHoodie: '#1e3a8a',
    headphoneColor: '#38bdf8',
    hairColor: '#18181b',
    glowColor: '#38bdf8',
    borderGradient: 'from-[#38bdf8] to-[#1d4ed8]',
    bgTone: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  },
  {
    id: 'mascot-amber',
    name: 'Full-Stack Fox',
    title: 'Code Prodigy',
    tagline: 'Agile sprints & fast end-to-end prototyping',
    hoodie: '#d97706',
    darkHoodie: '#78350f',
    headphoneColor: '#fbbf24',
    hairColor: '#7c2d12',
    glowColor: '#f59e0b',
    borderGradient: 'from-[#fcd34d] to-[#b45309]',
    bgTone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
  {
    id: 'mascot-rose',
    name: 'Design Engineer',
    title: 'UI Wizard',
    tagline: 'Pixel precision & smooth animations',
    hoodie: '#e11d48',
    darkHoodie: '#881337',
    headphoneColor: '#fb7185',
    hairColor: '#4c1d95',
    glowColor: '#f43f5e',
    borderGradient: 'from-[#fda4af] to-[#be123c]',
    bgTone: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  },
  {
    id: 'mascot-cyan',
    name: 'Terminal Nomad',
    title: 'DevOps Explorer',
    tagline: 'Pipelines, containers & cloud deployment',
    hoodie: '#0891b2',
    darkHoodie: '#164e63',
    headphoneColor: '#22d3ee',
    hairColor: '#27272a',
    glowColor: '#06b6d4',
    borderGradient: 'from-[#67e8f9] to-[#0e7490]',
    bgTone: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  },
  {
    id: 'mascot-indigo',
    name: 'AI Strategist',
    title: 'Algorithm Guru',
    tagline: 'Neural architectures & intelligent workflows',
    hoodie: '#4f46e5',
    darkHoodie: '#312e81',
    headphoneColor: '#818cf8',
    hairColor: '#09090b',
    glowColor: '#6366f1',
    borderGradient: 'from-[#a5b4fc] to-[#3730a3]',
    bgTone: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  },
  {
    id: 'mascot-slate',
    name: 'Dark Mode Ninja',
    title: 'Stealth Dev',
    tagline: 'Ultra-clean code & zero distractions',
    hoodie: '#334155',
    darkHoodie: '#0f172a',
    headphoneColor: '#94a3b8',
    hairColor: '#0f172a',
    glowColor: '#cbd5e1',
    borderGradient: 'from-[#94a3b8] to-[#1e293b]',
    bgTone: 'bg-slate-500/15 text-slate-600 dark:text-slate-400',
  },
]

export function getAvatarDefinition(avatarId?: string | null): AvatarOption {
  if (!avatarId) return AVATAR_OPTIONS[0]
  return AVATAR_OPTIONS.find((a) => a.id === avatarId) ?? AVATAR_OPTIONS[0]
}

export interface UserAvatarProps {
  avatar?: string | null
  className?: string
  expression?: 'idle' | 'wave' | 'cheer' | 'think'
  fallback?: string
}

export function UserAvatar({ avatar, className, expression = 'idle', fallback }: UserAvatarProps) {
  const def = getAvatarDefinition(avatar)
  return (
    <Mascot
      hoodie={def.hoodie}
      darkHoodie={def.darkHoodie}
      headphoneColor={def.headphoneColor}
      hairColor={def.hairColor}
      expression={expression}
      className={className}
    />
  )
}

export interface AvatarPickerProps {
  selected: string
  onSelect: (avatarId: string) => void
  className?: string
}

export function AvatarPicker({ selected, onSelect, className }: AvatarPickerProps) {
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-3', className)}>
      {AVATAR_OPTIONS.map((opt) => {
        const isSelected = selected === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            aria-pressed={isSelected}
            className={cn(
              'group relative flex flex-col items-center p-3 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer outline-none',
              isSelected
                ? 'border-[#0078d4] bg-[#0078d4]/10 shadow-[0_0_16px_rgba(0,120,212,0.25)] ring-2 ring-[#0078d4]/40 dark:border-[#38bdf8] dark:bg-[#38bdf8]/15 dark:ring-[#38bdf8]/40'
                : 'border-(--cf-border) bg-(--cf-surface-2) hover:border-(--cf-border-strong,var(--cf-border)) hover:bg-(--cf-surface) hover:scale-[1.02]',
            )}
          >
            {/* Active tick */}
            {isSelected && (
              <span className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-[#0078d4] text-white shadow-sm dark:bg-[#38bdf8] dark:text-[#0f172a]">
                <Check className="size-3 stroke-[3]" />
              </span>
            )}

            {/* Avatar image container with gradient border */}
            <div
              className={cn(
                'relative size-16 sm:size-20 rounded-full p-[2px] transition-transform duration-200 group-hover:scale-105',
                `bg-gradient-to-br ${opt.borderGradient}`,
              )}
            >
              <div className="size-full overflow-hidden rounded-full bg-(--cf-surface) grid place-items-center ring-1 ring-black/10 dark:ring-white/10">
                <Mascot
                  hoodie={opt.hoodie}
                  darkHoodie={opt.darkHoodie}
                  headphoneColor={opt.headphoneColor}
                  hairColor={opt.hairColor}
                  expression={isSelected ? 'cheer' : 'idle'}
                  className="size-full scale-110"
                />
              </div>
            </div>

            {/* Details */}
            <div className="mt-2 text-center w-full min-w-0">
              <span className="block font-display text-xs font-bold text-(--cf-text) truncate">
                {opt.name}
              </span>
              <span className="block text-[10px] text-(--cf-muted) truncate mt-0.5">
                {opt.title}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
