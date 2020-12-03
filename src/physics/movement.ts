export type Vector = [number, number];
export interface MovementConfig {
  delta: number;
  friction: number;
  start: Vector;
  constraint: (position: Vector) => boolean;
}

export interface Movement {
  getPosition: () => Vector;
  getVelocity: () => Vector;
  getSpeed: () => number;
  getAngle: () => number;
  setAcceleration: (acc: Vector) => void;
}
export const startMovementSim = ({
  start,
  delta,
  friction,
  constraint
}: MovementConfig): Movement & { cleanup: () => void } => {
  let position = start;
  let velocity: Vector = [0, 0];
  let acceleration: Vector = [0, 0];
  let angle = 0;

  const propagate = (delta: number): [Vector, Vector] => [
    position.map((p, i) => velocity[i] * delta + p) as Vector,
    velocity.map(
      (v, i) => acceleration[i] * delta + (1 - friction) * v
    ) as Vector
  ];

  const id = setInterval(() => {
    const [nextPos, nextVel] = propagate(delta);
    if (constraint(nextPos)) {
      position = nextPos;
      velocity = nextVel;
      const [xVel, yVel] = velocity;
      if (xVel !== 0 || yVel !== 0) {
        angle = Math.atan2(xVel, yVel);
      }
    } else {
      velocity = [0, 0];
      acceleration = [0, 0];
    }
  }, delta * 1000);

  return {
    getPosition: () => position,
    getVelocity: () => velocity,
    getSpeed: () => {
      const [x, y] = velocity;
      return Math.sqrt(x * x + y * y);
    },
    getAngle: () => angle,
    setAcceleration: (acc: Vector) => {
      acceleration = acc;
    },
    cleanup: () => clearInterval(id)
  };
};
