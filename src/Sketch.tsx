/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import React, {
  FC,
  MutableRefObject,
  useEffect,
  useState,
  useRef,
  useCallback
} from "react";

import { UserData } from "connection";
import { toVideoElement } from "webcam";

interface Props {
  position: [number, number];
  setPosition: (position: [number, number]) => void;
  others: UserData[];
  stream: MediaStream | null;
}

const ballRadius = 50;
const topBorder = 40;
const leftBorder = 40;
const rightBorder = 760;
const bottomBorder = 760;
const canvasWidth = 800;
const canvasHeight = 800;

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

const useAnimation = (onFrame: () => Promise<void>) => {
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

declare const require: (url: string) => string;

let office: HTMLImageElement | null = null;
(async () => {
  office = await loadImage(require("../public/assets/office.png"), 1000, 1000);
})();

let loudspeaker: HTMLImageElement | null = null;
(async () => {
  loudspeaker = await loadImage(
    require("../public/assets/loudspeaker_grey.png"),
    800,
    600
  );
})();

export const Sketch: FC<Props> = ({
  position,
  setPosition,
  stream,
  others
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctx = useContext2D(canvasRef);
  const drawPlayers = useCallback(async () => {
    if (ctx && stream) {
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

      const video = toVideoElement(stream);
      ctxTmp.drawImage(
        video,
        x - ballRadius,
        y - ballRadius,
        (100 / video.videoHeight) * video.videoWidth,
        100
      );

      ctx.drawImage(ctxTmp.canvas, 0, 0);
      others.forEach((other) => {
        ctx.drawImage(
          toVideoElement(other.streams![0]),
          other.position?.[0] ?? 0,
          other.position?.[1] ?? 0,
          (100 / video.videoHeight) * video.videoWidth,
          100
        );
      });

      if (loudspeaker) {
        ctx.drawImage(
          loudspeaker,
          x - 3.2 * ballRadius,
          y - 2.3 * ballRadius,
          (250 / loudspeaker.height) * loudspeaker.width,
          250
        );
      }
    }
  }, [ctx, stream, others, position]);

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
    if (ctx && office) {
      drawContour(ctx);
      ctx.drawImage(office, 0, 0, canvasWidth, canvasHeight);
    }
    return () => {
      if (ctx) {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      }
    };
  }, [ctx, position]);

  useEventListener("keydown", onKeyDown);

  return (
    <>
      <h3>
        Come on in, grab a coffee and join us for some jibber-jabber and
        watercooler banter.
      </h3>
      <canvas
        ref={canvasRef}
        className="Canvas"
        width={String(canvasWidth)}
        height={String(canvasHeight)}
      >
        Your browser does not support the HTML5 canvas tag.
      </canvas>
    </>
  );
};
