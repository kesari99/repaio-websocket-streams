import { FastifyInstance } from "fastify";
import { PassThrough } from "stream";
import { SmallestTranscriber } from "../stt/smallest-transcriber.js";
import {
  convertMuLawToPCM,
  upsampleTo16kHz,
} from "../utils/convertTo16bitPCM.js";

/**
 * Registers a websocket route that Exotel's Voicebot applet streams audio to.
 *
 * The Voice App configured at `EXOTEL_VOICE_APP_ID` should be set up so its
 * Voicebot applet streams to: `wss://<your-host>/exotel-stream`.
 *
 * Exotel's Voicebot envelope mirrors Twilio's media-stream protocol:
 *   { event: "start"|"media"|"stop", streamSid, media: { payload: <base64> } }
 *
 * Audio is delivered as 8 kHz mu-law. We decode to PCM s16le and upsample to
 * 16 kHz before feeding the SmallestTranscriber.
 */
export async function registerExotelMediaStream(app: FastifyInstance) {
  app.get("/exotel-stream", { websocket: true }, (connection, req) => {
    console.log("[Exotel] New WebSocket connection from Exotel Voicebot");

    const apiKey = process.env.SMALLEST_API_KEY;
    const language = process.env.SMALLEST_LANGUAGE ?? "en";
    const wsUrl =
      process.env.SMALLEST_WS_URL ??
      `wss://api.smallest.ai/waves/v1/pulse/get_text?language=${encodeURIComponent(language)}`;

    if (!apiKey) {
      console.error("[Exotel] SMALLEST_API_KEY missing — closing socket.");
      connection.close(1011, "SMALLEST_API_KEY missing");
      return;
    }

    let streamSid: string | null = null;
    let callSid: string | null = null;
    let transcriber: SmallestTranscriber | null = null;
    const audioStream = new PassThrough();

    const cleanup = () => {
      try {
        transcriber?.disconnect();
      } catch {
        /* noop */
      }
      try {
        audioStream.end();
      } catch {
        /* noop */
      }
      transcriber = null;
    };

    connection.on("message", async (raw) => {
      let data: any;
      try {
        data = JSON.parse(raw.toString());
      } catch (err) {
        console.error("[Exotel] Non-JSON frame ignored:", err);
        return;
      }

      switch (data.event) {
        case "connected":
          console.log("[Exotel] connected event");
          break;

        case "start": {
          streamSid = data.start?.stream_sid ?? data.start?.streamSid ?? null;
          callSid = data.start?.call_sid ?? data.start?.callSid ?? null;
          console.log("[Exotel] Stream started:", { streamSid, callSid });

          transcriber = new SmallestTranscriber({
            apiKey,
            wsUrl,
            sampleRate: 16000,
            language,
            endpointing: 700,
          });

          transcriber.on("transcript", (event) => {
            const prefix = event.type === "final" ? "[FINAL]" : "[partial]";
            console.log(
              `[Exotel→Smallest] ${prefix} (${callSid ?? streamSid}) ${event.text}`,
            );
          });

          transcriber.on("error", (err: Error) => {
            console.error("[Exotel→Smallest] error:", err.message);
          });

          transcriber.on("connected", () => {
            console.log("[Exotel→Smallest] transcriber connected");
          });

          transcriber.on("closed", () => {
            console.log("[Exotel→Smallest] transcriber closed");
          });

          try {
            await transcriber.connect(audioStream);
          } catch (err) {
            console.error(
              "[Exotel] Failed to connect SmallestTranscriber:",
              err,
            );
            cleanup();
            connection.close(1011, "transcriber connection failed");
          }
          break;
        }

        case "media": {
          const payload: string | undefined = data.media?.payload;
          if (!payload) return;

          const muLawBuffer = Buffer.from(payload, "base64");
          const pcm8k = convertMuLawToPCM(muLawBuffer);
          const pcm16k = upsampleTo16kHz(pcm8k);

          if (!audioStream.destroyed) {
            audioStream.write(pcm16k);
          }
          break;
        }

        case "stop":
          console.log("[Exotel] Stream stopped");
          cleanup();
          break;

        default:
          // mark / clear / unknown — safe to ignore
          break;
      }
    });

    connection.on("close", () => {
      console.log("[Exotel] WebSocket closed");
      cleanup();
    });

    connection.on("error", (err) => {
      console.error("[Exotel] WebSocket error:", err);
      cleanup();
    });
  });
}
