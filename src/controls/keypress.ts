/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import { Vector } from "physics/movement";
import { useEventListener } from "controls/useEventListener";
import { useCallback, useState } from "react";

export const useMovementControl = (
  thrust: number
): { acceleration: Vector } => {
  const [acceleration, setAcceleration] = useState<Vector>([0, 0]);
  const onKeyUpDown = useCallback(
    (e: DocumentEventMap["keydown"] | DocumentEventMap["keyup"], isDown) => {
      // Avoid setting acc to new array with same content to avoid unnecessary rerenders
      const keepOrigIfSame = (f: (acc: Vector) => Vector) => (
        acc: Vector
      ): Vector => {
        const [x, y] = acc;
        const [newX, newY] = f(acc);
        return x === newX && y === newY ? acc : [newX, newY];
      };
      setAcceleration(
        keepOrigIfSame(([x, y]) => {
          switch (e.key) {
            case "Right":
            case "ArrowRight":
              return isDown ? [thrust, y] : [0, y];
            case "Left":
            case "ArrowLeft":
              return isDown ? [-thrust, y] : [0, y];
            case "Up":
            case "ArrowUp":
              return isDown ? [x, thrust] : [x, 0];
            case "Down":
            case "ArrowDown":
              return isDown ? [x, -thrust] : [x, 0];
            default:
              return [x, y];
          }
        })
      );
    },
    [setAcceleration, thrust]
  );

  const onDown = useCallback(
    (e: DocumentEventMap["keydown"]) => onKeyUpDown(e, true),
    [onKeyUpDown]
  );
  const onUp = useCallback(
    (e: DocumentEventMap["keyup"]) => onKeyUpDown(e, false),
    [onKeyUpDown]
  );

  useEventListener("keydown", onDown);
  useEventListener("keyup", onUp);

  return { acceleration };
};

export const useKeyDown = (key: string, onKeyDown: () => void) => {
  const handler = useCallback(
    (e: DocumentEventMap["keydown"]) => {
      if (e.key === key) {
        onKeyDown();
      }
    },
    [key, onKeyDown]
  );

  useEventListener("keydown", handler);
};
