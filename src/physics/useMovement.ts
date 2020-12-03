import { useEffect, useState } from "react";
import {
  Movement,
  startMovementSim,
  MovementConfig,
  Vector
} from "physics/movement";

export const useMovement = (
  acceleration: Vector,
  config: MovementConfig
): Movement | null => {
  const [movement, setMovement] = useState<Movement | null>(null);

  useEffect(() => {
    movement?.setAcceleration(acceleration);
  }, [movement, acceleration]);

  useEffect(() => {
    const { cleanup, ...movement } = startMovementSim(config);
    setMovement(movement);
    return () => {
      setMovement(null);
      cleanup();
    };
  }, [config]);

  return movement;
};
