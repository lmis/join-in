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

export interface SoundSource {
  isSpeaking: () => boolean;
  setOutputVolume: (x: number) => void;
}

// Creating building audio nodes is expensive, we keep a cache by stream.id
const soundSourcesByStreamId = new Map<string, SoundSource>();
const createSoundSource = (stream: MediaStream): SoundSource => {
  const ctx = new AudioContext();
  const analyzer = ctx.createAnalyser();
  analyzer.minDecibels = -90;
  analyzer.maxDecibels = -10;
  analyzer.smoothingTimeConstant = 0.05;
  analyzer.fftSize = 256;
  const dataArray = new Uint8Array(analyzer.frequencyBinCount);

  const outputGain = ctx.createGain();
  outputGain.gain.value = 0;

  const source = ctx.createMediaStreamSource(stream);
  source.connect(analyzer).connect(outputGain).connect(ctx.destination);

  const soundSource = {
    isSpeaking: () => {
      analyzer.getByteFrequencyData(dataArray);
      const score = dataArray.reduce((acc, x) => acc + x, 0);
      return score > 2000;
    },
    setOutputVolume: (x: number) => {
      outputGain.gain.value = x;
    }
  };
  soundSourcesByStreamId.set(stream.id, soundSource);
  return soundSource;
};
export const toSoundSource = (stream: MediaStream): SoundSource =>
  soundSourcesByStreamId.get(stream.id) ?? createSoundSource(stream);

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
