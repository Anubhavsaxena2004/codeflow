'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ProjectFile } from '@/data/challenges'
import { cn } from '@/lib/utils'
import { FileIcon } from './code'

type TreeNode =
  | { kind: 'folder'; name: string; path: string; chain: string[]; children: TreeNode[] }
  | { kind: 'file'; name: string; path: string; file: ProjectFile }

function buildTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode & { kind: 'folder' } = { kind: 'folder', name: '', path: '', chain: [], children: [] }

  for (const file of files) {
    const parts = file.path.split('/')
    let folder = root
    parts.slice(0, -1).forEach((part, index) => {
      const path = parts.slice(0, index + 1).join('/')
      let next = folder.children.find((child): child is TreeNode & { kind: 'folder' } => child.kind === 'folder' && child.path === path)
      if (!next) {
        next = { kind: 'folder', name: part, path, chain: [path], children: [] }
        folder.children.push(next)
      }
      folder = next
    })
    folder.children.push({ kind: 'file', name: parts[parts.length - 1], path: file.path, file })
  }

  // Folders first, then alphabetical; single-child folder chains collapse into one row (`src/main`), like VS Code.
  const tidy = (nodes: TreeNode[]): TreeNode[] =>
    nodes
      .map((node) => {
        if (node.kind === 'file') return node
        let folder = node
        while (folder.children.length === 1 && folder.children[0].kind === 'folder') {
          const only: TreeNode & { kind: 'folder' } = folder.children[0]
          folder = { ...only, name: `${folder.name}/${only.name}`, chain: [...folder.chain, only.path] }
        }
        return { ...folder, children: tidy(folder.children) }
      })
      .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) : a.kind === 'folder' ? -1 : 1))

  return tidy(root.children)
}

interface FileExplorerProps {
  projectName: string
  files: ProjectFile[]
  folders: Record<string, string>
  activePath: string | null
  challengeBadge: string
  onOpen: (path: string) => void
}

export function FileExplorer({ projectName, files, folders, activePath, challengeBadge, onOpen }: FileExplorerProps) {
  const tree = useMemo(() => buildTree(files), [files])
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  // A clicked folder stays selected until the active editor changes; otherwise the selection follows the active file.
  const [folderSelection, setFolderSelection] = useState<{ path: string; activePath: string | null } | null>(null)
  const selected = folderSelection && folderSelection.activePath === activePath ? folderSelection.path : activePath
  const setSelected = (path: string) => setFolderSelection({ path, activePath })

  const folderAbout = (node: TreeNode & { kind: 'folder' }) => [...node.chain].reverse().map((path) => folders[path]).find(Boolean)
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

  const toggle = (path: string) =>
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })

  const renderNodes = (nodes: TreeNode[], depth: number) =>
    nodes.map((node) => {
      const pad = 8 + depth * 12
      if (node.kind === 'folder') {
        const open = !collapsed.has(node.path)
        return (
          <li key={node.path}>
            <button
              type="button"
              onClick={() => {
                toggle(node.path)
                setSelected(node.path)
              }}
              title={folderAbout(node)}
              aria-expanded={open}
              className={cn('flex h-[22px] w-full items-center gap-0.5 pr-2 text-left hover:bg-[#2a2d2e]', selected === node.path && 'bg-[#37373d] hover:bg-[#37373d]')}
              style={{ paddingLeft: pad }}
            >
              {open ? <ChevronDown className="size-4 shrink-0 text-[#c5c5c5]" /> : <ChevronRight className="size-4 shrink-0 text-[#c5c5c5]" />}
              <span className="truncate">{node.name}</span>
            </button>
            {open && (
              <ul className="relative">
                <span aria-hidden className="pointer-events-none absolute inset-y-0 w-px bg-[#585858]/50" style={{ left: pad + 7 }} />
                {renderNodes(node.children, depth + 1)}
              </ul>
            )}
          </li>
        )
      }

      const isChallenge = node.file.challenge
      return (
        <li key={node.path}>
          <button
            type="button"
            onClick={() => {
              setFolderSelection(null)
              onOpen(node.path)
            }}
            title={node.file.about}
            className={cn(
              'flex h-[22px] w-full items-center gap-1.5 pr-2 text-left hover:bg-[#2a2d2e]',
              activePath === node.path && 'text-white',
              selected === node.path && 'bg-[#37373d] hover:bg-[#37373d]',
            )}
            style={{ paddingLeft: pad + 18 }}
          >
            <FileIcon path={node.path} />
            <span className={cn('truncate', isChallenge && 'text-[#e2c08d]')}>{node.name}</span>
            {isChallenge && <span className="ml-auto shrink-0 pl-2 text-[11px] text-[#e2c08d]">{challengeBadge}</span>}
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
        {renderNodes(tree, 0)}
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
