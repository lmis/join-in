import { MovementConfig } from "physics";

export const signalingUrl = "https://czof1.sse.codesandbox.io/";
export const positionUpdateInterval = 200;

export const audioDectectionConfig = {
  speakingBaseScore: 2000,
  fftSize: 256,
  minDecibels: -90,
  maxDecibels: -10,
  smoothingTimeConstant: 0.1
};

export const gameBorders = {
  bottom: 0,
  top: 800,
  left: 0,
  right: 800
};

export const audioDistanceSettings = {
  intensityFactor: 800 * 800,
  scalingFactor: 1
};

export const canvasWidth = 800;
export const canvasHeight = 800;
export const playerRadius = 75;
export const wallThickness = 5;

export const movementConfig: MovementConfig = {
  delta: 0.05,
  friction: 0.2,
  start: [430, 150],
  constraint: ([x, y]) =>
    x >= gameBorders.left + playerRadius + wallThickness &&
    x <= gameBorders.right - playerRadius - wallThickness &&
    y >= gameBorders.bottom + playerRadius + wallThickness &&
    y <= gameBorders.top - playerRadius - wallThickness
};

export const defaultThrust = 900;
