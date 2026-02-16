import { SlashCommandBuilder } from 'discord.js';
import { RegistrationService } from '../services/RegistrationService.js';
import { TimezoneService } from '../services/TimezoneService.js';
import { MyStatusService } from '../services/MyStatusService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('mystatus')
    .setDescription('View your current tournament registration & room'),
  
  async execute(interaction) {
    const registrationService = new RegistrationService();
    const timezoneService = new TimezoneService();
    const myStatusService = new MyStatusService(registrationService, timezoneService);

    try {
      // Show loading message
      await interaction.deferReply({ ephemeral: true });
      const payload = await myStatusService.buildStatusPayload(interaction.user);
      await interaction.editReply(payload);

    } catch (error) {
      console.error('Error in mystatus command:', error);
      
      let errorMessage = '❌ Failed to fetch your registration status.';
      
      if (error.message.includes('temporarily unavailable')) {
        errorMessage = '⚠️ The registration service is temporarily unavailable. Please try again later.';
      } else if (error.message.includes('connect')) {
        errorMessage = '🔌 Unable to connect to the tournament service. Please try again later.';
      }

      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
};
