import { EventEmitter } from "events";
import type { Readable } from "stream";
import WebSocket from "ws";

export interface SmallestConfig {
  apiKey: string;
  wsUrl: string;
  sampleRate?: number;
  language?: string;
  endpointing?: number;
}

export interface TranscriptEvent {
  type: "partial" | "final";
  text: string;
  confidence?: number;
}

export class SmallestTranscriber extends EventEmitter {
  #config: Required<SmallestConfig>;
  #ws: WebSocket | null = null;
  #audioStream: Readable | null = null;
  #connected = false;
  #pipingStarted = false;

  constructor(config: SmallestConfig) {
    super();
    this.#config = {
      sampleRate: 16000,
      language: "en",
      endpointing: 700,
      ...config,
    };
  }

  async connect(audioStream: Readable): Promise<void> {
    if (this.#connected) throw new Error("Already connected.");

    this.#audioStream = audioStream;

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.#config.wsUrl, {
        headers: { Authorization: `Bearer ${this.#config.apiKey}` },
      });

      this.#ws = ws;
      ws.on("message", this.#onMessage.bind(this));

      const markConnectedAndStart = (reason: string) => {
        if (this.#connected) return;
        this.#connected = true;
        console.log(`[SmallestTranscriber] Connected (${reason}).`);
        this.emit("connected");
        this.#startPiping();
        resolve();
      };

      const readyTimeout = setTimeout(() => {
        // Some servers never send a "ready" frame; don't hang waiting.
        markConnectedAndStart("timeout waiting for ready");
      }, 1500);

      ws.once("open", () => {
        console.log("[SmallestTranscriber] WebSocket open.");
        const initPayload = JSON.stringify({
          sample_rate: this.#config.sampleRate,
          language: this.#config.language,
          endpointing: this.#config.endpointing,
          encoding: "pcm_s16le",
        });

        ws.send(initPayload, (err) => {
          if (err) return reject(err);
          console.log("[SmallestTranscriber] Session config sent.");
          // If server accepts config silently, start streaming immediately.
          markConnectedAndStart("config sent");
        });
      });

      ws.once("message", (data: WebSocket.RawData) => {
        clearTimeout(readyTimeout);
        try {
          const msg = JSON.parse(data.toString()) as { type?: string; status?: string };
          if (msg.type === "ready" || msg.status === "ready") {
            markConnectedAndStart("server ready");
            return;
          }
        } catch {
          // ignore; treat any first message as an ok-to-stream signal
        }
        markConnectedAndStart("first message received");
      });

      ws.on("error", (err) => {
        clearTimeout(readyTimeout);
        this.emit("error", err);
        if (!this.#connected) reject(err);
      });

      ws.on("close", (code, reason) => {
        clearTimeout(readyTimeout);
        this.#connected = false;
        this.#ws = null;
        this.#pipingStarted = false;
        this.emit("closed");
        console.log(
          `[SmallestTranscriber] Socket closed — code=${code} reason=${reason.toString()}`,
        );
      });
    });
  }

  #startPiping(): void {
    if (this.#pipingStarted) return;
    this.#pipingStarted = true;
    const stream = this.#audioStream!;
    const ws = this.#ws!;

    stream.on("data", (chunk: Buffer) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(chunk, { binary: true }, (err) => {
          if (err) this.emit("error", err);
        });
      }
    });

    stream.on("end", () => {
      this.sendEndOfStream();
    });

    stream.on("error", (err) => {
      this.emit("error", err);
    });

    console.log("[SmallestTranscriber] Piping audio to WebSocket…");
  }

  #onMessage(data: WebSocket.RawData): void {
    try {
      const msg = JSON.parse(data.toString()) as {
        type?: string;
        is_final?: boolean;
        transcript?: string;
        text?: string;
        confidence?: number;
      };

      const text = msg.transcript ?? msg.text ?? "";
      if (!text) return;

      const event: TranscriptEvent = {
        type: msg.is_final || msg.type === "final" ? "final" : "partial",
        text,
        confidence: msg.confidence,
      };

      this.emit("transcript", event);
    } catch {
      // ignore non-JSON frames
    }
  }

  sendEndOfStream(): void {
    if (this.#ws?.readyState === WebSocket.OPEN) {
      this.#ws.send(JSON.stringify({ type: "end_of_stream" }));
    }
  }

  disconnect(): void {
    this.#audioStream?.destroy();
    this.#audioStream = null;

    if (this.#ws && this.#ws.readyState === WebSocket.OPEN) {
      this.sendEndOfStream();
      this.#ws.close(1000, "client disconnect");
    }

    this.#connected = false;
  }

  get connected(): boolean {
    return this.#connected;
  }
}

