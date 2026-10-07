import { JourneyHome } from '@/components/home/journey-home'
import { listCatalog, summarize } from '@/lib/server/journeys'

export const dynamic = 'force-dynamic'

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { journey, level } = await searchParams
  const journeys = (await listCatalog()).map((entry) => summarize(entry.project))
  return <JourneyHome journeys={journeys} initialJourney={typeof journey === 'string' ? journey : null} initialLevel={typeof level === 'string' ? level : null} />
}
