import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type Db = DatabaseSync;

export interface User {
  id: number;
  login: string;
  name: string;
  is_admin: number;
  password_hash: string | null;
  tg_chat_id: number | null;
  invite_hash: string | null;
  invite_expires: number | null;
  created_at: number;
  activated_at: number | null;
  avatar_at: number | null;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  login TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  password_hash TEXT,
  tg_chat_id INTEGER UNIQUE,
  invite_hash TEXT UNIQUE,
  invite_expires INTEGER,
  created_at INTEGER NOT NULL,
  activated_at INTEGER
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
CREATE TABLE IF NOT EXISTS signups (
  chat_id INTEGER PRIMARY KEY,
  step TEXT NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS assignments (
  giver_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
`;

export function openDb(file: string): Db {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  // Columns added after the first release.
  const cols = (db.prepare('PRAGMA table_info(users)').all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes('avatar_at')) db.exec('ALTER TABLE users ADD COLUMN avatar_at INTEGER');
  return db;
}

export function getSetting(db: Db, key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string | null } | undefined;
  return row?.value ?? null;
}

export function setSetting(db: Db, key: string, value: string | null): void {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}

/** Runs fn in a transaction (node:sqlite has no helper for it). */
export function tx<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export const findUser = (db: Db, id: number) => db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
