/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import React, { FC, useRef, useCallback, useEffect } from "react";

import { UserData } from "connection";
import { toVideoElement, toSoundSource } from "webcam";
import { useImage, useAnimation, useContext2D, useImages } from "render";
import { Position, roundTo } from "utils";
import { canvasWidth, canvasHeight, gameBorders, playerRadius } from "config";
import { Vector } from "physics";
declare const require: (url: string) => string;

interface Props {
  getPosition: () => Position;
  getAngle: () => number;
  getSpeed: () => number;
  others: UserData[];
  stream: MediaStream | null;
}

const drawCircle = (
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
  [x, y]: Position,
  radius: number
) => {
  const diameter = radius * 2;

  // Create a canvas with a circular rendering shape
  const circleCanvas = document.createElement("canvas");
  circleCanvas.width = diameter;
  circleCanvas.height = diameter;
  const circleCtx = circleCanvas.getContext("2d")!;
  circleCtx.beginPath();
  circleCtx.arc(radius, radius, radius, 0, Math.PI * 2);
  circleCtx.clip();
  circleCtx.closePath();
  circleCtx.restore();

  // Rescale and draw into cirecle
  circleCtx.drawImage(
    image,
    0,
    0,
    (diameter / imageHeight) * imageWidth,
    diameter
  );

  // Copy video circle onto main canvas
  ctx.drawImage(circleCanvas, x - radius, y - radius);
};

const drawPlayer = (
  frameNumber: number,
  ctx: CanvasRenderingContext2D,
  stream: MediaStream | null,
  radius: number,
  [x, y]: Position,
  angle: number,
  speed: number,
  audioIndication: HTMLImageElement,
  sloths: HTMLImageElement[]
) => {
  if (!stream) {
    const animationFramesPerImage = 10;
    const sloth =
      roundTo(speed, 1) > 0
        ? sloths[
            Math.round(frameNumber / animationFramesPerImage) % sloths.length
          ]
        : sloths[0];
    const stretch = 2;
    ctx.save();
    // Move the origin to the picture's center
    ctx.translate(x, y);
    ctx.rotate(angle);
    // Move the origin back to its starting point
    ctx.translate(-x, -y);
    ctx.drawImage(
      sloth,
      x - stretch * radius,
      y - stretch * radius,
      (2 * stretch * radius * sloth.width) / sloth.height,
      2 * stretch * radius
    );
    ctx.restore();
    return;
  }
  const video = toVideoElement(stream);
  drawCircle(ctx, video, video.videoWidth, video.videoHeight, [x, y], radius);

  // Add audioIndication
  if (toSoundSource(stream).isSpeaking()) {
    // How much larger to make the audio indication circle than the player circle
    const stretch = 2;
    ctx.drawImage(
      audioIndication,
      x - stretch * radius,
      y - stretch * radius,
      ((2 * stretch * radius) / audioIndication.height) * audioIndication.width,
      2 * stretch * radius
    );
  }
};

const drawBackground = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  scale: number,
  [x, y]: Position
) => {
  ctx.drawImage(image, x, y, scale * image.width, scale * image.height);
};

const slothUrls = [3, 2, 1, 2, 3, 4, 5, 4].map((i) =>
  require(`../public/assets/sloth${i}.png`)
);

export const GameArea: FC<Props> = ({
  getPosition,
  getAngle,
  getSpeed,
  stream,
  others
}) => {
  const background = useImage(require("../public/assets/office.png"));
  const audioIndication = useImage(
    require("../public/assets/audio-indication.png")
  );
  const sloths = useImages(slothUrls);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctx = useContext2D(canvasRef);

  const draw = useCallback(
    async (frameNumber: number) => {
      if (!ctx) {
        return;
      }

      if (audioIndication && background && sloths) {
        const scale = 0.75;
        const [xScale, yScale] = [
          (gameBorders.right - gameBorders.left) / (background.width * scale),
          (gameBorders.top - gameBorders.bottom) / (background.height * scale)
        ];
        const scalePixelsToGameSpace = ([x, y]: Position): Position => [
          x * xScale,
          y * yScale
        ];

        const [viewWidth, viewHeight] = scalePixelsToGameSpace([
          canvasWidth,
          canvasHeight
        ]);

        const position = getPosition();
        const angle = getAngle();
        const speed = getSpeed();
        const [xPlayer, yPlayer] = position;
        const leftIsTight = xPlayer < gameBorders.left + viewWidth / 2;
        const rightIsTight = xPlayer > gameBorders.right - viewWidth / 2;
        const bottomIsTight = yPlayer < gameBorders.bottom + viewHeight / 2;
        const topIsTight = yPlayer > gameBorders.top - viewHeight / 2;

        const [xCanvas, yCanvas] = [
          leftIsTight
            ? gameBorders.left
            : rightIsTight
            ? gameBorders.right - viewWidth
            : xPlayer - viewWidth / 2,
          bottomIsTight
            ? gameBorders.bottom + viewHeight
            : topIsTight
            ? gameBorders.top
            : yPlayer + viewHeight / 2
        ];

        const transformPositionToPixelSpace = ([x, y]: Position): Position => [
          (x - xCanvas) / xScale,
          (yCanvas - y) / yScale
        ];

        drawBackground(
          ctx,
          background,
          scale,
          transformPositionToPixelSpace([gameBorders.left, gameBorders.top])
        );

        others.forEach(({ streams, position = [0, 0] }) => {
          drawPlayer(
            frameNumber,
            ctx,
            streams?.[0] ?? null,
            playerRadius * scale,
            transformPositionToPixelSpace(position),
            angle,
            speed,
            audioIndication,
            sloths
          );
        });

        drawPlayer(
          frameNumber,
          ctx,
          stream,
          playerRadius * scale,
          transformPositionToPixelSpace(position),
          angle,
          speed,
          audioIndication,
          sloths
        );
      }
    },
    [
      ctx,
      stream,
      others,
      getPosition,
      getAngle,
      getSpeed,
      audioIndication,
      background,
      sloths
    ]
  );

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
