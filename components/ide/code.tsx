'use client'

import { FileCode, FileJson, FileText, Settings, type LucideIcon } from 'lucide-react'
import { Highlight, Prism, type PrismTheme } from 'prism-react-renderer'
import { cn } from '@/lib/utils'

// prism-react-renderer ships without Java; a clike extension covers what the Spring stack uses.
if (!Prism.languages.java) {
  Prism.languages.java = Prism.languages.extend('clike', {
    keyword:
      /\b(?:abstract|boolean|break|byte|case|catch|char|class|continue|default|do|double|else|enum|extends|final|finally|float|for|if|implements|import|instanceof|int|interface|long|new|package|private|protected|public|record|return|short|static|super|switch|this|throw|throws|try|var|void|while)\b/,
    'class-name': /\b[A-Z]\w*\b/,
  })
  Prism.languages.insertBefore('java', 'keyword', { annotation: { pattern: /@\w+/, alias: 'function' } })
}

// VS Code's colours as CSS variables (globals.css), so the code follows light and dark mode.
const color = (name: string) => ({ color: `var(--syn-${name})` })
const ideTheme: PrismTheme = {
  plain: { ...color('plain'), backgroundColor: 'transparent' },
  styles: [
    { types: ['prolog', 'constant', 'char'], style: color('constant') },
    { types: ['comment'], style: color('comment') },
    { types: ['keyword', 'changed', 'interpolation-punctuation'], style: color('keyword') },
    { types: ['builtin'], style: color('builtin') },
    { types: ['number', 'inserted', 'boolean'], style: color('number') },
    { types: ['attr-name', 'variable'], style: color('variable') },
    { types: ['deleted', 'string', 'attr-value', 'template-punctuation'], style: color('string') },
    { types: ['selector'], style: color('selector') },
    { types: ['tag'], style: color('tag') },
    { types: ['punctuation', 'operator'], style: color('punctuation') },
    { types: ['function'], style: color('function') },
    { types: ['class-name'], style: color('class') },
  ],
}

const languages: Record<string, string> = {
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  py: 'python',
  java: 'java',
  json: 'json',
  xml: 'markup',
  sql: 'sql',
  yml: 'yaml',
  yaml: 'yaml',
  md: 'markdown',
}

const extensionOf = (path: string) => path.split('/').pop()?.split('.').pop()?.toLowerCase() ?? ''

export function languageFor(path: string) {
  return languages[extensionOf(path)] ?? 'plain'
}

export function commentPrefix(language: string) {
  return language === 'python' ? '#' : '//'
}

/** Highlighted code, one div per line, so callers can line it up with a gutter. */
export function CodeLines({ code, language, wrap = false, lineClassName }: { code: string; language: string; wrap?: boolean; lineClassName?: string }) {
  return (
    <Highlight code={code} language={language} theme={ideTheme}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <>
          {tokens.map((line, index) => {
            const { className, style } = getLineProps({ line })
            return (
              <div key={index} style={style} className={cn(className, 'min-h-5', wrap ? 'whitespace-pre-wrap [overflow-wrap:anywhere]' : 'whitespace-pre', lineClassName)}>
                {line.map((token, key) => {
                  const props = getTokenProps({ token })
                  return <span key={key} className={props.className} style={props.style}>{props.children}</span>
                })}
              </div>
            )
          })}
        </>
      )}
    </Highlight>
  )
}

const icons: Record<string, [LucideIcon, string]> = {
  js: [FileCode, 'text-[#e8d44d]'],
  jsx: [FileCode, 'text-[#61dafb]'],
  ts: [FileCode, 'text-[#3178c6]'],
  py: [FileCode, 'text-[#4b8bbe]'],
  java: [FileCode, 'text-[#e76f00]'],
  xml: [FileCode, 'text-[#e37933]'],
  json: [FileJson, 'text-[#cbcb41]'],
  txt: [FileText, 'text-(--ide-muted)'],
  md: [FileText, 'text-[#519aba]'],
}

export function FileIcon({ path, className }: { path: string; className?: string }) {
  const [Icon, color] = icons[extensionOf(path)] ?? [Settings, 'text-[#6d8086]']
  return <Icon aria-hidden className={cn('size-4 shrink-0', color, className)} />
}
