import { jsonError, readBody, withChallenge, type ChallengeRouteContext } from '@/lib/server/api'
import { query } from '@/lib/server/db'

/** Counts one "predict the status code" answer from the Run drawer. */
export async function POST(request: Request, context: ChallengeRouteContext) {
  return withChallenge(context, async (challenge, user) => {
    const body = await readBody(request)
    if (typeof body?.correct !== 'boolean') return jsonError(400, 'correct must be a boolean.')

    const [predictions] = await query<{ correct: number; total: number }>(
      `INSERT INTO challenge_progress AS p (user_id, challenge_id, predictions_correct, predictions_total)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (user_id, challenge_id) DO UPDATE SET
         predictions_correct = p.predictions_correct + EXCLUDED.predictions_correct,
         predictions_total   = p.predictions_total + 1,
         updated_at          = now()
       RETURNING predictions_correct AS correct, predictions_total AS total`,
      [user.id, challenge.id, body.correct ? 1 : 0],
    )
    return Response.json({ predictions })
  })
}
