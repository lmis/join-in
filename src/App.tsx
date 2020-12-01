/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import React, { useMemo } from "react";
import { useUserMedia } from "webcam";
import { GameArea } from "GameArea";
import { useRemoteConnection } from "connection";
import { useMovement } from "physics";
import { useMovementControl } from "keypress";
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
  const { acceleration } = useMovementControl(
    stream ? defaultThrust : 0.1 * defaultThrust
  );
  const { getPosition, getAngle, getSpeed } = useMovement(
    acceleration,
    movementConfig
  );

  const { users, connectionId } = useRemoteConnection(
    signalingUrl,
    positionUpdateInterval,
    getPosition,
    stream
  );
  const others = useMemo(() => users.filter((u) => u.streams), [users]);

  return (
    <div className="App">
      {!error && !stream ? (
        <h2>Waiting for webcam...</h2>
      ) : (
        <>
          <h2>Users</h2>
          <div>
            You ({connectionId ?? "No connection"}){" "}
            {error && `(No camera: ${error})`}
          </div>
          <div>
            {others.map((u) => (
              <div key={u.userId}>
                <div>{u.userId}</div>
                <div>Video: {u.streams ? "yes" : "no"}</div>
              </div>
            ))}
          </div>
          <GameArea
            getPosition={getPosition}
            getAngle={getAngle}
            getSpeed={getSpeed}
            others={others}
            stream={stream}
          />
        </>
      )}
    </div>
  );
}
