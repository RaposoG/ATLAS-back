import { FastifyInstance } from "fastify";
import { fastifyPlugin } from "fastify-plugin";

export const auth = fastifyPlugin(async (app: FastifyInstance) => {
  app.decorateRequest("getCurrentUserId", async () => {
    return "";
  });

  app.addHook("preHandler", async (request, reply) => {
    request.getCurrentUserId = async () => {
      try {
        const { sub } = await request.jwtVerify<{ sub: string }>();
        return sub;
      } catch {
        throw new Error("Invalid token");
      }
    };
  });
});
