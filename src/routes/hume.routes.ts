import { FastifyInstance } from "fastify";
import { HumeController } from "../controllers/humeController.js";

export async function PlayHumeAudio(app: FastifyInstance) {
  app.post("/play-hume-audio", HumeController);
}
