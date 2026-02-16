import { describe, it, expect, vi, beforeEach } from 'vitest';
import mystatusCommand from '../commands/mystatus.js';
import { RegistrationService } from '../services/RegistrationService.js';
import { TimezoneService } from '../services/TimezoneService.js';

vi.mock('../services/RegistrationService.js');
vi.mock('../services/TimezoneService.js');

describe('MyStatus Command', () => {
  let mockInteraction;
  let mockRegistrationService;
  let mockTimezoneService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockInteraction = {
      user: {
        id: '123456789012345678',
        username: 'testuser',
        displayName: 'Test User',
        displayAvatarURL: vi.fn().mockReturnValue('https://example.com/avatar.png')
      },
      deferReply: vi.fn().mockImplementation(() => {
        mockInteraction.deferred = true;
        return Promise.resolve();
      }),
      editReply: vi.fn(),
      reply: vi.fn(),
      deferred: false
    };

    mockRegistrationService = {
      getPlayerRegistrations: vi.fn()
    };
    RegistrationService.mockImplementation(() => mockRegistrationService);

    mockTimezoneService = {
      getUserTimezone: vi.fn(),
      validateTimezone: vi.fn()
    };
    TimezoneService.mockImplementation(() => mockTimezoneService);
  });

  it('should have correct command name and description', () => {
    expect(mystatusCommand.data.name).toBe('mystatus');
    expect(mystatusCommand.data.description).toBe('View your current tournament registration & room');
  });

  it('should not define command options', () => {
    const json = mystatusCommand.data.toJSON();
    expect(json.options || []).toHaveLength(0);
  });

  it('should defer ephemerally and return no-registration embed', async () => {
    mockTimezoneService.getUserTimezone.mockResolvedValue('UTC');
    mockTimezoneService.validateTimezone.mockReturnValue(true);
    mockRegistrationService.getPlayerRegistrations.mockResolvedValue({
      player: null,
      registrations: []
    });

    await mystatusCommand.execute(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(mockRegistrationService.getPlayerRegistrations).toHaveBeenCalledWith('123456789012345678');
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      embeds: [expect.objectContaining({
        data: expect.objectContaining({
          description: expect.stringContaining('not currently registered')
        })
      })]
    });
  });

  it('should include room and players when registered', async () => {
    mockTimezoneService.getUserTimezone.mockResolvedValue('UTC');
    mockTimezoneService.validateTimezone.mockReturnValue(true);
    mockRegistrationService.getPlayerRegistrations.mockResolvedValue({
      player: { name: 'Test Player' },
      registrations: [{
        session_id: 456,
        week: 'S14W01',
        session_date_epoch: 1723327200,
        session_date_formatted: 'Sat, Aug 10, 2024 10:00 PM UTC',
        room_no: 5,
        room_players: [{ player_name: 'Alice', isNew: false }, { player_name: 'Bob', isNew: true }],
        courses: []
      }]
    });

    await mystatusCommand.execute(mockInteraction);

    const payload = mockInteraction.editReply.mock.calls[0][0];
    const embed = payload.embeds[0].data;
    const field = embed.fields.find(f => f.name.includes('S14W01'));

    expect(field.value).toContain('**Time:**');
    expect(field.value).toContain('**Room:** 5');
    expect(field.value).toContain('• Alice');
    expect(field.value).toContain('• Bob 🌱');
  });

  it('should show invalid timezone embed if stored timezone is invalid', async () => {
    mockTimezoneService.getUserTimezone.mockResolvedValue('BAD/TZ');
    mockTimezoneService.validateTimezone.mockReturnValue(false);

    await mystatusCommand.execute(mockInteraction);

    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      embeds: [expect.objectContaining({
        data: expect.objectContaining({
          title: expect.stringContaining('Invalid Timezone')
        })
      })]
    });
    expect(mockRegistrationService.getPlayerRegistrations).not.toHaveBeenCalled();
  });

  it('should return fallback error message when shared service throws', async () => {
    mockTimezoneService.getUserTimezone.mockRejectedValue(new Error('service unavailable'));

    await mystatusCommand.execute(mockInteraction);

    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('Failed to fetch your registration status')
    });
  });
});

