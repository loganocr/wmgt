import { EmbedBuilder } from 'discord.js';

/**
 * Shared service for rendering the same registration status payload used by
 * both /mystatus and the "My Room" message button.
 */
export class MyStatusService {
  constructor(registrationService, timezoneService) {
    this.registrationService = registrationService;
    this.timezoneService = timezoneService;
  }

  /**
   * Build the mystatus-style Discord reply payload for a user.
   *
   * @param {import('discord.js').User} user
   * @returns {Promise<{embeds: EmbedBuilder[]}>}
   */
  async buildStatusPayload(user) {
    const userTimezone = await this.timezoneService.getUserTimezone(
      this.registrationService,
      user.id,
      'UTC'
    );

    if (!this.timezoneService.validateTimezone(userTimezone)) {
      const invalidTimezoneEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Invalid Timezone')
        .setDescription(`Your stored timezone \`${userTimezone}\` is invalid.`)
        .addFields({
          name: 'How to fix',
          value: 'Use `/timezone` to set a valid timezone, then try again.',
          inline: false
        });

      return { embeds: [invalidTimezoneEmbed] };
    }

    const registrationData = await this.registrationService.getPlayerRegistrations(user.id);

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('🏆 Your Tournament Registrations')
      .setAuthor({
        name: user.displayName || user.username,
        iconURL: user.displayAvatarURL()
      })
      .setTimestamp();

    if (registrationData.error_code === 'PLAYER_NOT_FOUND') {
      embed.setDescription('📭 You are not currently registered for any tournaments.')
        .addFields({
          name: '💡 Want to register?',
          value: 'As a new player you visit [MyWMGT.com](https://mywmgt.com) to setup your account.',
          inline: false
        });

      return { embeds: [embed] };
    }

    if (!registrationData.registrations || registrationData.registrations.length === 0) {
      embed.setDescription('📭 You are not currently registered for any tournaments.')
        .addFields({
          name: '💡 Want to register?',
          value: 'Use `/register` to sign up for the current tournament!',
          inline: false
        });

      return { embeds: [embed] };
    }

    const registrations = registrationData.registrations;
    const playerName = registrationData.player?.name || user.displayName || user.username;
    embed.setDescription(`**Player:** ${playerName}\n**Active Registrations:** ${registrations.length}`);

    for (const registration of registrations) {
      try {
        const formattedTime = `<t:${registration.session_date_epoch}:F> (${registration.session_date_formatted})`;

        let registrationDetails = registration.courses && registration.courses.length > 0
          ? registration.courses.map(course =>
            `• **${course.course_code}** - ${course.course_name}`
          ).join('\n')
          : 'TBD';

        registrationDetails += '\n\n';
        registrationDetails += `**Time:** ${formattedTime}\n`;

        if (registration.room_no) {
          registrationDetails += `**Room:** ${registration.room_no}\n`;
          registrationDetails += registration.room_players.map(player =>
            `• ${player.player_name}` + (player.isNew ? ' 🌱' : '')
          ).join('\n');
          registrationDetails += '\n\n';
        } else {
          registrationDetails += '**Room:** *Not assigned yet*\n';
        }

        registrationDetails += `**Session ID:** ${registration.session_id}`;

        embed.addFields({
          name: `📅 ${registration.week}`,
          value: registrationDetails,
          inline: false
        });
      } catch (_error) {
        embed.addFields({
          name: `📅 ${registration.week}`,
          value: `**Time:** ${registration.time_slot} UTC\n**Room:** ${registration.room_no || '*Not assigned yet*'}\n**Session ID:** ${registration.session_id}`,
          inline: false
        });
      }
    }

    embed.setFooter({
      text: `Times shown in ${userTimezone} | Go to MyWMGT.com to change your preference`
    });

    return { embeds: [embed] };
  }
}

