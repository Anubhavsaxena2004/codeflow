'use client'

import { useState, type FormEvent, type InputHTMLAttributes } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mascot } from '@/components/home/mascot'
import { ThemeToggle } from '@/components/theme-toggle'

function Field({ label, hint, ...input }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-bold text-(--cf-text)">
      {label}
      <input
        required
        {...input}
        className="rounded-xl border-2 border-(--cf-border) bg-(--cf-surface-2) px-3 py-2.5 text-sm font-normal text-(--cf-text) outline-none transition focus:border-[#22c55e] focus:bg-(--cf-surface)"
      />
      {hint && <span className="font-normal text-(--cf-muted)">{hint}</span>}
    </label>
  )
}

export function AuthForm({ mode, next }: { mode: 'login' | 'register'; next: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const isRegister = mode === 'register'

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const body = JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))
    setPending(true)
    setError(null)

    const response = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }).catch(() => null)
    if (response?.ok) {
      router.replace(next)
      router.refresh()
      return
    }
    const data = await response?.json().catch(() => null)
    setError(data?.error ?? (response ? `The server ran into a problem (error ${response.status}). Try again in a minute.` : 'Could not reach the server. Check your connection and try again.'))
    setPending(false)
  }

  const switchHref = `/${isRegister ? 'login' : 'register'}${next === '/' ? '' : `?next=${encodeURIComponent(next)}`}`

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-(--cf-bg) p-4 text-(--cf-text)">
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-[#22c55e]/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 -right-16 size-96 rounded-full bg-[#7c3aed]/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute right-1/3 top-8 size-56 rounded-full bg-[#06b6d4]/20 blur-3xl" />
      <ThemeToggle className="absolute right-4 top-4 size-9 rounded-full border border-(--cf-border) bg-(--cf-surface) text-(--cf-muted) hover:text-(--cf-text)" />

      <div className="relative w-full max-w-sm rounded-3xl border border-(--cf-border) bg-(--cf-surface) p-6 shadow-(--cf-shadow)">
        <div aria-hidden className="absolute inset-x-6 top-0 h-1 rounded-b-full" style={{ background: 'linear-gradient(90deg, #22c55e, #06b6d4, #7c3aed)' }} />
        <Link href="/" className="mb-6 inline-flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl text-xs font-extrabold text-white" style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}>{'</>'}</span>
          <span className="text-xl font-extrabold">CodeFlow</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#dcfce7] dark:bg-[#16a34a]/20">
            <Mascot className="size-14" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
            <p className="mt-0.5 text-xs leading-5 text-(--cf-muted)">
              {isRegister ? 'Your drafts, best scores and attempts are saved to your account.' : 'Sign in to pick up where you left off.'}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          {isRegister && <Field label="Name" name="name" autoComplete="name" maxLength={80} />}
          <Field label="Email" name="email" type="email" autoComplete="email" maxLength={254} />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            minLength={isRegister ? 8 : undefined}
            maxLength={128}
            hint={isRegister ? 'At least 8 characters.' : undefined}
          />

          {error && (
            <p role="alert" className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs text-[#b91c1c] dark:border-[#ef4444]/40 dark:bg-[#ef4444]/10 dark:text-[#fca5a5]">
              {error}
            </p>
          )}

          <button type="submit" disabled={pending} className="btn-shine rounded-xl py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgb(22_163_74/0.35)] transition hover:brightness-110 disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}>
            {pending ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-(--cf-muted)">
          {isRegister ? 'Already have an account?' : 'New to CodeFlow?'}{' '}
          <Link href={switchHref} className="font-bold text-[#16a34a] hover:underline dark:text-[#4ade80]">
            {isRegister ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </div>
    </main>
  )
}
