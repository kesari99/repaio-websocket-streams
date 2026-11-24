import dotenv from "dotenv";
import { ExotelClient, ExotelError } from "../clients/ExotelClient.js";

dotenv.config();

const DEFAULT_PUBLIC_BASE_URL =
  "https://dingo-suitable-accurately.ngrok-free.app";

interface ExotelCallBody {
  to?: string;
  from?: string;
  voiceAppId?: string;
  webhookUrl?: string;
  recordCall?: boolean;
  callType?: "trans" | "promo";
  maxRetries?: number;
}

export async function createExotelCallHandler(request: any, reply: any) {
  try {
    const accountSid = process.env.EXOTEL_ACCOUNT_SID;
    const apiKey = process.env.EXOTEL_API_KEY;
    const apiToken = process.env.EXOTEL_API_TOKEN;
    const callerId = process.env.EXOTEL_CALLER_ID; // your Exotel virtual number
    const voiceAppId = process.env.EXOTEL_VOICE_APP_ID; // App that streams audio to your WS

    const publicBaseUrl = (
      process.env.PUBLIC_BASE_URL ?? DEFAULT_PUBLIC_BASE_URL
    ).replace(/\/+$/, "");

    const statusCallback =
      process.env.EXOTEL_STATUS_CALLBACK_URL ??
      `${publicBaseUrl}/exotel-status`;

    if (!accountSid || !apiKey || !apiToken || !callerId || !voiceAppId) {
      return reply.status(500).send({
        error:
          "Missing Exotel configuration. Required: EXOTEL_ACCOUNT_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_CALLER_ID, EXOTEL_VOICE_APP_ID",
      });
    }

    const body: ExotelCallBody = (request.body ?? {}) as ExotelCallBody;
    const to = body.to ?? "+919381756966";
    const from = body.from ?? callerId;

    const exotel = new ExotelClient({
      accountSid,
      apiKey,
      apiToken,
    });

    const sid = await exotel.call(to, from, {
      voiceAppId: body.voiceAppId ?? voiceAppId,
      webhookUrl: body.webhookUrl ?? statusCallback,
      recordCall: body.recordCall ?? true,
      callType: body.callType ?? "trans",
      maxRetries: body.maxRetries ?? 3,
    });

    console.log("Exotel call created with SID:", sid, {
      to,
      from,
      statusCallback,
      streamUrl: `${publicBaseUrl.replace(/^http/, "ws")}/exotel-stream`,
    });
    return reply.send({ sid, statusCallback });
  } catch (error) {
    if (error instanceof ExotelError) {
      console.error("Exotel error:", error.message, {
        code: error.code,
        status: error.status,
      });
      return reply.status(error.status ?? 500).send({
        error: "Failed to create Exotel call",
        code: error.code,
        message: error.message,
      });
    }

    console.error("Error creating Exotel call:", error);
    return reply.status(500).send({
      error: "Failed to create Exotel call",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
