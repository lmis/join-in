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
  const { yourId, usersById } = useRemoteConnection(
    "https://czof1.sse.codesandbox.io/",
    stream
  );
  const others = [...usersById.values()].filter((u) => u.streams);


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
          <div>You ({yourId})</div>
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
      <Sketch others={others} stream={stream} />
    </div>
  );
}
