/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import React, { FC, useRef, RefObject, useCallback } from "react";

import { UserData } from "connection";
import { toVideoElement, toSoundSource } from "webcam";
import { useImage, useAnimation, useContext2D } from "render";
import { Position } from "utils";
declare const require: (url: string) => string;

interface Props {
  positionRef: RefObject<Position>;
  others: UserData[];
  stream: MediaStream | null;
}

const canvasWidth = 800;
const canvasHeight = 800;
const ballRadius = 50;
const bottomLeft: Position = [40, 40];
const topRight: Position = [760, 760];

const drawPlayer = (
  ctx: CanvasRenderingContext2D,
  stream: MediaStream,
  [x, y]: Position,
  audioIndication: HTMLImageElement
) => {
  // Create a canvas with a circular rendering shape
  const circleCanvas = document.createElement("canvas");
  circleCanvas.width = canvasWidth;
  circleCanvas.height = canvasHeight;
  const circleCtx = circleCanvas.getContext("2d")!;
  circleCtx.beginPath();
  circleCtx.arc(x, y, ballRadius, 0, Math.PI * 2);
  circleCtx.clip();
  circleCtx.closePath();
  circleCtx.restore();

  // Draw video onto circular canvas
  const video = toVideoElement(stream);
  circleCtx.drawImage(
    video,
    x - ballRadius,
    y - ballRadius,
    (100 / video.videoHeight) * video.videoWidth,
    100
  );

  // Copy video circle onto main canvas
  ctx.drawImage(circleCanvas, 0, 0);

  // Add audioIndication
  if (toSoundSource(stream).isSpeaking()) {
    ctx.drawImage(
      audioIndication,
      x - 3.2 * ballRadius,
      y - 2.3 * ballRadius,
      (250 / audioIndication.height) * audioIndication.width,
      250
    );
  }
};

const drawBackground = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  [x, y]: Position
) => {
  ctx.drawImage(image, x, y, image.width, image.height);
};

export const GameArea: FC<Props> = ({ positionRef, stream, others }) => {
  const background = useImage(
    require("../public/assets/office.png"),
    1000,
    1000
  );
  const audioIndication = useImage(
    require("../public/assets/loudspeaker_grey.png"),
    800,
    600
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctx = useContext2D(canvasRef);

  const draw = useCallback(async () => {
    const position = positionRef.current;
    if (!ctx || !position) {
      return;
    }

    if (stream && audioIndication && background) {
      // How many pixels is a position point worth?
      const [xScaling, yScaling] = [
        background.width / 800,
        background.height / 800
      ];

      // In player space
      const [xPlayer, yPlayer] = position;
      const leftIsTight = xPlayer < 360;
      const rightIsTight = xPlayer > 500;

      const [xCanvas, yCanvas] = [
        leftIsTight
          ? 0
          : rightIsTight
          ? 200
          : xPlayer - canvasWidth / (2 * xScaling),
        yPlayer + canvasHeight / (2 * yScaling)
      ];
      const [xBackground, yBackground] = [
        0 / xScaling,
        background.height / yScaling
      ];

      const toCanvasSpace = ([x, y]: Position): Position => [
        (x - xCanvas) * xScaling,
        (yCanvas - y) * yScaling
      ];

      drawBackground(
        ctx,
        background,
        toCanvasSpace([xBackground, yBackground])
      );

      others.forEach(({ streams, position = [0, 0] }) => {
        drawPlayer(ctx, streams![0], toCanvasSpace(position), audioIndication);
      });

      drawPlayer(ctx, stream, toCanvasSpace(position), audioIndication);
    }
  }, [ctx, stream, others, positionRef, audioIndication, background]);

  useAnimation(draw);

  return (
    <>
      <h3>
        Come on in, grab a coffee and join us for some jibber-jabber and
        watercooler banter.
      </h3>
      <canvas
        ref={canvasRef}
        className="Canvas"
        width={canvasWidth.toString()}
        height={canvasHeight.toString()}
      >
        Your browser does not support the HTML5 canvas tag.
      </canvas>
    </>
  );
};
