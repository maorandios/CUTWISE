import { useState, useEffect } from 'react';

interface UseCountUpOptions {
  end: number;
  duration?: number; // Duration in milliseconds (default 1500ms)
  decimals?: number; // Number of decimal places (default 0)
  shouldAnimate?: boolean; // Whether to animate or show final value immediately
}

export const useCountUp = ({ end, duration = 1500, decimals = 0, shouldAnimate = true }: UseCountUpOptions) => {
  const [count, setCount] = useState(shouldAnimate ? 0 : end);

  useEffect(() => {
    // If shouldAnimate is false, just set to final value immediately
    if (!shouldAnimate) {
      setCount(end);
      return;
    }

    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic function for smooth deceleration
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentCount = startValue + (end - startValue) * easeOutCubic;

      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration, shouldAnimate]);

  return count.toFixed(decimals);
};
