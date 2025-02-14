import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["dev", "test", "production"]).default("dev"),
  PORT: z.coerce.number().default(3434),
  SECRET_JWT: z.string(),
  DATABASE_URL: z.string(),
  DISCORD_CLIENT_ID: z.string(),
  DISCORD_CLIENT_SECRET: z.string(),
  DISCORD_TOKEN_BOX: z.string(),
  DISCORD_GUILD_ID: z.string(),
  DISCORD_REDIRECT_URI: z.string(),
});

const _env = envSchema.safeParse(process.env);

if (_env.success === false) {
  console.error("❌ Invalid environment variables ", _env.error.format());

  throw new Error("❌ Invalid environment variables ");
}

export const env = _env.data;
