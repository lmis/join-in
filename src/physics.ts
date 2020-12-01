/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useCallback } from "react";
import { Position, roundTo } from "utils";

export interface MovementConfig {
  delta: number;
  friction: number;
  start: Position;
  constraint: (p: Position) => boolean;
}

export interface MovementOutput {
  getPosition: () => Position;
  getAngle: () => number;
  getSpeed: () => number;
}

export type Vector = [number, number];
const movement = (
  getAcceleration: () => Vector,
  setPosition: (p: Position) => void,
  setVelocity: (v: Vector) => void,
  { start, delta, friction, constraint }: MovementConfig
): (() => void) => {
  let position = start;
  let velocity: Vector = [0, 0];
  let acceleration = getAcceleration();

  const propagate = (delta: number): [Position, Vector, Vector] => [
    position.map((p, i) => velocity[i] * delta + p) as Position,
    velocity.map(
      (v, i) => acceleration[i] * delta + (1 - friction) * v
    ) as Vector,
    getAcceleration()
  ];

  const id = setInterval(() => {
    const [nextPos, nextVel, nextAcc] = propagate(delta);
    if (constraint(nextPos)) {
      position = nextPos;
      velocity = nextVel;
      acceleration = nextAcc;
      setPosition(nextPos);
      setVelocity(nextVel);
    } else {
      velocity = [0, 0];
      acceleration = [0, 0];
    }
  }, delta * 1000);

  return () => clearInterval(id);
};

export const useMovement = (
  acceleration: Vector,
  config: MovementConfig
): MovementOutput => {
  // This stuff gets updated on the millisecond scale so we'd like to avoid rerendering.
  const positionRef = useRef<Position>(config.start);
  const angleRef = useRef<number>(0);
  const speedRef = useRef<number>(0);
  const accelerationRef = useRef<Vector>(acceleration);

  const getPosition = useCallback(() => positionRef.current, [positionRef]);
  const getAngle = useCallback(() => angleRef.current, [angleRef]);
  const getSpeed = useCallback(() => speedRef.current, [speedRef]);

  useEffect(() => {
    accelerationRef.current = acceleration;
  }, [acceleration, accelerationRef]);

  useEffect(() => {
    const cleanup = movement(
      () => accelerationRef.current,
      (p) => {
        positionRef.current = p;
      },
      ([x, y]) => {
        if (x !== 0 || y !== 0) {
          angleRef.current = Math.atan2(x, y);
        }
        speedRef.current = Math.sqrt(x * x + y * y);
      },
      config
    );
    return cleanup;
  }, [accelerationRef, config]);

  return { getPosition, getAngle, getSpeed };
};
