import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp, Hub } from './app.ts';
import { Avatars } from './avatars.ts';
import { createInvite, hashPassword, verifyPassword } from './auth.ts';
import { openDb, type Db, type User } from './db.ts';
import { drawIsDue, runDraw, singleCycle } from './draw.ts';
import { avatarRequest, handleUpdate } from './telegram.ts';

const SITE = 'https://santa.test';

function setup() {
  const db = openDb(':memory:');
  const sent: { chatId: number; text: string }[] = [];
  const avatars = new Avatars(mkdtempSync(join(tmpdir(), 'santa-')));
  const app = createApp({ db, hub: new Hub(), siteUrl: SITE, botUsername: () => 'santa_bot', send: async (m) => sent.push(m), avatars });
  return { db, app, sent, avatars };
}

const tg = (chatId: number, text: string) => ({ update_id: 1, message: { chat: { id: chatId, type: 'private' }, text } });
const passwordFrom = (text: string) => /Пароль: <code>(\S+)<\/code>/.exec(text)![1]!;

function addUser(db: Db, login: string, admin = false): number {
  return Number(db.prepare('INSERT INTO users (login, name, is_admin, created_at) VALUES (?, ?, ?, ?)').run(login, login.toUpperCase(), admin ? 1 : 0, Date.now()).lastInsertRowid);
}

/** Activates a user through the bot, as a real invite would. */
function activate(db: Db, id: number, chatId: number): string {
  const [reply] = handleUpdate(db, tg(chatId, `/start ${createInvite(db, id)}`), SITE);
  return passwordFrom(reply!.text);
}

async function login(app: ReturnType<typeof createApp>, loginName: string, password: string) {
  const res = await app.request('/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost' },
    body: JSON.stringify({ login: loginName, password }),
  });
  return { res, cookie: res.headers.get('set-cookie')?.split(';')[0] ?? '' };
}

describe('draw', () => {
  it('builds one cycle: nobody gives to themselves, everyone gives and receives once', () => {
    for (let n = 2; n < 30; n++) {
      const ids = Array.from({ length: n }, (_, i) => i);
      const pairs = singleCycle(ids);
      expect([...pairs].every(([g, r]) => g !== r)).toBe(true);
      expect(new Set(pairs.values()).size).toBe(n);
      let at = 0;
      for (let k = 0; k < n; k++) at = pairs.get(at)!;
      expect(at).toBe(0); // walking n steps returns to the start: a single cycle
    }
  });

  it('draws only activated users, once', () => {
    const { db } = setup();
    const a = addUser(db, 'anna');
    const b = addUser(db, 'boris');
    addUser(db, 'vera'); // never activated
    expect(runDraw(db)).toEqual({ ok: false, reason: 'Нужно хотя бы два активированных участника' });
    activate(db, a, 1);
    activate(db, b, 2);
    expect(runDraw(db)).toEqual({ ok: true, count: 2 });
    expect(runDraw(db).ok).toBe(false);
  });

  it('is due only after the scheduled time', () => {
    const { db } = setup();
    db.prepare("INSERT INTO settings VALUES ('draw_at', ?)").run(new Date(Date.now() + 60_000).toISOString());
    expect(drawIsDue(db)).toBe(false);
    expect(drawIsDue(db, Date.now() + 120_000)).toBe(true);
  });
});

describe('telegram onboarding', () => {
  it('sends a password that works, stores only its hash, and burns the invite', () => {
    const { db } = setup();
    const id = addUser(db, 'anna');
    const code = createInvite(db, id);
    const [reply] = handleUpdate(db, tg(42, `/start ${code}`), SITE);
    const password = passwordFrom(reply!.text);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as User;
    expect(user.tg_chat_id).toBe(42);
    expect(user.password_hash).not.toContain(password);
    expect(verifyPassword(password, user.password_hash)).toBe(true);
    expect(handleUpdate(db, tg(43, `/start ${code}`), SITE)[0]!.text).toMatch(/устарела/);
  });

  it('/password replaces the password for a known chat only', () => {
    const { db } = setup();
    const id = addUser(db, 'anna');
    const first = activate(db, id, 42);
    const [reply] = handleUpdate(db, tg(42, '/password'), SITE);
    const second = passwordFrom(reply!.text);
    expect(second).not.toBe(first);
    expect(handleUpdate(db, tg(99, '/password'), SITE)[0]!.text).toMatch(/ссылку-приглашение/);
  });

  it('never moves an activated account to another Telegram via a link', async () => {
    const { db, app } = setup();
    const admin = addUser(db, 'org', true);
    const { cookie } = await login(app, 'org', activate(db, admin, 1));
    const victim = addUser(db, 'vera');
    activate(db, victim, 2);
    const viaApi = await app.request(`/api/admin/users/${victim}/invite`, { method: 'POST', headers: { cookie, origin: 'http://localhost' } });
    expect(viaApi.status).toBe(409);
    // even with a fresh code in hand, another chat cannot claim the account
    const [reply] = handleUpdate(db, tg(666, `/start ${createInvite(db, victim)}`), SITE);
    expect(reply!.text).not.toMatch(/Пароль/);
    expect((db.prepare('SELECT tg_chat_id FROM users WHERE id = ?').get(victim) as { tg_chat_id: number }).tg_chat_id).toBe(2);
  });

  it('signs up from the shared chat link: name, login, then a password', () => {
    const { db } = setup();
    db.prepare("INSERT INTO settings VALUES ('join_code', 'abc')").run();
    expect(handleUpdate(db, tg(7, '/start join_wrong'), SITE)[0]!.text).toMatch(/устарела/);
    expect(handleUpdate(db, tg(7, '/start join_abc'), SITE)[0]!.text).toMatch(/имя/);
    expect(handleUpdate(db, tg(7, 'Лёша <b>'), SITE)[0]!.text).toMatch(/Лёша &lt;b&gt;.*логин/s);
    addUser(db, 'taken');
    expect(handleUpdate(db, tg(7, 'taken'), SITE)[0]!.text).toMatch(/занят/);
    expect(handleUpdate(db, tg(7, 'no spaces'), SITE)[0]!.text).toMatch(/латиница/);
    const password = passwordFrom(handleUpdate(db, tg(7, 'lesha'), SITE)[0]!.text);
    const user = db.prepare("SELECT * FROM users WHERE login = 'lesha'").get() as unknown as User;
    expect(user.name).toBe('Лёша <b>');
    expect(user.tg_chat_id).toBe(7);
    expect(verifyPassword(password, user.password_hash)).toBe(true);
    expect(handleUpdate(db, tg(7, '/start join_abc'), SITE)[0]!.text).toMatch(/уже в игре/);
  });

  it('closes sign-up after the draw', () => {
    const { db } = setup();
    db.prepare("INSERT INTO settings VALUES ('join_code', 'abc'), ('drawn_at', '2026-12-25')").run();
    expect(handleUpdate(db, tg(8, '/start join_abc'), SITE)[0]!.text).toMatch(/закрыта/);
  });

  it('takes avatars from known chats only, and only JPEG', async () => {
    const { db, app, avatars } = setup();
    const id = addUser(db, 'anna');
    const password = activate(db, id, 5);
    const photo = {
      update_id: 2,
      message: {
        chat: { id: 5, type: 'private' },
        photo: [
          { file_id: 'big', width: 1280, height: 1280 },
          { file_id: 'mid', width: 320, height: 320 },
          { file_id: 'tiny', width: 90, height: 90 },
        ],
      },
    };
    expect(avatarRequest(db, photo)).toEqual({ userId: id, chatId: 5, fileId: 'mid' });
    expect(avatarRequest(db, { ...photo, message: { ...photo.message, chat: { id: 99, type: 'private' } } })).toBeNull();
    expect(avatars.save(db, id, Buffer.from('<svg>'))).toBe(false);
    expect(avatars.save(db, id, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2]))).toBe(true);
    const { cookie } = await login(app, 'anna', password);
    const res = await app.request(`/api/avatars/${id}`, { headers: { cookie } });
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect((await app.request(`/api/avatars/${id}`)).status).toBe(401);
  });

  it('ignores group chats', () => {
    const { db } = setup();
    expect(handleUpdate(db, { update_id: 1, message: { chat: { id: -5, type: 'group' }, text: '/start x' } }, SITE)).toEqual([]);
  });
});

describe('api', () => {
  it('logs in, rejects wrong passwords and foreign origins', async () => {
    const { db, app } = setup();
    const password = activate(db, addUser(db, 'anna'), 1);
    expect((await login(app, 'anna', 'nope')).res.status).toBe(401);
    const ok = await login(app, 'anna', password);
    expect(ok.res.status).toBe(200);
    expect(ok.res.headers.get('set-cookie')).toMatch(/HttpOnly/i);
    const foreign = await app.request('/api/login', { method: 'POST', headers: { origin: 'https://evil.test' }, body: '{}' });
    expect(foreign.status).toBe(403);
  });

  it('shows each player only their own pair, and admins never see pairs or passwords', async () => {
    const { db, app } = setup();
    const ids = ['anna', 'boris', 'vera'].map((l, i) => addUser(db, l, i === 0));
    const passwords = ids.map((id, i) => activate(db, id, i + 1));
    runDraw(db);
    const { cookie } = await login(app, 'anna', passwords[0]!);
    const mine = (await (await app.request('/api/assignment', { headers: { cookie } })).json()) as { receiver: { id: number }; wheel: unknown[] };
    const expected = db.prepare('SELECT receiver_id FROM assignments WHERE giver_id = ?').get(ids[0]!) as { receiver_id: number };
    expect(mine.receiver.id).toBe(expected.receiver_id);
    expect(mine.wheel).toHaveLength(2);
    const users = JSON.stringify(await (await app.request('/api/admin/users', { headers: { cookie } })).json());
    expect(users).not.toMatch(/password|receiver|hash/i);
  });

  it('keeps the admin API for organisers', async () => {
    const { db, app } = setup();
    const password = activate(db, addUser(db, 'boris'), 1);
    const { cookie } = await login(app, 'boris', password);
    expect((await app.request('/api/admin/users', { headers: { cookie } })).status).toBe(403);
  });

  it('creates participants with a Telegram invite link', async () => {
    const { db, app } = setup();
    const { cookie } = await login(app, 'anna', activate(db, addUser(db, 'anna', true), 1));
    const res = await app.request('/api/admin/users', {
      method: 'POST',
      headers: { cookie, origin: 'http://localhost', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Боря', login: 'boris' }),
    });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { inviteLink: string }).inviteLink).toMatch(/^https:\/\/t\.me\/santa_bot\?start=[\w-]{32}$/);
  });
});

describe('chat', () => {
  it('posts, lists in order, validates and lets only organisers delete', async () => {
    const { db, app } = setup();
    const { cookie } = await login(app, 'anna', activate(db, addUser(db, 'anna'), 1));
    const post = (text: string) =>
      app.request('/api/chat', { method: 'POST', headers: { cookie, origin: 'http://localhost', 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
    expect((await post('  ')).status).toBe(400);
    expect((await post('x'.repeat(501))).status).toBe(400);
    const first = (await (await post('С наступающим!')).json()) as { id: number; name: string; text: string };
    expect(first).toMatchObject({ name: 'ANNA', text: 'С наступающим!' });
    await post('<b>второе</b>');
    const list = (await (await app.request('/api/chat', { headers: { cookie } })).json()) as { text: string }[];
    expect(list.map((m) => m.text)).toEqual(['С наступающим!', '<b>второе</b>']);
    expect((await app.request(`/api/admin/chat/${first.id}`, { method: 'DELETE', headers: { cookie, origin: 'http://localhost' } })).status).toBe(403);
    expect((await app.request('/api/chat')).status).toBe(401);
  });
});

describe('passwords', () => {
  it('hashes with a salt', () => {
    expect(hashPassword('x')).not.toBe(hashPassword('x'));
    expect(verifyPassword('x', hashPassword('x'))).toBe(true);
    expect(verifyPassword('y', hashPassword('x'))).toBe(false);
  });
});
