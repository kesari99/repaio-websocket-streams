declare module "node-record-lpcm16" {
  import type { Readable } from "stream";

  export type RecordOptions = {
    sampleRate?: number;
    channels?: number;
    threshold?: number;
    audioType?: string;
    recorder?: string;
    device?: string;
    silence?: string;
    endOnSilence?: boolean;
    verbose?: boolean;
  };

  export type Recording = {
    stream(): Readable;
    stop(): void;
  };

  export function record(options?: RecordOptions): Recording;

  const _default: { record: typeof record };
  export default _default;
}

