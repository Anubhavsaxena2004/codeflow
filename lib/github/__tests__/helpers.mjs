export function jsonResponse(body, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(body ?? {}), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

/**
 * A fetch that answers from a fixed queue and records every call, so tests can
 * assert exactly which GitHub endpoints a push hits, in which order, and with
 * what payloads. Throws if the code makes a request the test didn't expect.
 */
export function mockFetchQueue(responses) {
  const queue = [...responses]
  const calls = []
  const fetchImpl = async (url, init) => {
    const urlString = String(url)
    const body = init?.body === undefined ? undefined : JSON.parse(init.body)
    calls.push({ url: urlString, method: init?.method, body, headers: init?.headers })
    const next = queue.shift()
    if (!next) throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${urlString}`)
    if (next instanceof Response) return next
    return jsonResponse(next.body ?? {}, { status: next.status ?? 200, headers: next.headers ?? {} })
  }
  return { fetchImpl, calls }
}

export const HEAD_SHA = 'headsha11111111111111111111111111111111'
export const HEAD_TREE = 'headtree22222222222222222222222222222222'
export const NEW_TREE = 'newtree33333333333333333333333333333333'
export const COMMIT_SHA = 'commit44444444444444444444444444444444'

export const repoOk = (overrides = {}) =>
  jsonResponse({ permissions: { push: true }, default_branch: 'main', owner: { login: 'octocat' }, ...overrides })

export const refAt = (sha = HEAD_SHA) => jsonResponse({ object: { sha, type: 'commit' } })

export const commitAt = (tree = HEAD_TREE) => jsonResponse({ sha: HEAD_SHA, tree: { sha: tree } })

export const blobWith = (sha) => jsonResponse({ sha })

export const newTree = () => jsonResponse({ sha: NEW_TREE })

export const newCommit = () => jsonResponse({ sha: COMMIT_SHA })

export const refUpdated = () => jsonResponse({ object: { sha: COMMIT_SHA, type: 'commit' } })
