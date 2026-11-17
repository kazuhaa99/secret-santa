/** The chat's own emoji, drawn: a cigarette whose smoke curls into a snowflake, with a holly sprig. */
export function Mark({ className = 'h-10 w-auto', smoke = true }: { className?: string; smoke?: boolean }) {
  return (
    <svg viewBox="0 0 72 44" className={className} aria-hidden fill="none">
      {smoke && (
        <g stroke="#fbf7ef" strokeLinecap="round" opacity="0.85">
          <path className="drift" d="M58 26c-3-4 3-6 0-10s3-5 1-8" strokeWidth="1.6" />
          <path d="M60 5v6M57 8h6M58 6l4 4M62 6l-4 4" strokeWidth="1.2" />
        </g>
      )}
      <rect x="6" y="29" width="15" height="9" rx="1.5" fill="#d9a35f" />
      <path d="M9 31.5v4M12.5 31.5v4M16 31.5v4" stroke="#b07a3c" strokeWidth="1" strokeLinecap="round" />
      <rect x="21" y="29" width="33" height="9" rx="1" fill="#fbf7ef" />
      <rect x="54" y="29" width="5" height="9" rx="1.5" fill="#6b5f55" />
      <rect x="57" y="29" width="4" height="9" rx="2" fill="#ff8a1f" />
      {/* holly */}
      <path d="M4 30c-3-2-4-6-1-8 1 3 4 3 5 6-1 1-2 2-4 2z" fill="#1d7a4e" />
      <circle cx="7" cy="25" r="1.8" fill="#e2383f" />
    </svg>
  );
}
