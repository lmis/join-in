export type Position = [number, number];
export const inexhaustive = (x: never): void => {};

export const wait = (millis: number) =>
  new Promise((resolve) => setTimeout(resolve, millis));

export const fuzzyEqual = (a: number, b: number, tol: number) =>
  Math.abs(a - b) < tol;

export const positionFuzzyEqual = (
  [xa, ya]: Position,
  [xb, yb]: Position,
  tol: number
) => fuzzyEqual(xa, xb, tol) && fuzzyEqual(ya, yb, tol);
