'use client'

import { useEffect } from 'react'

export function TitleBackdrop() {
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        document.documentElement.classList.add('tab-hidden')
      } else {
        document.documentElement.classList.remove('tab-hidden')
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // 24 starry points for night sky
  const stars = [
    { top: '8%', left: '12%', delay: '0s', size: 2 },
    { top: '14%', left: '38%', delay: '1.2s', size: 1.5 },
    { top: '6%', left: '62%', delay: '0.6s', size: 2.5 },
    { top: '18%', left: '84%', delay: '1.8s', size: 2 },
    { top: '24%', left: '22%', delay: '2.4s', size: 1.5 },
    { top: '30%', left: '50%', delay: '0.9s', size: 2 },
    { top: '22%', left: '72%', delay: '1.5s', size: 1 },
    { top: '10%', left: '92%', delay: '2.1s', size: 2 },
    { top: '36%', left: '16%', delay: '0.3s', size: 1.5 },
    { top: '42%', left: '44%', delay: '1.7s', size: 2.5 },
    { top: '34%', left: '88%', delay: '0.8s', size: 1.5 },
    { top: '12%', left: '4%', delay: '1.4s', size: 2 },
    { top: '28%', left: '96%', delay: '2.5s', size: 1 },
    { top: '48%', left: '6%', delay: '1.1s', size: 2 },
    { top: '16%', left: '54%', delay: '0.4s', size: 1.5 },
    { top: '40%', left: '76%', delay: '2.2s', size: 2 },
  ]

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {/* Sky Gradient */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#bfe9ff] via-[#d6f0ff] to-[#eaf7ff] transition-colors duration-500 dark:from-[#0b1026] dark:via-[#131738] dark:to-[#1b1f4a]"
      />

      {/* Night Sky Twinkling Stars */}
      <div className="absolute inset-0 hidden dark:block">
        {stars.map((star, i) => (
          <span
            key={i}
            className="animate-star-twinkle absolute rounded-full bg-white shadow-[0_0_4px_#fff]"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: star.delay,
            }}
          />
        ))}
      </div>

      {/* Drifting Clouds */}
      <div className="absolute inset-x-0 top-[8%] h-24 opacity-75 dark:opacity-20">
        <svg
          viewBox="0 0 160 60"
          className="animate-cloud-slow absolute left-0 top-0 w-44 fill-white drop-shadow-xs"
        >
          <path d="M 20 40 Q 20 20 45 22 Q 60 10 85 20 Q 110 8 130 25 Q 150 25 150 42 Q 150 54 135 54 L 25 54 Q 15 54 20 40 Z" />
        </svg>
      </div>

      <div className="absolute inset-x-0 top-[22%] h-24 opacity-60 dark:opacity-15">
        <svg
          viewBox="0 0 160 60"
          className="animate-cloud-slower absolute left-0 top-0 w-60 fill-white drop-shadow-xs"
        >
          <path d="M 20 40 Q 20 20 45 22 Q 60 10 85 20 Q 110 8 130 25 Q 150 25 150 42 Q 150 54 135 54 L 25 54 Q 15 54 20 40 Z" />
        </svg>
      </div>

      <div className="absolute inset-x-0 top-[38%] h-20 opacity-40 dark:opacity-10">
        <svg
          viewBox="0 0 160 60"
          className="animate-cloud-fast absolute left-0 top-0 w-36 fill-white drop-shadow-xs"
        >
          <path d="M 20 40 Q 20 20 45 22 Q 60 10 85 20 Q 110 8 130 25 Q 150 25 150 42 Q 150 54 135 54 L 25 54 Q 15 54 20 40 Z" />
        </svg>
      </div>

      {/* Distant Island Silhouettes in World Colours at Low Contrast */}
      <svg
        viewBox="0 0 1440 320"
        className="absolute inset-x-0 bottom-0 w-full h-[220px] sm:h-[300px] object-cover"
        preserveAspectRatio="none"
      >
        {/* Deep background hills / ocean mist */}
        <path
          d="M0,280 C320,240 480,260 720,240 C960,220 1180,250 1440,230 L1440,320 L0,320 Z"
          fill="#0284c7"
          className="opacity-10 dark:opacity-15"
        />

        {/* Castle / Dungeon silhouette (purple) */}
        <path
          d="M0,290 C180,260 280,200 440,240 C540,265 640,280 800,270 L800,320 L0,320 Z"
          fill="#7c3aed"
          className="opacity-15 dark:opacity-15"
        />

        {/* Village silhouette (gold) */}
        <path
          d="M480,290 C620,250 780,230 960,260 C1080,280 1200,285 1320,275 L1320,320 L480,320 Z"
          fill="#f59e0b"
          className="opacity-12 dark:opacity-15"
        />

        {/* Forest Island silhouette (green, foreground low horizon) */}
        <path
          d="M600,300 C800,250 1020,220 1240,250 C1360,265 1420,270 1440,270 L1440,320 L600,320 Z"
          fill="#22c55e"
          className="opacity-18 dark:opacity-20"
        />
      </svg>
    </div>
  )
}
