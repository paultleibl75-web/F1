import { useState, useEffect, useRef } from 'react';

export function useSmoothedValue(target: number, durationMs: number = 200): number {
  const [current, setCurrent] = useState(target);
  const state = useRef({ startVal: current, endVal: target, startTime: performance.now() });
  const rafRef = useRef<number>();

  useEffect(() => {
    // If target changed, update animation state
    if (target !== state.current.endVal) {
      state.current = {
        startVal: current, // start from what is currently rendered
        endVal: target,
        startTime: performance.now(),
      };
    }

    const loop = () => {
      const now = performance.now();
      const { startVal, endVal, startTime } = state.current;
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      // Linear interpolation
      const nextVal = startVal + (endVal - startVal) * progress;
      setCurrent(nextVal);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]); // deliberately excluding current so we don't restart the effect every frame

  return current;
}
