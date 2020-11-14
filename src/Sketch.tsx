/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import React, {
  FC,
  MutableRefObject,
  useEffect,
  useState,
  useRef,
  useCallback
} from "react";

interface Props {
  videoRef: React.RefObject<HTMLVideoElement>;
}

const ballRadius = 30;

const useContext2D = (
  canvasRef: MutableRefObject<HTMLCanvasElement | null>
): CanvasRenderingContext2D | null => {
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  useEffect(() => {
    setCtx(canvasRef.current?.getContext("2d") ?? null);
  }, [canvasRef]);

  return ctx;
};

const drawContour = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  ctx.moveTo(100, 100);
  ctx.lineTo(500, 100);
  ctx.lineTo(500, 300);
  ctx.lineTo(100, 300);
  ctx.closePath();
  ctx.stroke();
};

const drawBall = (
  ctx: CanvasRenderingContext2D,
  position: [number, number],
  fillStyle: string = "#0095DD"
) => {
  ctx.beginPath();
  ctx.arc(position[0], position[1], ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.closePath();
};

const useAnimation = (onFrame: () => void) => {
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = () => {
      onFrame();
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

const useEventListener = <K extends keyof DocumentEventMap>(
  type: K,
  onEvent: (e: DocumentEventMap[K]) => void
) => {
  useEffect(() => {
    document.addEventListener(type, onEvent);
    return () => {
      document.removeEventListener(type, onEvent);
    };
  }, [type, onEvent]);
};

export const Sketch: FC<Props> = ({ videoRef }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctx = useContext2D(canvasRef);
  const [position, setPosition] = useState<[number, number]>([200, 150]);
  const drawPlayers = useCallback(() => {
    const video = videoRef.current;
    if (ctx && video) {
      const [x, y] = position;
      ctx.drawImage(video, x, y, 100, 100);
    }
  }, [ctx, videoRef, position]);
  useAnimation(drawPlayers);
  const onKeyDown = useCallback(
    (e: DocumentEventMap["keydown"]) => {
      if (!ctx) {
        return;
      }
      const increment = 5;
      const [x, y] = position;
      if (e.key === "Right" || e.key === "ArrowRight") {
        const newX = Math.min(x + increment, 500 - ballRadius);
        setPosition([newX, y]);
      } else if (e.key === "Left" || e.key === "ArrowLeft") {
        const newX = Math.max(x - increment, 100 + ballRadius);
        setPosition([newX, y]);
      } else if (e.key === "Up" || e.key === "ArrowUp") {
        const newY = Math.max(y - increment, 100 + ballRadius);
        setPosition([x, newY]);
      } else if (e.key === "Down" || e.key === "ArrowDown") {
        const newY = Math.min(y + increment, 300 - ballRadius);
        setPosition([x, newY]);
      }
    },
    [position, ctx]
  );

  useEffect(() => {
    if (ctx) {
      drawContour(ctx);
      drawBall(ctx, position);
    }
    return () => {
      if (ctx) {
        ctx.clearRect(0, 0, 600, 400);
      }
    };
  }, [ctx, position]);

  useEventListener("keydown", onKeyDown);

  return (
    <>
      <h3>Watercooler Corner</h3>
      <canvas ref={canvasRef} className="Canvas" width="600" height="400">
        Your browser does not support the HTML5 canvas tag.
      </canvas>
    </>
  );
};
