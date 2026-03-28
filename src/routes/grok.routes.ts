import { FastifyInstance } from "fastify";
import { grokSendMessage } from "../controllers/grokController.js";

export async function GrokRoutes(app: FastifyInstance) {
  app.post("/grok-send-message", grokSendMessage);
}

