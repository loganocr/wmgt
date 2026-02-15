import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PermissionFlagsBits } from 'discord.js';

// Mock Logger before importing the command
vi.mock('../utils/Logger.js', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    })
  }
}));

let setupCommand;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('../commands/setupRegistration.js');
  setupCommand = mod.default;
});

function createMockInteraction(overrides = {}) {
  return {
    deferReply: vi.fn().mockResolvedValue(),
    editReply: vi.fn().mockResolvedValue(),
    reply: vi.fn().mockResolvedValue(),
    deferred: false,
    replied: false,
    user: { id: '111222333444555666' },
    channel: {
      id: '999888777666555444',
      name: 'tournament-registration'
    },
    client: {
      registrationMessageManager: {
        _postNewMessage: vi.fn().mockResolvedValue()
      }
    },
    ...overrides
  };
}

describe('setupRegistration command', () => {
  describe('command data', () => {
    it('should have the correct command name', () => {
      expect(setupCommand.data.name).toBe('setup-wmgt-registration');
    });

    it('should require Manage Messages permission', () => {
      expect(setupCommand.data.default_member_permissions).toBe(
        PermissionFlagsBits.ManageMessages.toString()
      );
    });
  });

  describe('successful setup', () => {
    it('should defer reply as ephemeral', async () => {
      const interaction = createMockInteraction();
      await setupCommand.execute(interaction);
      expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    });

    it('should call _postNewMessage with the current channel id', async () => {
      const interaction = createMockInteraction();
      await setupCommand.execute(interaction);
      expect(interaction.client.registrationMessageManager._postNewMessage)
        .toHaveBeenCalledWith('999888777666555444');
    });

    it('should reply with ephemeral confirmation including channel name', async () => {
      const interaction = createMockInteraction();
      await setupCommand.execute(interaction);
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: '✅ Registration message has been posted in #tournament-registration.'
      });
    });
  });

  describe('missing manager', () => {
    it('should reply with error when registrationMessageManager is not set', async () => {
      const interaction = createMockInteraction({
        client: { registrationMessageManager: null }
      });
      await setupCommand.execute(interaction);
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: '❌ Registration system is not initialized. Please contact an administrator.'
      });
    });

    it('should reply with error when registrationMessageManager is undefined', async () => {
      const interaction = createMockInteraction({
        client: {}
      });
      await setupCommand.execute(interaction);
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: '❌ Registration system is not initialized. Please contact an administrator.'
      });
    });
  });

  describe('error handling', () => {
    it('should reply with error when _postNewMessage throws', async () => {
      const interaction = createMockInteraction();
      interaction.deferred = true;
      interaction.client.registrationMessageManager._postNewMessage
        .mockRejectedValue(new Error('Discord API error'));

      await setupCommand.execute(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith({
        content: '❌ Failed to post the registration message. Please try again later.'
      });
    });

    it('should use reply with ephemeral if not yet deferred', async () => {
      const interaction = createMockInteraction();
      // Simulate deferReply throwing before deferred is set
      interaction.deferReply.mockRejectedValue(new Error('Interaction expired'));
      interaction.deferred = false;
      interaction.replied = false;

      await setupCommand.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith({
        content: '❌ Failed to post the registration message. Please try again later.',
        ephemeral: true
      });
    });
  });
});
