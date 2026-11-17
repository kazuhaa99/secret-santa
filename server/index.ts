import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createApp, Hub } from './app.ts';
import { Avatars } from './avatars.ts';
import { config } from './config.ts';
import { getSetting, openDb, setSetting, type User } from './db.ts';
import { drawIsDue, runDraw } from './draw.ts';
import { avatarRequest, Bot, handleUpdate } from './telegram.ts';

const db = openDb(config.dbFile);
if (!getSetting(db, 'title')) setSetting(db, 'title', config.defaultTitle);

const hub = new Hub();
const avatars = new Avatars(join(dirname(config.dbFile), 'avatars'));
const bot = config.botToken ? new Bot(config.botToken) : null;

const api = createApp({
  db,
  hub,
  siteUrl: config.siteUrl,
  botUsername: () => bot?.username ?? '',
  send: (m) => (bot ? bot.send(m) : Promise.reject(new Error('BOT_TOKEN is not set'))),
  avatars,
});

const app = new Hono();
app.route('/', api);
// The built single-page app; every non-API path falls back to it.
if (existsSync('./web/dist/index.html')) {
  app.use('*', serveStatic({ root: './web/dist' }));
  app.get('/assets/*', (c) => c.notFound());
  // Read per request so a rebuilt bundle is picked up without a restart.
  app.get('*', (c) => c.html(readFileSync('./web/dist/index.html', 'utf8')));
}

/** The draw starts on its own at the scheduled time; everyone gets a nudge in Telegram (without the result). */
setInterval(() => {
  if (!drawIsDue(db)) return;
  const r = runDraw(db);
  if (!r.ok) {
    // Do not retry every second: the organiser has to fix it and set a new time.
    setSetting(db, 'draw_error', r.reason);
    setSetting(db, 'draw_at', null);
    hub.emit('presence');
    return;
  }
  hub.emit('draw');
  if (!bot) return;
  const users = db.prepare('SELECT * FROM users WHERE tg_chat_id IS NOT NULL AND id IN (SELECT giver_id FROM assignments)').all() as unknown as User[];
  for (const u of users)
    void bot
      .send({ chatId: u.tg_chat_id!, text: `Жеребьёвка прошла. Узнать, кому ты даришь подарок: ${config.siteUrl}` })
      .catch((e) => console.error('[bot] notify failed', e.message));
}, 1000);

if (bot) {
  bot
    .init()
    .then(() => {
      console.log(`[bot] @${bot.username} is polling`);
      return bot.poll(async (u) => {
        const photo = avatarRequest(db, u);
        if (!photo) return handleUpdate(db, u, config.siteUrl);
        try {
          const saved = avatars.save(db, photo.userId, await bot.download(photo.fileId));
          if (saved) hub.emit('presence');
          return [{ chatId: photo.chatId, text: saved ? 'Готово, аватарка обновлена. Посмотри на сайте.' : 'Не получилось: пришли обычное фото (не файлом).' }];
        } catch (e) {
          console.error('[bot] avatar failed', (e as Error).message);
          return [{ chatId: photo.chatId, text: 'Фото слишком большое или не загрузилось. Попробуй другое.' }];
        }
      });
    })
    .catch((e) => console.error('[bot] failed to start', e.message));
} else console.warn('[bot] BOT_TOKEN is not set: passwords cannot be delivered');

serve({ fetch: app.fetch, port: config.port }, ({ port }) => console.log(`[web] http://localhost:${port}`));
