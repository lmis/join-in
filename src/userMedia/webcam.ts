/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import { has } from "userMedia/mediaStream";
import { useEffect, useState } from "react";
import adapter from "webrtc-adapter";

export interface UserMedia {
  stream: MediaStream | null;
  videoEnabled: boolean;
  audioEnabled: boolean;
  error: string | null;
}

export const useUserMedia = (
  constraints: MediaStreamConstraints
): UserMedia => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);

  useEffect(() => {
    const id = setInterval(() => {
      setVideoEnabled(has("video", stream));
      setAudioEnabled(has("audio", stream));
    }, 50);
    return () => clearInterval(id);
  }, [stream]);

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
        setError(e.message);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [stream, constraints]);

  return { stream, error, videoEnabled, audioEnabled };
};
