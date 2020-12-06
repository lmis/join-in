/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import { useCallback, useState } from "react";

export const useZoom = ({
  defaultScale,
  minScale,
  stepSize
}: {
  defaultScale: number;
  minScale: number;
  stepSize: number;
}): { scale: number; increment: () => void; decrement: () => void } => {
  const [scale, setScale] = useState<number>(defaultScale);

  const increment = useCallback(() => {
    setScale((x) => x + stepSize);
  }, [stepSize]);

  const decrement = useCallback(() => {
    setScale((x) => Math.max(minScale, x - stepSize));
  }, [stepSize, minScale]);

  return { scale, increment, decrement };
};
