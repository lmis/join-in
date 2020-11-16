/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import {
  useRef,
  useEffect,
  useState,
  MutableRefObject,
  createRef
} from "react";
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

export interface Webcam extends UserMedia {
  videoRef: MutableRefObject<HTMLVideoElement>;
}

const videosByStreamId = new Map<string, HTMLVideoElement>();
export const toVideoElement = (stream: MediaStream): HTMLVideoElement => {
  const video = videosByStreamId.get(stream.id);
  if (video) {
    return video;
  }
  const newVideo = document.createElement("video");
  newVideo.muted = true;
  newVideo.autoplay = true;
  newVideo.srcObject = stream;
  newVideo.height = 0;
  document.body.appendChild(newVideo);
  videosByStreamId.set(stream.id, newVideo);
  return newVideo;
};
