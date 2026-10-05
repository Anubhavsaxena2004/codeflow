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
      className={cn('grid place-items-center transition', className)}
    >
      {theme === 'dark' ? <Sun aria-hidden className={iconClassName} /> : <Moon aria-hidden className={iconClassName} />}
    </button>
  )
}
