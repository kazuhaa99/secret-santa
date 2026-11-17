import { generatePassword, hashPassword, sha256 } from './auth.ts';
import { findUser, getSetting, tx, type Db, type User } from './db.ts';

export const LOGIN_RE = /^[a-z0-9_.-]{3,32}$/i;

export interface Outgoing {
  chatId: number;
  /** HTML (parse_mode=HTML): escape anything user-provided */
  text: string;
}

interface PhotoSize {
  file_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface Update {
  update_id: number;
  message?: {
    chat: { id: number; type: string };
    text?: string;
    photo?: PhotoSize[];
    document?: { file_id: string; mime_type?: string; file_size?: number };
  };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const HELP_UNKNOWN = 'Привет! Это бот Тайного Санты «Сигаретки». Чтобы участвовать, открой ссылку-приглашение из чата.';
const HELP_KNOWN = 'Ты уже в игре. Забыл пароль — отправь /password. Пришли фото — поставлю его на аватарку.';

/** HTML message: login and password in <code>, which Telegram copies with one tap. */
function credentials(user: User, password: string, siteUrl: string): string {
  return [
    `${esc(user.name)}, ты в игре.`,
    '',
    `Сайт: ${siteUrl}`,
    `Логин: <code>${esc(user.login)}</code>`,
    `Пароль: <code>${password}</code>`,
    '',
    'Пароль знаешь только ты: организатор его не видит. Забудешь — отправь /password.',
    'Пришли сюда фото — оно станет твоей аватаркой на сайте.',
  ].join('\n');
}

/** Sets a fresh random password and signs the user out everywhere; returns the message to send. */
export function issuePassword(db: Db, user: User, siteUrl: string): Outgoing | null {
  if (!user.tg_chat_id) return null;
  const password = generatePassword();
  tx(db, () => {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), user.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  });
  return { chatId: user.tg_chat_id, text: credentials(user, password, siteUrl) };
}

/** Turns one Telegram update into the replies to send. Only private chats are served. */
export function handleUpdate(db: Db, update: Update, siteUrl: string): Outgoing[] {
  const msg = update.message;
  if (!msg?.text || msg.chat.type !== 'private') return [];
  if (msg.text.length > 200) return [];
  const chatId = msg.chat.id;
  const [command, arg] = msg.text.trim().split(/\s+/, 2);
  const bound = db.prepare('SELECT * FROM users WHERE tg_chat_id = ?').get(chatId) as User | undefined;

  // ── Self sign-up from the shared chat link: name → login → (photo) ──
  if (command === '/start' && arg?.startsWith('join_')) {
    if (bound) return [{ chatId, text: HELP_KNOWN }];
    const code = getSetting(db, 'join_code');
    if (!code || arg !== `join_${code}`) return [{ chatId, text: 'Ссылка устарела. Попроси у организатора свежую в чате.' }];
    if (getSetting(db, 'drawn_at')) return [{ chatId, text: 'Жеребьёвка уже прошла, регистрация закрыта. Напиши организатору.' }];
    db.prepare('INSERT INTO signups (chat_id, step, created_at) VALUES (?, ?, ?) ON CONFLICT(chat_id) DO UPDATE SET step = excluded.step, name = NULL').run(
      chatId,
      'name',
      Date.now(),
    );
    return [{ chatId, text: 'Привет! Регистрируемся в Тайного Санту «Сигаретки».\n\nКак тебя подписать на сайте? Напиши имя (до 40 символов).' }];
  }
  const signup = bound ? undefined : (db.prepare('SELECT * FROM signups WHERE chat_id = ?').get(chatId) as { step: string; name: string | null } | undefined);
  if (signup && !command!.startsWith('/')) {
    const text = msg.text.trim();
    if (signup.step === 'name') {
      if (!text || text.length > 40) return [{ chatId, text: 'Имя должно быть от 1 до 40 символов. Попробуй ещё раз.' }];
      db.prepare("UPDATE signups SET step = 'login', name = ? WHERE chat_id = ?").run(text, chatId);
      return [{ chatId, text: `Отлично, ${esc(text)}. Теперь придумай логин для входа: 3–32 символа, латиница, цифры, точка, дефис или подчёркивание.` }];
    }
    if (signup.step === 'login') {
      if (!LOGIN_RE.test(text)) return [{ chatId, text: 'Логин: 3–32 символа, только латиница, цифры, точка, дефис, подчёркивание. Ещё раз?' }];
      if (db.prepare('SELECT 1 FROM users WHERE login = ?').get(text)) return [{ chatId, text: 'Такой логин уже занят. Придумай другой.' }];
      if (getSetting(db, 'drawn_at')) return [{ chatId, text: 'Пока ты регистрировался, жеребьёвка уже прошла. Напиши организатору.' }];
      const user = tx(db, () => {
        const { lastInsertRowid } = db
          .prepare('INSERT INTO users (login, name, tg_chat_id, created_at, activated_at) VALUES (?, ?, ?, ?, ?)')
          .run(text, signup.name!, chatId, Date.now(), Date.now());
        db.prepare('DELETE FROM signups WHERE chat_id = ?').run(chatId);
        return findUser(db, Number(lastInsertRowid))!;
      });
      const reply = issuePassword(db, user, siteUrl);
      return reply ? [reply] : [];
    }
  }

  if (command === '/start' && arg) {
    const invited = db.prepare('SELECT * FROM users WHERE invite_hash = ?').get(sha256(arg)) as User | undefined;
    if (!invited || (invited.invite_expires ?? 0) < Date.now())
      return [{ chatId, text: 'Ссылка устарела или уже использована. Попроси у организатора новую.' }];
    if (bound && bound.id !== invited.id)
      return [{ chatId, text: `Этот Telegram уже привязан к участнику «${esc(bound.name)}». Одна ссылка — один человек.` }];
    // An account already tied to someone's Telegram never moves by link: otherwise whoever holds a
    // fresh link (the organiser) could take it over and read that person's pair.
    if (invited.tg_chat_id !== null && invited.tg_chat_id !== chatId)
      return [{ chatId, text: 'Этот участник уже подключил свой Telegram. Если он сменил аккаунт, организатор переносит его через сервер.' }];
    db.prepare('UPDATE users SET tg_chat_id = ?, invite_hash = NULL, invite_expires = NULL, activated_at = COALESCE(activated_at, ?) WHERE id = ?').run(
      chatId,
      Date.now(),
      invited.id,
    );
    const reply = issuePassword(db, { ...invited, tg_chat_id: chatId }, siteUrl);
    return reply ? [reply] : [];
  }
  if (command === '/password' && bound) {
    const reply = issuePassword(db, bound, siteUrl);
    return reply ? [reply] : [];
  }
  return [{ chatId, text: bound ? HELP_KNOWN : HELP_UNKNOWN }];
}

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/**
 * A photo (or an image sent as a file) from a known participant becomes their avatar.
 * Picks the smallest Telegram size that is still at least 320 px wide.
 */
export function avatarRequest(db: Db, update: Update): { userId: number; chatId: number; fileId: string } | null {
  const msg = update.message;
  if (!msg || msg.chat.type !== 'private') return null;
  const user = db.prepare('SELECT * FROM users WHERE tg_chat_id = ?').get(msg.chat.id) as User | undefined;
  if (!user) return null;
  if (msg.photo?.length) {
    const sizes = [...msg.photo].sort((a, b) => a.width - b.width);
    const pick = sizes.find((s) => s.width >= 320) ?? sizes.at(-1)!;
    return { userId: user.id, chatId: msg.chat.id, fileId: pick.file_id };
  }
  if (msg.document?.mime_type === 'image/jpeg' && (msg.document.file_size ?? 0) <= MAX_AVATAR_BYTES)
    return { userId: user.id, chatId: msg.chat.id, fileId: msg.document.file_id };
  return null;
}

/** Minimal Bot API client with long polling (no public webhook needed). */
export class Bot {
  username = '';
  private offset = 0;
  private stopped = false;
  private token: string;
  constructor(token: string) {
    this.token = token;
  }

  private async call<T>(method: string, body: object, signal?: AbortSignal): Promise<T> {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    const data = (await res.json()) as { ok: boolean; result: T; description?: string };
    if (!data.ok) throw new Error(`Telegram ${method}: ${data.description ?? res.status}`);
    return data.result;
  }

  async init(): Promise<void> {
    this.username = (await this.call<{ username: string }>('getMe', {})).username;
    await this.call('deleteWebhook', {});
  }

  send(m: Outgoing): Promise<unknown> {
    return this.call('sendMessage', { chat_id: m.chatId, text: m.text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
  }

  /** Downloads a file the user sent, refusing anything over the size limit. */
  async download(fileId: string): Promise<Buffer> {
    const file = await this.call<{ file_path?: string; file_size?: number }>('getFile', { file_id: fileId });
    if (!file.file_path || (file.file_size ?? 0) > MAX_AVATAR_BYTES) throw new Error('file too large or unavailable');
    const res = await fetch(`https://api.telegram.org/file/bot${this.token}/${file.file_path}`);
    if (!res.ok) throw new Error(`download ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_AVATAR_BYTES) throw new Error('file too large');
    return buf;
  }

  async poll(onUpdate: (u: Update) => Outgoing[] | Promise<Outgoing[]>): Promise<void> {
    while (!this.stopped) {
      try {
        const updates = await this.call<Update[]>('getUpdates', { offset: this.offset, timeout: 30, allowed_updates: ['message'] });
        for (const u of updates) {
          this.offset = u.update_id + 1;
          for (const m of await onUpdate(u)) await this.send(m).catch((e) => console.error('[bot] send failed', e.message));
        }
      } catch (e) {
        console.error('[bot] poll failed', (e as Error).message);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  stop() {
    this.stopped = true;
  }
}
