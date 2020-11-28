/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import React, { useState, useCallback } from "react";
import { useUserMedia } from "webcam";
import { GameArea } from "GameArea";
import { useRemoteConnection } from "connection";
import { useMovement, Vector } from "physics";
import { KeyUpDownEvent, useKeyUpDown } from "keypress";
import {
  movementConfig,
  positionUpdateInterval,
  signalingUrl,
  thrust
} from "config";

import "./styles.css";

const constraints = { audio: true, video: true };

export default function App() {
  const [acceleration, setAcceleration] = useState<Vector>([0, 0]);
  const { getPosition, getAngle } = useMovement(acceleration, movementConfig);
  const onKeyUpDown = useCallback(
    (e: KeyUpDownEvent, isDown) => {
      setAcceleration(([x, y]) => {
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
      });
    },
    [setAcceleration]
  );

  useKeyUpDown(onKeyUpDown);

  // TODO: we don't need high res quality for all of these!
  const { stream, error } = useUserMedia(constraints);
  const { users, connectionId } = useRemoteConnection(
    signalingUrl,
    positionUpdateInterval,
    getPosition,
    stream
  );
  const others = users.filter((u) => u.streams);
  return (
    <div className="App">
      {error ? (
        <>
          <h2>Cannot get webcam access.</h2>
          <p>Error: {error.message}</p>
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
        others={others}
        stream={stream}
      />
    </div>
  );
}
