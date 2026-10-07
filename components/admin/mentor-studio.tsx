'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Download, Eye, FileCheck2, TriangleAlert } from 'lucide-react'
import { signupChallenge } from '@/data/challenges/signup'
import CodeFlowApp from '@/components/codeflow-app'
import { ThemeToggle } from '@/components/theme-toggle'

export function MentorStudio() {
  const [value, setValue] = useState(JSON.stringify(signupChallenge, null, 2))
  const [errors, setErrors] = useState<string[]>([])
  const [preview, setPreview] = useState(false)
  const [customChallenge, setCustomChallenge] = useState(signupChallenge)

  const validate = () => {
    try {
      const parsed = JSON.parse(value)
      const required = ['id', 'title', 'fileName', 'scaffold', 'blocks', 'glossary', 'architecture']
      const missing = required.filter((key) => !(key in parsed))
      const nextErrors = missing.length
        ? missing.map((key) => `Missing required field: ${key}`)
        : !Array.isArray(parsed.blocks)
          ? ['blocks must be an array']
          : parsed.blocks.length < 1
            ? ['blocks must contain at least one block']
            : []
      setErrors(nextErrors)
      if (nextErrors.length === 0) setCustomChallenge(parsed)
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Invalid JSON'])
    }
  }

  const download = () => {
    const blob = new Blob([JSON.stringify(signupChallenge, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'signup-challenge-template.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (preview) {
    return (
      <div className="min-h-screen bg-(--adm-bg)">
        <div className="border-b border-(--adm-border) bg-(--adm-panel) px-4 py-3 md:px-6">
          <div className="mx-auto flex max-w-[1440px] items-center">
            <button
              type="button"
              onClick={() => setPreview(false)}
              className="flex items-center gap-1.5 rounded-lg border border-(--adm-border-strong) bg-(--adm-panel) px-3 py-1.5 text-[12px] font-medium text-(--adm-fg) hover:bg-(--adm-hover) transition-colors duration-150"
            >
              <ArrowLeft className="size-3.5" /> Back to editor
            </button>
          </div>
        </div>
        <CodeFlowApp challenge={customChallenge} sync={false} />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-(--adm-bg) text-[13px] text-(--adm-fg)">
      <header className="border-b border-(--adm-border) bg-(--adm-panel) px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-display text-base font-bold tracking-tight text-(--adm-heading)">
              {'</>'} CodeFlow
            </Link>
            <span className="text-(--adm-dim)">/ Mentor mode</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="size-8 rounded-lg border border-(--adm-border-strong) text-(--adm-muted) hover:bg-(--adm-hover) hover:text-(--adm-heading) transition-colors duration-150" iconClassName="size-3.5" />
            <button
              type="button"
              onClick={download}
              className="flex items-center gap-1.5 rounded-lg border border-(--adm-border-strong) bg-(--adm-panel) px-3 py-1.5 text-[12px] font-medium text-(--adm-fg) hover:bg-(--adm-hover) transition-colors duration-150"
            >
              <Download className="size-3.5" /> Download template
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] p-4 md:p-6">
        <div className="max-w-2xl">
          <h1 className="font-display text-[length:var(--fs-h2)] font-black tracking-tight text-(--adm-heading)">
            Create a challenge
          </h1>
          <p className="mt-1 text-[13px] leading-5 text-(--adm-muted)">
            Paste a JSON definition matching the Challenge schema. Validate it, then preview the learning flow immediately.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-(--adm-muted)">Challenge JSON</label>
            <textarea
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="min-h-[620px] rounded-lg border border-(--adm-border-strong) bg-(--adm-panel) p-4 font-mono text-[12px] leading-6 text-(--adm-code) outline-none focus:border-[#15803d] focus:ring-1 focus:ring-[#15803d]/30 transition-colors duration-150"
              spellCheck={false}
            />
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-lg border border-(--adm-border) bg-(--adm-panel) p-4 md:p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-(--adm-heading)">
                <FileCheck2 className="size-4 text-(--adm-teal)" /> Schema tools
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={validate}
                  className="rounded-lg bg-[#15803d] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#166534] transition-colors duration-150"
                >
                  Validate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    validate()
                    setPreview(true)
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-(--adm-border-strong) bg-(--adm-panel) px-4 py-2 text-[12px] font-medium text-(--adm-fg) hover:bg-(--adm-hover) transition-colors duration-150"
                >
                  <Eye className="size-3.5" /> Preview challenge
                </button>
              </div>

              <div className="mt-5 border-t border-(--adm-border) pt-4 text-[12px]">
                {errors.length === 0 ? (
                  <p className="flex items-center gap-1.5 text-(--adm-teal)">
                    <CheckCircle2 className="size-3.5 shrink-0" /> No errors yet. Validate your definition to check it.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5 text-(--adm-error)" role="alert">
                    {errors.map((error) => (
                      <li key={error} className="flex items-start gap-1.5">
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

