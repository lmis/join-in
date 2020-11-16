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

const ballRadius = 50;
const topBorder = 50;
const leftBorder = 50;
const rightBorder = 550;
const bottomBorder = 350;

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
  ctx.moveTo(leftBorder, topBorder);
  ctx.lineTo(rightBorder, topBorder);
  ctx.lineTo(rightBorder, bottomBorder);
  ctx.lineTo(leftBorder, bottomBorder);
  ctx.closePath();
  ctx.stroke();
};

const useAnimation = (onFrame: () => void) => {
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = async () => {
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

const loadImage = async (
  url: string,
  width?: number,
  height?: number
): Promise<HTMLImageElement> => {
  return new Promise<HTMLImageElement>((resolve) => {
    const image = new Image(width, height);
    image.onload = () => resolve(image);
    image.src = url;
  });
};

declare const require: (url: string)=> string;

let loudspeaker: HTMLImageElement | null = null;
(async () => {
  loudspeaker = await loadImage(
    require("../public/assets/loudspeaker.png"),
    800,
    600
  );
})();

export const Sketch: FC<Props> = ({ videoRef }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctx = useContext2D(canvasRef);
  const [position, setPosition] = useState<[number, number]>([200, 150]);
  const drawPlayers = useCallback(() => {
    const video = videoRef.current;
    if (ctx && video) {
      const [x, y] = position;
      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = ctx.canvas.width;
      tmpCanvas.height = ctx.canvas.height;
      const ctxTmp = tmpCanvas.getContext("2d")!;

      ctxTmp.beginPath();
      ctxTmp.arc(position[0], position[1], ballRadius, 0, Math.PI * 2);
      ctxTmp.clip();
      ctxTmp.closePath();
      ctxTmp.restore();

      ctxTmp.drawImage(
        video,
        x - ballRadius,
        y - ballRadius,
        (100 / video.videoHeight) * video.videoWidth,
        100
      );
      ctx.drawImage(ctxTmp.canvas, 0, 0);

      if (loudspeaker) {
        ctx.drawImage(loudspeaker, x, y, 150, 150);
      }
    }
  }, [ctx, videoRef, position]);

  const onKeyDown = useCallback(
    (e: DocumentEventMap["keydown"]) => {
      if (!ctx) {
        return;
      }
      const increment = 5;
      const [x, y] = position;
      if (e.key === "Right" || e.key === "ArrowRight") {
        const newX = Math.min(x + increment, rightBorder - ballRadius);
        setPosition([newX, y]);
      } else if (e.key === "Left" || e.key === "ArrowLeft") {
        const newX = Math.max(x - increment, leftBorder + ballRadius);
        setPosition([newX, y]);
      } else if (e.key === "Up" || e.key === "ArrowUp") {
        const newY = Math.max(y - increment, topBorder + ballRadius);
        setPosition([x, newY]);
      } else if (e.key === "Down" || e.key === "ArrowDown") {
        const newY = Math.min(y + increment, bottomBorder - ballRadius);
        setPosition([x, newY]);
      }
    },
    [position, ctx]
  );

  useAnimation(drawPlayers);

  useEffect(() => {
    if (ctx) {
      drawContour(ctx);
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
      <h3>
        Come on in, grab a coffee and joins uf for some jibber-jabber and
        watercooler banter.
      </h3>
      <canvas ref={canvasRef} className="Canvas" width="600" height="400">
        Your browser does not support the HTML5 canvas tag.
      </canvas>
    </>
  );
};
