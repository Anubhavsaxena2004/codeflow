import { withAdmin } from '@/lib/server/api'
import { learnerReport } from '@/lib/server/learners'

export const dynamic = 'force-dynamic'

/** Every learner with their journeys, passed levels and GitHub repo, for the admin's Learners view. */
export async function GET() {
  return withAdmin(async () => Response.json(await learnerReport()))
}
