'use client';

import { useEffect, useRef, useState } from 'react';
import { Text, type TextProps } from '@chakra-ui/react';

interface AnimatedNumberProps extends Omit<TextProps, 'children' | 'as'> {
  value: number;
  /** Turns the tweened number into the string on screen. Default: rounded. */
  format?: (n: number) => string;
  durationMs?: number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Counts from wherever it was to the new value. The board's numbers climb as
 * bounties stream in, which is the whole point — a board that snaps to a final
 * figure reads as a screenshot.
 */
export default function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toString(),
  durationMs = 900,
  ...textProps
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const currentRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;

    if (prefersReducedMotion()) {
      fromRef.current = value;
      currentRef.current = value;
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const step = (t: number) => {
      const progress = Math.min(1, (t - start) / durationMs);
      const current = from + (value - from) * easeOutCubic(progress);
      currentRef.current = current;
      setDisplay(current);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = value;
      }
    };
    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      // Whatever frame we reached is the new starting point, so a tween that
      // gets interrupted continues from there instead of snapping back.
      fromRef.current = currentRef.current;
    };
  }, [value, durationMs]);

  return (
    <Text as="span" sx={{ fontVariantNumeric: 'tabular-nums' }} {...textProps}>
      {format(display)}
    </Text>
  );
}
