'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, Clock3, Lightbulb, Play, RotateCcw, Star, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { signupChallenge, correctOrder as signupOrder, type Challenge } from '@/data/challenges/signup'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Language = 'express' | 'django' | 'spring'
type Scenario = 'new' | 'missing' | 'exists'

const languageLabels: Record<Language, string> = {
  express: 'Node.js + Express',
  django: 'Python + Django',
  spring: 'Java + Spring Boot',
}

const languageCode: Record<Language, string[]> = {
  express: [
    'const { name, email, password } = req.body;',
    'if (!name || !email || !password) return res.status(400);',
    'const existingUser = await User.findOne({ email });',
    'const hashedPassword = await bcrypt.hash(password, salt);',
    'const user = await User.create({ password: hashedPassword });',
    'return res.status(201).json({ userId: user._id });',
  ],
  django: [
    '        name = request.data.get("name")\n        email = request.data.get("email")\n        password = request.data.get("password")',
    '        if not name or not email or not password:\n            return Response({"message": "All fields are required"}, status=400)',
    '        existing_user = User.objects.filter(email=email).first()\n        if existing_user:\n            return Response({"message": "User already exists, please login"}, status=409)',
    '        hashed_password = make_password(password)',
    '        user = User.objects.create(name=name, email=email, password=hashed_password)',
    '        return Response({"message": "Signup successful", "userId": user.id}, status=201)',
  ],
  spring: [
    '    String name = request.name();\n    String email = request.email();\n    String password = request.password();',
    '    if (name == null || name.isBlank() || email == null || email.isBlank() || password == null || password.isBlank()) {\n      return ResponseEntity.badRequest().body("All fields are required");\n    }',
    '    Optional<User> existingUser = userRepository.findByEmail(email);\n    if (existingUser.isPresent()) {\n      return ResponseEntity.status(409).body("User already exists, please login");\n    }',
    '    String hashedPassword = passwordEncoder.encode(password);',
    '    User user = userRepository.save(new User(name, email, hashedPassword));',
    '    return ResponseEntity.status(201).body(new SignupResponse(user.getId()));',
  ],
}

const languageScaffold: Partial<Record<Language, Record<number, string>>> = {
  django: {
    0: 'from django.contrib.auth.hashers import make_password',
    1: 'from rest_framework.response import Response',
    2: 'from .models import User',
    3: 'def signup(request):',
    4: '    try:',
    11: '    except Exception:',
    12: '        return Response({"message": "Something went wrong"}, status=500)',
    13: '',
    14: '',
    16: '',
  },
  spring: {
    0: 'import java.util.Optional;',
    1: 'import org.springframework.http.ResponseEntity;',
    2: 'import org.springframework.web.bind.annotation.*;',
    3: 'public ResponseEntity<?> signup(SignupRequest request) {',
    4: '  try {',
    11: '  } catch (Exception error) {',
    12: '    return ResponseEntity.internalServerError().body("Something went wrong");',
    13: '  }',
    14: '}',
    16: '',
  },
}

function blockCodeFor(language: Language, blockId: string, fallback: string) {
  if (language === 'express') return fallback
  const index = signupOrder.indexOf(blockId)
  return languageCode[language][index] ?? fallback
}

const scenarios: Record<Scenario, { label: string; status: number; body: string }> = {
  new: { label: 'New user', status: 201, body: '{ name: "Riya", email: "riya@test.com", password: "********" }' },
  missing: { label: 'Missing password', status: 400, body: '{ name: "Riya", email: "riya@test.com" }' },
  exists: { label: 'Already registered', status: 409, body: '{ name: "Riya", email: "existing@test.com", password: "********" }' },
}

function Code({ text }: { text: string }) {
  return <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[#2d2b60]">{text}</pre>
}

function RunDrawer({ language, onClose, onPrediction }: { language: Language; onClose: () => void; onPrediction: (correct: boolean) => void }) {
  const [scenario, setScenario] = useState<Scenario>('new')
  const [prediction, setPrediction] = useState<number | null>(null)
  const [ran, setRan] = useState(false)
  const data = scenarios[scenario]

  return (
    <motion.aside
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[680px] flex-col border-l-2 border-[#2d2b60] bg-[#f7f0f1] text-[#2d2b60] shadow-[0_20px_50px_rgba(35,32,71,0.22)]"
    >
      <header className="flex items-center justify-between border-b-2 border-[#2d2b60]/50 px-5 py-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-[#2d2b60]">
            <Play className="size-4 text-[#4e7cff]" /> Predict before run
          </div>
          <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-[#5a567e]">{languageLabels[language]} · {data.label}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close run drawer"><X /></Button>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {(Object.keys(scenarios) as Scenario[]).map((item) => (
            <button
              key={item}
              onClick={() => {
                setScenario(item)
                setPrediction(null)
                setRan(false)
              }}
              className={cn(
                'rounded border px-3 py-2 text-[10px] font-medium',
                scenario === item ? 'border-[#2d2b60] bg-[#2d2b60] text-[#f7f0f1]' : 'border-[#2d2b60]/50 text-[#2d2b60]',
              )}
            >
              {scenarios[item].label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border-2 border-[#d5b36c] bg-[#fff4dd] p-4">
          <p className="text-sm font-bold text-[#2d2b60]">What status code will this return?</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[201, 400, 409, 500].map((code) => (
              <button
                key={code}
                onClick={() => setPrediction(code)}
                className={cn(
                  'rounded border py-2 text-xs font-bold',
                  prediction === code ? 'border-[#2d2b60] bg-[#2d2b60] text-[#fff]' : 'border-[#d5b36c] text-[#2d2b60]',
                )}
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-xl border-2 border-[#2d2b60]/40 bg-[#f3f2f8] p-3">
          <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-[#5a567e]">Request body</div>
          <Code text={data.body} />
        </div>

        <div className="mt-4 rounded-xl border-2 border-[#2d2b60]/40 bg-[#f3f2f8] p-3">
          {languageCode[language].map((line) => (
            <div key={line} className="mb-2 rounded-md bg-white/60 p-2">
              <Code text={line} />
            </div>
          ))}
        </div>

        <Button
          className="mt-4 w-full bg-[#4e7cff] text-white hover:bg-[#3c6df0]"
          disabled={prediction === null || ran}
          onClick={() => {
            setRan(true)
            onPrediction(prediction === data.status)
          }}
        >
          <Play data-icon="inline-start" /> Run scenario
        </Button>

        {ran && (
          <div
            className={cn(
              'mt-4 rounded-xl border-2 p-4 text-sm',
              prediction === data.status ? 'border-[#66c7a3] bg-[#ecfdf5] text-[#146c4a]' : 'border-[#f4b4a8] bg-[#fff5f3] text-[#ab3d2a]',
            )}
          >
            <strong>{prediction === data.status ? 'Correct prediction' : 'Not quite'}</strong>
            <p className="mt-2 text-xs text-[#2d2b60]">
              {prediction === data.status ? 'That status matches the request flow.' : `The correct answer is ${data.status}.`}
            </p>
          </div>
        )}
      </div>
    </motion.aside>
  )
}

function ArchitectureStrip({ challenge, activeBlock, confirmed, pulsedNode, onNodeClick }: { challenge: Challenge; activeBlock: string | null; confirmed: string[]; pulsedNode: string | null; onNodeClick: (id: string) => void }) {
  const architecture = challenge.architecture
  const activeMapping = activeBlock ? architecture.mappings[activeBlock] : undefined
  const isLit = (id: string) => confirmed.some((block) => architecture.mappings[block]?.nodeIds.includes(id))
  const arrowLit = (id: string) => confirmed.some((block) => architecture.mappings[block]?.arrowIds?.includes(id))

  return (
    <div className="mt-4 rounded-xl border-2 border-[#2d2b60]/40 bg-[#f7f2f3] p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.26em] text-[#5a567e]">Architecture map</span>
        <span className="text-[9px] text-[#5a567e]">click a node</span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {architecture.nodes.map((node, index) => (
          <div key={node.id} className="flex items-center gap-2">
            <button
              onClick={() => onNodeClick(node.id)}
              className={cn(
                'sketch-node min-w-[110px] rounded-xl border-2 px-3 py-2 text-center text-[11px] font-bold transition-all',
                node.kind === 'database' ? 'border-[#d5b36c] text-[#2d2b60]' : 'border-[#4e7cff] text-[#2d2b60]',
                activeMapping?.nodeIds.includes(node.id) || isLit(node.id) ? 'bg-[#dfe8ff] shadow-[0_0_16px_rgba(78,124,255,0.25)]' : pulsedNode === node.id ? 'bg-[#fff4dd] shadow-[0_0_16px_rgba(213,179,108,0.35)] animate-pulse' : 'bg-white/70',
              )}
            >
              <span>{node.label}</span>
              {isLit(node.id) && <span className="ml-1 text-[#4e7cff]">✓</span>}
            </button>
            {index < architecture.nodes.length - 1 && (
              <span
                className={cn(
                  'text-xl text-[#7d7a9a]',
                  architecture.arrows[index] && (activeMapping?.arrowIds?.includes(architecture.arrows[index].id) || arrowLit(architecture.arrows[index].id)) && 'text-[#4e7cff]',
                )}
              >
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Reflection({ challenge, onDone }: { challenge: Challenge; onDone: () => void }) {
  const [answers, setAnswers] = useState<string[]>(['', ''])
  const [submitted, setSubmitted] = useState(false)
  const reflections = challenge.reflections ?? []

  return (
    <section className="mt-6 rounded-xl border-2 border-[#2d2b60]/40 bg-[#f7f2f3] p-4">
      <h2 className="text-[10px] uppercase tracking-[0.28em] text-[#2d2b60]">Explain it back</h2>
      <p className="mt-1 text-[10px] text-[#5a567e]">Not auto-graded. Compare your reasoning with the model answer.</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {reflections.map((item, index) => (
          <div key={item.question}>
            <label className="text-[11px] text-[#2d2b60]">{item.question}</label>
            <textarea
              value={answers[index] ?? ''}
              onChange={(event) =>
                setAnswers((current) =>
                  current.map((answer, itemIndex) => (itemIndex === index ? event.target.value : answer)),
                )
              }
              className="mt-2 min-h-24 w-full rounded border border-[#2d2b60]/40 bg-white/80 p-3 text-xs text-[#2d2b60] outline-none focus:border-[#4e7cff]"
              placeholder="Write your explanation..."
            />
            {submitted && (
              <div className="mt-2 rounded border border-[#66c7a3]/40 bg-[#ecfdf5] p-3 text-[11px] text-[#146c4a]">
                <strong>Model answer</strong>
                <p className="mt-1">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {reflections.length > 0 && (
        <Button
          className="mt-4"
          onClick={() => {
            setSubmitted(true)
            onDone()
          }}
          disabled={answers.slice(0, reflections.length).some((answer) => !answer.trim())}
        >
          Compare answers
        </Button>
      )}
    </section>
  )
}

export default function CodeFlowApp({ challenge = signupChallenge }: { challenge?: Challenge }) {
  const order = challenge === signupChallenge ? signupOrder : challenge.blocks.filter((block) => !block.id.startsWith('bad-')).map((block) => block.id)
  const [language, setLanguage] = useState<Language>('express')
  const [slots, setSlots] = useState<(string | undefined)[]>(() => Array(order.length).fill(undefined))
  const [checked, setChecked] = useState(false)
  const [checkAttempts, setCheckAttempts] = useState(0)
  const [runOpen, setRunOpen] = useState(false)
  const [hints, setHints] = useState(0)
  const [hintLevels, setHintLevels] = useState<Record<number, number>>({})
  const [pulsedNode, setPulsedNode] = useState<string | null>(null)
  const [predictions, setPredictions] = useState({ correct: 0, total: 0 })
  const [started, setStarted] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [reflected, setReflected] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const [focusedNode, setFocusedNode] = useState<string | null>(null)

  useEffect(() => { setStarted(Date.now()) }, [])
  useEffect(() => {
    if (!started) return
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => window.clearInterval(id)
  }, [started])

  useEffect(() => {
    const saved = window.localStorage.getItem('codeflow-progress')
    if (saved) {
      try {
        setPredictions(JSON.parse(saved).predictions ?? { correct: 0, total: 0 })
      } catch {
        // ignore malformed local progress
      }
    }
  }, [])

  const initialBlocks = useMemo(
    () =>
      [...challenge.blocks.filter((block) => !block.id.startsWith('bad-'))].sort(
        (a, b) =>
          (a.id.split('').reduce((n, c) => n + c.charCodeAt(0), 0) % 7) -
            (b.id.split('').reduce((n, c) => n + c.charCodeAt(0), 0) % 7) || a.id.localeCompare(b.id),
      ),
    [challenge],
  )
  const [blocks] = useState(initialBlocks)

  const completed = checked && slots.every((id, index) => id === order[index])
  const score = Math.max(0, 100 - Math.max(0, checkAttempts - (completed ? 0 : 1)) * 10 - hints * 15)
  const stars = score >= 90 ? 3 : score >= 70 ? 2 : 1
  const confirmed = slots.filter((id, index): id is string => id === order[index])
  const activeBlock = hovered ?? (focusedNode ? blocks.find((block) => challenge.architecture.mappings[block.id]?.nodeIds.includes(focusedNode))?.id ?? null : null)

  const place = (id: string) => {
    const next = [...slots]
    const old = next.indexOf(id)
    if (old >= 0) next[old] = undefined
    const empty = next.findIndex((slot) => !slot)
    if (empty >= 0) next[empty] = id
    setSlots(next)
    setChecked(false)
  }

  const reset = () => {
    setSlots(Array(order.length).fill(undefined))
    setChecked(false)
    setCheckAttempts(0)
    setHints(0)
    setHintLevels({})
    setStarted(Date.now())
    setElapsed(0)
    setReflected(false)
    setFocusedNode(null)
  }

  const hint = () => {
    const index = slots.findIndex((id, position) => id !== order[position])
    if (index < 0) return
    const level = (hintLevels[index] ?? 0) + 1
    const block = challenge.architecture.mappings[order[index]]
    setHintLevels((value) => ({ ...value, [index]: level }))
    setHints((value) => value + 1)
    if (level === 2) setPulsedNode(block?.nodeIds[0] ?? null)
    if (level >= 3) {
      const next = [...slots]
      next[index] = order[index]
      setSlots(next)
      setPulsedNode(null)
    }
    setChecked(false)
  }

  const persist = (next: { correct: number; total: number }) => {
    setPredictions(next)
    window.localStorage.setItem('codeflow-progress', JSON.stringify({ predictions: next, completed: true, score, stars, elapsed }))
  }

  const progressPercent = Math.min(100, Math.round((confirmed.length / order.length) * 100))

  return (
    <>
      <style jsx global>{`
        .notebook-bg {
          background: #f4e9e7;
          color: #2d2b60;
        }
        .notebook-shell {
          background: rgba(255,255,255,0.3);
          border: 2px solid rgba(45,43,96,0.55);
          border-radius: 28px;
          box-shadow: 0 18px 40px rgba(60,58,115,0.18);
        }
        .handwritten {
          font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive;
          letter-spacing: 0.04em;
        }
        .panel-box {
          background: rgba(255,255,255,0.22);
          border: 2px solid rgba(45,43,96,0.55);
          border-radius: 20px;
        }
        .editor-box {
          background: rgba(255,255,255,0.28);
          border: 2px solid rgba(45,43,96,0.55);
          border-radius: 20px;
          min-height: 560px;
        }
        .slot-button {
          border: 2px solid rgba(45,43,96,0.55);
          background: rgba(255,255,255,0.25);
          border-radius: 14px;
          min-height: 92px;
          transition: all 0.2s ease;
        }
        .slot-button.active {
          border-color: rgba(78,124,255,0.9);
          background: rgba(78,124,255,0.1);
          box-shadow: 0 0 0 3px rgba(78,124,255,0.18);
        }
        .slot-button.correct {
          border-color: rgba(102,199,163,0.9);
          background: rgba(102,199,163,0.12);
        }
        .code-pill {
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(45,43,96,0.25);
          border-radius: 10px;
          padding: 10px 12px;
        }
        .sketch-node {
          transform: rotate(-0.6deg);
          font-family: ui-monospace, monospace;
        }
        .sketch-node:nth-child(even) {
          transform: rotate(0.8deg);
        }
      `}</style>

      <div className="notebook-bg min-h-screen p-4 md:p-8">
        <div className="notebook-shell mx-auto max-w-[1400px] p-3 md:p-5">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#2d2b60]/55 pb-3">
            <div className="flex items-center gap-4">
              <a href="/" className="flex items-center gap-2 text-sm font-bold text-[#2d2b60]">
                <span className="flex size-8 items-center justify-center rounded-md bg-[#4e7cff] text-xs text-white">{'<>'}</span>
                CodeFlow
              </a>
              <ChevronRight className="size-4 text-[#5a567e]" />
              <span className="text-xs uppercase tracking-[0.28em] text-[#5a567e]">{challenge.title}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-[10px] text-[#5a567e]">
                <span className="sr-only">Choose language and framework</span>
                <select
                  value={language}
                  onChange={(event) => {
                    const nextLanguage = event.target.value as Language
                    setLanguage(nextLanguage)
                    setChecked(false)
                  }}
                  className="rounded border-2 border-[#2d2b60]/50 bg-[#fbf7f7] px-2 py-1.5 text-[10px] text-[#2d2b60]"
                  aria-label="Choose language and framework"
                >
                  <option value="express">Node.js + Express</option>
                  <option value="django">Python + Django</option>
                  <option value="spring">Java + Spring Boot</option>
                </select>
              </label>

              <span className="text-[10px] text-[#5a567e]">Hints used: {hints}</span>
              <Button size="sm" variant="ghost" onClick={reset}><RotateCcw data-icon="inline-start" />Reset</Button>
              <Button size="sm" variant="outline" onClick={hint} disabled={completed}><Lightbulb data-icon="inline-start" />Hint</Button>
              <Button size="sm" onClick={() => { setChecked(true); setCheckAttempts((value) => value + 1) }}><Check data-icon="inline-start" />Check</Button>
              <Button size="sm" className="bg-[#4e7cff] text-white hover:bg-[#3c6df0]" disabled={!completed} onClick={() => setRunOpen(true)}><Play data-icon="inline-start" />Run it</Button>
            </div>
          </header>

          <div className="mb-5 grid gap-3 sm:grid-cols-4">
            <div className="panel-box p-3">
              <div className="text-[10px] uppercase tracking-[0.24em] text-[#5a567e]">Score</div>
              <div className="mt-1 text-2xl font-bold text-[#2d2b60]">{score}</div>
            </div>
            <div className="panel-box p-3">
              <div className="text-[10px] uppercase tracking-[0.24em] text-[#5a567e]">Time</div>
              <div className="mt-1 flex items-center gap-2 text-2xl font-bold text-[#2d2b60]">
                <Clock3 className="size-4 text-[#4e7cff]" /> {elapsed}s
              </div>
            </div>
            <div className="panel-box p-3">
              <div className="text-[10px] uppercase tracking-[0.24em] text-[#5a567e]">Accuracy</div>
              <div className="mt-1 text-2xl font-bold text-[#2d2b60]">{predictions.total ? Math.round((predictions.correct / predictions.total) * 100) : 0}%</div>
            </div>
            <div className="panel-box p-3">
              <div className="text-[10px] uppercase tracking-[0.24em] text-[#5a567e]">Best</div>
              <div className="mt-1 flex gap-1 text-[#d5b36c]">
                {[...Array(3)].map((_, index) => <Star key={index} className={cn('size-4', index < stars ? 'fill-current' : 'text-[#d9d4d9]')} />)}
              </div>
            </div>
          </div>

          <main className="grid gap-4 xl:grid-cols-[240px_1fr_300px]">
            <aside className="panel-box p-3">
              <div className="mb-3 text-[10px] uppercase tracking-[0.28em] text-[#5a567e]">Explorer</div>
              <div className="space-y-2">
                {blocks.map((block) => (
                  <button
                    key={block.id}
                    onMouseEnter={() => setHovered(block.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => place(block.id)}
                    className={cn(
                      'w-full rounded-xl border-2 px-3 py-2 text-left transition-all',
                      activeBlock === block.id ? 'border-[#4e7cff] bg-[#eaf0ff]' : 'border-[#2d2b60]/40 bg-white/35',
                    )}
                  >
                    <div className="text-[11px] font-bold text-[#2d2b60]">{block.label}</div>
                    <div className="mt-1 text-[9px] text-[#5a567e]">{block.what}</div>
                  </button>
                ))}
              </div>
            </aside>

            <section className="editor-box p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-[10px] uppercase tracking-[0.28em] text-[#5a567e]">Project flow</div>
                <div className="rounded-full border-2 border-[#2d2b60]/40 bg-white/70 px-3 py-1 text-[10px] font-semibold text-[#2d2b60]">{progressPercent}% complete</div>
              </div>

              <div className="mb-4 grid gap-2 md:grid-cols-3">
                {order.map((blockId, index) => {
                  const block = challenge.blocks.find((item) => item.id === blockId)
                  const isPlaced = !!slots[index]
                  return (
                    <button
                      key={`${blockId}-${index}`}
                      onClick={() => block && place(block.id)}
                      className={cn(
                        'slot-button p-3 text-left',
                        isPlaced ? 'active' : '',
                        slots[index] === order[index] ? 'correct' : '',
                      )}
                    >
                      <div className="mb-1 text-[9px] uppercase tracking-[0.24em] text-[#5a567e]">slot {index + 1}</div>
                      <div className="text-[12px] font-bold text-[#2d2b60]">{block?.label ?? 'Empty'}</div>
                    </button>
                  )
                })}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {order.map((blockId, index) => {
                  const block = challenge.blocks.find((item) => item.id === blockId)
                  const value = slots[index]
                  return (
                    <div key={`${blockId}-code-${index}`} className="code-pill">
                      {block ? (
                        <>
                          <div className="mb-1 text-[9px] uppercase tracking-[0.26em] text-[#5a567e]">{block.label}</div>
                          <Code text={block.code} />
                        </>
                      ) : (
                        <div className="text-[10px] uppercase tracking-[0.26em] text-[#5a567e]">Waiting for block</div>
                      )}
                      <div className="mt-2 text-[9px] text-[#5a567e]">{value === blockId ? 'placed' : 'not placed yet'}</div>
                    </div>
                  )
                })}
              </div>
            </section>

            <aside className="panel-box p-3">
              <div className="mb-3 text-[10px] uppercase tracking-[0.28em] text-[#5a567e]">GitHub</div>
              <div className="rounded-xl border-2 border-dashed border-[#2d2b60]/50 bg-white/50 p-3 text-[11px] text-[#2d2b60]">
                Connect GitHub
              </div>

              <div className="mt-4 rounded-xl border-2 border-[#2d2b60]/40 bg-white/50 p-3">
                <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[#5a567e]">Activity</div>
                <div className="text-[11px] text-[#2d2b60]">GitHub · Explorer · File tree</div>
              </div>

              <ArchitectureStrip
                challenge={challenge}
                activeBlock={activeBlock}
                confirmed={confirmed}
                pulsedNode={pulsedNode}
                onNodeClick={(id) => setFocusedNode(focusedNode === id ? null : id)}
              />

              {reflected && <Reflection challenge={challenge} onDone={() => setReflected(true)} />}
            </aside>
          </main>
        </div>
      </div>

      {runOpen && (
        <AnimatePresence>
          <RunDrawer
            language={language}
            onClose={() => setRunOpen(false)}
            onPrediction={(correct) => persist({ correct: predictions.correct + (correct ? 1 : 0), total: predictions.total + 1 })}
          />
        </AnimatePresence>
      )}
    </>
  )
}

export { languageLabels }

<style jsx global>{`.sketch-node{transform:rotate(-.6deg);font-family:ui-monospace,monospace}.sketch-node:nth-child(even){transform:rotate(.8deg)}`}</style>
