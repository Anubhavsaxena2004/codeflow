import type { Metadata } from 'next'
import { AdminDashboard } from '@/components/admin/admin-dashboard'
import { adminGate } from '@/components/admin/admin-gate'

export const metadata: Metadata = { title: 'Admin — CodeFlow' }
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  return (await adminGate('/admin')) ?? <AdminDashboard />
}
