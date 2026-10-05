/** The learner's little developer, used for "You are here" on the map and in the sidebar. */
export function Mascot({ className, hoodie = '#16a34a' }: { className?: string; hoodie?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M12 64 C12 50 20 43 32 43 C44 43 52 50 52 64 Z" fill={hoodie} />
      <path d="M26 44 L32 52 L38 44" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
      <rect x="28" y="36" width="8" height="8" rx="3" fill="#f3c19d" />
      <circle cx="32" cy="27" r="13" fill="#fcd2b0" />
      <path d="M18.5 27 C17 14 25 10 33 10 C42 10 47 16 45.5 26 C43 20.5 37 18.5 31 19.5 C26 20.5 21.5 23 18.5 27 Z" fill="#3b2a20" />
      <circle cx="27" cy="28.5" r="1.7" fill="#1f2937" />
      <circle cx="37" cy="28.5" r="1.7" fill="#1f2937" />
      <path d="M28 33.5 Q32 36.5 36 33.5" fill="none" stroke="#9a3412" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="24" cy="32" r="2" fill="#fb7185" opacity="0.35" />
      <circle cx="40" cy="32" r="2" fill="#fb7185" opacity="0.35" />
    </svg>
  )
}
