import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Db, User } from './db.ts';

const SESSION_DAYS = 30;
const INVITE_DAYS = 7;

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** scrypt with a per-password salt, stored as "salt:hash" (hex). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `${salt.toString('hex')}:${scryptSync(password, salt, 32).toString('hex')}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, Buffer.from(salt, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

// No look-alike characters (0/O, 1/l/I), so it can be retyped from a phone screen.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** 14 characters from a 55-symbol alphabet: ~80 bits. */
export function generatePassword(length = 14): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/**
 * One-time invite code for a Telegram deep link (t.me/bot?start=<code>): 32 url-safe characters,
 * within Telegram's 64-character [A-Za-z0-9_-] limit. Only its hash is stored.
 */
export function createInvite(db: Db, userId: number): string {
  const code = randomBytes(24).toString('base64url');
  db.prepare('UPDATE users SET invite_hash = ?, invite_expires = ? WHERE id = ?').run(
    sha256(code),
    Date.now() + INVITE_DAYS * 86_400_000,
    userId,
  );
  return code;
}

export function createSession(db: Db, userId: number): { token: string; maxAge: number } {
  const token = randomBytes(32).toString('base64url');
  const maxAge = SESSION_DAYS * 86_400;
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha256(token), userId, Date.now() + maxAge * 1000);
  return { token, maxAge };
}

export function userBySession(db: Db, token: string | undefined): User | null {
  if (!token) return null;
  const row = db
    .prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?')
    .get(sha256(token), Date.now()) as User | undefined;
  return row ?? null;
}

export function deleteSession(db: Db, token: string | undefined): void {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

/** Fixed-window limiter for login attempts, keyed by IP and login. */
export class RateLimiter {
  private hits = new Map<string, { n: number; until: number }>();
  private max: number;
  private windowMs: number;
  constructor(max: number, windowMs: number) {
    this.max = max;
    this.windowMs = windowMs;
  }
  allow(key: string, now = Date.now()): boolean {
    if (this.hits.size > 10_000) for (const [k, v] of this.hits) if (v.until < now) this.hits.delete(k);
    const h = this.hits.get(key);
    if (!h || h.until < now) {
      this.hits.set(key, { n: 1, until: now + this.windowMs });
      return true;
    }
    h.n++;
    return h.n <= this.max;
  }
  reset(key: string) {
    this.hits.delete(key);
  }
}
