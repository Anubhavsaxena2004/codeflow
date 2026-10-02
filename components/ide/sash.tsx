'use client'

import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { cn } from '@/lib/utils'

interface SashProps {
  /** `x` resizes a width (left/right drag), `y` resizes a height (up/down drag). */
  axis: 'x' | 'y'
  value: number
  min: number
  /** Upper bound, or a function so it can depend on the window size at drag time. */
  max: number | (() => number)
  /** Set when growing the pane means dragging left/up (panes on the right or bottom). */
  invert?: boolean
  label: string
  className?: string
  onChange: (value: number) => void
  onReset: () => void
}

const KEY_STEP = 16

/** A draggable pane border, like VS Code's sashes. Double-click resets; arrow keys nudge. */
export function Sash({ axis, value, min, max, invert = false, label, className, onChange, onReset }: SashProps) {
  const [dragging, setDragging] = useState(false)
  const upperBound = () => Math.max(min, typeof max === 'function' ? max() : max)
  const clamp = (next: number) => Math.round(Math.min(upperBound(), Math.max(min, next)))

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    const handle = event.currentTarget
    const start = axis === 'x' ? event.clientX : event.clientY
    const startValue = value
    const bodyClass = axis === 'x' ? 'is-resizing-x' : 'is-resizing-y'

    handle.setPointerCapture(event.pointerId)
    document.body.classList.add(bodyClass)
    setDragging(true)

    const move = (moveEvent: globalThis.PointerEvent) => {
      const delta = (axis === 'x' ? moveEvent.clientX : moveEvent.clientY) - start
      onChange(clamp(startValue + (invert ? -delta : delta)))
    }
    const end = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', end)
      handle.removeEventListener('pointercancel', end)
      document.body.classList.remove(bodyClass)
      setDragging(false)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', end)
    handle.addEventListener('pointercancel', end)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const grow = axis === 'x' ? (invert ? 'ArrowLeft' : 'ArrowRight') : invert ? 'ArrowUp' : 'ArrowDown'
    const shrink = axis === 'x' ? (invert ? 'ArrowRight' : 'ArrowLeft') : invert ? 'ArrowDown' : 'ArrowUp'
    if (event.key === grow) onChange(clamp(value + KEY_STEP))
    else if (event.key === shrink) onChange(clamp(value - KEY_STEP))
    else if (event.key === 'Enter') onReset()
    else return
    event.preventDefault()
  }

  return (
    <div
      role="separator"
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      tabIndex={0}
      title={`${label} — drag to resize, double-click to reset`}
      onPointerDown={onPointerDown}
      onDoubleClick={onReset}
      onKeyDown={onKeyDown}
      className={cn(
        'group absolute z-30 hidden touch-none outline-none lg:block',
        axis === 'x' ? 'inset-y-0 w-1.5 cursor-col-resize' : 'inset-x-0 h-1.5 cursor-row-resize',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute bg-[#0078d4] opacity-0 transition-opacity group-hover:opacity-100 group-hover:delay-150 group-focus-visible:opacity-100',
          axis === 'x' ? 'inset-y-0 left-1/2 w-[3px] -translate-x-1/2' : 'inset-x-0 top-1/2 h-[3px] -translate-y-1/2',
          dragging && 'opacity-100',
        )}
      />
    </div>
  )
}
