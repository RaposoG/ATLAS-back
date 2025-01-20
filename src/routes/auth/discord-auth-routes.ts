import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import axios from "axios";
import { prisma } from "@/lib/prisma";
import { BadRequestError } from "../_errors/bad-request-error";
import { env } from "node:process";

export async function discordAuthRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/auth/discord",
    {
      schema: {
        tags: ["Auth"],
        summary: "Start Discord OAuth2 Flow",
        description: "Redirects the user to the Discord login page for OAuth2 authentication.",
        response: {
          302: z.object({
            url: z.string(),
          }),
        },
      },
    },
    async (_, reply) => {
      const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
      const authorizationUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&scope=identify%20email`;

      return reply.redirect(authorizationUrl);
    }
  );

  app.withTypeProvider<ZodTypeProvider>().get(
    "/auth/discord/callback",
    {
      schema: {
        tags: ["Auth"],
        summary: "Handle Discord OAuth2 Callback",
        description: "Processes the authorization code returned by Discord to authenticate the user.",
        querystring: z.object({
          code: z.string(),
        }),
        response: {
          200: z.object({
            message: z.string(),
            token: z.string(),
          }),
          400: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { code } = request.query;

      if (!code) {
        throw new BadRequestError("Authorization code is missing");
      }

      try {
        const DISCORD_CLIENT_ID = env.DISCORD_CLIENT_ID!;
        const DISCORD_CLIENT_SECRET = env.DISCORD_CLIENT_SECRET!;
        const DISCORD_API_BASE = "https://discord.com/api";

        const tokenResponse = await axios.post(
          `${DISCORD_API_BASE}/oauth2/token`,
          new URLSearchParams({
            client_id: DISCORD_CLIENT_ID,
            client_secret: DISCORD_CLIENT_SECRET,
            grant_type: "authorization_code",
            code,
          }).toString(),
          {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          }
        );

        const { access_token, refresh_token } = tokenResponse.data;

        const userResponse = await axios.get(`${DISCORD_API_BASE}/users/@me`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });

        const { id: discordId, username, avatar, global_name, email } = userResponse.data;

        let user = await prisma.user.findUnique({
          where: { discordId },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              discordId,
              username,
              avatar,
              global_name,
              email,
              accessToken: access_token,
              refreshToken: refresh_token,
            },
          });
        } else {
          await prisma.user.update({
            where: { discordId },
            data: {
              accessToken: access_token,
              refreshToken: refresh_token,
            },
          });
        }

        const sessionToken = app.jwt.sign({ userId: user.id }, { expiresIn: "30d" });

        return reply.status(200).send({
          message: "Authentication successful",
          token: sessionToken,
        });
      } catch (error: any) {
        console.error("Discord Auth Error:", error.response?.data || error);
        throw new BadRequestError("Failed to authenticate with Discord");
      }
    }
  );
}
