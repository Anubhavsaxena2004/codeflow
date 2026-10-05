export interface MascotProps {
  className?: string
  hoodie?: string
  expression?: 'idle' | 'wave' | 'cheer' | 'think'
}

/** The learner's little developer, used for "You are here" on the map and in the sidebar. */
export function Mascot({ className, hoodie = '#16a34a', expression = 'idle' }: MascotProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M12 64 C12 50 20 43 32 43 C44 43 52 50 52 64 Z" fill={hoodie} />
      <path d="M26 44 L32 52 L38 44" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
      <rect x="28" y="36" width="8" height="8" rx="3" fill="#f3c19d" />
      <circle cx="32" cy="27" r="13" fill="#fcd2b0" />
      <path d="M18.5 27 C17 14 25 10 33 10 C42 10 47 16 45.5 26 C43 20.5 37 18.5 31 19.5 C26 20.5 21.5 23 18.5 27 Z" fill="#3b2a20" />
      
      {expression === 'cheer' ? (
        <>
          <path d="M25 28.5 Q27 26 29 28.5" fill="none" stroke="#1f2937" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M35 28.5 Q37 26 39 28.5" fill="none" stroke="#1f2937" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M28 32 Q32 37 36 32 Z" fill="#9a3412" />
        </>
      ) : expression === 'think' ? (
        <>
          <circle cx="27" cy="27.5" r="1.7" fill="#1f2937" />
          <circle cx="37" cy="28.5" r="1.5" fill="#1f2937" />
          <path d="M25 24.5 L29 24" fill="none" stroke="#3b2a20" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M28.5 34 Q32 33 35.5 34" fill="none" stroke="#9a3412" strokeWidth="1.6" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="27" cy="28.5" r="1.7" fill="#1f2937" />
          <circle cx="37" cy="28.5" r="1.7" fill="#1f2937" />
          <path d="M28 33.5 Q32 36.5 36 33.5" fill="none" stroke="#9a3412" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}

      {expression === 'wave' && (
        <path d="M48 50 C52 44 56 36 54 32 C52 30 49 32 47 36" fill="none" stroke={hoodie} strokeWidth="4" strokeLinecap="round" />
      )}

      <circle cx="24" cy="32" r="2" fill="#fb7185" opacity="0.35" />
      <circle cx="40" cy="32" r="2" fill="#fb7185" opacity="0.35" />
    </svg>
  )
}
