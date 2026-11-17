import { generatePassword, hashPassword, sha256 } from './auth.ts';
import { tx, type Db, type User } from './db.ts';

export interface Outgoing {
  chatId: number;
  text: string;
}

interface Update {
  update_id: number;
  message?: { chat: { id: number; type: string }; text?: string };
}

const HELP_UNKNOWN = 'Привет! Это бот Тайного Санты. Чтобы участвовать, попроси у организатора личную ссылку-приглашение и открой её.';
const HELP_KNOWN = 'Ты уже в игре. Если забыл пароль, отправь /password — пришлю новый.';

function credentials(user: User, password: string, siteUrl: string): string {
  return [
    `${user.name}, ты в игре.`,
    '',
    `Сайт: ${siteUrl}`,
    `Логин: ${user.login}`,
    `Пароль: ${password}`,
    '',
    'Пароль знаешь только ты: организатор его не видит. Забудешь — отправь /password.',
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
  const chatId = msg.chat.id;
  const [command, arg] = msg.text.trim().split(/\s+/, 2);
  const bound = db.prepare('SELECT * FROM users WHERE tg_chat_id = ?').get(chatId) as User | undefined;

  if (command === '/start' && arg) {
    const invited = db.prepare('SELECT * FROM users WHERE invite_hash = ?').get(sha256(arg)) as User | undefined;
    if (!invited || (invited.invite_expires ?? 0) < Date.now())
      return [{ chatId, text: 'Ссылка устарела или уже использована. Попроси у организатора новую.' }];
    if (bound && bound.id !== invited.id)
      return [{ chatId, text: `Этот Telegram уже привязан к участнику «${bound.name}». Одна ссылка — один человек.` }];
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

  /** protect_content: the message cannot be forwarded or saved from the chat. */
  send(m: Outgoing): Promise<unknown> {
    return this.call('sendMessage', { chat_id: m.chatId, text: m.text, protect_content: true, link_preview_options: { is_disabled: true } });
  }

  async poll(onUpdate: (u: Update) => Outgoing[]): Promise<void> {
    while (!this.stopped) {
      try {
        const updates = await this.call<Update[]>('getUpdates', { offset: this.offset, timeout: 30, allowed_updates: ['message'] });
        for (const u of updates) {
          this.offset = u.update_id + 1;
          for (const m of onUpdate(u)) await this.send(m).catch((e) => console.error('[bot] send failed', e.message));
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
