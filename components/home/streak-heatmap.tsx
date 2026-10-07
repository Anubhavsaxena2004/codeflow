'use client'

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { CalendarDays, Flame, Trophy } from 'lucide-react'
import { activityByDay, dayKey, longestStreak, streakDays } from '@/lib/journeys/progress'
import { cn } from '@/lib/utils'

// A GitHub / LeetCode style calendar: one cell per day for the last year, darker the more levels
// were passed that day. Sequential colour: one green hue, light to dark, with its own steps in
// dark mode (bright on a dark surface), and a neutral empty cell.

const WEEKS = 53
const CELL = 11
const GAP = 3
const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

/** 0 = no activity, then 1, 2, 3–4 and 5+ levels. */
const bucketOf = (count: number) => (count <= 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4)
const BUCKET_CLASSES = [
  'bg-(--cf-track)',
  'bg-[#9be9a8] dark:bg-[#0e4429]',
  'bg-[#40c463] dark:bg-[#006d32]',
  'bg-[#30a14e] dark:bg-[#26a641]',
  'bg-[#216e39] dark:bg-[#39d353]',
]
const BUCKET_LABELS = ['No levels', '1 level', '2 levels', '3–4 levels', '5 or more levels']

const longDate = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
const monthName = new Intl.DateTimeFormat('en', { month: 'short' })

interface Day {
  key: string
  date: Date
  count: number
  future: boolean
}

export function StreakHeatmap({ rows, now: nowProp }: { rows: { completedAt: string }[]; now?: Date }) {
  // The calendar depends on "today", which differs between the server and the browser, so it
  // is drawn after mounting.
  const [now, setNow] = useState<Date | null>(nowProp ?? null)
  useEffect(() => {
    if (!nowProp) setNow(new Date())
  }, [nowProp])

  const counts = useMemo(() => activityByDay(rows), [rows])
  const weeks = useMemo(() => {
    if (!now) return []
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    // Columns are weeks starting on Sunday; the last column holds today.
    const start = new Date(today)
    start.setDate(start.getDate() - start.getDay() - (WEEKS - 1) * 7)
    return Array.from({ length: WEEKS }, (_, week) =>
      Array.from({ length: 7 }, (_, weekday): Day => {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + week * 7 + weekday)
        const key = dayKey(date)
        return { key, date, count: counts.get(key) ?? 0, future: date > today }
      }),
    )
  }, [now, counts])

  const yearTotal = weeks.flat().reduce((sum, day) => sum + day.count, 0)
  const activeDays = weeks.flat().filter((day) => day.count > 0)
  const current = useMemo(() => (now ? streakDays(rows, now) : 0), [rows, now])
  const longest = useMemo(() => longestStreak(rows), [rows])

  // Month labels sit above the first week that starts in that month.
  const months = weeks.map((week, index) => {
    const first = week[0].date
    const previous = weeks[index - 1]?.[0].date
    return !previous || previous.getMonth() !== first.getMonth() ? monthName.format(first) : ''
  })
  // The partial first month would collide with the next label when that one is close.
  if (months[1] || months[2]) months[0] = ''

  // Scroll the calendar to today on narrow screens.
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth
  }, [weeks.length])

  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null)
  const showTip = (event: MouseEvent<HTMLDivElement>) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-day]')
    const host = scroller.current?.parentElement
    if (!cell || !host) return setTip(null)
    const count = Number(cell.dataset.count)
    const box = cell.getBoundingClientRect()
    const frame = host.getBoundingClientRect()
    setTip({
      text: `${count === 0 ? 'No levels' : `${count} level${count === 1 ? '' : 's'}`} passed on ${cell.dataset.label}`,
      x: box.left - frame.left + box.width / 2,
      y: box.top - frame.top,
    })
  }

  const plural = (value: number, word: string) => `${word}${value === 1 ? '' : 's'}`
  const stats = [
    { icon: <Trophy className="size-4 text-[#16a34a] dark:text-[#4ade80]" />, value: yearTotal, label: `${plural(yearTotal, 'level')} in the last year` },
    { icon: <CalendarDays className="size-4 text-(--cf-muted)" />, value: activeDays.length, label: `active ${plural(activeDays.length, 'day')}` },
    { icon: <Flame className="size-4 fill-[#f97316] text-[#f97316]" />, value: current, label: 'day current streak' },
    { icon: <Flame className="size-4 text-[#ea580c] dark:text-[#fdba74]" />, value: longest, label: 'day longest streak' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-2 rounded-xl border border-(--cf-border) bg-(--cf-surface-2)/60 px-3 py-2">
            {stat.icon}
            <dt className="sr-only">{stat.label}</dt>
            <dd className="text-xs text-(--cf-muted)">
              <span className="num font-display text-base font-extrabold text-(--cf-text)">{stat.value}</span> {stat.label}
            </dd>
          </div>
        ))}
      </dl>

      <div className="relative">
        <div ref={scroller} className="no-scrollbar overflow-x-auto pb-1">
          {now ? (
            <div
              role="img"
              aria-label={`Activity calendar: ${yearTotal} levels passed on ${activeDays.length} days in the last year. Current streak ${current} days, longest ${longest} days.`}
              className="inline-flex flex-col gap-1"
              onMouseMove={showTip}
              onMouseLeave={() => setTip(null)}
            >
              <div className="flex text-[10px] font-semibold text-(--cf-muted)" style={{ paddingLeft: 28, gap: GAP }} aria-hidden>
                {months.map((label, index) => (
                  <span key={index} className="overflow-visible whitespace-nowrap" style={{ width: CELL }}>
                    {label}
                  </span>
                ))}
              </div>
              <div className="flex" style={{ gap: GAP }}>
                <div className="flex w-[25px] flex-col text-[10px] text-(--cf-muted)" style={{ gap: GAP }} aria-hidden>
                  {WEEKDAY_LABELS.map((label, index) => (
                    <span key={index} className="leading-none" style={{ height: CELL }}>
                      {label}
                    </span>
                  ))}
                </div>
                {weeks.map((week, index) => (
                  <div key={index} className="flex flex-col" style={{ gap: GAP }}>
                    {week.map((day) => (
                      <span
                        key={day.key}
                        data-day={day.future ? undefined : day.key}
                        data-count={day.count}
                        data-label={longDate.format(day.date)}
                        className={cn('rounded-[3px]', day.future ? 'invisible' : BUCKET_CLASSES[bucketOf(day.count)], !day.future && day.key === dayKey(now) && 'ring-1 ring-(--cf-text)/40')}
                        style={{ width: CELL, height: CELL }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[110px] w-full animate-pulse rounded-xl bg-(--cf-surface-2)" />
          )}
        </div>

        {tip && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-[#0f172a] px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg dark:bg-white dark:text-[#0f172a]"
            style={{ left: tip.x, top: tip.y - 6 }}
          >
            {tip.text}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-(--cf-muted)">
        <span>{current > 0 ? `Pass a level today to keep your ${current}-day streak.` : 'Pass a level today to start a streak.'}</span>
        <span className="flex items-center gap-1" aria-label="Colour scale: from no levels to 5 or more levels a day">
          Less
          {BUCKET_CLASSES.map((className, index) => (
            <span key={index} title={BUCKET_LABELS[index]} className={cn('rounded-[3px]', className)} style={{ width: CELL, height: CELL }} />
          ))}
          More
        </span>
      </div>

      {activeDays.length > 0 && (
        <details className="text-[12px] text-(--cf-muted)">
          <summary className="cursor-pointer font-semibold hover:text-(--cf-text)">Show active days as a list</summary>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {[...activeDays].reverse().map((day) => (
              <li key={day.key} className="flex justify-between gap-3 rounded-md bg-(--cf-surface-2)/60 px-2 py-1">
                <span>{longDate.format(day.date)}</span>
                <span className="num font-semibold text-(--cf-text)">
                  {day.count} level{day.count === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
