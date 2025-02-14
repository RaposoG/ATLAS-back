import { CommandInteraction, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder().setName("ping").setDescription("Ele irá responder pong e o tempo de resposta!");

export async function execute(interaction: CommandInteraction, createEmbed: Function) {
  const sent = await interaction.reply({ content: "Pinging...", fetchReply: true });
  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  const wsPing = Math.round(interaction.client.ws.ping);
  const avatar = interaction.client.user?.avatarURL() || "";
  const embed = createEmbed("Pong!", `Latência: ${latency}ms\nPing WS: ${wsPing}ms`, avatar);
  return interaction.editReply({ embeds: [embed] });
}
