import type { ReactNode } from 'react';
import { Countdown } from './Countdown';

/** Granny's TV: the greeting on screen and the countdown ticking like the Kremlin clock. */
export function Tv({ title, drawAt, drawn, children }: { title: string; drawAt: string | null; drawn: boolean; children?: ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[560px] rounded-[26px] bg-[linear-gradient(#6b4423,#4a2c15)] px-4 pb-6 pt-4 shadow-[0_30px_60px_-20px_#000,inset_0_2px_0_#9a6a3a]">
      <div className="tv-screen relative overflow-hidden rounded-[40px/30px] px-3 pb-4 pt-5 text-center text-[#d9f0ff]">
        <p className="label !text-[#cfe6f5]/80">{drawn ? 'Жеребьёвка прошла' : drawAt ? 'До жеребьёвки' : 'Скоро'}</p>
        <h1 className="tv-glow mt-1 font-display text-[clamp(1.9rem,6.5vw,3rem)] leading-[1.1] text-[#ffe9b3]">{title}</h1>
        <div className="mt-2">
          {children ??
            (drawAt ? (
              <Countdown to={drawAt} />
            ) : (
              <p className="mx-auto max-w-[36ch] font-serif text-[15px] italic text-[#cfe6f5]">Организатор ещё не назначил время. Как назначит — здесь пойдут куранты.</p>
            ))}
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between px-2" aria-hidden>
        <span className="font-serif text-[11px] uppercase tracking-[0.3em] text-[#d9b98a]/70">Рубин</span>
        <span className="flex gap-2.5">
          <i className="block size-4 rounded-full bg-[radial-gradient(#d9b98a,#7a5530)]" />
          <i className="block size-4 rounded-full bg-[radial-gradient(#d9b98a,#7a5530)]" />
        </span>
      </div>
      <span className="absolute -bottom-3.5 left-[22%] right-[22%] h-3.5 rounded-b-[10px] bg-[#2a170b]" aria-hidden />
    </div>
  );
}
