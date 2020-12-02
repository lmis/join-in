/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import React, { useEffect } from "react";
import { hasAudio, hasVideo, toStreamControl, useUserMedia } from "webcam";
import { GameArea } from "GameArea";
import { useRemoteConnection } from "connection";
import { useMovement } from "physics";
import { useZoom, useMovementControl } from "keypress";
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
  const { stream, error } = useUserMedia(userMediaConstraints);
  const { acceleration } = useMovementControl(
    stream && hasVideo(stream) ? defaultThrust : 0.1 * defaultThrust
  );
  const getMovement = useMovement(acceleration, movementConfig);

  // TODO: Use this to make buttons :)
  useEffect(() => {
    if (stream) {
      setTimeout(() => {
        console.log("OFF");
        toStreamControl(stream).setVideoEnabled(false);
      }, 1000);
      setTimeout(() => {
        console.log("ON");
        toStreamControl(stream).setVideoEnabled(true);
      }, 3000);
    }
  }, [stream]);

  const { users, connectionId } = useRemoteConnection(
    signalingUrl,
    positionUpdateInterval,
    getMovement,
    stream
  );

  const isWaiting = !error && !stream;
  const videoReady = stream && hasVideo(stream);
  const audioReady = stream && hasAudio(stream);

  return (
    <div className="App">
      {isWaiting ? (
        <h2>Waiting for webcam...</h2>
      ) : (
        <>
          <h2>Users</h2>
          <div>
            You ({connectionId ?? "No connection"}){" "}
            {!videoReady && `(No camera: ${error})`}{" "}
            {!audioReady && `(No microphone: ${error})`}
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
            getMovement={getMovement}
            others={users}
          />
        </>
      )}
    </div>
  );
}
