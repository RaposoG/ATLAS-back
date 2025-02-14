import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import axios from "axios";
import { prisma } from "@/lib/prisma";
import { BadRequestError } from "../_errors/bad-request-error";
import { env } from "@/env";
import { EmbedBuilder, TextChannel } from "discord.js";
import { client } from "@/bot";
import { auth } from "@/middlewares/auth";

async function sendDiscordLog(channelId: string, title: string, description: string, color: number = 0x0099ff) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (channel && channel instanceof TextChannel) {
      const embed = new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setTimestamp();
      await channel.send({ embeds: [embed] });
    } else {
      console.error("Canal não encontrado ou não é um canal de texto.");
    }
  } catch (error) {
    console.error("Erro ao enviar mensagem para o Discord:", error);
  }
}

export async function getUser(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      "/auth/me",
      {
        schema: {
          tags: ["Auth"],
          summary: "Get user authenticated",
          description: " depois eu faço", //TODO: arrumar descrição
          security: [{ bearerAuth: [] }],
          response: {
            200: z.object({
              id: z.string(),
              discordId: z.string(),
              username: z.string(),
              global_name: z.string().nullable(),
              avatar: z.string().nullable(),
              email: z.string().nullable(),
              accessToken: z.string(),
              refreshToken: z.string(),
              createdAt: z.date(),
              updatedAt: z.date(),
            }),
            401: z.object({
              message: z.string(),
            }),
            400: z.object({
              message: z.string(),
            }),
          },
        },
      },
      async (request, reply) => {
        const userId = await request.getCurrentUserId();

        if (!userId) {
          return reply.status(401).send({ message: "Invalid token" });
        }

        const user = await prisma.user.findUnique({
          where: {
            id: userId,
          },
        });

        if (!user) {
          return reply.status(400).send({ message: "User not exist" });
        }

        return reply.status(200).send(user);
      }
    );
}
