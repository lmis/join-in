/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import React, { useEffect, useState, useMemo } from "react";
import { useVideoRef, useUserMedia } from "./webcam";
import { Sketch } from "./Sketch";
import { useRemoteConnection } from "./connection";
import "./styles.css";
import adapter from "webrtc-adapter";

export default function App() {
  const constraints = useMemo(() => ({ audio: true, video: true }), []);
  const { stream, error } = useUserMedia(constraints);
  const { usersById } = useRemoteConnection(
    "https://lezte.sse.codesandbox.io/",
    stream
  );
  const other = [...usersById.values()][0];
  const selfVideoRef = useVideoRef(stream);
  const otherVideoRef = useVideoRef(other?.streams?.[0] ?? null);

  return (
    <div className="App">
      <h1>Welcome and join-in!</h1>
      {error ? (
        <>
          <h2>Cannot get webcam access.</h2>
          <p>Error: {error.message}</p>
        </>
      ) : (
        <>
          <div>
            <video ref={selfVideoRef} muted autoPlay />
          </div>
          <h2>Other</h2>
          <div>
            <video ref={otherVideoRef} muted autoPlay />
          </div>
        </>
      )}
      {/* <Sketch videoRef={videoRef} /> */}
    </div>
  );
}
