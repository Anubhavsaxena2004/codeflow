'use client'

import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

export interface GameTooltipProps {
  content: ReactNode
  children: ReactElement
  side?: 'top' | 'bottom'
  disabled?: boolean
  className?: string
}

export function GameTooltip({
  content,
  children,
  side = 'top',
  disabled = false,
  className,
}: GameTooltipProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; actualSide: 'top' | 'bottom' } | null>(null)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const id = useId()

  useEffect(() => {
    setMounted(true)
  }, [])

  const updatePosition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const tooltipHeight = 36
    const spacing = 8

    let targetSide = side
    if (side === 'top' && rect.top - tooltipHeight - spacing < 8) {
      targetSide = 'bottom'
    } else if (side === 'bottom' && rect.bottom + tooltipHeight + spacing > window.innerHeight - 8) {
      targetSide = 'top'
    }

    const top = targetSide === 'top' ? rect.top - spacing : rect.bottom + spacing
    const left = rect.left + rect.width / 2

    setCoords({ top, left, actualSide: targetSide })
  }

  const handleMouseEnter = () => {
    if (disabled || !content) return
    timerRef.current = setTimeout(() => {
      updatePosition()
      setOpen(true)
    }, 300)
  }

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setOpen(false)
  }

  const handleFocus = () => {
    if (disabled || !content) return
    updatePosition()
    setOpen(true)
  }

  const handleBlur = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onScrollOrResize = () => updatePosition()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open])

  if (!isValidElement(children)) {
    return <>{children}</>
  }

  const childProps = children.props as {
    onMouseEnter?: (e: React.MouseEvent<HTMLElement>) => void
    onMouseLeave?: (e: React.MouseEvent<HTMLElement>) => void
    onFocus?: (e: React.FocusEvent<HTMLElement>) => void
    onBlur?: (e: React.FocusEvent<HTMLElement>) => void
  }
  const childRef = (children as { ref?: React.Ref<HTMLElement> }).ref

  const trigger = cloneElement(children as ReactElement<any>, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node
      if (typeof childRef === 'function') {
        childRef(node)
      } else if (childRef && 'current' in childRef) {
        ;(childRef as { current: HTMLElement | null }).current = node
      }
    },
    'aria-describedby': open && content ? id : undefined,
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      childProps?.onMouseEnter?.(e)
      handleMouseEnter()
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      childProps?.onMouseLeave?.(e)
      handleMouseLeave()
    },
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      childProps?.onFocus?.(e)
      handleFocus()
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      childProps?.onBlur?.(e)
      handleBlur()
    },
  })

  return (
    <>
      {trigger}
      {mounted && open && content && coords &&
        createPortal(
          <div
            id={id}
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: coords.actualSide === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
              zIndex: 9999,
              transition: 'opacity var(--dur-fast, 160ms) var(--ease-out, ease-out), transform var(--dur-fast, 160ms) var(--ease-out, ease-out)',
            }}
            className="pointer-events-none rounded-[var(--radius-sm,8px)] border border-(--cf-border) bg-(--cf-surface) px-2.5 py-1 text-[12px] font-semibold text-(--cf-text) shadow-(--elev-3) animate-in fade-in"
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  )
}
