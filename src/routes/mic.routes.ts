import type { FastifyInstance } from "fastify";
import { MicRecorder } from "../mic/mic-recorder.js";
import { SmallestTranscriber } from "../stt/smallest-transcriber.js";

let recorder: MicRecorder | null = null;
let transcriber: SmallestTranscriber | null = null;

export async function MicRoutes(app: FastifyInstance) {
  app.post<{
    Body: { apiKey?: string; wsUrl?: string; language?: string };
  }>("/mic/start", async (req, reply) => {
    if (recorder?.isRecording) {
      return reply.status(409).send({ error: "Recording already active." });
    }

    const apiKey = req.body?.apiKey ?? process.env.SMALLEST_API_KEY;
    const language = req.body?.language ?? "en";
    const wsUrl =
      req.body?.wsUrl ??
      process.env.SMALLEST_WS_URL ??
      `wss://api.smallest.ai/waves/v1/pulse/get_text?language=${encodeURIComponent(language)}`;

    if (!apiKey) {
      return reply.status(400).send({ error: "SMALLEST_API_KEY is required." });
    }

    try {
      recorder = new MicRecorder({
        sampleRate: 16000,
        channels: 1,
        threshold: 0,
        audioType: "raw",
        recorder: "sox",
      });

      transcriber = new SmallestTranscriber({
        apiKey,
        wsUrl,
        sampleRate: 16000,
        language,
        endpointing: 700,
      });

      console.log("[MicRoutes] Using Smallest wsUrl:", wsUrl);

      transcriber.on("transcript", (event) => {
        const prefix = event.type === "final" ? "[FINAL]" : "[partial]";
        console.log(`${prefix} ${event.text}`);
      });

      transcriber.on("error", (err: Error) => {
        console.error("[SmallestTranscriber] Error:", err.message);
      });

      transcriber.on("connected", () => {
        console.log("[SmallestTranscriber] Connected and ready.");
      });

      transcriber.on("closed", () => {
        console.log("[SmallestTranscriber] Connection closed.");
        recorder = null;
        transcriber = null;
      });

      const audioStream = recorder.start();
      await transcriber.connect(audioStream);

      return reply.send({ status: "started", wsUrl, language });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      recorder?.stop();
      recorder = null;
      transcriber = null;
      return reply.status(500).send({ error: message });
    }
  });

  app.post("/mic/stop", async (_req, reply) => {
    if (!recorder?.isRecording) {
      return reply.status(409).send({ error: "No active recording." });
    }

    transcriber?.disconnect();
    recorder?.stop();
    recorder = null;
    transcriber = null;

    return reply.send({ status: "stopped" });
  });

  app.get("/mic/status", async (_req, reply) => {
    return reply.send({
      recording: recorder?.isRecording ?? false,
      transcribing: transcriber?.connected ?? false,
    });
  });
}

