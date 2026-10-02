import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth-form'
import { safeNext } from '@/lib/utils'

export const metadata: Metadata = { title: 'Sign in — CodeFlow' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { next } = await searchParams
  return <AuthForm mode="login" next={safeNext(next)} />
}
