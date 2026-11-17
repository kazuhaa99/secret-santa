/** A gold coin for tips (our own drawing). */
export function Coin({ className = 'size-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="15" fill="#b8860b" />
      <circle cx="16" cy="15" r="14" fill="#ffd54a" />
      <circle cx="16" cy="15" r="10.5" fill="none" stroke="#c99a1a" strokeWidth="1.6" />
      <path d="M16 8.5l2 4.3 4.6.5-3.4 3.1 1 4.6L16 18.6 11.8 21l1-4.6-3.4-3.1 4.6-.5z" fill="#e0a811" />
      <ellipse cx="11" cy="9" rx="4" ry="2" fill="#fff6c2" opacity="0.8" transform="rotate(-30 11 9)" />
    </svg>
  );
}
