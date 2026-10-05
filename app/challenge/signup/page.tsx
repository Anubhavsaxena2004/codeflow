import CodeFlowApp from '@/components/codeflow-app'
import { stackLabels, type Stack } from '@/data/challenges'

export default async function SignupChallengePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { stack } = await searchParams
  const initialStack = typeof stack === 'string' && Object.hasOwn(stackLabels, stack) ? (stack as Stack) : undefined
  return <CodeFlowApp initialStack={initialStack} />
}
