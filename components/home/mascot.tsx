'use client'

import { useId } from 'react'

export interface MascotProps {
  className?: string
  hoodie?: string
  darkHoodie?: string
  headphoneColor?: string
  hairColor?: string
  expression?: 'idle' | 'wave' | 'cheer' | 'think'
}

/** The learner's developer mascot, used for "You are here" on the map, in the HUD and sidebar. */
export function Mascot({
  className,
  hoodie = '#16a34a',
  darkHoodie,
  headphoneColor = '#22c55e',
  hairColor = '#3b2314',
  expression = 'idle',
}: MascotProps) {
  const uid = useId()
  const hoodieId = `hoodie-${uid}`
  const skinId = `skin-${uid}`

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={hoodieId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hoodie} />
          <stop offset="100%" stopColor={darkHoodie ?? '#14532d'} />
        </linearGradient>
        <linearGradient id={skinId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffeedd" />
          <stop offset="100%" stopColor="#f8c9a5" />
        </linearGradient>
      </defs>

      {/* Headphone band (behind hair) */}
      <path
        d="M 22 44 C 18 20, 82 20, 78 44"
        fill="none"
        stroke="#1e293b"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <path
        d="M 24 43 C 21 23, 79 23, 76 43"
        fill="none"
        stroke="#475569"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Back Hair */}
      <path
        d="M 25 44 C 21 26, 79 26, 75 44 C 77 56, 72 63, 68 66 C 60 62, 40 62, 32 66 C 28 63, 23 56, 25 44 Z"
        fill={hairColor}
      />

      {/* Body / Hoodie */}
      <path
        d="M 18 100 C 18 76, 30 65, 50 65 C 70 65, 82 76, 82 100 Z"
        fill={`url(#${hoodieId})`}
      />

      {/* Shoulder fold shadows */}
      <path
        d="M 22 94 C 28 84, 37 80, 42 75"
        fill="none"
        stroke="#000000"
        strokeOpacity="0.18"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M 78 94 C 72 84, 63 80, 58 75"
        fill="none"
        stroke="#000000"
        strokeOpacity="0.18"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Hoodie Collar / Neckline */}
      <path
        d="M 34 67 C 34 77, 66 77, 66 67 C 60 78, 40 78, 34 67 Z"
        fill="#000000"
        fillOpacity="0.22"
      />
      <path
        d="M 35 66 Q 50 78 65 66"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.75"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Drawstrings with metal aglets */}
      <path
        d="M 43 72 Q 40 83 42 88"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.9"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="40.5" y="87" width="3" height="5" rx="1.5" fill="#e2e8f0" />
      <path
        d="M 57 72 Q 60 83 58 88"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.9"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="56.5" y="87" width="3" height="5" rx="1.5" fill="#e2e8f0" />

      {/* Code badge on chest */}
      <text
        x="50"
        y="96"
        textAnchor="middle"
        fontSize="6.5"
        fontWeight="900"
        fontFamily="ui-monospace, monospace"
        fill="#ffffff"
        opacity="0.5"
      >
        &lt;/&gt;
      </text>

      {/* Neck */}
      <path
        d="M 43 54 L 43 67 C 45 70, 55 70, 57 67 L 57 54 Z"
        fill="#f4b595"
      />
      <path
        d="M 43 54 C 47 61, 53 61, 57 54 L 57 57 C 53 63, 47 63, 43 57 Z"
        fill="#000000"
        fillOpacity="0.12"
      />

      {/* Head */}
      <ellipse cx="50" cy="46" rx="22.5" ry="20.5" fill={`url(#${skinId})`} />

      {/* Ears */}
      <circle cx="28" cy="47" r="4.5" fill="#f8c9a5" />
      <circle cx="72" cy="47" r="4.5" fill="#f8c9a5" />

      {/* Headphone Earcups */}
      <g>
        {/* Left Earcup */}
        <rect x="19" y="38" width="9" height="18" rx="4.5" fill="#0f172a" />
        <rect x="21" y="40" width="5" height="14" rx="2.5" fill={headphoneColor} opacity={0.85} />
        {/* Right Earcup */}
        <rect x="72" y="38" width="9" height="18" rx="4.5" fill="#0f172a" />
        <rect x="74" y="40" width="5" height="14" rx="2.5" fill={headphoneColor} opacity={0.85} />
      </g>

      {/* Blush cheeks */}
      <ellipse cx="37" cy="51" rx="4.5" ry="2.5" fill="#f43f5e" opacity="0.28" />
      <ellipse cx="63" cy="51" rx="4.5" ry="2.5" fill="#f43f5e" opacity="0.28" />

      {/* Front Hair (Layered anime/chibi bangs) */}
      <path
        d="M 28 42 C 26 23, 74 23, 72 42 C 67 33, 56 32, 50 36 C 44 32, 33 34, 28 42 Z"
        fill={hairColor}
      />
      <path
        d="M 33 36 Q 37 46 44 41 Q 40 35 43 33"
        fill={hairColor}
      />
      <path
        d="M 43 34 Q 52 46 62 38 Q 55 33 58 31"
        fill={hairColor}
      />
      <path
        d="M 60 36 Q 66 45 70 41 Q 65 34 68 31"
        fill={hairColor}
      />
      {/* Hair highlight */}
      <path
        d="M 37 27 C 43 24, 57 24, 63 27"
        fill="none"
        stroke="#784421"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Face Expressions */}
      {expression === 'cheer' ? (
        <>
          {/* Eyebrows up */}
          <path d="M 36 38 Q 41 36 46 38" fill="none" stroke="#26160d" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 54 38 Q 59 36 64 38" fill="none" stroke="#26160d" strokeWidth="2.2" strokeLinecap="round" />
          {/* Smiling arcs */}
          <path d="M 36.5 46 Q 41 40 45.5 46" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
          <path d="M 54.5 46 Q 59 40 63.5 46" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
          {/* Cheerful open mouth */}
          <path d="M 44.5 51 Q 50 61 55.5 51 Z" fill="#991b1b" />
          <path d="M 46.5 54 Q 50 58.5 53.5 54" fill="#f43f5e" />
          {/* Little celebration star sparkles */}
          <path d="M 30 33 L 31.5 35.5 L 34 37 L 31.5 38.5 L 30 41 L 28.5 38.5 L 26 37 L 28.5 35.5 Z" fill="#f59e0b" />
          <path d="M 70 33 L 71.5 35.5 L 74 37 L 71.5 38.5 L 70 41 L 68.5 38.5 L 66 37 L 68.5 35.5 Z" fill="#f59e0b" />
        </>
      ) : expression === 'think' ? (
        <>
          {/* Inquisitive eyebrows */}
          <path d="M 36 41 L 46 38" fill="none" stroke="#26160d" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 54 38 Q 59 36 64 40" fill="none" stroke="#26160d" strokeWidth="2.2" strokeLinecap="round" />
          {/* Looking up-right eyes */}
          <g>
            <ellipse cx="42" cy="44.5" rx="3.8" ry="4.8" fill="#0f172a" />
            <circle cx="43.5" cy="43" r="1.8" fill="#ffffff" />
            <ellipse cx="60" cy="44.5" rx="3.8" ry="4.8" fill="#0f172a" />
            <circle cx="61.5" cy="43" r="1.8" fill="#ffffff" />
          </g>
          {/* Smirk mouth */}
          <path d="M 47 53 Q 51 51 55 53" fill="none" stroke="#9a3412" strokeWidth="2.2" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* Eyebrows */}
          <path d="M 36 40 Q 41 38 46 40" fill="none" stroke="#26160d" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 54 40 Q 59 38 64 40" fill="none" stroke="#26160d" strokeWidth="2.2" strokeLinecap="round" />
          {/* Expressive glossy eyes */}
          <g>
            <ellipse cx="41" cy="46" rx="3.8" ry="5" fill="#0f172a" />
            <circle cx="39.5" cy="44" r="1.8" fill="#ffffff" />
            <circle cx="42.5" cy="48" r="0.8" fill="#ffffff" opacity="0.8" />
            <ellipse cx="59" cy="46" rx="3.8" ry="5" fill="#0f172a" />
            <circle cx="57.5" cy="44" r="1.8" fill="#ffffff" />
            <circle cx="60.5" cy="48" r="0.8" fill="#ffffff" opacity="0.8" />
          </g>
          {/* Warm smile */}
          <path d="M 46 52.5 Q 50 56.5 54 52.5" fill="none" stroke="#9a3412" strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}

      {/* Waving Arm (for wave expression) */}
      {expression === 'wave' && (
        <g>
          <path
            d="M 76 75 C 83 67, 88 53, 85 45 C 82 43, 77 46, 75 53"
            fill="none"
            stroke={hoodie}
            strokeWidth="9"
            strokeLinecap="round"
          />
          <circle cx="85" cy="43" r="4.8" fill="#f8c9a5" />
          <path
            d="M 87 40 Q 89 42 86 44"
            fill="none"
            stroke="#f4b595"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  )
}
