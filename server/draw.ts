import { randomInt } from 'node:crypto';
import { getSetting, setSetting, tx, type Db } from './db.ts';

/**
 * Sattolo's shuffle: a uniformly random single cycle. Everyone gives to the next person in the
 * cycle, so nobody draws themselves and the chain closes without isolated pairs (for n ≥ 3).
 */
export function singleCycle<T>(items: T[], rand: (n: number) => number = randomInt): Map<T, T> {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i); // 0 ≤ j < i, never i itself
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  const out = new Map<T, T>();
  a.forEach((giver, k) => out.set(giver, a[(k + 1) % a.length]!));
  return out;
}

export type DrawResult = { ok: true; count: number } | { ok: false; reason: string };

/** Draws among everyone who activated an account. Idempotent: an existing draw is kept. */
export function runDraw(db: Db): DrawResult {
  return tx(db, () => {
    if (getSetting(db, 'drawn_at')) return { ok: false, reason: 'Жеребьёвка уже прошла' };
    const ids = (db.prepare('SELECT id FROM users WHERE password_hash IS NOT NULL ORDER BY id').all() as { id: number }[]).map((r) => r.id);
    if (ids.length < 2) return { ok: false, reason: 'Нужно хотя бы два активированных участника' };
    const insert = db.prepare('INSERT INTO assignments (giver_id, receiver_id) VALUES (?, ?)');
    for (const [giver, receiver] of singleCycle(ids)) insert.run(giver, receiver);
    setSetting(db, 'drawn_at', new Date().toISOString());
    return { ok: true, count: ids.length };
  });
}

export function resetDraw(db: Db): void {
  tx(db, () => {
    db.exec('DELETE FROM assignments');
    setSetting(db, 'drawn_at', null);
  });
}

/** True when the scheduled time has come and no draw happened yet. */
export function drawIsDue(db: Db, now = Date.now()): boolean {
  const at = getSetting(db, 'draw_at');
  return Boolean(at) && !getSetting(db, 'drawn_at') && Date.parse(at!) <= now;
}
