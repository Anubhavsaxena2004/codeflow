'use client'

import { useState, type FormEvent, type InputHTMLAttributes } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

function Field({ label, hint, ...input }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#2d2b60]">
      {label}
      <input
        required
        {...input}
        className="rounded-lg border-2 border-[#2d2b60]/40 bg-white/70 px-3 py-2 text-sm font-normal text-[#2d2b60] outline-none transition focus:border-[#4e7cff]"
      />
      {hint && <span className="font-normal text-[#5a567e]">{hint}</span>}
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
    <main className="grid min-h-dvh place-items-center bg-[#f4e9e7] p-4 text-[#2d2b60]">
      <div className="w-full max-w-sm rounded-[24px] border-2 border-[#2d2b60]/55 bg-white/30 p-6 shadow-[0_18px_40px_rgba(60,58,115,0.18)]">
        <Link href="/" className="mb-6 inline-flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-[#4e7cff] text-xs font-bold text-white">{'<>'}</span>
          <span className="font-['Segoe_Print','Bradley_Hand','Comic_Sans_MS',cursive] text-xl">CodeFlow</span>
        </Link>

        <h1 className="font-['Segoe_Print','Bradley_Hand','Comic_Sans_MS',cursive] text-2xl">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
        <p className="mt-1 text-xs leading-5 text-[#5a567e]">
          {isRegister ? 'Your drafts, best scores and attempts are saved to your account.' : 'Sign in to pick up where you left off.'}
        </p>

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
            <p role="alert" className="rounded-lg border border-[#f4b4a8] bg-[#fff5f3] px-3 py-2 text-xs text-[#ab3d2a]">
              {error}
            </p>
          )}

          <button type="submit" disabled={pending} className="rounded-lg bg-[#4e7cff] py-2.5 text-sm font-semibold text-white transition hover:bg-[#3c6df0] disabled:opacity-60">
            {pending ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-[#5a567e]">
          {isRegister ? 'Already have an account?' : 'New to CodeFlow?'}{' '}
          <Link href={switchHref} className="font-semibold text-[#4e7cff] hover:underline">
            {isRegister ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </div>
    </main>
  )
}
