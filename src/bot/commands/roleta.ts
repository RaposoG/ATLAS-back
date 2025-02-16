import { CommandInteraction, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder().setName("roleta").setDescription("Jogue uma roleta russa!");

export async function execute(interaction: CommandInteraction, createEmbed: Function) {
  const bulletPosition = Math.floor(Math.random() * 6) + 1;
  const chamberPosition = Math.floor(Math.random() * 6) + 1;
  const avatar = interaction.client.user?.avatarURL() || "";

  if (bulletPosition === chamberPosition) {
    const embed = createEmbed("Bang!", "Você foi atingido!", avatar);
    return interaction.reply({ embeds: [embed] });
  } else {
    const embed = createEmbed("Click!", "Você sobreviveu!", avatar);
    return interaction.reply({ embeds: [embed] });
  }
}
