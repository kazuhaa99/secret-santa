import { useEffect, useState } from 'react';
import { SlidingNumber } from './sliding-number';

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Date.parse(to) - now;
  if (left <= 0) return <p className="font-display text-4xl text-ember">Крутим колесо…</p>;
  const { d, h, m, s } = parts(left);
  const cells: [number, string][] = [
    ...(d > 0 ? ([[d, 'дн']] as [number, string][]) : []),
    [h, 'ч'],
    [m, 'мин'],
    [s, 'сек'],
  ];
  return (
    <div className="flex items-end gap-4 sm:gap-6" role="timer" aria-label={`До жеребьёвки: ${d} дн ${h} ч ${m} мин`}>
      {cells.map(([v, label]) => (
        <div key={label} className="flex flex-col items-start">
          <span className="font-display text-[clamp(2.75rem,12vw,4.5rem)] leading-none tnum">
            <SlidingNumber value={v} padStart={label !== 'дн'} />
          </span>
          <span className="mt-2 text-xs uppercase tracking-[0.12em] text-smoke">{label}</span>
        </div>
      ))}
    </div>
  );
}
