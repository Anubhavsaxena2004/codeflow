import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JourneyWorkspace } from '@/components/journey/journey-workspace'
import { getPublishedProject } from '@/lib/server/journeys'

type Params = { params: Promise<{ projectId: string; levelId: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { projectId, levelId } = await params
  const level = (await getPublishedProject(projectId))?.levels.find((item) => item.id === levelId)
  return { title: level ? `${level.title} — CodeFlow` : 'CodeFlow' }
}

export default async function LevelPage({ params }: Params) {
  const { projectId, levelId } = await params
  const project = await getPublishedProject(projectId)
  if (!project?.levels.some((level) => level.id === levelId)) notFound()
  return <JourneyWorkspace key={`${project.id}/${levelId}`} project={project} levelId={levelId} />
}
