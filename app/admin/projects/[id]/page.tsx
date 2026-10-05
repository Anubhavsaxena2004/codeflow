import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { adminGate } from '@/components/admin/admin-gate'
import { ProjectEditor } from '@/components/admin/project-editor'
import { getCatalogEntry } from '@/lib/server/journeys'

export const metadata: Metadata = { title: 'Edit journey — CodeFlow' }
export const dynamic = 'force-dynamic'

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await adminGate(`/admin/projects/${id}`)
  if (gate) return gate
  const entry = await getCatalogEntry(id, { includeDrafts: true })
  if (!entry) notFound()
  return <ProjectEditor initial={entry} />
}
