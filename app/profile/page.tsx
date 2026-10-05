import type { Metadata } from 'next'
import { ProfileView } from '@/components/home/profile-view'
import { listCatalog, summarize } from '@/lib/server/journeys'

export const metadata: Metadata = { title: 'Profile — CodeFlow' }
export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const journeys = (await listCatalog()).map((entry) => summarize(entry.project))
  return <ProfileView journeys={journeys} />
}
