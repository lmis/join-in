/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useUserMedia } from "webcam";
import { GameArea } from "GameArea";
import { useRemoteConnection } from "connection";
import { useMovement, Vector } from "physics";
import { KeyUpDownEvent, useKeyUpDown } from "keypress";
import {
  movementConfig,
  positionUpdateInterval,
  signalingUrl,
  defaultThrust
} from "config";

import "./styles.css";

const constraints = { audio: true, video: true };

export default function App() {
  const { stream, error } = useUserMedia(constraints);
  const [acceleration, setAcceleration] = useState<Vector>([0, 0]);
  const { getPosition, getAngle, getSpeed } = useMovement(
    acceleration,
    movementConfig
  );
  const onKeyUpDown = useCallback(
    (e: KeyUpDownEvent, isDown) => {
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
          const thrust = stream ? defaultThrust : defaultThrust * 0.1;
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
    [setAcceleration, stream]
  );

  useKeyUpDown(onKeyUpDown);

  const { users, connectionId } = useRemoteConnection(
    signalingUrl,
    positionUpdateInterval,
    getPosition,
    stream
  );
  const others = useMemo(() => users.filter((u) => u.streams), [users]);

  return (
    <div className="App">
      {error ? (
        <>
          <h2>Cannot get webcam access.</h2>
          <p>Error: {error}</p>
        </>
      ) : (
        <>
          <h2>Users</h2>
          <div>You ({connectionId})</div>
          <div>
            {others.map((u) => (
              <div key={u.userId}>
                <div>{u.userId}</div>
                <div>Video: {u.streams ? "yes" : "no"}</div>
              </div>
            ))}
          </div>
        </>
      )}
      <GameArea
        getPosition={getPosition}
        getAngle={getAngle}
        getSpeed={getSpeed}
        others={others}
        stream={stream}
      />
    </div>
  );
}
