import { clsx, type ClassValue } from 'clsx';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export const cn = (...v: ClassValue[]) => twMerge(clsx(v));

type Tone = 'gold' | 'ghost' | 'danger';

const TONES: Record<Tone, string> = {
  gold: 'bg-[linear-gradient(180deg,#e6c77f,#c9a456)] text-night font-semibold shadow-[inset_0_1px_0_#fff6,0_8px_20px_-10px_#d8b56b] hover:brightness-105',
  ghost: 'border border-line bg-night-2/60 text-snow hover:border-frost/60 hover:bg-night-3',
  danger: 'border border-line text-danger hover:border-danger/60 hover:bg-danger/10',
};

export function Button({ tone = 'gold', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] tracking-[0.01em] transition-[background-color,border-color,transform,filter] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        TONES[tone],
        className,
      )}
    />
  );
}

export function Field({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-frost">{label}</span>
      <input
        {...props}
        className={cn(
          'min-h-12 w-full rounded-xl border border-line bg-night-2/80 px-3.5 text-base text-snow outline-none transition-colors focus:border-gold',
          props.className,
        )}
      />
      {hint && <span className="mt-1.5 block text-xs text-frost">{hint}</span>}
    </label>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error'; children: ReactNode }) {
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={cn('rounded-lg px-3.5 py-2.5 text-sm', tone === 'error' ? 'bg-danger/10 text-danger' : 'bg-night-3 text-frost')}>
      {children}
    </p>
  );
}
