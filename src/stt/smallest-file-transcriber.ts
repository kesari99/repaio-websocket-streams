import { EventEmitter } from "events";
import WebSocket, { WebSocket as WSClient } from "ws";

class SmallestFileTranscriber extends EventEmitter {
  #apiKey: string;
  #ws: WSClient | null;
  #isConnected: boolean = false;

  constructor() {
    super();
    const apiKey = process.env.SMALLEST_API_KEY;
    if (!apiKey) {
      throw new Error("SMALLEST_API_KEY environment variable is required");
    }
    this.#apiKey = apiKey;
    this.#ws = null;
  }

  connect() {
    const url = "wss://api.smallest.ai/waves/v1/pulse/get_text?language=en";

    this.#ws = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${this.#apiKey}`,
      },
    });
    this.#ws.on("open", () => {
      console.log("Connected to Smallest Pulse STT websocket");
      this.emit("open");
    });

    this.#ws.on("message", (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        console.log("Transcript:", parsed);
        this.emit("transcript", parsed);
      } catch (error) {
        this.emit("error", error);
      }
    });

    this.#ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      this.emit("error", error);
    });

    this.#ws.on("close", () => {
      console.log("WebSocket closed");
      this.emit("close");
    });
  }

  sendAudioDataChunk(chunk: Buffer) {
    if (!this.#ws || this.#ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    this.#ws.send(chunk);
  }

  disconnect() {
    if (this.#ws) {
      this.#ws.close();
    }
  }
}

export { SmallestFileTranscriber };
