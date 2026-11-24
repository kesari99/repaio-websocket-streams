// routes/callRoutes.ts
import { FastifyInstance } from "fastify";
import { createTwilloCallHandler } from "../controllers/twilloController.js";
import { createPlivoCallHandler } from "../controllers/plivoController.js";
import { createExotelCallHandler } from "../controllers/exotelController.js";

export async function callRoutes(app: FastifyInstance) {
  app.post("/make-call-twillo", createTwilloCallHandler);
  app.post("/make-call-plivo", createPlivoCallHandler);
  app.post("/make-call-exotel", createExotelCallHandler);
}
