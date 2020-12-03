export interface SoundControl {
  getSpeakingIntensity: () => number;
  setOutputVolume: (x: number) => void;
}

export interface SoundControlConfig {
  minDecibels: number;
  maxDecibels: number;
  smoothingTimeConstant: number;
  fftSize: number;
  speakingBaseScore: number;
}

export const makeSoundControlFactory = ({
  minDecibels,
  maxDecibels,
  smoothingTimeConstant,
  fftSize,
  speakingBaseScore
}: SoundControlConfig) => {
  // Creating building audio nodes is expensive, we keep a cache by stream.id
  const soundControlByStreamId = new Map<string, SoundControl>();
  const createSoundControl = (stream: MediaStream): SoundControl => {
    const ctx = new AudioContext();
    const analyzer = ctx.createAnalyser();
    analyzer.minDecibels = minDecibels;
    analyzer.maxDecibels = maxDecibels;
    analyzer.smoothingTimeConstant = smoothingTimeConstant;
    analyzer.fftSize = fftSize;
    const dataArray = new Uint8Array(analyzer.frequencyBinCount);

    const outputGain = ctx.createGain();
    outputGain.gain.value = 0;

    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyzer).connect(outputGain).connect(ctx.destination);

    const soundControl = {
      getSpeakingIntensity: () => {
        analyzer.getByteFrequencyData(dataArray);
        const score = dataArray.reduce((acc, x) => acc + x, 0);
        return score / speakingBaseScore;
      },
      setOutputVolume: (x: number) => {
        outputGain.gain.value = x;
      }
    };
    soundControlByStreamId.set(stream.id, soundControl);
    return soundControl;
  };

  return (stream: MediaStream): SoundControl =>
    soundControlByStreamId.get(stream.id) ?? createSoundControl(stream);
};
