import { jsonError, parseSlots, readBody, withChallenge, type ChallengeRouteContext } from '@/lib/server/api'
import { query } from '@/lib/server/db'

export async function GET(_request: Request, context: ChallengeRouteContext) {
  return withChallenge(context, async (challenge, user) => {
    const [progress] = await query(
      `SELECT draft_slots         AS "draftSlots",
              attempts,
              best_score          AS "bestScore",
              best_time_seconds   AS "bestTimeSeconds",
              completed_at        AS "completedAt",
              predictions_correct AS "predictionsCorrect",
              predictions_total   AS "predictionsTotal"
         FROM challenge_progress
        WHERE user_id = $1 AND challenge_id = $2`,
      [user.id, challenge.id],
    )
    return Response.json({ progress: progress ?? null })
  })
}

/** Saves the unfinished arrangement so the learner can resume. The client debounces calls. */
export async function PUT(request: Request, context: ChallengeRouteContext) {
  return withChallenge(context, async (challenge, user) => {
    const body = await readBody(request)
    const slots = parseSlots(body?.slots, challenge)
    if (!slots) return jsonError(400, 'slots must list one block id (or null) per step.')

    await query(
      `INSERT INTO challenge_progress (user_id, challenge_id, draft_slots)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, challenge_id)
       DO UPDATE SET draft_slots = EXCLUDED.draft_slots, updated_at = now()`,
      [user.id, challenge.id, slots],
    )
    return Response.json({ ok: true })
  })
}
