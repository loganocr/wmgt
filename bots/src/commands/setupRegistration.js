import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { logger } from '../utils/Logger.js';

const commandLogger = logger.child({ command: 'setup-wmgt-registration' });

export default {
  data: new SlashCommandBuilder()
    .setName('setup-wmgt-registration')
    .setDescription('Post the persistent registration message in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const manager = interaction.client.registrationMessageManager;
      if (!manager) {
        commandLogger.error('RegistrationMessageManager not available on client');
        return await interaction.editReply({
          content: '❌ Registration system is not initialized. Please contact an administrator.'
        });
      }

      await manager._postNewMessage(interaction.channel.id);

      commandLogger.info('Registration message posted', {
        channelId: interaction.channel.id,
        channelName: interaction.channel.name,
        userId: interaction.user.id
      });

      await interaction.editReply({
        content: `✅ Registration message has been posted in #${interaction.channel.name}.`
      });
    } catch (error) {
      commandLogger.error('Failed to setup registration message', { error: error.message });

      const reply = {
        content: '❌ Failed to post the registration message. Please try again later.'
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(reply);
      } else {
        await interaction.reply({ ...reply, ephemeral: true });
      }
    }
  }
};
