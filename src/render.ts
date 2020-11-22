/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import { MutableRefObject, useEffect, useState, useRef } from "react";

export const useContext2D = (
  canvasRef: MutableRefObject<HTMLCanvasElement | null>
): CanvasRenderingContext2D | null => {
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  useEffect(() => {
    setCtx(canvasRef.current?.getContext("2d") ?? null);
  }, [canvasRef]);

  return ctx;
};

export const useAnimation = (onFrame: () => Promise<void>) => {
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = async () => {
      await onFrame();
      requestRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [onFrame]);
};

export const useImage = (
  url: string,
  width?: number,
  height?: number
): HTMLImageElement | null => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image(width, height);
    img.onload = () => setImage(img);
    img.src = url;
  }, [url, width, height]);

  return image;
};
