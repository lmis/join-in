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

export const useVideoRef = (
  stream: MediaStream | null
): MutableRefObject<HTMLVideoElement | null> => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  return videoRef;
};

export const useVideoRefs = (
  streams: MediaStream[] = []
): MutableRefObject<HTMLVideoElement>[] => {
  const [refs, setRefs] = useState<MutableRefObject<HTMLVideoElement>[]>([]);

  useEffect(() => {
    setRefs((rs) => {
      const refsWithStream = streams.map(
        (s, i) =>
          [rs[i] || createRef(), s] as [
            MutableRefObject<HTMLVideoElement>,
            MediaStream
          ]
      );
      refsWithStream.forEach(([r, s]) => {
        if (r.current) {
          r.current.srcObject = s;
        }
      });
      return refsWithStream.map(([r, s]) => r);
    });
  }, [streams.length]);

  return refs;
};
