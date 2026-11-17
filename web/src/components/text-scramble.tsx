/**
 * Text Scramble by ibelick — motion-primitives (MIT), also on 21st.dev
 * (https://21st.dev/@ibelick/components/text-scramble). Adapted: Cyrillic character set, plain
 * element instead of motion.create, interval cleared on unmount, nothing scrambles under reduced motion.
 */
import { useEffect, useState } from 'react';

const CHARS = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯабвгдежзиклмнопрстуфхцчшэюя';

export function TextScramble({
  children,
  duration = 1.1,
  speed = 0.04,
  className,
  onScrambleComplete,
}: {
  children: string;
  duration?: number;
  speed?: number;
  className?: string;
  onScrambleComplete?: () => void;
}) {
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onScrambleComplete?.();
      return;
    }
    const text = children;
    const steps = duration / speed;
    let step = 0;
    const timer = setInterval(() => {
      const progress = step / steps;
      let out = '';
      for (let i = 0; i < text.length; i++)
        out += text[i] === ' ' || progress * text.length > i ? text[i] : CHARS[Math.floor(Math.random() * CHARS.length)];
      setShown(out);
      if (++step > steps) {
        clearInterval(timer);
        setShown(null);
        onScrambleComplete?.();
      }
    }, speed * 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  return (
    <span className={className} aria-label={children}>
      <span aria-hidden>{shown ?? children}</span>
    </span>
  );
}
