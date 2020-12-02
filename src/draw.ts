/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import { Position } from "utils";

interface CommonParams {
  ctx: CanvasRenderingContext2D;
  alpha: number;
  flipped: boolean;
  image: CanvasImageSource;
  angle: number;
  position: Position;
}
export const drawImage = ({
  ctx,
  alpha,
  flipped,
  image,
  width,
  height,
  angle,
  position: [x, y]
}: CommonParams & { width: number; height: number }) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (flipped) {
    ctx.scale(-1, 1);
  }
  ctx.rotate(angle);
  ctx.translate(-x, -y);
  ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
  ctx.restore();
};

export const drawCircle = ({
  ctx,
  image,
  imageWidth,
  imageHeight,
  radius,
  ...rest
}: CommonParams & {
  radius: number;
  imageWidth: number;
  imageHeight: number;
}) => {
  const diameter = radius * 2;

  // Create a canvas with a circular rendering shape
  const circleCanvas = document.createElement("canvas");
  circleCanvas.width = diameter;
  circleCanvas.height = diameter;
  const circleCtx = circleCanvas.getContext("2d")!;
  circleCtx.beginPath();
  circleCtx.arc(radius, radius, radius, 0, Math.PI * 2);
  circleCtx.clip();

  // Rescale, crop and draw into cirecle
  const size = Math.min(imageWidth, imageHeight);
  const excessHeight = Math.max(0, imageHeight - size);
  const excessWidth = Math.max(0, imageWidth - size);
  // Rescale and draw into cirecle
  circleCtx.drawImage(
    image,
    // Offset in original image
    excessWidth / 2,
    excessHeight / 2,
    // Crop in original image
    size,
    size,
    // Position in circle canvas
    0,
    0,
    // Size in circle canvas
    diameter,
    diameter
  );

  // Copy video circle onto main canvas
  drawImage({
    ...rest,
    ctx,
    image: circleCanvas,
    width: diameter,
    height: diameter
  });
};
