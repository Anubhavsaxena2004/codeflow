'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CodeLines } from './code'

type Scenario = 'new' | 'missing' | 'exists'

const scenarios: Record<Scenario, { label: string; status: number; body: string }> = {
  new: { label: 'New user', status: 201, body: '{ "name": "Riya", "email": "riya@test.com", "password": "********" }' },
  missing: { label: 'Missing password', status: 400, body: '{ "name": "Riya", "email": "riya@test.com" }' },
  exists: { label: 'Already registered', status: 409, body: '{ "name": "Riya", "email": "existing@test.com", "password": "********" }' },
}

interface RunDrawerProps {
  stackLabel: string
  fileName: string
  code: string
  language: string
  onClose: () => void
  onPrediction: (correct: boolean) => void
}

export function RunDrawer({ stackLabel, fileName, code, language, onClose, onPrediction }: RunDrawerProps) {
  const [scenario, setScenario] = useState<Scenario>('new')
  const [prediction, setPrediction] = useState<number | null>(null)
  const [ran, setRan] = useState(false)
  const data = scenarios[scenario]
  const correct = prediction === data.status

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-black/50" />
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.2 }}
        role="dialog"
        aria-label="Predict before run"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[640px] flex-col border-l border-(--ide-border) bg-(--ide-bg) text-[13px] text-(--ide-fg) shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-(--ide-border) px-5 py-3">
          <div>
            <div className="flex items-center gap-2 font-semibold text-(--ide-heading)"><Play className="size-4 text-(--ide-success)" /> Predict before run</div>
            <p className="mt-0.5 text-[11px] text-(--ide-muted)">{stackLabel} · {data.label}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-(--ide-muted) hover:bg-(--ide-border) hover:text-(--ide-heading)"><X className="size-4" /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {(Object.keys(scenarios) as Scenario[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setScenario(item)
                  setPrediction(null)
                  setRan(false)
                }}
                className={cn('rounded-sm border px-3 py-1.5 text-[12px]', scenario === item ? 'border-[#0078d4] bg-[#0078d4] text-white' : 'border-(--ide-border-strong) text-(--ide-fg) hover:bg-(--ide-hover)')}
              >
                {scenarios[item].label}
              </button>
            ))}
          </div>

          <div className="rounded border border-(--ide-border-strong) bg-(--ide-bar) p-3">
            <div className="mb-1 text-[11px] tracking-wide text-(--ide-muted)">REQUEST BODY</div>
            <div className="ide-mono text-[12px] leading-5"><CodeLines code={data.body} language="json" wrap /></div>
          </div>

          <div className="mt-4 rounded border border-(--ide-warning)/50 bg-(--ide-warning)/10 p-4">
            <p className="font-semibold text-(--ide-warning-soft)">What status code will this return?</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[201, 400, 409, 500].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setPrediction(status)}
                  disabled={ran}
                  className={cn('rounded-sm border py-1.5 font-semibold', prediction === status ? 'border-(--ide-warning-soft) bg-(--ide-warning-soft) text-(--ide-bg)' : 'border-(--ide-warning)/50 text-(--ide-warning-soft) hover:bg-(--ide-warning)/15')}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={prediction === null || ran}
            onClick={() => {
              setRan(true)
              onPrediction(correct)
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm bg-[#2ea043] py-2 font-semibold text-white hover:bg-[#3fb950] disabled:opacity-40"
          >
            <Play className="size-4" /> Run scenario
          </button>

          {ran && (
            <div className={cn('mt-4 rounded border p-3', correct ? 'border-(--ide-success)/50 bg-(--ide-success)/10 text-(--ide-success-soft)' : 'border-(--ide-error)/50 bg-(--ide-error)/10 text-(--ide-error-soft)')}>
              <strong>{correct ? 'Correct prediction.' : `Not quite — the response is ${data.status}.`}</strong>
              <p className="mt-1 text-[12px] text-(--ide-fg)">
                {data.status === 201 ? 'Every check passes, the user is saved, and 201 Created comes back with the new id.' : data.status === 400 ? 'Validation returns early, before any database work.' : 'The duplicate check finds the email and returns 409 before hashing.'}
              </p>
            </div>
          )}

          <div className="mt-5 overflow-hidden rounded border border-(--ide-border-strong)">
            <div className="border-b border-(--ide-border) bg-(--ide-bg-alt) px-3 py-1 text-[11px] text-(--ide-muted)">{fileName}</div>
            <div className="ide-mono overflow-x-auto bg-(--ide-bar) p-3 text-[12px] leading-5"><CodeLines code={code} language={language} /></div>
          </div>
        </div>
      </motion.aside>
    </>
  )
}
