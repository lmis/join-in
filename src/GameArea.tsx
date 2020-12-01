/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import React, { FC, useRef, useCallback } from "react";

import { UserData } from "connection";
import { toVideoElement, toSoundSource } from "webcam";
import { useAssets, useAsset, useAnimation, useContext2D } from "render";
import { drawCircle, drawRotated } from "draw";
import { Position, roundTo } from "utils";
import { canvasWidth, canvasHeight, gameBorders, playerRadius } from "config";

interface Props {
  getPosition: () => Position;
  getAngle: () => number;
  getSpeed: () => number;
  others: UserData[];
  stream: MediaStream | null;
}

const drawPlayer = (
  frameNumber: number,
  ctx: CanvasRenderingContext2D,
  stream: MediaStream | null,
  radius: number,
  p: Position,
  angle: number,
  speed: number,
  audioIndication: HTMLImageElement,
  sloths: HTMLImageElement[]
) => {
  if (!stream) {
    const height = 4 * radius;
    const animationFramesPerImage = 10;
    const sloth =
      roundTo(speed, 1) > 0
        ? sloths[
            Math.round(frameNumber / animationFramesPerImage) % sloths.length
          ]
        : sloths[0];
    drawRotated(
      ctx,
      sloth,
      height * (sloth.width / sloth.height),
      height,
      angle,
      p
    );
    return;
  }
  const video = toVideoElement(stream);
  drawCircle(ctx, video, video.videoWidth, video.videoHeight, p, radius);

  // Add audioIndication
  if (toSoundSource(stream).isSpeaking()) {
    const height = 4 * radius;
    drawRotated(
      ctx,
      audioIndication,
      height * (audioIndication.width / audioIndication.height),
      height,
      0,
      p
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

const slothAssets = [3, 2, 1, 2, 3, 4, 5, 4].map((i) => `sloth${i}.png`);

export const GameArea: FC<Props> = ({
  getPosition,
  getAngle,
  getSpeed,
  stream,
  others
}) => {
  const background = useAsset("office.png");
  const audioIndication = useAsset("audio-indication.png");
  const sloths = useAssets(slothAssets);
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
