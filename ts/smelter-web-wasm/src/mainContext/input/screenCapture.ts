import type { Input, RegisterInputResult } from '../input';
import type { InstanceContext } from '../instance';

export class ScreenCaptureInput implements Input {
  private inputId: string;
  private ctx: InstanceContext;
  private mediaStream: MediaStream;

  constructor(inputId: string, mediaStream: MediaStream, ctx: InstanceContext) {
    this.inputId = inputId;
    this.ctx = ctx;
    this.mediaStream = mediaStream;
  }

  public async terminate(): Promise<void> {
    this.mediaStream.getTracks().forEach(track => track.stop());
    await this.ctx.audioMixer.removeInput(this.inputId);
  }
}

export async function handleRegisterScreenCaptureInput(
  ctx: InstanceContext,
  inputId: string
): Promise<RegisterInputResult> {
  const mediaStream = await navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: {
      width: { max: 2048 },
      height: { max: 2048 },
    },
  });
  const videoTrack = mediaStream.getVideoTracks()[0];
  const audioTrack = mediaStream.getAudioTracks()[0];
  const transferable = [];

  // @ts-ignore
  let videoTrackProcessor: MediaStreamTrackProcessor | undefined;
  if (videoTrack) {
    // @ts-ignore
    videoTrackProcessor = new MediaStreamTrackProcessor({ track: videoTrack });
    transferable.push(videoTrackProcessor.readable);
  }

  if (audioTrack) {
    ctx.audioMixer.addMediaStreamInput(inputId, audioTrack);
  }

  return {
    input: new ScreenCaptureInput(inputId, mediaStream, ctx),
    workerMessage: [
      {
        type: 'registerInput',
        inputId,
        input: {
          type: 'stream',
          videoStream: videoTrackProcessor.readable,
        },
      },
      transferable,
    ],
  };
}
