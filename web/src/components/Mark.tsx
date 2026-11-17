/** The chat's own emoji, drawn: a cigarette with a smouldering tip and a curl of smoke. */
export function Mark({ className = 'h-10 w-auto', smoke = true }: { className?: string; smoke?: boolean }) {
  return (
    <svg viewBox="0 0 64 40" className={className} aria-hidden fill="none">
      {smoke && (
        <path
          className="drift"
          d="M54 22c-3-4 3-6 0-10s3-6 1-10"
          stroke="var(--color-smoke)"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.7"
        />
      )}
      <rect x="4" y="25" width="15" height="9" rx="1.5" fill="var(--color-filter)" />
      <path d="M7 27.5v4M10.5 27.5v4M14 27.5v4" stroke="#b9824a" strokeWidth="1" strokeLinecap="round" />
      <rect x="19" y="25" width="33" height="9" rx="1" fill="var(--color-paper)" />
      <rect x="52" y="25" width="5" height="9" rx="1.5" fill="#6b5f55" />
      <rect className="smoulder" x="55" y="25" width="4" height="9" rx="2" fill="var(--color-ember)" />
    </svg>
  );
}
