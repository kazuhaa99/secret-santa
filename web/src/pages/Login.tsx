import { useState, type FormEvent } from 'react';
import { api, ApiError, type Me } from '../api';
import { Scene } from '../components/Festive';
import { Mark } from '../components/Mark';
import { Button, Field, Notice } from '../components/ui';

export function Login({ onLogin }: { onLogin: (me: Me) => void }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onLogin(await api<Me>('/api/login', { method: 'POST', body: { login, password } }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Нет связи с сервером');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Scene>
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 pb-12 pt-20">
        <div className="rise text-center">
          <Mark className="mx-auto h-14 w-auto" />
          <p className="label mt-6">Новый год у бабушки</p>
        </div>
        <h1 className="rise mt-3 text-center font-display text-[clamp(3.2rem,16vw,4.5rem)] leading-[1] text-cream [text-shadow:0_4px_16px_#0008]" style={{ ['--d' as string]: 1 }}>
          Сигаретка
        </h1>
        <p className="rise mt-2 text-center font-hand text-[30px] text-gold" style={{ ['--d' as string]: 2 }}>
          и её Тайный Санта
        </p>
        

        <form onSubmit={submit} className="rise mt-8 space-y-4 rounded-[20px] border-[6px] border-[#e9d4a8] bg-cream p-5 text-ink shadow-[0_30px_60px_-20px_#000] [&_input]:border-[#d9b98a] [&_input]:bg-white [&_input]:text-ink [&_label>span]:text-[#8a6a4a]" style={{ ['--d' as string]: 3 }}>
          <Field label="Логин" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={login} onChange={(e) => setLogin(e.target.value)} />
          <Field
            label="Пароль"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="Его прислал бот в Telegram. Забыл — отправь боту /password."
          />
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Проверяем…' : 'За стол!'}
          </Button>
        </form>
      </main>
    </Scene>
  );
}
