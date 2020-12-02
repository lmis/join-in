/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import React, { FC, useRef, useCallback } from "react";

import { UserData } from "connection";
import { toVideoElement, toSoundSource, hasVideo, hasAudio } from "webcam";
import { useAssets, useAsset, useAnimation, useContext2D } from "render";
import { drawCircle, drawImage } from "draw";
import { distanceSquared, Position, roundTo } from "utils";
import {
  scaleConfig,
  canvasWidth,
  canvasHeight,
  gameBorders,
  playerRadius,
  audioDistanceSettings
} from "config";
import { Movement } from "physics";

interface Props {
  restScale: number;
  getMovement: () => Movement;
  others: UserData[];
  stream: MediaStream | null;
}

const drawPlayer = ({
  frameNumber,
  ctx,
  stream,
  flipped,
  radius,
  position,
  angle,
  audioIndication,
  muted,
  placeholders
}: {
  frameNumber: number;
  ctx: CanvasRenderingContext2D;
  stream: MediaStream | null;
  flipped: boolean;
  radius: number;
  position: Position;
  angle: number;
  audioIndication: HTMLImageElement;
  muted: HTMLImageElement;
  placeholders: HTMLImageElement[];
}) => {
  if (stream && hasVideo(stream)) {
    const video = toVideoElement(stream);
    drawCircle({
      ctx,
      alpha: 1,
      angle: 0,
      flipped,
      image: video,
      imageWidth: video.videoWidth,
      imageHeight: video.videoHeight,
      position,
      radius
    });
  } else {
    const height = 4 * radius;
    const animationFramesPerImage = 10;
    const placeholder =
      placeholders[
        Math.round(frameNumber / animationFramesPerImage) % placeholders.length
      ];
    drawImage({
      ctx,
      alpha: 1,
      flipped: false,
      image: placeholder,
      width: height * (placeholder.width / placeholder.height),
      height,
      angle,
      position
    });
  }

  if (stream && hasAudio(stream)) {
    const speakingIntensity = toSoundSource(stream).getSpeakingIntensity();
    if (speakingIntensity > 1) {
      const alpha = speakingIntensity - 1;
      const height = 4 * radius;
      drawImage({
        ctx,
        alpha,
        flipped: false,
        image: audioIndication,
        width: height * (audioIndication.width / audioIndication.height),
        height,
        angle: 0,
        position
      });
    }
  } else {
    const height = radius;
    const [x, y] = position;
    drawImage({
      ctx,
      alpha: 1,
      angle: 0,
      flipped: false,
      image: muted,
      width: height * (muted.width / muted.height),
      height,
      position: [x + radius, y + radius]
    });
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
  getMovement,
  stream,
  others,
  restScale
}) => {
  const background = useAsset("office.png");
  const audioIndication = useAsset("audio-indication.png");
  const muted = useAsset("muted.png");
  const sloths = useAssets(slothAssets);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctx = useContext2D(canvasRef);

  const draw = useCallback(
    async (frameNumber: number) => {
      if (!ctx) {
        return;
      }

      if (audioIndication && background && sloths && muted) {
        const scale = Math.max(
          scaleConfig.minScale,
          restScale * (1 - getMovement().speed / scaleConfig.speedFactor)
        );
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

        const { position, angle, speed } = getMovement();
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

        others.forEach((other) => {
          const otherMovement = other.movement ?? null;
          const otherStream = other.audioStreams?.[0] ?? null;
          if (!otherMovement) {
            return;
          }
          if (otherStream && hasAudio(otherStream)) {
            const { intensityFactor, scalingFactor } = audioDistanceSettings;
            toSoundSource(otherStream).setOutputVolume(
              Math.min(
                scalingFactor,
                intensityFactor /
                  distanceSquared(position, otherMovement.position)
              ) / scalingFactor
            );
          }
          drawPlayer({
            frameNumber,
            ctx,
            stream,
            flipped: true,
            radius: playerRadius * scale,
            position: transformPositionToPixelSpace(otherMovement.position),
            angle: otherMovement.angle,
            audioIndication,
            muted,
            placeholders:
              roundTo(otherMovement.speed, 1) > 0 ? sloths : [sloths[0]]
          });
        });

        drawPlayer({
          frameNumber,
          ctx,
          stream,
          flipped: false,
          radius: playerRadius * scale,
          position: transformPositionToPixelSpace(position),
          angle,
          audioIndication,
          muted,
          placeholders: roundTo(speed, 1) > 0 ? sloths : [sloths[0]]
        });
      }
    },
    [
      ctx,
      stream,
      others,
      restScale,
      getMovement,
      audioIndication,
      background,
      sloths,
      muted
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
