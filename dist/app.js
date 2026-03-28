import fastify from "fastify";
import fastifyFormBody from "@fastify/formbody";
import fastifyWs from "@fastify/websocket";
import dotenv from "dotenv";
import twilio from "twilio";
import { registerMediaStream } from "./websockets/mediastreamHandler.js";
import { callRoutes } from "./routes/callRoutes.js";
import { AIRoutes } from "./routes/airoutes.js";
import { PlayHumeAudio } from "./routes/hume.routes.js";
import { GrokRoutes } from "./routes/grok.routes.js";
// Load environment variables first
dotenv.config();
const port = Number(process.env.PORT) || 8080;
// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);
// Function to create outbound call
// Initialize fastify app
const app = fastify();
app.register(fastifyFormBody);
app.register(fastifyWs);
const transcriberMap = new Map();
// const server = createServer(app.server);
// setUpWebSocket(server);
app.get("/", (req, res) => {
    res.send("Hello World! Twillo server with WebSocket is configured.");
});
app.register(callRoutes);
app.register(AIRoutes);
app.register(PlayHumeAudio);
app.register(GrokRoutes);
// Example using Express
app.get("/plivo-answer", (req, res) => {
    const response = `
    <Response>
  <Connect>
              <Stream url="wss://dingo-suitable-accurately.ngrok-free.app/media-stream"/>
          </Connect>
          <Pause length="3600"/>    </Response>
  `;
    return res.header("Content-Type", "text/xml").send(response);
});
app.get("/incomming-call", async (req, res) => {
    console.log("req.headers.host", req.headers.host, req.body);
    return res.send("Hello World! Twillo server with WebSocket is configured.");
});
app.register(async function (app) {
    await registerMediaStream(app, (streamSid) => transcriberMap.get(streamSid) || null);
});
export function registerTranscriber(streamSid, transcriber) {
    transcriberMap.set(streamSid, transcriber);
}
// Start the server
app.listen({ port: port }, (err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Web Server is running on port ${port}`);
});
