# Сигаретка · Тайный Санта

Маленький сайт для жеребьёвки Тайного Санты среди друзей.

- Организатор кидает в чат общую ссылку на Telegram-бота (её можно сменить в админке). Бот спрашивает имя и логин и присылает случайный пароль. Пароль знает только участник: в базе хранится scrypt-хэш, организатор его не видит.
- Фото, присланное боту, становится аватаркой. Участника можно добавить и вручную, тогда бот выдаст личную одноразовую ссылку.
- Лобби — новогодний стол, вид сверху: у каждого свой стул, кто онлайн, тот сидит подсвеченный. Пока ждём, идёт обратный отсчёт. В назначенное время сервер сам проводит жеребьёвку (один общий цикл, никто не дарит себе).
- Прямо на столе крутится колесо с аватарками и останавливается на получателе. Пары видит только сам даритель, даже админ их не видит. Регистрация после жеребьёвки закрыта.

## Стек

Node 22 (TypeScript без сборки), Hono, встроенный `node:sqlite`, React + Vite + Tailwind v4, motion, canvas-confetti. Шрифты: Unbounded, Caveat, Onest.
Компоненты Sliding Number и Text Scramble — [motion-primitives](https://github.com/ibelick/motion-primitives) (MIT), они же на 21st.dev.

## Локально

```bash
npm install
npm run build && BOT_TOKEN=<токен> SITE_URL=http://localhost:8787 npm start
npm run admin -- create <login> "<Имя>"   # организатор: ссылка-приглашение в Telegram
npm test
```

Для разработки: `npm run dev` (API на 8787, Vite на 5173 с прокси `/api`).

## Сервер

```bash
curl -fsSL https://raw.githubusercontent.com/kazuhaa99/secret-santa/main/deploy.sh | BOT_TOKEN=<токен> bash
cd ~/secret-santa && sudo docker compose exec app node server/cli.ts create <login> "<Имя>"
```

Скрипт ставит Docker, открывает 80/443, берёт домен `<ip>.sslip.io` (или `DOMAIN=...`) и поднимает приложение за Caddy с HTTPS.
Обновление: `bash ~/secret-santa/deploy.sh`.

Перепривязать участника к новому Telegram можно только с сервера: `node server/cli.ts invite <login>`. Из админки это закрыто, иначе организатор мог бы забрать чужой аккаунт.
