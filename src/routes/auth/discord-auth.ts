import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import axios from "axios";
import { prisma } from "@/lib/prisma";
import { BadRequestError } from "../_errors/bad-request-error";
import { env } from "@/env";
import { EmbedBuilder, TextChannel } from "discord.js";
import { client } from "@/bot";

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

export async function discordAuthRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/auth/discord",
    {
      schema: {
        tags: ["Auth"],
        summary: "Handle Discord OAuth2 Callback",
        description: "Processes the authorization code returned by Discord to authenticate the user.",
        body: z.object({
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
      const { code } = request.body;
      const discordLogChannelId = "1339782869526122606";

      if (!code) {
        await sendDiscordLog(discordLogChannelId, "Falha no Login", "Código de autorização ausente.", 0xff0000);
        throw new BadRequestError("Authorization code is missing");
      }

      try {
        const DISCORD_CLIENT_ID = env.DISCORD_CLIENT_ID!;
        const DISCORD_CLIENT_SECRET = env.DISCORD_CLIENT_SECRET!;
        const DISCORD_API_BASE = "https://discord.com/api";
        const DISCORD_BOT_TOKEN = env.DISCORD_TOKEN_BOX;
        const DISCORD_GUILD_ID = env.DISCORD_GUILD_ID;
        const DISCORD_REDIRECT_URI = env.DISCORD_REDIRECT_URI;

        const tokenResponse = await axios.post(
          `${DISCORD_API_BASE}/oauth2/token`,
          new URLSearchParams({
            client_id: DISCORD_CLIENT_ID,
            client_secret: DISCORD_CLIENT_SECRET,
            grant_type: "authorization_code",
            code,
            redirect_uri: DISCORD_REDIRECT_URI,
          }).toString(),
          {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          }
        );

        const { access_token } = tokenResponse.data;

        const userResponse = await axios.get(`${DISCORD_API_BASE}/users/@me`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });

        const { id: discordId, username } = userResponse.data;

        try {
          await axios.get(`${DISCORD_API_BASE}/guilds/${DISCORD_GUILD_ID}/members/${discordId}`, {
            headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
          });
        } catch (error: any) {
          console.error("User not in Discord Guild:", error.response?.data || error);
          await sendDiscordLog(discordLogChannelId, "Falha no Login", `Usuário ${username} (ID: ${discordId}) não está no servidor.`, 0xff0000);
          throw new BadRequestError("User is not a member of the required Discord guild.");
        }

        const { avatar, global_name, email } = userResponse.data;
        const { refresh_token } = tokenResponse.data;

        let user = await prisma.user.findUnique({
          where: { discordId },
        });

        if (!user) {
          const registrationMessage = `Usuário "${username}" vulgo "${global_name}" (ID: ${discordId}) registrado com sucesso.`;
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
          await sendDiscordLog(discordLogChannelId, "Novo Usuário Registrado", registrationMessage, 0x00ff00);
        } else {
          const loginMessage = `Usuário "${username}" vulgo "${global_name}" (ID: ${discordId}) logado com sucesso. o token dele será invalidado em 7 dias.`;
          await prisma.user.update({
            where: { discordId },
            data: {
              accessToken: access_token,
              refreshToken: refresh_token,
            },
          });
          await sendDiscordLog(discordLogChannelId, "Login Bem-Sucedido", loginMessage, 0x00ff00);
        }

        const sessionToken = app.jwt.sign({ sub: user.id }, { expiresIn: "7d" });

        return reply.status(200).send({
          message: "Authentication successful",
          token: sessionToken,
        });
      } catch (error: any) {
        console.error("Discord Auth Error:", error.response?.data || error);
        await sendDiscordLog(discordLogChannelId, "Erro de Autenticação", `Falha ao autenticar com o Discord. Detalhes: ${error.message || error}`, 0xff0000);
        throw new BadRequestError("Failed to authenticate with Discord");
      }
    }
  );
}
