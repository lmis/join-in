/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import React, { useEffect, useState, useMemo } from "react";
import { useWebcam } from "./webcam";
import { Sketch } from "./Sketch";
import {useSignalingServer} from "./signaling";
import "./styles.css";
import adapter from "webrtc-adapter";

export default function App() {
  const constraints = useMemo(() => ({ audio: true, video: true }), []);
  const { videoRef, error } = useWebcam(constraints);
  const {userIds} = useSignalingServer("https://occ8f.sse.codesandbox.io/");

  return (
    <div className="App">
      <h1>Hello CodeSandbox</h1>
      {JSON.stringify(userIds)}
      {error ? (
        <>
          <h2>Cannot get webcam access.</h2>
          <p>Error: {error.message}</p>
        </>
      ) : (
        <video ref={videoRef} muted autoPlay />
      )}
      <Sketch videoRef={videoRef} />
    </div>
  );
}
