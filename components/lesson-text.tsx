import { Fragment, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const codeStyles = {
  dark: 'rounded bg-[#2b2b2b] px-1 py-px text-[0.92em] text-[#ce9178]',
  light: 'rounded bg-[#eef1f6] px-1 py-px text-[0.92em] text-[#3b3f8f]',
}

function inline(text: string, tone: keyof typeof codeStyles): ReactNode {
  return text.split(/(`[^`]+`)/).map((part, index) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 2 ? (
      <code key={index} className={cn('ide-mono', codeStyles[tone])}>
        {part.slice(1, -1)}
      </code>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  )
}

/** Renders lesson text: blank lines split paragraphs, "- " lines are bullets, `backticks` are code. */
export function LessonText({ text, tone = 'dark', className }: { text: string; tone?: keyof typeof codeStyles; className?: string }) {
  const blocks: { kind: 'p' | 'ul'; lines: string[] }[] = []
  for (const line of text.split('\n')) {
    const bullet = /^\s*-\s+/.test(line)
    const last = blocks[blocks.length - 1]
    if (!line.trim()) blocks.push({ kind: 'p', lines: [] })
    else if (bullet && last?.kind === 'ul') last.lines.push(line.replace(/^\s*-\s+/, ''))
    else if (bullet) blocks.push({ kind: 'ul', lines: [line.replace(/^\s*-\s+/, '')] })
    else if (last?.kind === 'p') last.lines.push(line)
    else blocks.push({ kind: 'p', lines: [line] })
  }

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {blocks
        .filter((block) => block.lines.length)
        .map((block, index) =>
          block.kind === 'ul' ? (
            <ul key={index} className="flex list-disc flex-col gap-1 pl-5">
              {block.lines.map((line, item) => (
                <li key={item}>{inline(line, tone)}</li>
              ))}
            </ul>
          ) : (
            <p key={index}>{inline(block.lines.join(' '), tone)}</p>
          ),
        )}
    </div>
  )
}
