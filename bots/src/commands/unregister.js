import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
import { RegistrationService } from '../services/RegistrationService.js';
import { TimezoneService } from '../services/TimezoneService.js';
import { config } from '../config/config.js';


const registrationService = new RegistrationService();
const timezoneService = new TimezoneService();

export default {
  data: new SlashCommandBuilder()
    .setName('unregister')
    .setDescription('Unregister from the ' + config.bot.tournament + ' tournament'),

  async execute(interaction) {
    try {
      // Defer reply to allow time for API calls
      await interaction.deferReply({ ephemeral: true });

      // Get user's timezone preference
      let userTimezone = interaction.options.getString('timezone') || 'UTC';
      let formattedTime;

      if (!userTimezone) {
        userTimezone = await timezoneService.getUserTimezone(registrationService, interaction.user.id, 'UTC');
      }


      // Validate timezone if provided
      if (!timezoneService.validateTimezone(userTimezone)) {
        const commonTimezones = timezoneService.getCommonTimezones();
        const timezoneList = commonTimezones.map(tz => `• ${tz.value} - ${tz.label}`).join('\n');
        
        const errorEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Invalid Timezone')
          .setDescription(`The timezone "${userTimezone}" is not valid.`)
          .addFields({
            name: 'Common Timezones',
            value: timezoneList,
            inline: false
          })
          .setFooter({ text: 'Please use a valid IANA timezone name or common abbreviation.' });

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Fetch user's current registrations
      let registrationData;
      try {
        registrationData = await registrationService.getPlayerRegistrations(interaction.user.id);
      } catch (error) {
        const errorEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Registration Data Error')
          .setDescription(error.message)
          .setFooter({ text: 'Please try again later or contact support.' });

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Check if user has any registrations
      if (!registrationData.registrations || registrationData.registrations.length === 0) {
        const noRegistrationsEmbed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('📋 No Active Registrations')
          .setDescription('You are not currently registered for any tournament sessions.')
          .addFields({
            name: '💡 Tip',
            value: 'Use `/register` to sign up for upcoming tournaments!',
            inline: false
          })
          .setFooter({ text: 'Check back later for new tournament sessions.' });

        return await interaction.editReply({ embeds: [noRegistrationsEmbed] });
      }

      // Create registration list embed
      const registrationsEmbed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle('📋 Your Tournament Registrations')
        .setDescription('Confirm you want to cancel:');

      // Format registrations for display and selection
      const registrationOptions = [];
      const registrationDetails = [];

      for (const registration of registrationData.registrations) {

        // Format time slot with timezone conversion
        formattedTime = `<t:${registration.session_date_epoch}:F> (${registration.session_date_formatted})`;


        // Create option for select menu
        const optionLabel = `${registration.week} - ${registration.time_slot} UTC`;
        const optionDescription = `**Time:** ${formattedTime}\n${registration.room_no ? ` | Room ${registration.room_no}` : ''}`;

        registrationOptions.push({
          label: optionLabel.length > 100 ? optionLabel.substring(0, 97) + '...' : optionLabel,
          description: optionDescription.length > 100 ? optionDescription.substring(0, 97) + '...' : optionDescription,
          value: `${registration.session_id}_${registration.time_slot}`
        });

        // Add to embed details
        const registrationDetail = {
          name: `🏆 ${registration.week}`,
          value: `**Date:** ${formattedTime}` +
                 `${registration.room_no ? `\n**Room:** ${registration.room_no}` : ''}`,
          inline: false
        };
        registrationDetails.push(registrationDetail);
      }

      // Add registration details to embed
      registrationsEmbed.addFields(registrationDetails);

      // Create selection menu (Discord limit is 25 options)
      if (registrationOptions.length > 25) {
        registrationOptions.splice(25);
        registrationsEmbed.setFooter({ text: 'Showing first 25 registrations. Contact support if you need to cancel others.' });
      }

       // Add cancel button
      const cancelButton = new ButtonBuilder()
        .setCustomId('unregister_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌');

      // Confirm Button
      const confirmButton = new ButtonBuilder()
//      .setCustomId(`confirm_unregister_${sessionId}_${timeSlot}`)
      .setCustomId(`confirm_unregister`)
      .setLabel('Confirm Unregistration')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('⚠️');


      const buttonRow = new ActionRowBuilder().addComponents(cancelButton);

      let components = [buttonRow]; // default

      if (registrationOptions.length > 1) {
        const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('unregister_selection')
        .setPlaceholder('Choose a registration to cancel')
        .addOptions(registrationOptions);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        components = [selectRow, buttonRow];
      }
      else {
        registrationsEmbed.addFields({
          name: "Registration",
          value: registrationOptions[0].label,
          inline: false
        });

        buttonRow.addComponents(confirmButton);
      }

      await interaction.editReply({
        embeds: [registrationsEmbed],
        components
      });

      const replyMessage = await interaction.fetchReply();

      // Handle registration selection
      const filter = (i) => i.user.id === interaction.user.id;
      const collector = replyMessage.createMessageComponentCollector({
        filter,
        componentType: ComponentType.StringSelect,
        time: 300000 // 5 minutes
      });

      collector.on('collect', async (selectInteraction) => {
        if (selectInteraction.customId === 'unregister_selection') {
                    // Stop collectors to prevent interference with subsequent interactions
                    collector.stop();
                    buttonCollector.stop();          
          await handleUnregistrationSelection(selectInteraction, registrationData, formattedTime);
        }
      });

      // Handle cancel button
      const buttonCollector = replyMessage.createMessageComponentCollector({
        filter,
        componentType: ComponentType.Button,
        time: 300000 // 5 minutes
      });

      buttonCollector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.customId === 'confirm_unregister') {

           await handleUnregistrationConfirmation(buttonInteraction, registrationData.registrations[0], formattedTime);
        }
        else
        if (buttonInteraction.customId === 'unregister_cancel') {
          await buttonInteraction.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0x808080)
                .setTitle('❌ Unregistration Cancelled')
                .setDescription('Tournament unregistration has been cancelled.')
            ],
            components: []
          });
          collector.stop();
          buttonCollector.stop();
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
          interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x808080)
                .setTitle('⏰ Selection Timeout')
                .setDescription('Unregistration timed out. Please run the command again to unregister.')
            ],
            components: []
          }).catch(() => {}); // Ignore errors if interaction is already handled
        }
      });

    } catch (error) {
      console.error('Error in unregister command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Unregistration Error')
        .setDescription('An unexpected error occurred while processing your unregistration.')
        .setFooter({ text: 'Please try again later or contact support.' });

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  }
};

/**
 * Handle unregistration selection and confirmation
 */
async function handleUnregistrationSelection(interaction, registrationData, formattedTime) {
  try {
    await interaction.deferUpdate();

    const selectedValue = interaction.values[0];
    const [sessionId, timeSlot] = selectedValue.split('_');
    
    // Find the selected registration
    const selectedRegistration = registrationData.registrations.find(
      reg => reg.session_id.toString() === sessionId && reg.time_slot === timeSlot
    );

    if (!selectedRegistration) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Registration Not Found')
            .setDescription('The selected registration could not be found.')
        ],
        components: []
      });
      return;
    }

    // Create confirmation embed
    const confirmEmbed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('⚠️ Confirm Unregistration')
      .setDescription(`Are you sure you want to unregister from **${selectedRegistration.week}**?`)
      .addFields(
        {
          name: '⏰ Time Slot',
          value: `${registrationData.time_slot} <t:${registrationData.session_date_epoch}:f>`,
          inline: true
        }
      );

    if (selectedRegistration.room_no) {
      confirmEmbed.addFields({
        name: '🏠 Room',
        value: `Room ${selectedRegistration.room_no}`,
        inline: true
      });
    }

    confirmEmbed.setFooter({ text: 'This action cannot be undone!' });

    // Create confirmation buttons
    const confirmButton = new ButtonBuilder()
      .setCustomId(`confirm_unregister_${sessionId}_${timeSlot}`)
      .setLabel('Confirm Unregistration')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('⚠️');

    const cancelButton = new ButtonBuilder()
      .setCustomId('unregister_cancel_confirm')
      .setLabel('Keep Registration')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('↩️');

    const confirmRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    await interaction.editReply({
      embeds: [confirmEmbed],
      components: [confirmRow]
    });

    const replyMessage = await interaction.fetchReply();

    // Handle confirmation
    const filter = (i) => i.user.id === interaction.user.id;
    const confirmCollector = replyMessage.createMessageComponentCollector({
      filter,
      componentType: ComponentType.Button,
      time: 60000 // 1 minute for confirmation
    });

    confirmCollector.on('collect', async (confirmInteraction) => {
      if (confirmInteraction.customId.startsWith('confirm_unregister_')) {
        await handleUnregistrationConfirmation(confirmInteraction, selectedRegistration, formattedTime);
      } else if (confirmInteraction.customId === 'unregister_cancel_confirm') {
        await confirmInteraction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x808080)
              .setTitle('↩️ Unregistration Cancelled')
              .setDescription('Your registration has been kept. No changes were made.')
          ],
          components: []
        });
      }
      confirmCollector.stop();
    });

    confirmCollector.on('end', (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x808080)
              .setTitle('⏰ Confirmation Timeout')
              .setDescription('Unregistration confirmation timed out. Your registration has been kept.')
          ],
          components: []
        }).catch(() => {}); // Ignore errors if interaction is already handled
      }
    });

  } catch (error) {
    console.error('Error handling unregistration selection:', error);
    
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Selection Error')
          .setDescription('An error occurred while processing your selection.')
      ],
      components: []
    });
  }
}

/**
 * Handle final unregistration confirmation and API call
 */
async function handleUnregistrationConfirmation(interaction, registration, formattedTime) {
  try {
    await interaction.deferUpdate();

    // Show loading message
    const loadingEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('⏳ Processing Unregistration...')
      .setDescription('Please wait while we remove your tournament registration.');

    await interaction.editReply({
      embeds: [loadingEmbed],
      components: []
    });

    // Attempt unregistration
    try {
      const unregistrationResult = await registrationService.unregisterPlayer(
        interaction.user,
        registration.session_id
      );

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('👋 Unregistration Successful!')
        .setDescription(`You have been successfully unregistered from **${registration.week}**`);

      if (registration.room_no) {
        successEmbed.addFields({
          name: '🏠 Previous Room',
          value: `Room ${registration.room_no}`,
          inline: true
        });
      }

      successEmbed.setFooter({ 
        text: 'Use /register to sign up for other tournaments or /mystatus to view remaining registrations.' 
      });

      await interaction.editReply({
        embeds: [successEmbed]
      });

    } catch (unregistrationError) {
      console.error('Unregistration API error:', unregistrationError);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Unregistration Failed')
        .setDescription(unregistrationError.message)
        .setFooter({ text: 'Please try again or contact support if the problem persists.' });

      await interaction.editReply({
        embeds: [errorEmbed]
      });
    }

  } catch (error) {
    console.error('Error handling unregistration confirmation:', error);
    
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Unregistration Error')
          .setDescription('An unexpected error occurred during unregistration.')
      ],
      components: []
    });
  }
}
