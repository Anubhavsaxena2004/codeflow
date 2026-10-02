import { availableStacks, solutionOrder, type Stack } from '@/data/challenges'
import { isInt, jsonError, parseSlots, readBody, withChallenge, type ChallengeRouteContext } from '@/lib/server/api'
import { query } from '@/lib/server/db'
import { computeScore } from '@/lib/scoring'

/**
 * Records one Check. Correctness and score are decided here, not trusted from the client;
 * hint and wrong-check counts are client-reported.
 */
export async function POST(request: Request, context: ChallengeRouteContext) {
  return withChallenge(context, async (challenge, user) => {
    const body = await readBody(request)
    const order = parseSlots(body?.order, challenge)
    const stack = body?.stack
    const hints = body?.hints
    const wrongChecks = body?.wrongChecks
    const elapsedSeconds = body?.elapsedSeconds

    if (
      !order ||
      !availableStacks(challenge).includes(stack as Stack) ||
      !isInt(hints, 0, 1000) ||
      !isInt(wrongChecks, 0, 10_000) ||
      !isInt(elapsedSeconds, 0, 7 * 24 * 60 * 60)
    ) {
      return jsonError(400, 'Invalid attempt.')
    }

    const correct = solutionOrder(challenge).every((id, index) => order[index] === id)
    const score = correct ? computeScore({ wrongChecks, hints }) : null

    // One round trip: append the attempt and fold it into the progress row atomically.
    const [progress] = await query<{ attempts: number; bestScore: number | null; bestTimeSeconds: number | null }>(
      `WITH attempt AS (
         INSERT INTO challenge_attempts (user_id, challenge_id, stack, submitted_order, correct, score, hints_used, elapsed_seconds)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       )
       INSERT INTO challenge_progress AS p (user_id, challenge_id, attempts, best_score, best_time_seconds, completed_at)
       VALUES ($1, $2, 1, $6, CASE WHEN $5 THEN $8 END, CASE WHEN $5 THEN now() END)
       ON CONFLICT (user_id, challenge_id) DO UPDATE SET
         attempts          = p.attempts + 1,
         best_score        = GREATEST(p.best_score, EXCLUDED.best_score),
         best_time_seconds = LEAST(p.best_time_seconds, EXCLUDED.best_time_seconds),
         completed_at      = COALESCE(p.completed_at, EXCLUDED.completed_at),
         updated_at        = now()
       RETURNING attempts, best_score AS "bestScore", best_time_seconds AS "bestTimeSeconds"`,
      [user.id, challenge.id, stack, order, correct, score, hints, elapsedSeconds],
    )

    return Response.json({ correct, score, progress })
  })
}
