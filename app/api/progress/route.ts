import { withUser } from '@/lib/server/api'
import { query } from '@/lib/server/db'

/**
 * Everything the home page shows for the signed-in user: challenge summaries (served by the
 * (user_id, challenge_id) primary key) and every passed journey level.
 */
export async function GET() {
  return withUser(async (user) => {
    const [progress, levels] = await Promise.all([
      query(
        `SELECT challenge_id AS "challengeId", attempts, best_score AS "bestScore", completed_at AS "completedAt"
           FROM challenge_progress
          WHERE user_id = $1`,
        [user.id],
      ),
      query(
        `SELECT project_id AS "projectId", level_id AS "levelId", stars, xp, completed_at AS "completedAt"
           FROM level_progress
          WHERE user_id = $1`,
        [user.id],
      ),
    ])
    return Response.json({ progress, levels })
  })
}
