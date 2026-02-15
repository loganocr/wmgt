import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import moment from 'moment-timezone';
import RegistrationMessageManager from '../services/RegistrationMessageManager.js';

// Mock config
vi.mock('../config/config.js', () => ({
  config: {
    registration: {
      pollingStartOffsetHrs: 2,
      pollingEndOffsetHrs: 8,
      pollIntervalMs: 60000,
      idlePollIntervalMs: 3600000
    }
  }
}));

// Mock logger
vi.mock('../utils/Logger.js', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    })
  }
}));

// Mock MessagePersistence
vi.mock('../utils/MessagePersistence.js', () => ({
  saveMessageReference: vi.fn().mockResolvedValue(undefined),
  loadMessageReference: vi.fn().mockResolvedValue(null)
}));

describe('RegistrationMessageManager.deriveTournamentState', () => {
  let manager;

  beforeEach(() => {
    manager = new RegistrationMessageManager(null, null);
  });

  it('should return "closed" for null tournament data', () => {
    expect(manager.deriveTournamentState(null)).toBe('closed');
  });

  it('should return "closed" for undefined tournament data', () => {
    expect(manager.deriveTournamentState(undefined)).toBe('closed');
  });

  it('should return "closed" for empty object', () => {
    expect(manager.deriveTournamentState({})).toBe('closed');
  });

  it('should return "registration_open" when tournament_state is "open"', () => {
    const data = { tournament_state: 'open', tournament_name: 'Test', week: 'Week 1' };
    expect(manager.deriveTournamentState(data)).toBe('registration_open');
  });

  it('should return "ongoing" when tournament_state is "ongoing"', () => {
    const data = { tournament_state: 'ongoing', tournament_name: 'Test', week: 'Week 1' };
    expect(manager.deriveTournamentState(data)).toBe('ongoing');
  });

  it('should return "closed" when tournament_state is "closed"', () => {
    const data = { tournament_state: 'closed', tournament_name: 'Test', week: 'Week 1' };
    expect(manager.deriveTournamentState(data)).toBe('closed');
  });

  it('should return "closed" when tournament_state is missing', () => {
    const data = { tournament_name: 'Test', week: 'Week 1' };
    expect(manager.deriveTournamentState(data)).toBe('closed');
  });

  it('should return "closed" for an unrecognized tournament_state value', () => {
    const data = { tournament_state: 'unknown_value', tournament_name: 'Test' };
    expect(manager.deriveTournamentState(data)).toBe('closed');
  });
});

describe('RegistrationMessageManager.buildRegistrationMessage', () => {
  let manager;

  beforeEach(() => {
    manager = new RegistrationMessageManager(null, null);
  });

  // --- closed state ---

  it('should return closed embed for null tournament data', () => {
    const result = manager.buildRegistrationMessage(null);

    expect(result.embeds).toHaveLength(1);
    expect(result.components).toHaveLength(1);

    const embed = result.embeds[0].toJSON();
    expect(embed.color).toBe(0x808080);
    expect(embed.title).toBe('🏆 WMGT Tournament');
    expect(embed.description).toContain('No active tournament');

    const button = result.components[0].toJSON().components[0];
    expect(button.label).toBe('Registration Closed');
    expect(button.disabled).toBe(true);
    expect(button.style).toBe(2); // Secondary
  });

  it('should return closed embed for empty object', () => {
    const result = manager.buildRegistrationMessage({});

    const embed = result.embeds[0].toJSON();
    expect(embed.color).toBe(0x808080);
    expect(embed.title).toBe('🏆 WMGT Tournament');

    const button = result.components[0].toJSON().components[0];
    expect(button.disabled).toBe(true);
  });

  // --- registration_open state ---

  it('should return green embed with tournament info when registration is open', () => {
    const futureClose = moment.utc().add(2, 'days').toISOString();
    const futureSession = moment.utc().add(5, 'days').format('YYYY-MM-DD');

    const data = {
      tournament_state: 'open',
      tournament_name: 'Summer Classic',
      week: 'Week 42',
      registration_open: true,
      close_registration_on: futureClose,
      session_date: futureSession,
      courses: [{ name: 'Sweetopia' }, { name: 'Labyrinth' }],
      available_time_slots: [
        { time: '22:00', day_offset: -1 },
        { time: '02:00', day_offset: 0 }
      ]
    };

    const result = manager.buildRegistrationMessage(data);

    const embed = result.embeds[0].toJSON();
    expect(embed.color).toBe(0x00AE86);
    expect(embed.title).toBe('🏆 Summer Classic — Week 42');

    // Check fields exist
    const fieldNames = embed.fields.map(f => f.name);
    expect(fieldNames).toContain('Session Date');
    expect(fieldNames).toContain('Courses');
    expect(fieldNames).toContain('Time Slots');
    expect(fieldNames).toContain('Registration Closes');

    // Check courses field content
    const coursesField = embed.fields.find(f => f.name === 'Courses');
    expect(coursesField.value).toContain('Sweetopia');
    expect(coursesField.value).toContain('Labyrinth');

    // Check time slots field content
    const slotsField = embed.fields.find(f => f.name === 'Time Slots');
    expect(slotsField.value).toContain('22:00 UTC');
    expect(slotsField.value).toContain('02:00 UTC');

    // Check button
    const button = result.components[0].toJSON().components[0];
    expect(button.custom_id).toBe('reg_register');
    expect(button.label).toBe('Register Now');
    expect(button.style).toBe(3); // Success
    expect(button.disabled).toBeFalsy();
  });

  it('should include session date as Discord timestamp in registration_open embed', () => {
    const futureClose = moment.utc().add(2, 'days').toISOString();
    const sessionDate = '2024-12-14';

    const data = {
      tournament_state: 'open',
      tournament_name: 'Test',
      week: 'Week 1',
      registration_open: true,
      close_registration_on: futureClose,
      session_date: sessionDate,
      courses: [{ name: 'Course A' }],
      available_time_slots: [{ time: '20:00', day_offset: 0 }]
    };

    const result = manager.buildRegistrationMessage(data);
    const embed = result.embeds[0].toJSON();
    const sessionField = embed.fields.find(f => f.name === 'Session Date');
    const expectedEpoch = moment.utc(sessionDate).unix();
    expect(sessionField.value).toBe(`<t:${expectedEpoch}:D>`);
  });

  it('should include registration close time as relative Discord timestamp', () => {
    const futureClose = moment.utc().add(3, 'days').toISOString();
    const futureSession = moment.utc().add(5, 'days').format('YYYY-MM-DD');

    const data = {
      tournament_state: 'open',
      tournament_name: 'Test',
      week: 'Week 1',
      registration_open: true,
      close_registration_on: futureClose,
      session_date: futureSession,
      courses: [{ name: 'Course A' }],
      available_time_slots: [{ time: '20:00', day_offset: 0 }]
    };

    const result = manager.buildRegistrationMessage(data);
    const embed = result.embeds[0].toJSON();
    const closeField = embed.fields.find(f => f.name === 'Registration Closes');
    const expectedEpoch = moment.utc(futureClose).unix();
    expect(closeField.value).toBe(`<t:${expectedEpoch}:R>`);
  });

  // --- ongoing state ---

  it('should return orange embed with disabled button when tournament is ongoing', () => {
    const now = moment.utc();
    const sessionDate = now.clone().startOf('day').format('YYYY-MM-DD');
    const slotTime = now.clone().subtract(1, 'hour').format('HH:mm');

    const data = {
      tournament_state: 'ongoing',
      tournament_name: 'Summer Classic',
      week: 'Week 42',
      session_date: sessionDate,
      courses: [{ name: 'Sweetopia' }],
      available_time_slots: [{ time: slotTime, day_offset: 0 }]
    };

    const result = manager.buildRegistrationMessage(data);

    const embed = result.embeds[0].toJSON();
    expect(embed.color).toBe(0xFFA500);
    expect(embed.title).toBe('🏆 Week 42 (In Progress)');

    // Check session date field uses full timestamp format
    const sessionField = embed.fields.find(f => f.name === 'Session Date');
    const expectedEpoch = moment.utc(sessionDate).unix();
    expect(sessionField.value).toBe(`<t:${expectedEpoch}:F>`);

    // Check time slots field
    const slotsField = embed.fields.find(f => f.name === 'Time Slots (UTC)');
    expect(slotsField.value).toContain('UTC');

    // Check button is disabled
    const button = result.components[0].toJSON().components[0];
    expect(button.custom_id).toBe('reg_register');
    expect(button.label).toBe('Tournament In Progress');
    expect(button.style).toBe(2); // Secondary
    expect(button.disabled).toBe(true);
  });

  // --- edge cases ---

  it('should handle tournament data with no courses gracefully', () => {
    const futureClose = moment.utc().add(2, 'days').toISOString();
    const futureSession = moment.utc().add(5, 'days').format('YYYY-MM-DD');

    const data = {
      tournament_state: 'open',
      tournament_name: 'Test',
      week: 'Week 1',
      registration_open: true,
      close_registration_on: futureClose,
      session_date: futureSession,
      courses: [],
      available_time_slots: [{ time: '20:00', day_offset: 0 }]
    };

    const result = manager.buildRegistrationMessage(data);
    const embed = result.embeds[0].toJSON();
    const fieldNames = embed.fields.map(f => f.name);
    expect(fieldNames).not.toContain('Courses');
  });

  it('should handle tournament data with no time slots gracefully in registration_open', () => {
    const futureClose = moment.utc().add(2, 'days').toISOString();
    const futureSession = moment.utc().add(5, 'days').format('YYYY-MM-DD');

    const data = {
      tournament_state: 'open',
      tournament_name: 'Test',
      week: 'Week 1',
      registration_open: true,
      close_registration_on: futureClose,
      session_date: futureSession,
      courses: [{ name: 'Course A' }],
      available_time_slots: []
    };

    const result = manager.buildRegistrationMessage(data);
    const embed = result.embeds[0].toJSON();
    const fieldNames = embed.fields.map(f => f.name);
    expect(fieldNames).not.toContain('Time Slots');
  });

  it('should always return exactly one embed and one component row', () => {
    // closed
    let result = manager.buildRegistrationMessage(null);
    expect(result.embeds).toHaveLength(1);
    expect(result.components).toHaveLength(1);

    // registration_open
    const futureClose = moment.utc().add(2, 'days').toISOString();
    result = manager.buildRegistrationMessage({
      tournament_state: 'open',
      tournament_name: 'T',
      week: 'W1',
      registration_open: true,
      close_registration_on: futureClose,
      session_date: moment.utc().add(5, 'days').format('YYYY-MM-DD'),
      courses: [{ name: 'C' }],
      available_time_slots: [{ time: '20:00', day_offset: 0 }]
    });
    expect(result.embeds).toHaveLength(1);
    expect(result.components).toHaveLength(1);
  });

  it('should use reg_register custom ID for all button states', () => {
    // closed
    let button = manager.buildRegistrationMessage(null).components[0].toJSON().components[0];
    expect(button.custom_id).toBe('reg_register');

    // registration_open
    const futureClose = moment.utc().add(2, 'days').toISOString();
    button = manager.buildRegistrationMessage({
      tournament_state: 'open',
      tournament_name: 'T',
      week: 'W1',
      registration_open: true,
      close_registration_on: futureClose,
      session_date: moment.utc().add(5, 'days').format('YYYY-MM-DD'),
      courses: [],
      available_time_slots: [{ time: '20:00', day_offset: 0 }]
    }).components[0].toJSON().components[0];
    expect(button.custom_id).toBe('reg_register');

    // ongoing
    const now = moment.utc();
    button = manager.buildRegistrationMessage({
      tournament_state: 'ongoing',
      tournament_name: 'T',
      week: 'W1',
      session_date: now.clone().startOf('day').format('YYYY-MM-DD'),
      available_time_slots: [{ time: now.clone().subtract(1, 'hour').format('HH:mm'), day_offset: 0 }]
    }).components[0].toJSON().components[0];
    expect(button.custom_id).toBe('reg_register');
  });
});


describe('RegistrationMessageManager.calculatePollingWindow', () => {
  let manager;

  beforeEach(() => {
    manager = new RegistrationMessageManager(null, null);
  });

  it('should return null for null data', () => {
    expect(manager.calculatePollingWindow(null)).toBeNull();
  });

  it('should return null when session_date is missing', () => {
    expect(manager.calculatePollingWindow({ available_time_slots: [{ time: '22:00' }] })).toBeNull();
  });

  it('should return null when available_time_slots is empty', () => {
    expect(manager.calculatePollingWindow({ session_date: '2024-08-10', available_time_slots: [] })).toBeNull();
  });

  it('should return null when available_time_slots is not an array', () => {
    expect(manager.calculatePollingWindow({ session_date: '2024-08-10', available_time_slots: 'invalid' })).toBeNull();
  });

  it('should calculate correct window for a single slot (2hrs before, 8hrs after)', () => {
    const result = manager.calculatePollingWindow({
      session_date: '2024-08-10',
      available_time_slots: [{ time: '22:00', day_offset: 0 }]
    });

    expect(result).not.toBeNull();
    expect(result.start.utc().format('YYYY-MM-DD HH:mm')).toBe('2024-08-10 20:00'); // 22:00 - 2hrs
    expect(result.end.utc().format('YYYY-MM-DD HH:mm')).toBe('2024-08-11 06:00');   // 22:00 + 8hrs
  });

  it('should account for day_offset in calculations', () => {
    const result = manager.calculatePollingWindow({
      session_date: '2024-08-10',
      available_time_slots: [{ time: '22:00', day_offset: -1 }]
    });

    expect(result).not.toBeNull();
    // day_offset -1 means slot is on Aug 9 at 22:00
    expect(result.start.utc().format('YYYY-MM-DD HH:mm')).toBe('2024-08-09 20:00'); // 22:00 - 2hrs on Aug 9
    expect(result.end.utc().format('YYYY-MM-DD HH:mm')).toBe('2024-08-10 06:00');   // 22:00 + 8hrs on Aug 9
  });

  it('should span from earliest slot - 2hrs to latest slot + 8hrs across multiple slots', () => {
    const result = manager.calculatePollingWindow({
      session_date: '2024-08-10',
      available_time_slots: [
        { time: '22:00', day_offset: -1 },
        { time: '02:00', day_offset: 0 },
        { time: '08:00', day_offset: 0 }
      ]
    });

    expect(result).not.toBeNull();
    expect(result.start.utc().format('YYYY-MM-DD HH:mm')).toBe('2024-08-09 20:00'); // earliest (22:00 Aug 9) - 2hrs
    expect(result.end.utc().format('YYYY-MM-DD HH:mm')).toBe('2024-08-10 16:00');   // latest (08:00 Aug 10) + 8hrs
  });

  it('should default day_offset to 0 when not provided', () => {
    const result = manager.calculatePollingWindow({
      session_date: '2024-08-10',
      available_time_slots: [{ time: '14:00' }]
    });

    expect(result).not.toBeNull();
    expect(result.start.utc().format('YYYY-MM-DD HH:mm')).toBe('2024-08-10 12:00'); // 14:00 - 2hrs
    expect(result.end.utc().format('YYYY-MM-DD HH:mm')).toBe('2024-08-10 22:00');   // 14:00 + 8hrs
  });

  it('should skip slots with no time property', () => {
    const result = manager.calculatePollingWindow({
      session_date: '2024-08-10',
      available_time_slots: [
        { day_offset: 0 },
        { time: '14:00', day_offset: 0 }
      ]
    });

    expect(result).not.toBeNull();
    expect(result.start.utc().format('YYYY-MM-DD HH:mm')).toBe('2024-08-10 12:00');
    expect(result.end.utc().format('YYYY-MM-DD HH:mm')).toBe('2024-08-10 22:00');
  });

  it('should return null when all slots have no time property', () => {
    const result = manager.calculatePollingWindow({
      session_date: '2024-08-10',
      available_time_slots: [{ day_offset: 0 }, { day_offset: -1 }]
    });

    expect(result).toBeNull();
  });
});

describe('RegistrationMessageManager.isWithinPollingWindow', () => {
  let manager;

  beforeEach(() => {
    manager = new RegistrationMessageManager(null, null);
  });

  it('should return false for null data', () => {
    expect(manager.isWithinPollingWindow(null)).toBe(false);
  });

  it('should return false for empty data', () => {
    expect(manager.isWithinPollingWindow({})).toBe(false);
  });

  it('should return true when current time is within the polling window', () => {
    const now = moment.utc();
    // Slot 1 hour from now — polling window starts 2hrs before slot = 1hr ago
    const slotMoment = now.clone().add(1, 'hour');
    const sessionDate = slotMoment.clone().startOf('day').format('YYYY-MM-DD');
    const slotTime = slotMoment.format('HH:mm');

    const data = {
      session_date: sessionDate,
      available_time_slots: [{ time: slotTime, day_offset: 0 }]
    };

    expect(manager.isWithinPollingWindow(data)).toBe(true);
  });

  it('should return false when current time is before the polling window', () => {
    // Session is far in the future
    const futureSession = moment.utc().add(10, 'days').format('YYYY-MM-DD');

    const data = {
      session_date: futureSession,
      available_time_slots: [{ time: '22:00', day_offset: -1 }]
    };

    expect(manager.isWithinPollingWindow(data)).toBe(false);
  });

  it('should return false when current time is after the polling window', () => {
    const now = moment.utc();
    const sessionDate = now.clone().startOf('day').format('YYYY-MM-DD');
    // Slot was 10 hours ago — polling window ended 8hrs after slot = 2hrs ago
    const slotTime = now.clone().subtract(10, 'hours').format('HH:mm');

    const data = {
      session_date: sessionDate,
      available_time_slots: [{ time: slotTime, day_offset: 0 }]
    };

    expect(manager.isWithinPollingWindow(data)).toBe(false);
  });

  it('should return true during the pre-slot polling period (before first slot but within 2hr offset)', () => {
    const now = moment.utc();
    // Slot 1 hour from now — we're within the 2hr pre-start offset
    const slotMoment = now.clone().add(1, 'hour');
    const sessionDate = slotMoment.clone().startOf('day').format('YYYY-MM-DD');
    const slotTime = slotMoment.format('HH:mm');

    const data = {
      session_date: sessionDate,
      available_time_slots: [{ time: slotTime, day_offset: 0 }]
    };

    expect(manager.isWithinPollingWindow(data)).toBe(true);
  });
});


describe('RegistrationMessageManager.startPolling / stopPolling', () => {
  let manager;
  let mockRegistrationService;

  beforeEach(() => {
    vi.useFakeTimers();
    mockRegistrationService = {
      getCurrentTournament: vi.fn().mockResolvedValue({})
    };
    manager = new RegistrationMessageManager(null, mockRegistrationService);
  });

  afterEach(() => {
    manager.stopPolling();
    vi.useRealTimers();
  });

  it('should set pollTimer when startPolling is called', () => {
    expect(manager.pollTimer).toBeNull();
    manager.startPolling();
    expect(manager.pollTimer).not.toBeNull();
  });

  it('should clear pollTimer when stopPolling is called', () => {
    manager.startPolling();
    expect(manager.pollTimer).not.toBeNull();
    manager.stopPolling();
    expect(manager.pollTimer).toBeNull();
  });

  it('should use idle interval when outside polling window', () => {
    // No lastTournamentData → isWithinPollingWindow returns false → idle interval
    manager.lastTournamentData = null;
    manager.startPolling();

    // After 60s (active interval), should NOT have polled yet
    vi.advanceTimersByTime(60000);
    expect(mockRegistrationService.getCurrentTournament).not.toHaveBeenCalled();

    // After 1hr (idle interval), should have polled
    vi.advanceTimersByTime(3600000 - 60000);
    expect(mockRegistrationService.getCurrentTournament).toHaveBeenCalledTimes(1);
  });

  it('should use active interval when within polling window', () => {
    const now = moment.utc();
    const slotMoment = now.clone().add(1, 'hour');
    const sessionDate = slotMoment.clone().startOf('day').format('YYYY-MM-DD');
    const slotTime = slotMoment.format('HH:mm');

    manager.lastTournamentData = {
      session_date: sessionDate,
      available_time_slots: [{ time: slotTime, day_offset: 0 }]
    };

    manager.startPolling();

    // After 60s (active interval), should have polled
    vi.advanceTimersByTime(60000);
    expect(mockRegistrationService.getCurrentTournament).toHaveBeenCalledTimes(1);
  });

  it('should stop existing timer before starting a new one', () => {
    manager.startPolling();
    const firstTimer = manager.pollTimer;

    manager.startPolling();
    const secondTimer = manager.pollTimer;

    expect(secondTimer).not.toBeNull();
    // The timers should be different references (old one cleared, new one created)
    expect(firstTimer).not.toBe(secondTimer);
  });

  it('stopPolling should be safe to call when no timer is running', () => {
    expect(manager.pollTimer).toBeNull();
    expect(() => manager.stopPolling()).not.toThrow();
    expect(manager.pollTimer).toBeNull();
  });
});

describe('RegistrationMessageManager._pollAndUpdate', () => {
  let manager;
  let mockRegistrationService;
  let mockClient;
  let mockMessage;

  beforeEach(() => {
    mockMessage = {
      edit: vi.fn().mockResolvedValue(undefined)
    };

    const mockChannel = {
      messages: {
        fetch: vi.fn().mockResolvedValue(mockMessage)
      }
    };

    mockClient = {
      channels: {
        fetch: vi.fn().mockResolvedValue(mockChannel)
      }
    };

    mockRegistrationService = {
      getCurrentTournament: vi.fn()
    };

    manager = new RegistrationMessageManager(mockClient, mockRegistrationService);
  });

  it('should update message when tournament data changes', async () => {
    const newData = { tournament_name: 'Test', week: 'Week 1' };
    mockRegistrationService.getCurrentTournament.mockResolvedValue(newData);
    manager.lastTournamentData = null;
    manager.messageReference = { channelId: '123', messageId: '456' };

    await manager._pollAndUpdate();

    expect(mockMessage.edit).toHaveBeenCalled();
    expect(manager.lastTournamentData).toEqual(newData);
  });

  it('should NOT update message when tournament data is unchanged', async () => {
    const data = { tournament_name: 'Test', week: 'Week 1' };
    mockRegistrationService.getCurrentTournament.mockResolvedValue(data);
    manager.lastTournamentData = { tournament_name: 'Test', week: 'Week 1' };

    await manager._pollAndUpdate();

    expect(mockMessage.edit).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully and retain last known state', async () => {
    const lastData = { tournament_name: 'Last Known' };
    manager.lastTournamentData = lastData;
    mockRegistrationService.getCurrentTournament.mockRejectedValue(new Error('API unreachable'));

    await manager._pollAndUpdate();

    // Should not throw, and last known state should be preserved
    expect(manager.lastTournamentData).toEqual(lastData);
  });

  it('should detect polling window change and restart polling', async () => {
    vi.useFakeTimers();
    const now = moment.utc();
    const slotMoment = now.clone().add(1, 'hour');
    const sessionDate = slotMoment.clone().startOf('day').format('YYYY-MM-DD');
    const slotTime = slotMoment.format('HH:mm');

    // Start with idle mode (no data → outside window)
    manager._lastPollingMode = false;
    manager.lastTournamentData = null;

    // New data puts us within the polling window
    const newData = {
      session_date: sessionDate,
      available_time_slots: [{ time: slotTime, day_offset: 0 }]
    };
    mockRegistrationService.getCurrentTournament.mockResolvedValue(newData);
    manager.messageReference = { channelId: '123', messageId: '456' };

    const startPollingSpy = vi.spyOn(manager, 'startPolling');

    await manager._pollAndUpdate();

    expect(startPollingSpy).toHaveBeenCalled();
    manager.stopPolling();
    vi.useRealTimers();
  });
});

describe('RegistrationMessageManager.updateMessage', () => {
  let manager;
  let mockMessage;
  let mockChannel;
  let mockClient;

  beforeEach(() => {
    mockMessage = {
      edit: vi.fn().mockResolvedValue(undefined)
    };

    mockChannel = {
      messages: {
        fetch: vi.fn().mockResolvedValue(mockMessage)
      }
    };

    mockClient = {
      channels: {
        fetch: vi.fn().mockResolvedValue(mockChannel)
      }
    };

    manager = new RegistrationMessageManager(mockClient, null);
  });

  it('should skip update when messageReference is null', async () => {
    manager.messageReference = null;

    await manager.updateMessage({});

    expect(mockClient.channels.fetch).not.toHaveBeenCalled();
  });

  it('should fetch channel and message, then edit with new content', async () => {
    manager.messageReference = {
      channelId: '111',
      messageId: '222',
      guildId: '333',
      createdAt: '2024-01-01T00:00:00Z',
      lastUpdatedAt: '2024-01-01T00:00:00Z'
    };

    await manager.updateMessage(null); // null → closed state embed

    expect(mockClient.channels.fetch).toHaveBeenCalledWith('111');
    expect(mockChannel.messages.fetch).toHaveBeenCalledWith('222');
    expect(mockMessage.edit).toHaveBeenCalledTimes(1);

    // Verify the edit was called with embeds and components
    const editArg = mockMessage.edit.mock.calls[0][0];
    expect(editArg).toHaveProperty('embeds');
    expect(editArg).toHaveProperty('components');
  });

  it('should update lastUpdatedAt in messageReference after successful edit', async () => {
    const originalTime = '2024-01-01T00:00:00Z';
    manager.messageReference = {
      channelId: '111',
      messageId: '222',
      lastUpdatedAt: originalTime
    };

    await manager.updateMessage(null);

    expect(manager.messageReference.lastUpdatedAt).not.toBe(originalTime);
  });

  it('should handle channel not found gracefully', async () => {
    mockClient.channels.fetch.mockResolvedValue(null);
    manager.messageReference = { channelId: '111', messageId: '222' };

    // Should not throw
    await manager.updateMessage({});
    expect(mockMessage.edit).not.toHaveBeenCalled();
  });

  it('should detect "Unknown Message" error and post a new message', async () => {
    const unknownMessageError = new Error('Unknown Message');
    unknownMessageError.code = 10008;
    mockMessage.edit.mockRejectedValue(unknownMessageError);

    const newMessage = { id: '789', guildId: '333' };
    // _postNewMessage fetches the channel again, so add send to mockChannel
    mockChannel.send = vi.fn().mockResolvedValue(newMessage);

    manager.messageReference = { channelId: '111', messageId: '222' };

    // Mock registrationService for _postNewMessage
    manager.registrationService = {
      getCurrentTournament: vi.fn().mockResolvedValue({})
    };

    await manager.updateMessage({});

    // Should have posted a new message via _postNewMessage
    expect(mockChannel.send).toHaveBeenCalled();
    // Should have updated the reference
    expect(manager.messageReference.messageId).toBe('789');
    expect(manager.messageReference.channelId).toBe('111');
  });

  it('should detect "Unknown Message" by error message string when code is absent', async () => {
    const unknownMessageError = new Error('Unknown Message');
    // No .code property set
    mockChannel.messages.fetch.mockRejectedValue(unknownMessageError);

    const newMessage = { id: '789', guildId: '333' };
    mockChannel.send = vi.fn().mockResolvedValue(newMessage);

    manager.messageReference = { channelId: '111', messageId: '222' };
    manager.registrationService = {
      getCurrentTournament: vi.fn().mockResolvedValue({})
    };

    await manager.updateMessage({});

    expect(mockChannel.send).toHaveBeenCalled();
    expect(manager.messageReference.messageId).toBe('789');
  });

  it('should re-throw non-"Unknown Message" errors', async () => {
    mockMessage.edit.mockRejectedValue(new Error('Network timeout'));
    manager.messageReference = { channelId: '111', messageId: '222' };

    await expect(manager.updateMessage({})).rejects.toThrow('Network timeout');
  });
});

import { saveMessageReference, loadMessageReference } from '../utils/MessagePersistence.js';

describe('RegistrationMessageManager.ensureMessageExists', () => {
  let manager;
  let mockMessage;
  let mockChannel;
  let mockClient;
  let mockRegistrationService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMessage = {
      id: '999',
      guildId: '777',
      edit: vi.fn().mockResolvedValue(undefined)
    };

    mockChannel = {
      messages: {
        fetch: vi.fn().mockResolvedValue(mockMessage)
      },
      send: vi.fn().mockResolvedValue(mockMessage)
    };

    mockClient = {
      channels: {
        fetch: vi.fn().mockResolvedValue(mockChannel)
      }
    };

    mockRegistrationService = {
      getCurrentTournament: vi.fn().mockResolvedValue({})
    };

    manager = new RegistrationMessageManager(mockClient, mockRegistrationService);
  });

  it('should verify existing message when reference exists and message is found', async () => {
    manager.messageReference = { channelId: '111', messageId: '222' };

    await manager.ensureMessageExists();

    expect(mockClient.channels.fetch).toHaveBeenCalledWith('111');
    expect(mockChannel.messages.fetch).toHaveBeenCalledWith('222');
    // Should NOT post a new message
    expect(mockChannel.send).not.toHaveBeenCalled();
  });

  it('should post a new message when reference exists but message is deleted', async () => {
    manager.messageReference = { channelId: '111', messageId: '222' };
    mockChannel.messages.fetch.mockRejectedValue(new Error('Unknown Message'));

    await manager.ensureMessageExists();

    // Should fetch tournament data and post a new message
    expect(mockRegistrationService.getCurrentTournament).toHaveBeenCalled();
    expect(mockChannel.send).toHaveBeenCalled();
    expect(saveMessageReference).toHaveBeenCalled();
    expect(manager.messageReference.messageId).toBe('999');
  });

  it('should post a new message when no reference but channelId is configured', async () => {
    manager.messageReference = null;

    // Config has channelId set — we need to mock it
    const originalChannelId = (await import('../config/config.js')).config.registration.channelId;
    const { config: mockConfig } = await import('../config/config.js');
    mockConfig.registration.channelId = '555';

    try {
      await manager.ensureMessageExists();

      expect(mockClient.channels.fetch).toHaveBeenCalledWith('555');
      expect(mockChannel.send).toHaveBeenCalled();
      expect(saveMessageReference).toHaveBeenCalled();
      expect(manager.messageReference).not.toBeNull();
      expect(manager.messageReference.channelId).toBe('555');
    } finally {
      mockConfig.registration.channelId = originalChannelId;
    }
  });

  it('should log warning and return when no reference and no channelId configured', async () => {
    manager.messageReference = null;

    const { config: mockConfig } = await import('../config/config.js');
    const originalChannelId = mockConfig.registration.channelId;
    mockConfig.registration.channelId = null;

    try {
      await manager.ensureMessageExists();

      expect(mockChannel.send).not.toHaveBeenCalled();
      expect(saveMessageReference).not.toHaveBeenCalled();
      expect(manager.messageReference).toBeNull();
    } finally {
      mockConfig.registration.channelId = originalChannelId;
    }
  });

  it('should use channelId from reference when message is deleted (not config)', async () => {
    manager.messageReference = { channelId: '111', messageId: '222' };
    mockChannel.messages.fetch.mockRejectedValue(new Error('Unknown Message'));

    await manager.ensureMessageExists();

    // _postNewMessage should use the channelId from the old reference
    expect(mockClient.channels.fetch).toHaveBeenCalledWith('111');
    expect(manager.messageReference.channelId).toBe('111');
  });

  it('should persist the new message reference with correct structure', async () => {
    manager.messageReference = { channelId: '111', messageId: '222' };
    mockChannel.messages.fetch.mockRejectedValue(new Error('Unknown Message'));

    await manager.ensureMessageExists();

    const savedRef = saveMessageReference.mock.calls[0][0];
    expect(savedRef).toHaveProperty('channelId', '111');
    expect(savedRef).toHaveProperty('messageId', '999');
    expect(savedRef).toHaveProperty('createdAt');
    expect(savedRef).toHaveProperty('lastUpdatedAt');
  });

  it('should handle channel fetch returning null when posting new message', async () => {
    manager.messageReference = { channelId: '111', messageId: '222' };
    mockChannel.messages.fetch.mockRejectedValue(new Error('Unknown Message'));
    // On the second fetch (for posting), return null
    mockClient.channels.fetch
      .mockResolvedValueOnce(mockChannel)  // first call: ensureMessageExists check
      .mockResolvedValueOnce(null);        // second call: _postNewMessage

    await manager.ensureMessageExists();

    expect(mockChannel.send).not.toHaveBeenCalled();
    expect(saveMessageReference).not.toHaveBeenCalled();
  });
});

describe('RegistrationMessageManager.initialize', () => {
  let manager;
  let mockMessage;
  let mockChannel;
  let mockClient;
  let mockRegistrationService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMessage = {
      id: '999',
      guildId: '777',
      edit: vi.fn().mockResolvedValue(undefined)
    };

    mockChannel = {
      messages: {
        fetch: vi.fn().mockResolvedValue(mockMessage)
      },
      send: vi.fn().mockResolvedValue(mockMessage)
    };

    mockClient = {
      channels: {
        fetch: vi.fn().mockResolvedValue(mockChannel)
      }
    };

    mockRegistrationService = {
      getCurrentTournament: vi.fn().mockResolvedValue({ tournament_name: 'Test', week: 'Week 1' })
    };

    manager = new RegistrationMessageManager(mockClient, mockRegistrationService);
  });

  afterEach(() => {
    manager.stopPolling();
  });

  it('should load persisted reference and store it', async () => {
    const ref = { channelId: '111', messageId: '222', guildId: '333' };
    loadMessageReference.mockResolvedValue(ref);

    await manager.initialize();

    expect(loadMessageReference).toHaveBeenCalled();
    expect(manager.messageReference.channelId).toBe('111');
    expect(manager.messageReference.messageId).toBe('222');
  });

  it('should handle null persisted reference (first run)', async () => {
    loadMessageReference.mockResolvedValue(null);

    const { config: mockConfig } = await import('../config/config.js');
    const originalChannelId = mockConfig.registration.channelId;
    mockConfig.registration.channelId = null;

    try {
      await manager.initialize();

      expect(loadMessageReference).toHaveBeenCalled();
      // messageReference stays null since no channelId configured
    } finally {
      mockConfig.registration.channelId = originalChannelId;
    }
  });

  it('should call ensureMessageExists during initialization', async () => {
    const ref = { channelId: '111', messageId: '222' };
    loadMessageReference.mockResolvedValue(ref);

    const ensureSpy = vi.spyOn(manager, 'ensureMessageExists').mockResolvedValue(undefined);

    await manager.initialize();

    expect(ensureSpy).toHaveBeenCalled();
  });

  it('should fetch initial tournament data and store it', async () => {
    loadMessageReference.mockResolvedValue({ channelId: '111', messageId: '222' });
    const tournamentData = { tournament_name: 'Summer Classic', week: 'Week 42' };
    mockRegistrationService.getCurrentTournament.mockResolvedValue(tournamentData);

    await manager.initialize();

    expect(mockRegistrationService.getCurrentTournament).toHaveBeenCalled();
    expect(manager.lastTournamentData).toEqual(tournamentData);
  });

  it('should start polling after initialization', async () => {
    loadMessageReference.mockResolvedValue({ channelId: '111', messageId: '222' });
    const startPollingSpy = vi.spyOn(manager, 'startPolling');

    await manager.initialize();

    expect(startPollingSpy).toHaveBeenCalled();
    expect(manager.pollTimer).not.toBeNull();
  });

  it('should propagate errors from initialization', async () => {
    loadMessageReference.mockRejectedValue(new Error('File system error'));

    await expect(manager.initialize()).rejects.toThrow('File system error');
  });

  it('should call ensureMessageExists before fetching tournament data', async () => {
    const callOrder = [];
    loadMessageReference.mockResolvedValue({ channelId: '111', messageId: '222' });

    vi.spyOn(manager, 'ensureMessageExists').mockImplementation(async () => {
      callOrder.push('ensureMessageExists');
    });
    mockRegistrationService.getCurrentTournament.mockImplementation(async () => {
      callOrder.push('getCurrentTournament');
      return {};
    });

    await manager.initialize();

    expect(callOrder[0]).toBe('ensureMessageExists');
    expect(callOrder[1]).toBe('getCurrentTournament');
  });
});
