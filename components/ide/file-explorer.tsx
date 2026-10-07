'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, ChevronsDownUp, FilePlus2, Folder, FolderPlus, Lock, Trash2 } from 'lucide-react'
import type { ProjectFile } from '@/data/challenges'
import type { FileChange } from '@/lib/journeys/snapshot'
import { cn } from '@/lib/utils'
import { FileIcon } from './code'

/**
 * A path ending in "/" is an empty folder (e.g. right after `mkdir`). `change` adds a git-style
 * marker. `owned` marks files and folders the learner created with New File / New Folder.
 * `unused` files (made by a command, not used by the project) are shown locked and never open.
 */
export type ExplorerFile = ProjectFile & { change?: FileChange; owned?: boolean }

type FolderNode = { kind: 'folder'; name: string; path: string; chain: string[]; children: TreeNode[]; about?: string; generated?: boolean; changed: boolean; owned: boolean; unused: boolean }
type TreeNode = FolderNode | { kind: 'file'; name: string; path: string; file: ExplorerFile }

const changeMarks: Record<FileChange, { letter: string; className: string; label: string }> = {
  added: { letter: 'U', className: 'text-(--ide-added)', label: 'new in this level' },
  modified: { letter: 'M', className: 'text-(--ide-warning-soft)', label: 'changed in this level' },
}

const LOCKED = 'Locked: made by a setup command, but not used in this project.'

function buildTree(files: ExplorerFile[]): TreeNode[] {
  const root: FolderNode = { kind: 'folder', name: '', path: '', chain: [], children: [], changed: false, owned: false, unused: false }
  const ownedMarkers = new Set<string>()

  for (const file of files) {
    const isFolder = file.path.endsWith('/')
    const parts = (isFolder ? file.path.slice(0, -1) : file.path).split('/')
    let folder = root
    parts.slice(0, isFolder ? parts.length : -1).forEach((part, index) => {
      const path = parts.slice(0, index + 1).join('/')
      let next = folder.children.find((child): child is FolderNode => child.kind === 'folder' && child.path === path)
      if (!next) {
        next = { kind: 'folder', name: part, path, chain: [path], children: [], changed: false, owned: false, unused: false }
        folder.children.push(next)
      }
      if (file.change) next.changed = true
      folder = next
    })
    if (isFolder) {
      folder.about = file.about
      folder.generated = file.generated
      if (file.owned) ownedMarkers.add(folder.path)
    } else {
      folder.children.push({ kind: 'file', name: parts[parts.length - 1], path: file.path, file })
    }
  }

  // A folder is the learner's own when they created it, or when everything inside it is theirs.
  const markOwned = (node: TreeNode): boolean => {
    if (node.kind === 'file') return !!node.file.owned
    const childrenOwned = node.children.map(markOwned)
    node.owned = ownedMarkers.has(node.path) || (childrenOwned.length > 0 && childrenOwned.every(Boolean))
    return node.owned
  }
  root.children.forEach(markOwned)

  // A folder is locked when everything inside it is (Vite's src/assets holds only the demo logo).
  const markUnused = (node: TreeNode): boolean => {
    if (node.kind === 'file') return !!node.file.unused
    const childrenUnused = node.children.map(markUnused)
    node.unused = childrenUnused.length > 0 && childrenUnused.every(Boolean)
    return node.unused
  }
  root.children.forEach(markUnused)

  // Folders first, then alphabetical; single-child folder chains collapse into one row (`src/main`), like VS Code.
  const tidy = (nodes: TreeNode[]): TreeNode[] =>
    nodes
      .map((node) => {
        if (node.kind === 'file') return node
        let folder = node
        while (folder.children.length === 1 && folder.children[0].kind === 'folder' && !folder.generated && !folder.owned) {
          const only: FolderNode = folder.children[0]
          folder = { ...only, name: `${folder.name}/${only.name}`, chain: [...folder.chain, only.path] }
        }
        return { ...folder, children: tidy(folder.children) }
      })
      .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) : a.kind === 'folder' ? -1 : 1))

  return tidy(root.children)
}

const dirOf = (path: string) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '')

interface FileExplorerProps {
  projectName: string
  files: ExplorerFile[]
  folders: Record<string, string>
  activePath: string | null
  /** Shown next to the file being built, e.g. "3/6". */
  challengeBadge?: string
  onOpen: (path: string) => void
  /**
   * Enables New File / New Folder. Gets the full path ("src/notes.md", or "src/utils/" for a
   * folder) and returns an error message to show, or null when it was created.
   */
  onCreate?: (path: string, kind: 'file' | 'folder') => string | null
  /** Deletes a file or folder the learner created (folders end in "/"). */
  onDelete?: (path: string) => void
}

export function FileExplorer({ projectName, files, folders, activePath, challengeBadge, onOpen, onCreate, onDelete }: FileExplorerProps) {
  const tree = useMemo(() => buildTree(files), [files])
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  // Generated folders (node_modules, venv) start closed, the way an editor shows them.
  const [openedGenerated, setOpenedGenerated] = useState<Set<string>>(() => new Set())
  const isOpen = (folder: FolderNode) => (folder.generated ? openedGenerated.has(folder.path) : !collapsed.has(folder.path))
  // A clicked folder stays selected until the active editor changes; otherwise the selection follows the active file.
  const [folderSelection, setFolderSelection] = useState<{ path: string; activePath: string | null } | null>(null)
  const selected = folderSelection && folderSelection.activePath === activePath ? folderSelection.path : activePath
  const setSelected = (path: string) => setFolderSelection({ path, activePath })
  // The inline "new file / new folder" name box, VS Code style.
  const [creating, setCreating] = useState<{ kind: 'file' | 'folder'; dir: string } | null>(null)
  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const nameInput = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (creating) nameInput.current?.focus()
  }, [creating])

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

  const collapseAll = () => {
    const all = new Set<string>()
    const walk = (nodes: TreeNode[]) => nodes.forEach((node) => node.kind === 'folder' && (all.add(node.path), walk(node.children)))
    walk(tree)
    setCollapsed(all)
    setOpenedGenerated(new Set())
  }

  /** New items go into the selected folder, or next to the selected file, or at the root. */
  const startCreating = (kind: 'file' | 'folder') => {
    const dir = !selectedNode ? '' : selectedNode.kind === 'folder' ? selectedNode.path : dirOf(selectedNode.path)
    // Make sure the target folder (and its parents) are open, so the new item is visible.
    setCollapsed((current) => new Set([...current].filter((path) => !(dir === path || dir.startsWith(`${path}/`)))))
    setCreating({ kind, dir })
    setNewName('')
    setCreateError(null)
  }

  const finishCreating = () => {
    if (!creating || !onCreate) return
    const name = newName.trim().replace(/^\/+|\/+$/g, '')
    if (!name) return setCreating(null)
    const path = creating.dir ? `${creating.dir}/${name}` : name
    const error = onCreate(creating.kind === 'folder' ? `${path}/` : path, creating.kind)
    if (error) return setCreateError(error)
    setCreating(null)
    if (creating.kind === 'file') {
      setFolderSelection(null)
      onOpen(path)
    } else {
      setSelected(path)
    }
  }

  const createRow = (depth: number) =>
    creating && (
      <li>
        <div className="flex h-[22px] items-center gap-1.5 pr-2" style={{ paddingLeft: 8 + depth * 12 + (creating.kind === 'file' ? 18 : 4) }}>
          {creating.kind === 'file' ? <FileIcon path={newName || 'file'} /> : <Folder className="size-4 shrink-0 text-(--ide-fg-soft)" />}
          <input
            ref={nameInput}
            value={newName}
            onChange={(event) => {
              setNewName(event.target.value)
              setCreateError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') finishCreating()
              if (event.key === 'Escape') setCreating(null)
            }}
            onBlur={() => (newName.trim() ? finishCreating() : setCreating(null))}
            aria-label={creating.kind === 'file' ? 'New file name' : 'New folder name'}
            placeholder={creating.kind === 'file' ? 'file name, e.g. notes.md' : 'folder name'}
            spellCheck={false}
            className={cn('h-5 min-w-0 flex-1 rounded-sm border bg-(--ide-input) px-1 text-[12px] text-(--ide-fg) outline-none', createError ? 'border-(--ide-error)' : 'border-[#0078d4]')}
          />
        </div>
        {createError && (
          <p role="alert" className="mx-2 mb-1 rounded-sm border border-(--ide-error)/60 bg-(--ide-error)/15 px-2 py-1 text-[11px] leading-4 text-(--ide-error-soft)" style={{ marginLeft: 8 + depth * 12 }}>
            {createError}
          </p>
        )}
      </li>
    )

  const deleteButton = (path: string, label: string) =>
    onDelete && (
      <span
        role="button"
        tabIndex={0}
        onClick={(event) => {
          event.stopPropagation()
          if (window.confirm(`Delete ${label}? This cannot be undone.`)) onDelete(path)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            event.stopPropagation()
            if (window.confirm(`Delete ${label}? This cannot be undone.`)) onDelete(path)
          }
        }}
        aria-label={`Delete ${label}`}
        title="Delete"
        className="ml-auto hidden size-4 shrink-0 items-center justify-center rounded-sm text-(--ide-muted) hover:bg-(--ide-border-strong) hover:text-(--ide-fg) group-hover:flex group-focus-within:flex"
      >
        <Trash2 className="size-3" />
      </span>
    )

  const renderNodes = (nodes: TreeNode[], depth: number, dir: string) => (
    <>
      {creating?.dir === dir && createRow(depth)}
      {nodes.map((node) => {
        const pad = 8 + depth * 12
        if (node.kind === 'folder') {
          const open = isOpen(node) || (!!creating && (creating.dir === node.path || creating.dir.startsWith(`${node.path}/`)))
          return (
            <li key={node.path}>
              <button
                type="button"
                onClick={() => {
                  toggle(node)
                  setSelected(node.path)
                }}
                title={node.owned ? 'Your folder' : node.unused ? `${LOCKED} ${folderAbout(node) ?? ''}`.trim() : folderAbout(node)}
                aria-expanded={open}
                className={cn(
                  'group flex h-[22px] w-full items-center gap-0.5 pr-2 text-left hover:bg-(--ide-hover)',
                  selected === node.path && 'bg-(--ide-active) hover:bg-(--ide-active)',
                  node.generated ? 'text-(--ide-icon)' : node.unused ? 'text-(--ide-dim)' : node.changed && 'text-(--ide-added)',
                )}
                style={{ paddingLeft: pad }}
              >
                {open ? <ChevronDown className="size-4 shrink-0 text-(--ide-fg-soft)" /> : <ChevronRight className="size-4 shrink-0 text-(--ide-fg-soft)" />}
                <span className="truncate">{node.name}</span>
                {node.owned ? (
                  deleteButton(`${node.path}/`, `the folder ${node.name} and everything in it`)
                ) : node.unused ? (
                  <Lock aria-label="locked: not used in this project" className="ml-auto size-3 shrink-0" />
                ) : (
                  node.changed && !node.generated && <span aria-hidden className="ml-auto size-1.5 shrink-0 rounded-full bg-(--ide-added)/80" />
                )}
              </button>
              {open && (node.children.length > 0 || creating?.dir === node.path) && (
                <ul className="relative">
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 w-px bg-(--ide-faint)/50" style={{ left: pad + 7 }} />
                  {renderNodes(node.children, depth + 1, node.path)}
                </ul>
              )}
            </li>
          )
        }

        const isChallenge = node.file.challenge
        const locked = !!node.file.unused
        const mark = node.file.change ? changeMarks[node.file.change] : null
        return (
          <li key={node.path} className={cn(node.file.change === 'added' && 'animate-file-in')}>
            <button
              type="button"
              onClick={() => {
                // A locked file is only selected, so ABOUT can say why it stays shut.
                if (locked) return setSelected(node.path)
                setFolderSelection(null)
                onOpen(node.path)
              }}
              title={node.file.owned ? 'Your file' : locked ? `${LOCKED} ${node.file.about}` : mark ? `${node.file.about} (${mark.label})` : node.file.about}
              aria-label={locked ? `${node.name} (locked: not used in this project)` : undefined}
              className={cn(
                'group flex h-[22px] w-full items-center gap-1.5 pr-2 text-left hover:bg-(--ide-hover)',
                activePath === node.path && 'text-(--ide-heading)',
                selected === node.path && 'bg-(--ide-active) hover:bg-(--ide-active)',
                node.file.generated && 'text-(--ide-icon)',
                locked && 'text-(--ide-dim)',
              )}
              style={{ paddingLeft: pad + 18 }}
            >
              <FileIcon path={node.path} className={cn(locked && 'opacity-50')} />
              <span className={cn('truncate', isChallenge ? 'text-(--ide-warning-soft)' : !locked && mark?.className)}>{node.name}</span>
              {node.file.owned ? (
                deleteButton(node.path, node.name)
              ) : locked ? (
                <Lock aria-hidden className="ml-auto size-3 shrink-0" />
              ) : isChallenge && challengeBadge ? (
                <span className="ml-auto shrink-0 pl-2 text-[11px] text-(--ide-warning-soft)">{challengeBadge}</span>
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
      })}
    </>
  )

  const about = selectedNode
    ? selectedNode.kind === 'folder'
      ? selectedNode.owned
        ? 'A folder you created. Add files to it with New File.'
        : folderAbout(selectedNode)
      : selectedNode.file.owned
        ? 'A file you created. It is saved with your progress; it is not part of the level and is not pushed to GitHub.'
        : selectedNode.file.unused
          ? `${selectedNode.file.about} ${LOCKED}`
          : selectedNode.file.about
    : undefined

  const actions = [
    ...(onCreate
      ? [
          { label: 'New File…', icon: FilePlus2, action: () => startCreating('file') },
          { label: 'New Folder…', icon: FolderPlus, action: () => startCreating('folder') },
        ]
      : []),
    { label: 'Collapse Folders in Explorer', icon: ChevronsDownUp, action: collapseAll },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col text-[13px] text-(--ide-fg)">
      <div className="flex h-9 shrink-0 items-center px-5 text-[11px] tracking-wide text-(--ide-fg-title)">EXPLORER</div>
      <div className="flex h-[22px] shrink-0 items-center gap-0.5 px-1 text-[11px] font-bold tracking-wide">
        <ChevronDown className="size-4" />
        <span className="min-w-0 flex-1 truncate">{projectName.toUpperCase()}</span>
        <span className="flex shrink-0 items-center gap-0.5">
          {actions.map(({ label, icon: Icon, action }) => (
            <button key={label} type="button" onClick={action} aria-label={label} title={label} className="grid size-5 place-items-center rounded-sm text-(--ide-muted) hover:bg-(--ide-border-strong) hover:text-(--ide-fg)">
              <Icon className="size-3.5" />
            </button>
          ))}
        </span>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto pb-2" aria-label="Project files">
        {tree.length > 0 || creating ? renderNodes(tree, 0, '') : <li className="px-5 py-2 text-[12px] text-(--ide-dim)">Empty for now. Files appear here as you build.</li>}
      </ul>
      <section className="shrink-0 border-t border-(--ide-border)">
        <div className="flex h-[22px] items-center gap-0.5 px-1 text-[11px] font-bold tracking-wide">
          <ChevronDown className="size-4" /> ABOUT
        </div>
        <div className="px-5 pb-3 pt-1 text-[12px] leading-5 text-(--ide-muted)">
          {selectedNode && (
            <div className="mb-1 flex items-center gap-1.5 font-mono text-[11px] text-(--ide-fg)">
              {selectedNode.kind === 'folder' ? `${selectedNode.chain[selectedNode.chain.length - 1]}/` : selectedNode.path}
              {(selectedNode.kind === 'folder' ? selectedNode.unused : selectedNode.file.unused) && <Lock aria-label="locked" className="size-3 shrink-0 text-(--ide-dim)" />}
            </div>
          )}
          {about ?? 'Select a file or folder to see what it is for.'}
        </div>
      </section>
    </div>
  )
}
