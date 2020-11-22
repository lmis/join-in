/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import React, { FC, useRef, useCallback } from "react";

import { UserData } from "connection";
import { toVideoElement } from "webcam";
import { useImage, useAnimation, useContext2D } from "render";
import { useKeyDown } from "keypress";
import { Position, clampRect } from "utils";

interface Props {
  position: Position;
  setPosition: (position: Position) => void;
  others: UserData[];
  stream: MediaStream | null;
}

// TODO: express in terms of Positions
const ballRadius = 50;
const topBorder = 40;
const leftBorder = 40;
const rightBorder = 760;
const bottomBorder = 760;
const canvasWidth = 800;
const canvasHeight = 800;

declare const require: (url: string) => string;

export const Sketch: FC<Props> = ({
  position,
  setPosition,
  stream,
  others
}) => {
  const background = useImage(
    require("../public/assets/office.png"),
    1000,
    1000
  );
  // TODO: this could be extracted into useAudioIndication(stream) which would only return an image if the stream has sound
  const audioIndication = useImage(
    require("../public/assets/loudspeaker_grey.png"),
    800,
    600
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctx = useContext2D(canvasRef);

  const draw = useCallback(async () => {
    if (ctx && background) {
      ctx.drawImage(background, 0, 0, canvasWidth, canvasHeight);
    }
    if (ctx && stream) {
      // TODO: Flip positions for rendering only. Express everything with (0,0) = Bottom left
      // TODO: Extract stuff here
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

      if (audioIndication) {
        ctx.drawImage(
          audioIndication,
          x - 3.2 * ballRadius,
          y - 2.3 * ballRadius,
          (250 / audioIndication.height) * audioIndication.width,
          250
        );
      }
    }
  }, [ctx, stream, others, position, audioIndication, background]);

  const onKeyDown = useCallback(
    (e: DocumentEventMap["keydown"]) => {
      if (!ctx) {
        return;
      }
      const increment = 5;
      const [x, y] = position;
      // TODO: Support 'continious' controls
      setPosition(
        clampRect(
          ((): Position => {
            switch (e.key) {
              case "Right":
              case "ArrowRight":
                return [x + increment, y];
              case "Left":
              case "ArrowLeft":
                return [x - increment, y];
              case "Up":
              case "ArrowUp":
                return [x, y - increment];
              case "Down":
              case "ArrowDown":
                return [x, y + increment];
              default:
                return [x, y];
            }
          })(),
          [leftBorder + ballRadius, topBorder + ballRadius],
          [rightBorder - ballRadius, bottomBorder - ballRadius]
        )
      );
    },
    [position, setPosition, ctx]
  );

  useAnimation(draw);
  useKeyDown(onKeyDown);

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
