export type Position = [number, number];
export const inexhaustive = (x: never): void => {};

export const wait = (millis: number) =>
  new Promise((resolve) => setTimeout(resolve, millis));

export const clamp = (x: number, min: number, max: number) =>
  Math.max(Math.min(x, max), min);

export const clampRect = (
  [x, y]: Position,
  [xMin, yMin]: Position,
  [xMax, yMax]: Position
): Position => [clamp(x, xMin, xMax), clamp(y, yMin, yMax)];
