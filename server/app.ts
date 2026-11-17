import { Hono, type Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { streamSSE } from 'hono/streaming';
import { createInvite, createSession, deleteSession, hashPassword, RateLimiter, userBySession, verifyPassword } from './auth.ts';
import { randomBytes } from 'node:crypto';
import type { Avatars } from './avatars.ts';
import { findUser, getSetting, setSetting, type Db, type User } from './db.ts';
import { resetDraw, runDraw } from './draw.ts';
import { issuePassword, LOGIN_RE, type Outgoing } from './telegram.ts';

const COOKIE = 'ss_session';
const DUMMY_HASH = hashPassword('not-a-real-password');
const MAX_STREAMS_PER_USER = 3;

/** Who is in the lobby right now (open event streams), plus listeners to push changes to. */
export class Hub {
  private counts = new Map<number, number>();
  private listeners = new Set<(event: string, data?: string) => void>();
  online(): number[] {
    return [...this.counts.keys()];
  }
  streams(id: number): number {
    return this.counts.get(id) ?? 0;
  }
  join(id: number) {
    this.counts.set(id, (this.counts.get(id) ?? 0) + 1);
    this.emit('presence');
  }
  leave(id: number) {
    const n = (this.counts.get(id) ?? 1) - 1;
    if (n > 0) this.counts.set(id, n);
    else this.counts.delete(id);
    this.emit('presence');
  }
  subscribe(fn: (event: string, data?: string) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  /** data: a ready JSON payload (chat); without it listeners send a fresh lobby snapshot. */
  emit(event: string, data?: string) {
    for (const fn of this.listeners) fn(event, data);
  }
}

export interface AppDeps {
  db: Db;
  hub: Hub;
  siteUrl: string;
  botUsername: () => string;
  send: (m: Outgoing) => Promise<unknown>;
  avatars: Avatars;
}

type Env = { Variables: { user: User } };

const publicUser = (u: User) => ({ id: u.id, name: u.name, login: u.login, isAdmin: Boolean(u.is_admin), avatar: u.avatar_at });

export function createApp({ db, hub, siteUrl, botUsername, send, avatars }: AppDeps) {
  const app = new Hono<Env>();
  const limiter = new RateLimiter(10, 15 * 60_000);
  const ipLimiter = new RateLimiter(40, 15 * 60_000);
  const secure = siteUrl.startsWith('https://');
  const inviteLink = (code: string) => `https://t.me/${botUsername() || 'your_bot'}?start=${code}`;

  // Mutations only from our own pages: the browser always sends Origin on POST/PUT/DELETE.
  app.use('/api/*', async (c, next) => {
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      const origin = c.req.header('origin');
      if (!origin || new URL(origin).host !== new URL(c.req.url).host) return c.json({ error: 'Запрос с чужого сайта' }, 403);
    }
    await next();
  });

  app.post('/api/login', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { login?: string; password?: string };
    const login = String(body.login ?? '').trim();
    // Caddy overwrites X-Forwarded-For with the real client address; the app port is not public.
    const ip = c.req.header('x-forwarded-for') ?? 'local';
    const key = `${ip}|${login.toLowerCase()}`;
    if (!ipLimiter.allow(ip) || !limiter.allow(key)) return c.json({ error: 'Слишком много попыток. Подожди 15 минут.' }, 429);
    const user = db.prepare('SELECT * FROM users WHERE login = ?').get(login) as User | undefined;
    // Same scrypt cost whether or not the login exists, so timing does not reveal logins.
    const ok = verifyPassword(String(body.password ?? ''), user?.password_hash ?? DUMMY_HASH);
    if (!user || !user.password_hash || !ok) return c.json({ error: 'Неверный логин или пароль' }, 401);
    limiter.reset(key);
    const { token, maxAge } = createSession(db, user.id);
    setCookie(c, COOKIE, token, { httpOnly: true, secure, sameSite: 'Lax', path: '/', maxAge });
    return c.json(publicUser(user));
  });

  app.post('/api/logout', (c) => {
    deleteSession(db, getCookie(c, COOKIE));
    deleteCookie(c, COOKIE, { path: '/' });
    return c.json({ ok: true });
  });

  // Everything below needs a session.
  app.use('/api/*', async (c, next) => {
    const user = userBySession(db, getCookie(c, COOKIE));
    if (!user) return c.json({ error: 'Нужно войти' }, 401);
    c.set('user', user);
    await next();
  });

  app.get('/api/me', (c) => c.json(publicUser(c.get('user'))));

  // Avatars are for players only (behind the session check), cached until they change (?v=).
  app.get('/api/avatars/:id', (c) => {
    const data = avatars.read(Number(c.req.param('id')));
    if (!data) return c.notFound();
    return c.body(new Uint8Array(data), 200, { 'content-type': 'image/jpeg', 'cache-control': 'private, max-age=604800, immutable' });
  });

  const lobby = () => {
    const online = new Set(hub.online());
    // Seats follow the order people joined, so nobody jumps chairs between visits.
    const users = db.prepare('SELECT id, name, avatar_at, password_hash IS NOT NULL AS activated FROM users ORDER BY id').all() as {
      id: number;
      name: string;
      avatar_at: number | null;
      activated: number;
    }[];
    return {
      title: getSetting(db, 'title') ?? 'Тайный Санта',
      drawAt: getSetting(db, 'draw_at'),
      drawnAt: getSetting(db, 'drawn_at'),
      drawError: getSetting(db, 'draw_error'),
      participants: users.map((u) => ({ id: u.id, name: u.name, avatar: u.avatar_at, activated: Boolean(u.activated), online: online.has(u.id) })),
    };
  };

  // One snapshot per change, shared by every open stream.
  let cached: string | null = null;
  hub.subscribe((_event, data) => {
    if (data === undefined) cached = null;
  });
  const snapshot = () => (cached ??= JSON.stringify(lobby()));

  app.get('/api/lobby', (c) => c.json({ me: publicUser(c.get('user')), ...lobby() }));

  // Live lobby: joining marks you online; every change pushes a fresh snapshot.
  app.get('/api/lobby/stream', (c) => {
    const me = c.get('user');
    if (hub.streams(me.id) >= MAX_STREAMS_PER_USER) return c.json({ error: 'Лобби уже открыто в нескольких вкладках' }, 429);
    return streamSSE(c, async (stream) => {
      const push = (event: string, data: string) => stream.writeSSE({ event, data });
      const off = hub.subscribe((event, data) => void push(event, data ?? snapshot()));
      hub.join(me.id);
      const beat = setInterval(() => void stream.writeSSE({ event: 'ping', data: '' }), 25_000);
      await push('presence', JSON.stringify(lobby()));
      await new Promise<void>((resolve) => stream.onAbort(resolve));
      clearInterval(beat);
      off();
      hub.leave(me.id);
    });
  });

  /** Your own pair only; the wheel gets everyone else who took part. */
  // ── Table talk ──────────────────────────────────────────────────────────
  const MESSAGE = `SELECT m.id, m.user_id AS userId, u.name, u.avatar_at AS avatar, m.text, m.created_at AS at
    FROM messages m JOIN users u ON u.id = m.user_id`;
  const chatLimiter = new RateLimiter(20, 60_000);

  app.get('/api/chat', (c) => c.json((db.prepare(`${MESSAGE} ORDER BY m.id DESC LIMIT 100`).all() as object[]).reverse()));

  app.post('/api/chat', async (c) => {
    const me = c.get('user');
    const text = String(((await c.req.json().catch(() => ({}))) as { text?: string }).text ?? '').trim();
    if (!text || text.length > 500) throw new HttpError(400, 'Сообщение: от 1 до 500 символов');
    if (!chatLimiter.allow(String(me.id))) return c.json({ error: 'Не так быстро: подожди минутку' }, 429);
    const { lastInsertRowid } = db.prepare('INSERT INTO messages (user_id, text, created_at) VALUES (?, ?, ?)').run(me.id, text, Date.now());
    const msg = db.prepare(`${MESSAGE} WHERE m.id = ?`).get(Number(lastInsertRowid));
    hub.emit('chat', JSON.stringify(msg));
    return c.json(msg, 201);
  });

  app.get('/api/assignment', (c) => {
    const me = c.get('user');
    const row = db.prepare('SELECT u.id, u.name, u.avatar_at AS avatar FROM assignments a JOIN users u ON u.id = a.receiver_id WHERE a.giver_id = ?').get(me.id) as
      | { id: number; name: string; avatar: number | null }
      | undefined;
    if (!row) return c.json({ error: 'Жеребьёвки для тебя ещё не было' }, 404);
    const wheel = db
      .prepare('SELECT u.id, u.name, u.avatar_at AS avatar FROM assignments a JOIN users u ON u.id = a.giver_id WHERE a.giver_id != ? ORDER BY a.giver_id')
      .all(me.id) as { id: number; name: string; avatar: number | null }[];
    return c.json({ receiver: row, wheel });
  });

  // ── Admin ────────────────────────────────────────────────────────────────
  const admin = new Hono<Env>();
  admin.use('*', async (c, next) => {
    if (!c.get('user').is_admin) return c.json({ error: 'Только для организатора' }, 403);
    await next();
  });

  const target = (c: Context<Env>) => {
    const u = findUser(db, Number(c.req.param('id')));
    if (!u) throw new HttpError(404, 'Участник не найден');
    return u;
  };

  // Never exposes passwords or pairs: the organiser plays too.
  admin.get('/users', (c) => {
    const online = new Set(hub.online());
    const users = db.prepare('SELECT * FROM users ORDER BY created_at').all() as unknown as User[];
    return c.json(
      users.map((u) => ({
        ...publicUser(u),
        activated: u.password_hash !== null,
        telegram: u.tg_chat_id !== null,
        invitePending: u.invite_hash !== null && (u.invite_expires ?? 0) > Date.now(),
        online: online.has(u.id),
      })),
    );
  });

  admin.post('/users', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { name?: string; login?: string };
    const name = String(body.name ?? '').trim();
    const login = String(body.login ?? '').trim();
    if (!name || name.length > 40) throw new HttpError(400, 'Имя: от 1 до 40 символов');
    if (!LOGIN_RE.test(login)) throw new HttpError(400, 'Логин: 3–32 символа, латиница, цифры, точка, дефис, подчёркивание');
    if (db.prepare('SELECT 1 FROM users WHERE login = ?').get(login)) throw new HttpError(409, 'Такой логин уже есть');
    const { lastInsertRowid } = db.prepare('INSERT INTO users (login, name, created_at) VALUES (?, ?, ?)').run(login, name, Date.now());
    const code = createInvite(db, Number(lastInsertRowid));
    hub.emit('presence');
    return c.json({ id: Number(lastInsertRowid), inviteLink: inviteLink(code) }, 201);
  });

  admin.post('/users/:id/invite', (c) => {
    const u = target(c);
    if (u.tg_chat_id !== null) throw new HttpError(409, 'Участник уже подключил Telegram: новая ссылка не нужна');
    return c.json({ inviteLink: inviteLink(createInvite(db, u.id)) });
  });

  admin.post('/users/:id/password', async (c) => {
    const u = target(c);
    const msg = issuePassword(db, u, siteUrl);
    if (!msg) throw new HttpError(409, 'Участник ещё не открыл ссылку в Telegram');
    await send(msg);
    return c.json({ ok: true });
  });

  admin.delete('/chat/:id', (c) => {
    const id = Number(c.req.param('id'));
    db.prepare('DELETE FROM messages WHERE id = ?').run(id);
    hub.emit('chat-delete', JSON.stringify({ id }));
    return c.json({ ok: true });
  });

  admin.delete('/users/:id', (c) => {
    const u = target(c);
    if (u.id === c.get('user').id) throw new HttpError(400, 'Себя удалить нельзя');
    if (getSetting(db, 'drawn_at')) throw new HttpError(409, 'Жеребьёвка уже прошла: сначала сбрось её');
    db.prepare('DELETE FROM users WHERE id = ?').run(u.id);
    avatars.remove(u.id);
    hub.emit('presence');
    return c.json({ ok: true });
  });

  // One shared link for the friends' chat: whoever opens it signs up through the bot.
  const joinLink = (rotate: boolean) => {
    let code = getSetting(db, 'join_code');
    if (!code || rotate) {
      code = randomBytes(12).toString('base64url');
      setSetting(db, 'join_code', code);
    }
    return { link: `https://t.me/${botUsername() || 'your_bot'}?start=join_${code}` };
  };
  admin.get('/join', (c) => c.json(joinLink(false)));
  admin.post('/join', (c) => c.json(joinLink(true)));

  admin.put('/event', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { title?: string; drawAt?: string | null };
    const title = String(body.title ?? '').trim();
    if (!title || title.length > 60) throw new HttpError(400, 'Название: от 1 до 60 символов');
    const drawAt = body.drawAt ? new Date(body.drawAt) : null;
    if (drawAt && Number.isNaN(drawAt.getTime())) throw new HttpError(400, 'Неверная дата');
    setSetting(db, 'title', title);
    setSetting(db, 'draw_at', drawAt?.toISOString() ?? null);
    setSetting(db, 'draw_error', null);
    hub.emit('presence');
    return c.json({ ok: true });
  });

  admin.post('/draw', (c) => {
    const r = runDraw(db);
    if (!r.ok) throw new HttpError(409, r.reason);
    hub.emit('draw');
    return c.json(r);
  });

  admin.delete('/draw', (c) => {
    resetDraw(db);
    hub.emit('presence');
    return c.json({ ok: true });
  });

  app.route('/api/admin', admin);

  app.onError((err, c) => {
    if (err instanceof HttpError) return c.json({ error: err.message }, err.status);
    console.error(err);
    return c.json({ error: 'Что-то сломалось на сервере' }, 500);
  });

  return app;
}

export class HttpError extends Error {
  readonly status: 400 | 401 | 403 | 404 | 409;
  constructor(status: HttpError['status'], message: string) {
    super(message);
    this.status = status;
  }
}
