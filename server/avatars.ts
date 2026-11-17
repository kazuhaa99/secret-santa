import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Db } from './db.ts';

/** Avatars live next to the database as <user id>.jpg; users.avatar_at doubles as a cache-buster. */
export class Avatars {
  private dir: string;
  constructor(dir: string) {
    this.dir = dir;
    mkdirSync(dir, { recursive: true });
  }

  /** Accepts JPEG only (what Telegram sends for photos), checked by its magic bytes. */
  save(db: Db, userId: number, data: Buffer): boolean {
    if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8 || data[2] !== 0xff) return false;
    writeFileSync(join(this.dir, `${userId}.jpg`), data);
    db.prepare('UPDATE users SET avatar_at = ? WHERE id = ?').run(Date.now(), userId);
    return true;
  }

  read(userId: number): Buffer | null {
    try {
      return readFileSync(join(this.dir, `${userId}.jpg`));
    } catch {
      return null;
    }
  }

  remove(userId: number): void {
    rmSync(join(this.dir, `${userId}.jpg`), { force: true });
  }
}
