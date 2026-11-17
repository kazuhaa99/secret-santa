import { clsx, type ClassValue } from 'clsx';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export const cn = (...v: ClassValue[]) => twMerge(clsx(v));

type Tone = 'ember' | 'ghost' | 'danger';

const TONES: Record<Tone, string> = {
  ember: 'bg-ember text-ink hover:bg-[#ff7f47] font-semibold',
  ghost: 'border border-line text-paper hover:border-smoke hover:bg-ash-2',
  danger: 'border border-line text-danger hover:border-danger/60 hover:bg-danger/10',
};

export function Button({ tone = 'ember', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-[15px] transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        TONES[tone],
        className,
      )}
    />
  );
}

export function Field({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-smoke">{label}</span>
      <input
        {...props}
        className={cn(
          'min-h-12 w-full rounded-lg border border-line bg-ash px-3.5 text-base text-paper outline-none transition-colors focus:border-ember',
          props.className,
        )}
      />
      {hint && <span className="mt-1.5 block text-xs text-smoke">{hint}</span>}
    </label>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error'; children: ReactNode }) {
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={cn('rounded-lg px-3.5 py-2.5 text-sm', tone === 'error' ? 'bg-danger/10 text-danger' : 'bg-ash-2 text-smoke')}>
      {children}
    </p>
  );
}
