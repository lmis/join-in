import React, { useEffect, useState } from "react";
import { useUserMedia } from "userMedia/webcam";
import { hasAudio, hasVideo, setEnabled } from "userMedia/mediaStream";
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
  const { stream, error } = useUserMedia(userMediaConstraints);
  const [thrust, setThrust] = useState<number>(defaultThrust);
  const { acceleration } = useMovementControl(thrust);
  // stream && hasVideo(stream) ? defaultThrust : 0.1 * defaultThrust
  const movement = useMovement(acceleration, movementConfig);

  useEffect(() => {
    const id = setInterval(() => {
      if (stream && hasVideo(stream)) {
        setThrust(defaultThrust);
      } else {
        setThrust(0.1 * defaultThrust);
      }
    }, 50);
    return () => clearInterval(id);
  }, [stream]);

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
  const videoReady = stream && hasVideo(stream);
  const audioReady = stream && hasAudio(stream);
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
            {!videoReady && `(No camera: ${reason})`}{" "}
            {!audioReady && `(No microphone: ${reason})`}
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
            movement={movement}
            others={users}
          />
        </>
      )}
    </div>
  );
}
