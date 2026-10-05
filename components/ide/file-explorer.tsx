'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ProjectFile } from '@/data/challenges'
import type { FileChange } from '@/lib/journeys/snapshot'
import { cn } from '@/lib/utils'
import { FileIcon } from './code'

/** A path ending in "/" is an empty folder (e.g. right after `mkdir`). `change` adds a git-style marker. */
type ExplorerFile = ProjectFile & { change?: FileChange }

type FolderNode = { kind: 'folder'; name: string; path: string; chain: string[]; children: TreeNode[]; about?: string; generated?: boolean; changed: boolean }
type TreeNode = FolderNode | { kind: 'file'; name: string; path: string; file: ExplorerFile }

const changeMarks: Record<FileChange, { letter: string; className: string; label: string }> = {
  added: { letter: 'U', className: 'text-[#73c991]', label: 'new in this level' },
  modified: { letter: 'M', className: 'text-[#e2c08d]', label: 'changed in this level' },
}

function buildTree(files: ExplorerFile[]): TreeNode[] {
  const root: FolderNode = { kind: 'folder', name: '', path: '', chain: [], children: [], changed: false }

  for (const file of files) {
    const isFolder = file.path.endsWith('/')
    const parts = (isFolder ? file.path.slice(0, -1) : file.path).split('/')
    let folder = root
    parts.slice(0, isFolder ? parts.length : -1).forEach((part, index) => {
      const path = parts.slice(0, index + 1).join('/')
      let next = folder.children.find((child): child is FolderNode => child.kind === 'folder' && child.path === path)
      if (!next) {
        next = { kind: 'folder', name: part, path, chain: [path], children: [], changed: false }
        folder.children.push(next)
      }
      if (file.change) next.changed = true
      folder = next
    })
    if (isFolder) {
      folder.about = file.about
      folder.generated = file.generated
    } else {
      folder.children.push({ kind: 'file', name: parts[parts.length - 1], path: file.path, file })
    }
  }

  // Folders first, then alphabetical; single-child folder chains collapse into one row (`src/main`), like VS Code.
  const tidy = (nodes: TreeNode[]): TreeNode[] =>
    nodes
      .map((node) => {
        if (node.kind === 'file') return node
        let folder = node
        while (folder.children.length === 1 && folder.children[0].kind === 'folder' && !folder.generated) {
          const only: FolderNode = folder.children[0]
          folder = { ...only, name: `${folder.name}/${only.name}`, chain: [...folder.chain, only.path] }
        }
        return { ...folder, children: tidy(folder.children) }
      })
      .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) : a.kind === 'folder' ? -1 : 1))

  return tidy(root.children)
}

interface FileExplorerProps {
  projectName: string
  files: ExplorerFile[]
  folders: Record<string, string>
  activePath: string | null
  /** Shown next to the file being built, e.g. "3/6". */
  challengeBadge?: string
  onOpen: (path: string) => void
}

export function FileExplorer({ projectName, files, folders, activePath, challengeBadge, onOpen }: FileExplorerProps) {
  const tree = useMemo(() => buildTree(files), [files])
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  // Generated folders (node_modules, venv) start closed, the way an editor shows them.
  const [openedGenerated, setOpenedGenerated] = useState<Set<string>>(() => new Set())
  const isOpen = (folder: FolderNode) => (folder.generated ? openedGenerated.has(folder.path) : !collapsed.has(folder.path))
  // A clicked folder stays selected until the active editor changes; otherwise the selection follows the active file.
  const [folderSelection, setFolderSelection] = useState<{ path: string; activePath: string | null } | null>(null)
  const selected = folderSelection && folderSelection.activePath === activePath ? folderSelection.path : activePath
  const setSelected = (path: string) => setFolderSelection({ path, activePath })

  const folderAbout = (node: FolderNode) => [...node.chain].reverse().map((path) => folders[path]).find(Boolean) ?? node.about
  const selectedNode = useMemo(() => {
    const find = (nodes: TreeNode[]): TreeNode | undefined => {
      for (const node of nodes) {
        if (node.path === selected) return node
        const hit = node.kind === 'folder' ? find(node.children) : undefined
        if (hit) return hit
      }
    }
    return selected ? find(tree) : undefined
  }, [tree, selected])

  const toggle = (folder: FolderNode) => {
    const flip = (current: Set<string>) => {
      const next = new Set(current)
      if (next.has(folder.path)) next.delete(folder.path)
      else next.add(folder.path)
      return next
    }
    if (folder.generated) setOpenedGenerated(flip)
    else setCollapsed(flip)
  }

  const renderNodes = (nodes: TreeNode[], depth: number) =>
    nodes.map((node) => {
      const pad = 8 + depth * 12
      if (node.kind === 'folder') {
        const open = isOpen(node)
        return (
          <li key={node.path}>
            <button
              type="button"
              onClick={() => {
                toggle(node)
                setSelected(node.path)
              }}
              title={folderAbout(node)}
              aria-expanded={open}
              className={cn(
                'flex h-[22px] w-full items-center gap-0.5 pr-2 text-left hover:bg-[#2a2d2e]',
                selected === node.path && 'bg-[#37373d] hover:bg-[#37373d]',
                node.generated ? 'text-[#8b8b8b]' : node.changed && 'text-[#73c991]',
              )}
              style={{ paddingLeft: pad }}
            >
              {open ? <ChevronDown className="size-4 shrink-0 text-[#c5c5c5]" /> : <ChevronRight className="size-4 shrink-0 text-[#c5c5c5]" />}
              <span className="truncate">{node.name}</span>
              {node.changed && !node.generated && <span aria-hidden className="ml-auto size-1.5 shrink-0 rounded-full bg-[#73c991]/80" />}
            </button>
            {open && node.children.length > 0 && (
              <ul className="relative">
                <span aria-hidden className="pointer-events-none absolute inset-y-0 w-px bg-[#585858]/50" style={{ left: pad + 7 }} />
                {renderNodes(node.children, depth + 1)}
              </ul>
            )}
          </li>
        )
      }

      const isChallenge = node.file.challenge
      const mark = node.file.change ? changeMarks[node.file.change] : null
      return (
        <li key={node.path} className={cn(node.file.change === 'added' && 'animate-file-in')}>
          <button
            type="button"
            onClick={() => {
              setFolderSelection(null)
              onOpen(node.path)
            }}
            title={mark ? `${node.file.about} (${mark.label})` : node.file.about}
            className={cn(
              'flex h-[22px] w-full items-center gap-1.5 pr-2 text-left hover:bg-[#2a2d2e]',
              activePath === node.path && 'text-white',
              selected === node.path && 'bg-[#37373d] hover:bg-[#37373d]',
              node.file.generated && 'text-[#8b8b8b]',
            )}
            style={{ paddingLeft: pad + 18 }}
          >
            <FileIcon path={node.path} />
            <span className={cn('truncate', isChallenge ? 'text-[#e2c08d]' : mark?.className)}>{node.name}</span>
            {isChallenge && challengeBadge ? (
              <span className="ml-auto shrink-0 pl-2 text-[11px] text-[#e2c08d]">{challengeBadge}</span>
            ) : (
              mark && (
                <span aria-label={mark.label} className={cn('ml-auto shrink-0 pl-2 text-[11px] font-semibold', mark.className)}>
                  {mark.letter}
                </span>
              )
            )}
          </button>
        </li>
      )
    })

  const about = selectedNode ? (selectedNode.kind === 'folder' ? folderAbout(selectedNode) : selectedNode.file.about) : undefined

  return (
    <div className="flex h-full min-h-0 flex-col text-[13px] text-[#cccccc]">
      <div className="flex h-9 shrink-0 items-center px-5 text-[11px] tracking-wide text-[#bbbbbb]">EXPLORER</div>
      <div className="flex h-[22px] shrink-0 items-center gap-0.5 px-1 text-[11px] font-bold tracking-wide">
        <ChevronDown className="size-4" /> {projectName.toUpperCase()}
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto pb-2" aria-label="Project files">
        {tree.length > 0 ? renderNodes(tree, 0) : <li className="px-5 py-2 text-[12px] text-[#6e7681]">Empty for now. Files appear here as you build.</li>}
      </ul>
      <section className="shrink-0 border-t border-[#2b2b2b]">
        <div className="flex h-[22px] items-center gap-0.5 px-1 text-[11px] font-bold tracking-wide">
          <ChevronDown className="size-4" /> ABOUT
        </div>
        <div className="px-5 pb-3 pt-1 text-[12px] leading-5 text-[#9d9d9d]">
          {selectedNode && <div className="mb-1 font-mono text-[11px] text-[#cccccc]">{selectedNode.kind === 'folder' ? `${selectedNode.chain[selectedNode.chain.length - 1]}/` : selectedNode.path}</div>}
          {about ?? 'Select a file or folder to see what it is for.'}
        </div>
      </section>
    </div>
  )
}
