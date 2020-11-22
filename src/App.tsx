/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import React, { useState, useMemo } from "react";
import { useUserMedia } from "webcam";
import { Sketch } from "Sketch";
import { useRemoteConnection } from "connection";
import { Position } from "utils";

import "./styles.css";

export default function App() {
  const constraints = useMemo(() => ({ audio: true, video: true }), []);
  const [position, setPosition] = useState<Position>([430, 100]);
  // TODO: we don't need high res quality for all of these!
  const { stream, error } = useUserMedia(constraints);
  const { users, connectionId } = useRemoteConnection(
    "https://ofk29.sse.codesandbox.io/",
    position,
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
      <Sketch
        position={position}
        setPosition={setPosition}
        others={others}
        stream={stream}
      />
    </div>
  );
}
