'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, LockKeyhole, Star } from 'lucide-react'
import { signupChallenge } from '@/data/challenges/signup'
import { Button } from '@/components/ui/button'

const cards = [
  { id: 'signup', title: 'Signup Flow', description: 'Arrange validation, hashing, persistence, and a safe response.', difficulty: 'Intermediate', active: true, href: '/challenge/signup' },
  { id: 'login', title: 'Login Flow', description: 'Coming soon: verify credentials without leaking information.', difficulty: 'Intermediate', active: false },
  { id: 'jwt', title: 'JWT Auth Middleware', description: 'Coming soon: protect routes and handle expired tokens.', difficulty: 'Advanced', active: false },
  { id: 'post', title: 'CRUD: Create Post', description: 'Coming soon: validate ownership and create a resource.', difficulty: 'Intermediate', active: false },
]

export default function Home() {
  const [progress, setProgress] = useState<{ completed?: boolean; score?: number }>({})
  useEffect(() => { const saved = localStorage.getItem('codeflow-progress'); if (saved) setProgress(JSON.parse(saved)) }, [])
  return <main className="min-h-screen bg-[#0d0f12] font-mono text-[#d4d4d4]"><header className="border-b border-[#292d35] bg-[#111318] px-6 py-5"><div className="mx-auto flex max-w-6xl items-center justify-between"><a href="/" className="flex items-center gap-2 text-sm font-bold text-white"><span className="flex size-7 items-center justify-center rounded bg-[#007acc] text-xs">{'<>'}</span> CodeFlow</a><a href="/mentor" className="text-xs text-[#9da3ad] hover:text-white">Mentor mode</a></div></header><div className="mx-auto max-w-6xl px-6 py-14"><div className="max-w-2xl"><p className="text-[10px] uppercase tracking-[0.3em] text-[#4ec9b0]">Backend reasoning lab</p><h1 className="mt-4 text-4xl font-bold tracking-tight text-white">Learn backend flows by thinking like the runtime.</h1><p className="mt-4 text-sm leading-7 text-[#858c98]">Put real request handlers in order, predict their outcomes, and explain the decisions back. No autocomplete. Just better instincts.</p></div><div className="mt-12 grid gap-4 md:grid-cols-2">{cards.map((card) => <article key={card.id} className={`rounded-xl border p-5 ${card.active ? 'border-[#007acc]/60 bg-[#111a23]' : 'border-[#292d35] bg-[#15171d]'}`}><div className="flex items-start justify-between"><div><div className="flex items-center gap-2"><h2 className="text-lg font-bold text-white">{card.title}</h2>{card.active && progress.completed && <CheckCircle2 className="size-4 text-[#4ec9b0]" />}</div><p className="mt-2 text-xs leading-6 text-[#858c98]">{card.description}</p></div>{card.active ? <ArrowRight className="size-5 text-[#4ec9b0]" /> : <LockKeyhole className="size-4 text-[#555b66]" />}</div><div className="mt-6 flex items-center justify-between border-t border-[#292d35] pt-4 text-[10px] text-[#858c98]"><span>{card.difficulty}</span>{card.active ? <span className="flex items-center gap-1 text-[#d7ba7d]"><Star className="size-3 fill-current" /> {progress.score ?? 0}/100 best</span> : <span>Coming soon</span>}</div>{card.active && <Button asChild className="mt-5 w-full bg-[#007acc] text-white hover:bg-[#1688d4]"><a href={card.href}>Start challenge</a></Button>}</article>)}</div></div></main>
}
export { signupChallenge }
