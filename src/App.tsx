/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import React, { useRef, useEffect, useState, useMemo } from "react";
import { isEqual } from "lodash";
import "./styles.css";
import adapter from "webrtc-adapter";

const useUserMedia = (constraints: MediaStreamConstraints) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        var s = await navigator.mediaDevices.getUserMedia(constraints);
        if (!stream) {
          setStream(s);
        }
        setError(null);
      } catch (e) {
        setStream(null);
        setError(e);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [stream, constraints]);

  return { stream, error };
};

export default function App() {
  const constraints = useMemo(() => ({ audio: true, video: true }), []);
  const { stream, error } = useUserMedia(constraints);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  return (
    <div className="App">
      <h1>Hello CodeSandbox</h1>
      {error && (
        <>
          <h2>Cannot get webcam access.</h2>
          <p>Error: {error.message}</p>
        </>
      )}
      {stream && <video ref={videoRef} muted autoPlay />}
    </div>
  );
}
