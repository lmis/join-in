import React, { useEffect } from "react";
import { useUserMedia } from "userMedia/webcam";
import { setEnabled } from "userMedia/mediaStream";
import { GameArea } from "GameArea";
import { useRemoteConnection } from "connection";
import { useMovement } from "physics/useMovement";
import { useZoom, useMovementControl } from "controls/keypress";
import {
  scaleConfig,
  movementConfig,
  positionUpdateInterval,
  signalingUrl,
  defaultThrust
} from "config";

import "./styles.css";

const userMediaConstraints = { audio: true, video: true };

export default function App() {
  const restScale = useZoom(scaleConfig);
  const { stream, error, audioEnabled, videoEnabled } = useUserMedia(
    userMediaConstraints
  );
  const { acceleration } = useMovementControl(
    videoEnabled ? defaultThrust : 0.1 * defaultThrust
  );
  const movement = useMovement(acceleration, movementConfig);

  // TODO: Use this to make buttons :)
  useEffect(() => {
    if (stream) {
      setTimeout(() => {
        console.log("OFF");
        setEnabled("video", false, stream);
      }, 1000);
      setTimeout(() => {
        console.log("ON");
        setEnabled("video", true, stream);
      }, 3000);
    }
  }, [stream]);

  const { users, connectionId } = useRemoteConnection(
    signalingUrl,
    positionUpdateInterval,
    movement,
    stream
  );

  const isWaiting = !error && !stream;
  const reason = error
    ? error
    : stream && stream.getTracks().filter((t) => !t.enabled).length !== 0
    ? "Disabled"
    : null;

  return (
    <div className="App">
      {isWaiting ? (
        <h2>Waiting for webcam...</h2>
      ) : (
        <>
          <h2>Users</h2>
          <div>
            You ({connectionId ?? "No connection"}){" "}
            {!videoEnabled && `(No camera: ${reason})`}{" "}
            {!audioEnabled && `(No microphone: ${reason})`}
          </div>
          <div>
            {users.map((u) => (
              <div key={u.userId}>
                <div>
                  {u.userId} {!u.streams && "(no stream)"}
                </div>
              </div>
            ))}
          </div>
          <GameArea
            restScale={restScale}
            stream={stream}
            videoEnabled={videoEnabled}
            audioEnabled={audioEnabled}
            movement={movement}
            others={users}
          />
        </>
      )}
    </div>
  );
}
