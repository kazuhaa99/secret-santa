import { cn } from './ui';

const FALLBACK = ['#e2383f', '#1d7a4e', '#c9962a', '#3b5bdb', '#ff8a1f', '#8e44ad'];

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
      className={cn('grid place-items-center rounded-full font-display font-semibold text-snow', className)}
      style={{ background: FALLBACK[id % FALLBACK.length] }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
