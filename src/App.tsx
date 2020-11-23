/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import React, { useState, useCallback } from "react";
import { useUserMedia } from "webcam";
import { GameArea } from "GameArea";
import { useRemoteConnection } from "connection";
import { useMovement, MovementConfig, Vector } from "physics";
import { KeyUpDownEvent, useKeyUpDown } from "keypress";
import { Position } from "utils";

import "./styles.css";

const movementConfig: MovementConfig = {
  delta: 0.05,
  friction: 0.2,
  start: [430, 100],
  constraint: ([x, y]) => x >= 90 && x <= 710 && y >= 90 && y <= 720
};
const thrust = 900;

const constraints = { audio: true, video: true };
export default function App() {
  const [acceleration, setAcceleration] = useState<Vector>([0, 0]);
  const getPosition = useMovement(acceleration, movementConfig);
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
    "https://rgtx5.sse.codesandbox.io/",
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
      <GameArea getPosition={getPosition} others={others} stream={stream} />
    </div>
  );
}
