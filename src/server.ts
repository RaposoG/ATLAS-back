import { jsonSchemaTransform, serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";
import { fastify } from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import fastifyJwt from "@fastify/jwt";
import fastifyCors from "@fastify/cors";
import { env } from "@/env";
import { errorHandler } from "./error-handler";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { discordAuthRoutes } from "./routes/auth/discord-auth-routes";
import os from "os";

const app = fastify({
  logger: env.NODE_ENV === "dev",
}).withTypeProvider<ZodTypeProvider>();

app.setSerializerCompiler(serializerCompiler);
app.setValidatorCompiler(validatorCompiler);

app.setErrorHandler(errorHandler);

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Api BackEndTsFull",
      description: "Api BackEndTsFull",
      version: "0.0.1",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  transform: jsonSchemaTransform,
});

app.register(fastifySwaggerUI, {
  routePrefix: "/docs",
});

app.register(fastifyJwt, {
  secret: env.SECRET_JWT,
});

app.register(fastifyCors);

// Recomendo registrar as rotas daqui para baixo.

//Auth
app.register(discordAuthRoutes);

function getNetworkAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses: { name: string; address: string }[] = [];

  for (const name in interfaces) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        addresses.push({ name, address: iface.address });
      }
    }
  }

  return addresses;
}

app
  .listen({ port: env.PORT, host: "0.0.0.0" })
  .then(() => {
    console.log(`Server is running on port ${env.PORT}`);
    const networkAddresses = getNetworkAddresses();

    console.log("Server is available at the following addresses:");
    networkAddresses.forEach(({ name, address }) => {
      console.log(`- ${name}: http://${address}:${env.PORT}`);
    });

    console.log(`Local: http://localhost:${env.PORT}`);
  })
  .catch((error) => {
    console.error("Error starting server:", error);
  });
