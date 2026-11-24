import { FastifyInstance } from "fastify";

export async function smallestFileUpload(app: FastifyInstance) {
  app.post("/u", async (_req, reply) => {
    return reply.send({ ok: true });
  });
}
