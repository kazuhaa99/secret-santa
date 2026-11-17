/** Runtime settings from the environment. */
export const config = {
  port: Number(process.env.PORT ?? 8787),
  dbFile: process.env.DB_FILE ?? './data/santa.db',
  /** Public address of the site, used in messages from the bot. */
  siteUrl: (process.env.SITE_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  /** Telegram bot token from @BotFather; without it the site runs and invite links point nowhere. */
  botToken: process.env.BOT_TOKEN ?? '',
  defaultTitle: 'Сигаретка · Тайный Санта',
};
