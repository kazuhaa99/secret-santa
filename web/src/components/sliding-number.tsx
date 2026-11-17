/**
 * Sliding Number by ibelick — motion-primitives (MIT), also published on 21st.dev
 * (https://21st.dev/@ibelick/components/sliding-number). Changes: types, formatting, line height 1.2 so tall display glyphs do not peek from the neighbouring digit.
 */
import { motion, motionValue, useSpring, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useId } from 'react';
import useMeasure from 'react-use-measure';

const TRANSITION = { type: 'spring' as const, stiffness: 280, damping: 18, mass: 0.3 };

function Digit({ value, place }: { value: number; place: number }) {
  const valueRoundedToPlace = Math.floor(value / place) % 10;
  const initial = motionValue(valueRoundedToPlace);
  const animatedValue = useSpring(initial, TRANSITION);

  useEffect(() => {
    animatedValue.set(valueRoundedToPlace);
  }, [animatedValue, valueRoundedToPlace]);

  return (
    <div className="relative inline-block w-[1ch] overflow-x-visible overflow-y-clip leading-[1.2] tabular-nums">
      <div className="invisible">0</div>
      {Array.from({ length: 10 }, (_, i) => (
        <DigitFace key={i} mv={animatedValue} number={i} />
      ))}
    </div>
  );
}

function DigitFace({ mv, number }: { mv: MotionValue<number>; number: number }) {
  const uniqueId = useId();
  const [ref, bounds] = useMeasure();

  const y = useTransform(mv, (latest) => {
    if (!bounds.height) return 0;
    const placeValue = latest % 10;
    const offset = (10 + number - placeValue) % 10;
    let memo = offset * bounds.height;
    if (offset > 5) memo -= 10 * bounds.height;
    return memo;
  });

  // don't render the animated number until we know the height
  if (!bounds.height) {
    return (
      <span ref={ref} className="invisible absolute">
        {number}
      </span>
    );
  }

  return (
    <motion.span
      style={{ y }}
      layoutId={`${uniqueId}-${number}`}
      className="absolute inset-0 flex items-center justify-center"
      transition={TRANSITION}
      ref={ref}
    >
      {number}
    </motion.span>
  );
}

export function SlidingNumber({ value, padStart = false }: { value: number; padStart?: boolean }) {
  const integerValue = Math.floor(Math.abs(value));
  const digits = (padStart && integerValue < 10 ? `0${integerValue}` : String(integerValue)).split('');
  const places = digits.map((_, i) => Math.pow(10, digits.length - i - 1));
  return (
    <div className="flex items-center">
      {digits.map((_, index) => (
        <Digit key={`pos-${places[index]}`} value={integerValue} place={places[index]!} />
      ))}
    </div>
  );
}
