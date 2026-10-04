import type { ProjectFile } from './types'

/** UTF-8 string → base64, the encoding the Git Data API expects for blobs. */
export function toBase64(content: string): string {
  return Buffer.from(content, 'utf8').toString('base64')
}

export interface BlobResult {
  path: string
  sha: string
}

export interface TreeEntry {
  path: string
  mode: '100644'
  type: 'blob'
  sha: string
}

/** One tree entry per file, sorted so identical projects build identical trees. */
export function buildTreeEntries(blobs: BlobResult[]): TreeEntry[] {
  return [...blobs]
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map((blob) => ({ path: blob.path, mode: '100644' as const, type: 'blob' as const, sha: blob.sha }))
}

/**
 * Payload for POST /repos/{owner}/{repo}/git/trees. Passing base_tree layers
 * the entries on top of the current HEAD tree, so untouched files keep their
 * existing blobs.
 */
export function createTreePayload(entries: TreeEntry[], baseTree?: string | null): { tree: TreeEntry[]; base_tree?: string } {
  return baseTree ? { tree: entries, base_tree: baseTree } : { tree: entries }
}

/** Convenience for callers that hold ProjectFiles and their blob shas. */
export function treeEntriesForFiles(files: ProjectFile[], shas: Map<string, string>): TreeEntry[] {
  return buildTreeEntries(files.map((file) => ({ path: file.path, sha: shas.get(file.path) ?? '' })))
}
