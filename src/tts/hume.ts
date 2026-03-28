import { EventEmitter } from "node:events";
import { HumeClient } from "hume";
import player from "play-sound";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

export class Hume extends EventEmitter {
  private client: HumeClient | null;
  private audioPlayer: ReturnType<typeof player>;
  constructor() {
    super();
    this.client = null;
    this.audioPlayer = player();
  }

  async init() {
    if (!process.env.HUME_API_KEY) {
      throw new Error("HUME_API_KEY not found");
    }

    this.client = new HumeClient({
      apiKey: () => process.env.HUME_API_KEY,
    });
  }

  async connect() {
    await this.init();
  }

  async streamAudio(message: string): Promise<void> {
    if (!this.client) {
      throw new Error("Client not initialized");
    }

    try {
      const response = await this.client.tts.synthesizeJson({
        utterances: [{ text: message }],
        format: { type: "mp3" },
        numGenerations: 1,
      });

      const audioB64 = response.generations?.[0]?.audio;
      if (!audioB64) {
        throw new Error("No audio returned from Hume TTS");
      }

      const audioBuffer = Buffer.from(audioB64, "base64");

      const filePath = path.join(
        os.tmpdir(),
        `hume-tts-${Date.now()}-${Math.random().toString(16).slice(2)}.mp3`,
      );
      await fs.writeFile(filePath, audioBuffer);

      this.audioPlayer.play(filePath, (err: any) => {
        if (err) {
          this.emit("error", err);
        } else {
          this.emit("played", filePath);
        }
      });
    } catch (error) {
      console.log(error, "error");
      throw error;
    }
  }
}
