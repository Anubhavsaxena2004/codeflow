import { withUser } from '@/lib/server/api'
import { deleteConnection } from '@/lib/github/store'

/** Disconnects GitHub: the stored access token is deleted and cannot be recovered. */
export async function DELETE() {
  return withUser(async (user) => {
    await deleteConnection(user.id)
    return Response.json({ ok: true })
  })
}
