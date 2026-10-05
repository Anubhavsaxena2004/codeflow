'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { applyTheme, currentTheme, THEME_STORAGE_KEY, type Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

/** Switches between light and dark mode, remembers the choice, and follows other open tabs. */
export function ThemeToggle({ className, iconClassName = 'size-4' }: { className?: string; iconClassName?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    setTheme(currentTheme())
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY || (event.newValue !== 'light' && event.newValue !== 'dark')) return
      applyTheme(event.newValue, false)
      setTheme(event.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const next: Theme = theme === 'dark' ? 'light' : 'dark'
  const label = theme ? `Switch to ${next} mode` : 'Switch between light and dark mode'

  return (
    <button
      type="button"
      onClick={() => {
        applyTheme(next)
        setTheme(next)
      }}
      aria-label={label}
      title={label}
      className={cn(
        'group relative grid size-10 shrink-0 place-items-center rounded-full border border-(--cf-border) bg-(--cf-surface)/80 text-(--cf-muted) shadow-xs transition-colors duration-[var(--dur-base,240ms)] hover:bg-(--cf-surface-2) hover:text-(--cf-text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
        className,
      )}
    >
      <Sun
        aria-hidden
        className={cn(
          'transition-all duration-[var(--dur-base,240ms)] ease-[var(--ease-out)]',
          iconClassName,
          theme === 'dark'
            ? 'rotate-0 scale-100 opacity-100 text-amber-400'
            : '-rotate-90 scale-50 opacity-0 pointer-events-none absolute',
        )}
      />
      <Moon
        aria-hidden
        className={cn(
          'transition-all duration-[var(--dur-base,240ms)] ease-[var(--ease-out)]',
          iconClassName,
          theme === 'dark'
            ? 'rotate-90 scale-50 opacity-0 pointer-events-none absolute'
            : 'rotate-0 scale-100 opacity-100 text-(--cf-muted) group-hover:text-(--cf-text)',
        )}
      />
    </button>
  )
}
