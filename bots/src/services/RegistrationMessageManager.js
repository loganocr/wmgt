import moment from 'moment-timezone';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { config } from '../config/config.js';
import { logger } from '../utils/Logger.js';
import { saveMessageReference, loadMessageReference } from '../utils/MessagePersistence.js';

/**
 * Manages the lifecycle of the persistent registration message:
 * posting, updating, polling, and recovering after restarts.
 */
class RegistrationMessageManager {
  constructor(client, registrationService) {
    this.client = client;
    this.registrationService = registrationService;
    this.logger = logger.child({ service: 'RegistrationMessageManager' });
    this.pollTimer = null;
    this.lastTournamentData = null;
    this.messageReference = null;
  }

  /**
   * Derive the current tournament state from API data.
   *
   * Uses the `tournament_state` field returned by the REST API:
   *  - null / empty object / missing data → 'closed'
   *  - API returns 'open' → 'registration_open'
   *  - API returns 'ongoing' → 'ongoing'
   *  - API returns 'closed' or anything else → 'closed'
   *
   * @param {object|null} tournamentData - Data returned by the current_tournament endpoint
   * @returns {'registration_open'|'ongoing'|'closed'}
   */
  deriveTournamentState(tournamentData) {
    if (!tournamentData || Object.keys(tournamentData).length === 0) {
      return 'closed';
    }

    if (!tournamentData.sessions || Object.keys(tournamentData.sessions).length === 0) {
      return 'closed';
    }

    const apiState = tournamentData.sessions.tournament_state;


    if (apiState === 'open') {
      return 'registration_open';
    }

    if (apiState === 'ongoing') {
      return 'ongoing';
    }

    return 'closed';
  }

  /**
   * Calculate the polling window based on time slots and session date.
   *
   * Polling starts `pollingStartOffsetHrs` hours before the first time slot
   * and ends `pollingEndOffsetHrs` hours after the last time slot.
   * Accounts for `day_offset` in time slot calculations.
   *
   * @param {object|null} tournamentData
   * @returns {{ start: moment.Moment, end: moment.Moment }|null}
   */
  calculatePollingWindow(tournamentData) {
    if (!tournamentData || tournamentData == '{}' || !tournamentData.sessions) {
      return null;
    }

    const slots = tournamentData.sessions.available_time_slots;
    if (!Array.isArray(slots) || slots.length === 0) {
      return null;
    }

    const sessionDate = moment.utc(tournamentData.sessions.session_date).startOf('day');
    const startOffsetHrs = config.registration.pollingStartOffsetHrs;
    const endOffsetHrs = config.registration.pollingEndOffsetHrs;

    let earliest = null;
    let latest = null;

    for (const slot of slots) {
      if (!slot.time_slot) continue;

      const [hours, minutes] = slot.time_slot.split(':').map(Number);
      const dayOffset = slot.day_offset || 0;

      const slotMoment = sessionDate.clone()
        .add(dayOffset, 'days')
        .hours(hours)
        .minutes(minutes)
        .seconds(0)
        .milliseconds(0);

      if (!earliest || slotMoment.isBefore(earliest)) {
        earliest = slotMoment;
      }
      if (!latest || slotMoment.isAfter(latest)) {
        latest = slotMoment;
      }
    }

    if (!earliest || !latest) {
      return null;
    }

    return {
      start: earliest.clone().subtract(startOffsetHrs, 'hours'),
      end: latest.clone().add(endOffsetHrs, 'hours')
    };
  }

  /**
   * Check if the current UTC time is within the polling window.
   *
   * @param {object|null} tournamentData
   * @returns {boolean}
   */
  isWithinPollingWindow(tournamentData) {
    const window = this.calculatePollingWindow(tournamentData);
    if (!window) {
      return false;
    }

    const now = moment.utc();
    return now.isSameOrAfter(window.start) && now.isBefore(window.end);
  }

  /**
   * Build the Discord embed and button components based on the current tournament state.
   *
   * @param {object|null} tournamentData - Data from the current_tournament endpoint
   * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
   */
  buildRegistrationMessage(tournamentData) {
    const state = this.deriveTournamentState(tournamentData);
    switch (state) {
      case 'registration_open':
        return this._buildRegistrationOpenMessage(tournamentData);
      case 'ongoing':
        return this._buildOngoingMessage(tournamentData);
      case 'closed':
      default:
        return this._buildClosedMessage();
    }
  }

  /**
   * @private
   */
  _buildRegistrationOpenMessage(tournamentData) {
    const embed = new EmbedBuilder()
      .setColor(0x00AE86)
      .setTitle(`🏆 ${tournamentData.tournament_name} — ${tournamentData.week}`);

    if (tournamentData.session_date) {
      const sessionEpoch = moment.utc(tournamentData.session_date).unix();
      embed.addFields({ name: 'Session Date', value: `<t:${sessionEpoch}:D>`, inline: true });
    }

    if (Array.isArray(tournamentData.sessions.courses) && tournamentData.sessions.courses.length > 0) {
      const courseList = tournamentData.sessions.courses.map(c => c.course_name).join('\n');
      embed.addFields({ name: 'Courses', value: courseList, inline: true });
    }

    if (Array.isArray(tournamentData.sessions.available_time_slots) && tournamentData.sessions.available_time_slots.length > 0) {
      const slotList = tournamentData.sessions.available_time_slots
        .map(s => '`' + s.time_slot + ' UTC`' + ' <t:' + s.session_date_epoch + ':t>')
        .join('\n');
      embed.addFields({ name: 'Time Slots (UTC)', value: slotList, inline: false });
    }

    if (tournamentData.close_registration_on) {
      const closeEpoch = moment.utc(tournamentData.close_registration_on).unix();
      embed.addFields({ name: 'Registration Closes', value: `<t:${closeEpoch}:R>`, inline: true });
    }

    const button = new ButtonBuilder()
      .setCustomId('reg_register')
      .setLabel('Register Now')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🏌️');

    const row = new ActionRowBuilder().addComponents(button);

    return { embeds: [embed], components: [row] };
  }

  /**
   * @private
   */
  _buildOngoingMessage(tournamentData) {
    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle(`🏆 ${tournamentData.sessions.week} (In Progress) ⛳️`);

    if (Array.isArray(tournamentData.sessions.courses) && tournamentData.sessions.courses.length > 0) {
      const courseList = tournamentData.sessions.courses.map(c => c.course_name).join('\n');
      embed.addFields({ name: 'Courses', value: courseList, inline: true });
    }

    /*
    if (tournamentData.sessions.session_date) {
      const sessionEpoch = moment.utc(tournamentData.session_date).unix();
      embed.addFields({ name: 'Session Date', value: `<t:${sessionEpoch}:F>`, inline: true });
    }
    */

    if (Array.isArray(tournamentData.sessions.available_time_slots) && tournamentData.sessions.available_time_slots.length > 0) {
      const slotList = tournamentData.sessions.available_time_slots
        .map(s => 
            '`' + 
            s.time_slot + ' UTC` ' + 
            `(\`${s.player_count.toString().padStart(2, ' ')}p\`) ` +
           (s.time_slot_status === "done" ? '✅' : s.time_slot_status === 'current' ? '⬅️' : '⬜' ) + ' <t:' + s.session_date_epoch + ':t> '
        )
        .join('\n');
      embed.addFields({ name: 'Time Slots (UTC & Local)', value: slotList, inline: false });
    }

    embed.addFields({ name: 'Legend:', value: '✅ - Done, ⬅️ - Now playing' , inline: false });

    embed.addFields({ name: 'To enter scores go to ', value: config.bot.tournamentMDurl, inline: true  });

    const button = new ButtonBuilder()
      .setCustomId('reg_register')
      .setLabel('Tournament In Progress')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);

    const row = new ActionRowBuilder().addComponents(button);

    return { embeds: [embed], components: [row] };
  }

  /**
   * Start polling for tournament data changes.
   * Uses dual-interval logic: active polling (default 60s) within the polling window,
   * idle polling (default 1hr) outside the polling window.
   */
  startPolling() {
    this.stopPolling();

    const isActive = this.isWithinPollingWindow(this.lastTournamentData);
    const interval = isActive
      ? config.registration.pollIntervalMs
      : config.registration.idlePollIntervalMs;

    this.logger.info(`Starting polling in ${isActive ? 'active' : 'idle'} mode (interval: ${interval}ms)`);

    this.pollTimer = setInterval(() => this._pollAndUpdate(), interval);
  }

  /**
   * Stop the current polling timer.
   */
  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Poll the backend for tournament data, update the message if data changed,
   * and re-evaluate the polling interval if the window status changed.
   * @private
   */
  async _pollAndUpdate() {
    try {
      const tournamentData = await this.registrationService.getCurrentTournament();

      const currentJson = JSON.stringify(tournamentData);
      const lastJson = JSON.stringify(this.lastTournamentData);
      if (currentJson !== lastJson) {
        this.logger.info('Tournament data changed, updating message');
        await this.updateMessage(tournamentData);
        this.lastTournamentData = tournamentData;
      }

      // Re-evaluate polling interval — switch between active/idle if window changed
      const currentlyActive = this.isWithinPollingWindow(this.lastTournamentData);
      if (this._lastPollingMode !== undefined && this._lastPollingMode !== currentlyActive) {
        this.logger.info(`Polling window changed: switching to ${currentlyActive ? 'active' : 'idle'} mode`);
        this.startPolling();
      }
      this._lastPollingMode = currentlyActive;
    } catch (error) {
      this.logger.error('Error during poll', { error: error.message });
    }
  }

  /**
   * Update the existing Discord message with new embed content.
   * Handles the case where messageReference is null gracefully.
   *
   * @param {object|null} tournamentData - Current tournament data
   */
  async updateMessage(tournamentData) {
    if (!this.messageReference) {
      this.logger.warn('No message reference available, skipping update');
      return;
    }

    try {
      const { embeds, components } = this.buildRegistrationMessage(tournamentData);

      const channel = await this.client.channels.fetch(this.messageReference.channelId);
      if (!channel) {
        this.logger.warn('Channel not found for message update');
        return;
      }

      const message = await channel.messages.fetch(this.messageReference.messageId);
      await message.edit({ embeds, components });

      // Update lastUpdatedAt in the persisted reference
      this.messageReference.lastUpdatedAt = new Date().toISOString();
      await saveMessageReference(this.messageReference);

      this.logger.debug('Registration message updated successfully');
    } catch (error) {
      // Detect "Unknown Message" — the message was deleted externally (Requirement 1.3)
      if (error.code === 10008 || (error.message && error.message.includes('Unknown Message'))) {
        this.logger.warn('Registration message was deleted externally, posting a new one');
        await this._postNewMessage(this.messageReference.channelId);
        return;
      }

      this.logger.error('Failed to update registration message', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize the registration message manager.
   *
   * 1. Load persisted message reference
   * 2. Verify/recover the message via ensureMessageExists()
   * 3. Fetch initial tournament data
   * 4. Start polling
   */
  async initialize() {
    try {
      const ref = await loadMessageReference();
      if (ref) {
        this.messageReference = ref;
        this.logger.info('Loaded persisted message reference', {
          channelId: ref.channelId,
          messageId: ref.messageId
        });
      }

      await this.ensureMessageExists();

      this.lastTournamentData = await this.registrationService.getCurrentTournament();
      this.startPolling();

      this.logger.info('RegistrationMessageManager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize RegistrationMessageManager', { error: error.message });
      throw error;
    }
  }

  /**
   * Ensure the registration message exists in Discord.
   */
  async ensureMessageExists() {
    if (this.messageReference) {
      try {
        const channel = await this.client.channels.fetch(this.messageReference.channelId);
        if (channel) {
          await channel.messages.fetch(this.messageReference.messageId);
          this.logger.info('Existing registration message verified');
          return;
        }
      } catch (error) {
        this.logger.warn('Persisted message not found, posting a new one', { error: error.message });
      }
    }

    const channelId = this.messageReference?.channelId || config.registration.channelId;
    if (!channelId) {
      this.logger.warn('No channel configured for registration message. Run /setup-wmgt-registration to set up.');
      return;
    }

    await this._postNewMessage(channelId);
  }

  /**
   * Post a new registration message in the given channel and persist the reference.
   * @param {string} channelId - The Discord channel ID to post in
   * @private
   */
  async _postNewMessage(channelId) {
    const tournamentData = await this.registrationService.getCurrentTournament();
    const { embeds, components } = this.buildRegistrationMessage(tournamentData);

    const channel = await this.client.channels.fetch(channelId);
    if (!channel) {
      this.logger.error('Could not fetch channel to post registration message', { channelId });
      return;
    }

    const message = await channel.send({ embeds, components });

    this.messageReference = {
      channelId: channelId,
      messageId: message.id,
      guildId: message.guildId || null,
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString()
    };

    await saveMessageReference(this.messageReference);
    this.logger.info('Posted new registration message', {
      channelId: this.messageReference.channelId,
      messageId: this.messageReference.messageId
    });
  }

  /**
   * @private
   */
  _buildClosedMessage() {
    const embed = new EmbedBuilder()
      .setColor(0x808080)
      .setTitle('🏆 WMGT Tournament')
      .setDescription('No active tournament session. Check back soon!');

    const button = new ButtonBuilder()
      .setCustomId('reg_register')
      .setLabel('Registration Closed')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);

    const row = new ActionRowBuilder().addComponents(button);

    return { embeds: [embed], components: [row] };
  }
}

export default RegistrationMessageManager;
