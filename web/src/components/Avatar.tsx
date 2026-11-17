import { cn } from './ui';

const FALLBACK = ['#7a1a28', '#2d5c47', '#8a6a2c', '#2e3f6e', '#6b3b5e', '#4d5a2a'];

/** The photo sent to the bot, or initials on a festive colour picked by id. */
export function Avatar({ id, name, avatar, className }: { id: number; name: string; avatar: number | null; className?: string }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return avatar ? (
    <img src={`/api/avatars/${id}?v=${avatar}`} alt="" className={cn('rounded-full object-cover', className)} draggable={false} />
  ) : (
    <span
      className={cn('grid place-items-center rounded-full font-display text-[1.15em] font-semibold italic text-snow', className)}
      style={{ background: FALLBACK[id % FALLBACK.length] }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
