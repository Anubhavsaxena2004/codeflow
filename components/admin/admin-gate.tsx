import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/server/auth'

function AdminMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-(--adm-bg) p-6 text-[13px] text-(--adm-fg)">
      <div className="max-w-md rounded border border-(--adm-border) bg-(--adm-panel) p-6">
        <h1 className="text-base font-semibold text-(--adm-heading)">{title}</h1>
        <div className="mt-2 leading-6 text-(--adm-muted)">{children}</div>
        <Link href="/" className="mt-4 inline-block text-(--adm-link) hover:underline">Back to CodeFlow</Link>
      </div>
    </main>
  )
}

/** Server-side guard for admin pages: null when the visitor is an admin, otherwise what to show instead. */
export async function adminGate(path: string) {
  let user: Awaited<ReturnType<typeof getCurrentUser>>
  try {
    user = await getCurrentUser()
  } catch {
    return (
      <AdminMessage title="The admin needs the database">
        Admin edits are stored in PostgreSQL. Set <code>DATABASE_URL</code> in .env.local and run <code>pnpm db:migrate</code>.
      </AdminMessage>
    )
  }
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`)
  if (!user.isAdmin) {
    return (
      <AdminMessage title="Admins only">
        {user.email} is not an admin. This page is only for the CodeFlow admin.
      </AdminMessage>
    )
  }
  return null
}
