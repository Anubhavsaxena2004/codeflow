'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLearner } from '@/lib/use-learner'

/** Sends the learner to the first level they haven't passed (or the last one when all are done). */
export function JourneyContinue({ projectId, levelIds }: { projectId: string; levelIds: string[] }) {
  const router = useRouter()
  const { levels, ready } = useLearner()

  useEffect(() => {
    if (!ready) return
    const passed = new Set(levels.filter((row) => row.projectId === projectId).map((row) => row.levelId))
    const target = levelIds.find((id) => !passed.has(id)) ?? levelIds[levelIds.length - 1]
    router.replace(`/learn/${projectId}/${target}`)
  }, [ready, levels, levelIds, projectId, router])

  return <div className="grid min-h-dvh place-items-center bg-(--ide-bg) text-[13px] text-(--ide-muted)">Opening your next level…</div>
}
