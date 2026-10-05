import { notFound } from 'next/navigation'
import { JourneyContinue } from '@/components/journey/journey-continue'
import { getPublishedProject } from '@/lib/server/journeys'

export const dynamic = 'force-dynamic'

/** /learn/<journey> opens the learner's next level, which only the browser knows for guests. */
export default async function ContinuePage({ params }: { params: Promise<{ projectId: string }> }) {
  const project = await getPublishedProject((await params).projectId)
  if (!project) notFound()
  return <JourneyContinue projectId={project.id} levelIds={project.levels.map((level) => level.id)} />
}
