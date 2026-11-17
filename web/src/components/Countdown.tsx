import { useEffect, useState } from 'react';
import { SlidingNumber } from './sliding-number';

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Gold digits on little dark tiles, like a departure board at a winter station. */
export function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Date.parse(to) - now;
  if (left <= 0) return <p className="font-display text-2xl font-semibold text-gold">Крутим колесо…</p>;
  const { d, h, m, s } = parts(left);
  const cells: [number, string][] = [...(d > 0 ? ([[d, 'дней']] as [number, string][]) : []), [h, 'часов'], [m, 'минут'], [s, 'секунд']];
  return (
    <div className="flex justify-center gap-2 sm:gap-3" role="timer" aria-label={`До жеребьёвки: ${d} дн ${h} ч ${m} мин`}>
      {cells.map(([v, label]) => (
        <div key={label} className="flex min-w-[4.25rem] flex-col items-center rounded-2xl border border-gold/25 bg-night/70 px-2 pb-2 pt-3 shadow-[inset_0_1px_0_#ffffff14] sm:min-w-[5.5rem]">
          <span className="font-display text-[clamp(1.9rem,8vw,3rem)] font-semibold leading-none text-gold tnum">
            <SlidingNumber value={v} padStart={label !== 'дней'} />
          </span>
          <span className="mt-1.5 text-[11px] uppercase tracking-[0.14em] text-frost">{label}</span>
        </div>
      ))}
    </div>
  );
}
