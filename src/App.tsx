/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import React, { useEffect, useState, useMemo } from "react";
import { useVideoRef, useVideoRefs, useUserMedia } from "./webcam";
import { Sketch } from "./Sketch";
import { useRemoteConnection } from "./connection";
import "./styles.css";
import adapter from "webrtc-adapter";

export default function App() {
  const constraints = useMemo(() => ({ audio: true, video: true }), []);
  const { stream, error } = useUserMedia(constraints);
  const { yourId, usersById } = useRemoteConnection(
    "https://lezte.sse.codesandbox.io/",
    stream
  );
  const others = [...usersById.values()].filter((u) => u.streams);
  const selfVideoRef = useVideoRef(stream);
  const otherVideoRef = useVideoRefs(others.map((u) => u.streams![0]));

  return (
    <div className="App" >
      {error ? (
        <>
          <h2>Cannot get webcam access.</h2>
          <p>Error: {error.message}</p>
        </>
      ) : (
        <>
          <h2>Users</h2>
          <div>
            {others.map((u) => (
              <div key={u.userId}>
                <div>{u.userId}</div>
                <div>Video: {u.streams ? "yes" : "no"}</div>
              </div>
            ))}
          </div>
          <h2>You ({yourId})</h2>
          <div>
            <video ref={selfVideoRef} muted autoPlay />
          </div>
          {others.map(({ userId }, i) => {
            return (
              <div key={i}>
                <h2>Other ({userId})</h2>
                <div>
                  <video ref={otherVideoRef[i]} muted autoPlay />
                </div>
              </div>
            );
          })}
        </>
      )}
      <Sketch videoRef={selfVideoRef} />
    </div>
  );
}
