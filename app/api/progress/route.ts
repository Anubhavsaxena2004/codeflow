import { withUser } from '@/lib/server/api'
import { query } from '@/lib/server/db'

/** Summary of every challenge the user has touched, for the project list. Served by the (user_id, challenge_id) primary key. */
export async function GET() {
  return withUser(async (user) => {
    const progress = await query(
      `SELECT challenge_id AS "challengeId", attempts, best_score AS "bestScore", completed_at AS "completedAt"
         FROM challenge_progress
        WHERE user_id = $1`,
      [user.id],
    )
    return Response.json({ progress })
  })
}
