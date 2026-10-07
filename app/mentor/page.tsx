import type { Metadata } from 'next'
import { adminGate } from '@/components/admin/admin-gate'
import { MentorStudio } from '@/components/admin/mentor-studio'

export const metadata: Metadata = { title: 'Mentor mode — CodeFlow' }
export const dynamic = 'force-dynamic'

/** Mentor mode authors challenges, so it is admin-only like the rest of the admin. */
export default async function MentorPage() {
  return (await adminGate('/mentor')) ?? <MentorStudio />
}
