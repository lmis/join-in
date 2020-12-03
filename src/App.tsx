import React from "react";
import { useUserMedia } from "userMedia/webcam";
import { ButtonArea } from "ButtonArea";
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
          <div className="header">
            <span className="header_logo">join-in</span>
            <span className="header_slogan">
              Come on in, grab a coffee and join us for some jibber-jabber and
              watercooler banter.
            </span>
          </div>
          <div className="left-side">
            Users:
            <br />
            You ({connectionId ?? "No connection"})
            <br />
            {!videoEnabled && `(No camera: ${reason})`}
            <br />
            {!audioEnabled && `(No microphone: ${reason})`}
            <br />
            {users.map((u) => (
              <div key={u.userId}>
                <div>
                  {u.userId} {!u.streams && "(no stream)"}
                </div>
              </div>
            ))}
          </div>
          <div className="main">
            <GameArea
              restScale={restScale}
              stream={stream}
              videoEnabled={videoEnabled}
              audioEnabled={audioEnabled}
              movement={movement}
              others={users}
            />
            {stream && (
              <ButtonArea
                stream={stream}
                audioEnabled={audioEnabled}
                videoEnabled={videoEnabled}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
