export const hasVideo = (stream: MediaStream): boolean =>
  stream.getVideoTracks().filter((t) => t.enabled).length !== 0;

export const hasAudio = (stream: MediaStream): boolean =>
  stream.getAudioTracks().filter((t) => t.enabled).length !== 0;

export const setEnabled = (
  kind: "video" | "audio",
  enabled: boolean,
  stream: MediaStream
): void => {
  stream
    .getTracks()
    .filter((t) => t.kind === kind)
    .forEach((t) => {
      t.enabled = enabled;
    });
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
