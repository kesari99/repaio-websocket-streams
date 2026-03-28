import { FastifyInstance } from "fastify";
import { sendMessage } from "../controllers/aiController.js";

export function AIRoutes(app: FastifyInstance) {
  app.post("/send-message", sendMessage);
}
