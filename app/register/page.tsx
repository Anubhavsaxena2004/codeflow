import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth-form'
import { safeNext } from '@/lib/utils'

export const metadata: Metadata = { title: 'Create account — CodeFlow' }

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { next } = await searchParams
  return <AuthForm mode="register" next={safeNext(next)} />
}
