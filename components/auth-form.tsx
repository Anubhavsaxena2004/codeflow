'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Mascot } from '@/components/home/mascot'
import { ThemeToggle } from '@/components/theme-toggle'
import { GameButton, GamePanel } from '@/components/ui/game'
import { useShake } from '@/components/journey/feedback'
import { TitleBackdrop } from '@/components/auth/title-backdrop'
import { cn } from '@/lib/utils'

interface InputFieldProps {
  id: string
  label: string
  name: string
  type?: string
  icon: ReactNode
  hint?: string
  error?: string
  autoComplete?: string
  maxLength?: number
  minLength?: number
  required?: boolean
  showTogglePassword?: boolean
  showPassword?: boolean
  onTogglePassword?: () => void
}

function InputField({
  id,
  label,
  name,
  type = 'text',
  icon,
  hint,
  error,
  autoComplete,
  maxLength,
  minLength,
  required = true,
  showTogglePassword,
  showPassword,
  onTogglePassword,
}: InputFieldProps) {
  const errorId = error ? `${id}-error` : undefined
  const hintId = hint ? `${id}-hint` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-1.5 text-left">
      <label htmlFor={id} className="block text-xs font-display font-bold text-(--cf-text)">
        {label}
      </label>
      <div
        className={cn(
          'relative flex h-12 items-center rounded-[var(--radius-md,14px)] border-2 bg-(--cf-surface-2) transition-all',
          error
            ? 'border-[#ef4444] dark:border-[#ef4444]/60'
            : 'border-(--cf-border) hover:border-(--cf-border-strong,var(--cf-border)) focus-within:border-[#22c55e] focus-within:bg-(--cf-surface) focus-within:ring-2 focus-within:ring-[#22c55e]/25',
        )}
      >
        <span className="grid size-12 shrink-0 place-items-center text-(--cf-muted)" aria-hidden="true">
          {icon}
        </span>
        <input
          id={id}
          name={name}
          type={showTogglePassword ? (showPassword ? 'text' : 'password') : type}
          autoComplete={autoComplete}
          maxLength={maxLength}
          minLength={minLength}
          required={required}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className="h-full w-full min-w-0 bg-transparent pr-3 text-sm font-normal text-(--cf-text) outline-none placeholder:text-(--cf-muted)"
        />
        {showTogglePassword && onTogglePassword && (
          <button
            type="button"
            onClick={onTogglePassword}
            aria-pressed={showPassword}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="mr-3 grid size-8 place-items-center rounded-lg text-(--cf-muted) hover:bg-(--cf-surface) hover:text-(--cf-text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {error && (
        <div id={errorId} className="flex items-center gap-1.5 text-xs font-semibold text-[#dc2626] dark:text-[#f87171]">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {hint && !error && (
        <span id={hintId} className="text-[11px] text-(--cf-muted)">
          {hint}
        </span>
      )}
    </div>
  )
}

export function AuthForm({ mode, next }: { mode: 'login' | 'register'; next: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { triggerShake, shakeAnimation } = useShake()
  const shouldReduceMotion = useReducedMotion()
  const isRegister = mode === 'register'

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const body = JSON.stringify(Object.fromEntries(new FormData(form)))
    setPending(true)
    setError(null)

    const response = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }).catch(() => null)

    if (response?.ok) {
      router.replace(next)
      router.refresh()
      return
    }

    const data = await response?.json().catch(() => null)
    const errorMsg =
      data?.error ??
      (response
        ? `The server ran into a problem (error ${response.status}). Try again in a minute.`
        : 'Could not reach the server. Check your connection and try again.')
    setError(errorMsg)
    setPending(false)
    triggerShake()
  }

  const switchHref = `/${isRegister ? 'login' : 'register'}${
    next === '/' ? '' : `?next=${encodeURIComponent(next)}`
  }`

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-x-hidden p-4 text-(--cf-text)">
      {/* Decorative Title Backdrop */}
      <TitleBackdrop />

      {/* Top right ThemeToggle */}
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle className="size-9 rounded-full border border-(--cf-border) bg-(--cf-surface)/80 backdrop-blur-xs text-(--cf-muted) hover:text-(--cf-text) shadow-xs" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-8 px-4 py-8 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Column (1024px+): Wordmark, Tagline, Waving Mascot */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left max-w-md">
          <Link href="/" className="mb-4 inline-flex items-center gap-3">
            <span
              className="grid size-12 place-items-center rounded-2xl text-base font-extrabold text-white shadow-(--elev-3)"
              style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}
            >
              {'</>'}
            </span>
            <span
              className="font-display text-4xl lg:text-5xl font-black tracking-tight text-(--cf-text)"
              style={{
                textShadow: '0 2px 0 rgba(0,0,0,0.1), 0 4px 12px rgba(34,197,94,0.25)',
              }}
            >
              CodeFlow
            </span>
          </Link>
          <p className="font-display text-lg lg:text-xl font-bold text-(--cf-text) mb-1.5">
            Learn · Build · Level up
          </p>
          <p className="text-xs sm:text-sm text-(--cf-muted) leading-relaxed mb-6">
            Master backend development as a game. Solve hands-on levels, conquer boss challenges, and push real repositories to GitHub.
          </p>

          {/* Mascot waving loop on desktop */}
          <div className="hidden lg:block relative mt-2">
            <motion.div
              animate={shouldReduceMotion ? {} : { rotate: [0, 6, -3, 6, 0], y: [0, -4, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="size-36"
            >
              <Mascot expression="wave" className="size-full drop-shadow-md" />
            </motion.div>
          </div>
        </div>

        {/* Right Column: Form Card with shake animation */}
        <motion.div animate={shakeAnimation} className="w-full max-w-[420px]">
          <GamePanel
            tone="raised"
            padding="lg"
            className="relative shadow-(--elev-3) rounded-3xl border border-(--cf-border)"
          >
            {/* Top decorative gradient bar */}
            <div
              aria-hidden="true"
              className="absolute inset-x-8 top-0 h-1.5 rounded-b-full"
              style={{ background: 'linear-gradient(90deg, #22c55e, #06b6d4, #7c3aed)' }}
            />

            {/* Mobile Mascot & Header */}
            <div className="flex items-center gap-3 lg:hidden mb-4">
              <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#dcfce7] dark:bg-[#16a34a]/20">
                <Mascot expression="wave" className="size-12" />
              </span>
              <div>
                <h1 className="text-xl font-display font-extrabold text-(--cf-text)">
                  {isRegister ? 'Create your account' : 'Welcome back'}
                </h1>
                <p className="text-xs text-(--cf-muted)">
                  {isRegister
                    ? 'Your drafts, best scores and attempts are saved.'
                    : 'Sign in to pick up where you left off.'}
                </p>
              </div>
            </div>

            {/* Desktop Card Title */}
            <div className="hidden lg:block mb-4">
              <h1 className="text-2xl font-display font-extrabold text-(--cf-text)">
                {isRegister ? 'Create your account' : 'Welcome back'}
              </h1>
              <p className="mt-1 text-xs text-(--cf-muted)">
                {isRegister
                  ? 'Your drafts, best scores and attempts are saved to your account.'
                  : 'Sign in to pick up where you left off.'}
              </p>
            </div>

            {/* Mode Switch: Segmented Header */}
            <div
              className="flex rounded-xl border border-(--cf-border) bg-(--cf-surface-2) p-1 mb-5"
              role="tablist"
              aria-label="Authentication mode"
            >
              <Link
                href={`/login${next === '/' ? '' : `?next=${encodeURIComponent(next)}`}`}
                role="tab"
                aria-selected={!isRegister}
                className={cn(
                  'flex-1 text-center py-2 text-xs font-display font-bold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]',
                  !isRegister
                    ? 'bg-(--cf-surface) text-(--cf-text) shadow-xs'
                    : 'text-(--cf-muted) hover:text-(--cf-text)',
                )}
              >
                Sign in
              </Link>
              <Link
                href={`/register${next === '/' ? '' : `?next=${encodeURIComponent(next)}`}`}
                role="tab"
                aria-selected={isRegister}
                className={cn(
                  'flex-1 text-center py-2 text-xs font-display font-bold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]',
                  isRegister
                    ? 'bg-(--cf-surface) text-(--cf-text) shadow-xs'
                    : 'text-(--cf-muted) hover:text-(--cf-text)',
                )}
              >
                Create an account
              </Link>
            </div>

            {/* Form-level error alert */}
            {error && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3 text-xs text-[#b91c1c] dark:border-[#ef4444]/40 dark:bg-[#ef4444]/10 dark:text-[#fca5a5]"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={submit} className="flex flex-col gap-4">
              {isRegister && (
                <InputField
                  id="auth-name"
                  label="Name"
                  name="name"
                  icon={<User className="size-4" />}
                  autoComplete="name"
                  maxLength={80}
                />
              )}

              <InputField
                id="auth-email"
                label="Email"
                name="email"
                type="email"
                icon={<Mail className="size-4" />}
                autoComplete="email"
                maxLength={254}
              />

              <InputField
                id="auth-password"
                label="Password"
                name="password"
                type="password"
                icon={<Lock className="size-4" />}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                minLength={isRegister ? 8 : undefined}
                maxLength={128}
                hint={isRegister ? 'At least 8 characters.' : undefined}
                showTogglePassword={true}
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword((p) => !p)}
              />

              <div className="mt-2">
                <GameButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={pending}
                  aria-busy={pending}
                  className="btn-shine-idle font-display font-extrabold text-base tracking-wide"
                >
                  {pending ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
                </GameButton>
              </div>
            </form>

            {/* Secondary Link */}
            <p className="mt-5 text-center text-xs text-(--cf-muted)">
              {isRegister ? 'Already have an account?' : 'New to CodeFlow?'}{' '}
              <Link
                href={switchHref}
                className="font-bold text-[#16a34a] hover:underline dark:text-[#4ade80]"
              >
                {isRegister ? 'Sign in' : 'Create an account'}
              </Link>
            </p>
          </GamePanel>
        </motion.div>
      </div>
    </main>
  )
}
