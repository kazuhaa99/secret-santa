/**
 * Server-side setup for the organiser account (the only one not created from the admin page):
 *   npm run admin -- create <login> "<Имя>"   → new organiser + Telegram invite link
 *   npm run admin -- invite <login>           → fresh invite link; also moves an account to a new Telegram
 *                                               (only from the server, never from the admin page)
 */
import { createInvite } from './auth.ts';
import { config } from './config.ts';
import { openDb, type User } from './db.ts';
import { Bot } from './telegram.ts';

const [cmd, login, name] = process.argv.slice(2);
const db = openDb(config.dbFile);

async function link(code: string): Promise<string> {
  if (!config.botToken) return `(BOT_TOKEN не задан) код приглашения: ${code}`;
  const bot = new Bot(config.botToken);
  await bot.init();
  return `https://t.me/${bot.username}?start=${code}`;
}

if (cmd === 'create' && login && name) {
  const { lastInsertRowid } = db.prepare('INSERT INTO users (login, name, is_admin, created_at) VALUES (?, ?, 1, ?)').run(login, name, Date.now());
  console.log(`Организатор «${name}» создан. Открой ссылку в Telegram, бот пришлёт пароль:\n${await link(createInvite(db, Number(lastInsertRowid)))}`);
} else if (cmd === 'invite' && login) {
  const user = db.prepare('SELECT * FROM users WHERE login = ?').get(login) as User | undefined;
  if (!user) {
    console.error(`Нет пользователя ${login}`);
    process.exit(1);
  }
  db.prepare('UPDATE users SET tg_chat_id = NULL WHERE id = ?').run(user.id);
  console.log(await link(createInvite(db, user.id)));
} else {
  console.log('npm run admin -- create <login> "<Имя>"\nnpm run admin -- invite <login>');
  process.exit(1);
}
