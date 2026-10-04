import { jsonError, readBody, withUser } from '@/lib/server/api'
import { isExcludedPath, isValidPath } from '@/lib/github/filter'
import { replaceProjectFiles } from '@/lib/github/store'
import type { ProjectFile } from '@/lib/github/types'

const JOURNEY_ID = /^[A-Za-z0-9_-]{1,128}$/
const MAX_FILES = 200
const MAX_FILE_BYTES = 512 * 1024

/**
 * Saves the learner's built workspace for a journey. The GitHub push endpoints
 * read these files back, so this is the bridge from the editor to a push.
 * Body: { journeyId, files: [{ path, content }] }
 */
export async function PUT(request: Request) {
  return withUser(async (user) => {
    const body = await readBody(request)
    const journeyId = typeof body?.journeyId === 'string' ? body.journeyId : ''
    if (!JOURNEY_ID.test(journeyId)) return jsonError(400, 'A valid journeyId is required.')

    const files = Array.isArray(body?.files) ? body.files : null
    if (!files) return jsonError(400, 'A files array is required.')
    if (files.length > MAX_FILES) return jsonError(400, `Too many files (max ${MAX_FILES}).`)

    const clean: ProjectFile[] = []
    for (const entry of files) {
      if (!entry || typeof entry !== 'object') continue
      const path = typeof (entry as Record<string, unknown>).path === 'string' ? ((entry as Record<string, unknown>).path as string) : ''
      const content = typeof (entry as Record<string, unknown>).content === 'string' ? ((entry as Record<string, unknown>).content as string) : ''
      if (!isValidPath(path)) return jsonError(400, `Unsafe project file path: ${path || '(empty)'}`)
      // .env / .git / node_modules never belong in the store (or a push).
      if (isExcludedPath(path)) continue
      if (Buffer.byteLength(content, 'utf8') > MAX_FILE_BYTES) return jsonError(400, `File too large: ${path}`)
      clean.push({ path, content })
    }
    if (clean.length === 0) return jsonError(400, 'No pushable files were provided.')

    await replaceProjectFiles(user.id, journeyId, clean)
    return Response.json({ ok: true, count: clean.length })
  })
}
