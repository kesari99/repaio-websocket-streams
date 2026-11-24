import record from "node-record-lpcm16";
import type { Readable } from "stream";

export interface MicRecorderOptions {
  sampleRate?: number;
  channels?: number;
  threshold?: number;
  audioType?: string;
  recorder?: string;
}

export class MicRecorder {
  #recording: ReturnType<typeof record.record> | null = null;
  #options: Required<MicRecorderOptions>;

  constructor(options: MicRecorderOptions = {}) {
    this.#options = {
      sampleRate: options.sampleRate ?? 16000,
      channels: options.channels ?? 1,
      threshold: options.threshold ?? 0,
      audioType: options.audioType ?? "raw",
      recorder: options.recorder ?? "sox",
    };
  }

  start(): Readable {
    if (this.#recording) {
      throw new Error("Recording already in progress. Call stop() first.");
    }

    this.#recording = record.record({
      sampleRate: this.#options.sampleRate,
      channels: this.#options.channels,
      threshold: this.#options.threshold,
      audioType: this.#options.audioType,
      recorder: this.#options.recorder,
    });

    const stream = this.#recording.stream();

    stream.on("error", (err: Error) => {
      console.error("[MicRecorder] Stream error:", err.message);
    });

    console.log(
      `[MicRecorder] Started — ${this.#options.sampleRate}Hz, ${this.#options.channels}ch, recorder=${this.#options.recorder}`,
    );

    return stream;
  }

  stop(): void {
    if (!this.#recording) return;
    this.#recording.stop();
    this.#recording = null;
    console.log("[MicRecorder] Stopped.");
  }

  get isRecording(): boolean {
    return this.#recording !== null;
  }
}
