import { env } from "@/env";
import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import { commands } from "./commands";
import { deployCommands } from "./deploy-commands";

export const client = new Client({
  intents: ["Guilds", "GuildMessages", "DirectMessages"],
});

function createEmbed(title: string, description: string, imageUrl?: string) {
  const embed: any = {
    color: 0x0099ff,
    title,
    description,
    timestamp: new Date().toISOString(),
    footer: {
      text: "Atlas 87°",
    },
  };
  if (imageUrl) {
    embed.thumbnail = { url: imageUrl };
  }
  return embed;
}

client.once("ready", async () => {
  console.log("Discord bot is ready! 🤖");
  const guilds = await client.guilds.fetch();
  guilds.forEach(async (guild) => {
    await deployCommands({ guildId: guild.id });
    console.log(`Deployed commands to guild: ${guild.name}`);
  });
});

client.on("guildCreate", async (guild) => {
  await deployCommands({ guildId: guild.id });
  console.log(`Deployed commands to guild: ${guild.name}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) {
    return;
  }
  const { commandName, guildId } = interaction;

  if (guildId) {
  }

  if (commands[commandName as keyof typeof commands]) {
    commands[commandName as keyof typeof commands].execute(interaction, createEmbed);
  }
});
