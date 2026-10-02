'use client'

import { ArrowRight, CheckCircle2, LockKeyhole, Star } from 'lucide-react'

const cards = [
  { id: 'signup', title: 'Signup Flow', description: 'Arrange validation, hashing, persistence, and a safe response.', difficulty: 'Intermediate', active: true, href: '/challenge/signup' },
  { id: 'login', title: 'Login Flow', description: 'Coming soon: verify credentials without leaking information.', difficulty: 'Intermediate', active: false },
  { id: 'jwt', title: 'JWT Auth Middleware', description: 'Coming soon: protect routes and handle expired tokens.', difficulty: 'Advanced', active: false },
  { id: 'post', title: 'CRUD: Create Post', description: 'Coming soon: validate ownership and create a resource.', difficulty: 'Intermediate', active: false },
]

export default function Home() {
  return (
    <main className="notebook-bg min-h-screen p-4 md:p-8">
      <style jsx global>{`
        .notebook-bg {
          background: #f4e9e7;
          color: #2d2b60;
        }
        .handwritten {
          font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive;
          letter-spacing: 0.04em;
        }
        .paper-shell {
          background: rgba(255,255,255,0.24);
          border: 2px solid rgba(45,43,96,0.55);
          border-radius: 28px;
          box-shadow: 0 18px 40px rgba(60,58,115,0.18);
        }
        .panel-box {
          background: rgba(255,255,255,0.2);
          border: 2px solid rgba(45,43,96,0.55);
          border-radius: 18px;
        }
      `}</style>

      <div className="paper-shell mx-auto max-w-6xl p-4 md:p-6">
        <header className="mb-8 flex items-center justify-between gap-3 border-b-2 border-[#2d2b60]/60 pb-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-[#4e7cff] text-sm font-bold text-white">{'<>'}</span>
            <span className="handwritten text-2xl text-[#2d2b60]">CodeFlow</span>
          </div>
          <a href="/mentor" className="text-xs uppercase tracking-[0.26em] text-[#5a567e]">Mentor mode</a>
        </header>

        <section className="mb-8">
          <div className="handwritten text-3xl md:text-5xl text-[#2d2b60]">Project levels</div>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-2xl md:text-4xl text-[#2d2b60]">
            <span>1. ToDo App</span>
            <span className="text-3xl text-[#5a567e]">|</span>
            <span>Kaban board</span>
            <span className="handwritten text-2xl md:text-3xl text-[#3d7ae6]">examples</span>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="panel-box p-4">
            <div className="handwritten text-2xl text-[#2d2b60]">user-clicks on 1st project</div>
            <div className="mt-6 grid gap-4 md:grid-cols-[1.1fr_1fr]">
              <div className="rounded-[20px] border-2 border-[#2d2b60]/50 bg-white/35 p-4">
                <div className="handwritten text-xl text-[#2d2b60]">Folder structure</div>
                <div className="mt-4 space-y-2 text-sm text-[#2d2b60]">
                  <div>• client</div>
                  <div>• server</div>
                  <div>• config</div>
                  <div>• modules</div>
                </div>
              </div>

              <div className="rounded-[20px] border-2 border-[#2d2b60]/50 bg-white/35 p-4">
                <div className="handwritten text-xl text-[#2d2b60]">Code editor</div>
                <div className="mt-4 space-y-3">
                  <div className="h-10 rounded border-2 border-[#2d2b60]/45 bg-white/45" />
                  <div className="h-10 rounded border-2 border-[#2d2b60]/45 bg-white/45" />
                  <div className="h-10 rounded border-2 border-[#2d2b60]/45 bg-white/45" />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 text-sm text-[#2d2b60] md:flex-row md:justify-between">
              <div className="handwritten text-xl">Each folder has its own explanation</div>
              <div className="handwritten text-xl">Each folder structure unlocks step by step</div>
            </div>
          </div>

          <div className="panel-box p-4">
            <div className="handwritten text-2xl text-[#2d2b60]">Challenge blocks</div>
            <div className="mt-4 space-y-3">
              {cards.map((card) => (
                <a
                  key={card.id}
                  href={card.active ? card.href : undefined}
                  className={`block rounded-xl border-2 p-4 transition ${card.active ? 'border-[#2d2b60]/55 bg-white/50' : 'border-[#2d2b60]/25 bg-[#f8f7f7] opacity-80'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-[#2d2b60]">{card.title}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#5a567e]">{card.difficulty}</div>
                    </div>
                    {card.active ? <ArrowRight className="size-5 text-[#4e7cff]" /> : <LockKeyhole className="size-4 text-[#6a6882]" />}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#5a567e]">{card.description}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-[#2d2b60]/20 pt-2 text-[10px] text-[#5a567e]">
                    <span>{card.active ? 'Open challenge' : 'Coming soon'}</span>
                    {card.active && <span className="inline-flex items-center gap-1 text-[#d5b36c]"><Star className="size-3 fill-current" /> Best score</span>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
