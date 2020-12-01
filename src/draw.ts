/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import { Position } from "utils";

export const drawRotated = (
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  width: number,
  height: number,
  angle: number,
  [x, y]: Position
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.translate(-x, -y);
  ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
  ctx.restore();
};
export const drawCircle = (
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
