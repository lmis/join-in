/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import adapter from "webrtc-adapter";

export interface UserMedia {
  stream: MediaStream | null;
  error: Error | null;
}

export const useUserMedia = (
  constraints: MediaStreamConstraints
): UserMedia => {
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

// Creating video elements and setting sources is expensive, we keep a cache by stream.id
const videosByStreamId = new Map<string, HTMLVideoElement>();
const createVideoElement = (stream: MediaStream): HTMLVideoElement => {
  const video = document.createElement("video");
  videosByStreamId.set(stream.id, video);

  video.muted = true;
  video.autoplay = true;
  video.srcObject = stream;

  // Video must be rendered or the content will just remain black. This is a hack to render it invisibly at the end of the page
  video.height = 0;
  document.body.appendChild(video);

  return video;
};

export const toVideoElement = (stream: MediaStream): HTMLVideoElement =>
  videosByStreamId.get(stream.id) ?? createVideoElement(stream);
