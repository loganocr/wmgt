import { describe, it, expect, vi } from 'vitest';
import { MyStatusService } from '../services/MyStatusService.js';

function createUser() {
  return {
    id: '123',
    username: 'testuser',
    displayName: 'Test User',
    displayAvatarURL: vi.fn().mockReturnValue('https://example.com/avatar.png')
  };
}

describe('MyStatusService', () => {
  it('returns not-registered embed when no registrations exist', async () => {
    const registrationService = {
      getPlayerRegistrations: vi.fn().mockResolvedValue({ player: null, registrations: [] })
    };
    const timezoneService = {
      getUserTimezone: vi.fn().mockResolvedValue('UTC'),
      validateTimezone: vi.fn().mockReturnValue(true)
    };
    const service = new MyStatusService(registrationService, timezoneService);

    const payload = await service.buildStatusPayload(createUser());
    const embed = payload.embeds[0].toJSON();

    expect(embed.description).toContain('not currently registered');
  });

  it('includes time, room, and room players when registration exists', async () => {
    const registrationService = {
      getPlayerRegistrations: vi.fn().mockResolvedValue({
        player: { name: 'Test Player' },
        registrations: [{
          week: 'Week 42',
          session_date_epoch: 1723327200,
          session_date_formatted: 'Sat, Aug 10, 2024 10:00 PM UTC',
          room_no: 3,
          room_players: [
            { player_name: 'Test Player', isNew: false },
            { player_name: 'Rookie', isNew: true }
          ],
          session_id: 42,
          courses: [{ course_code: 'CLE', course_name: 'Crystal Lair' }]
        }]
      })
    };
    const timezoneService = {
      getUserTimezone: vi.fn().mockResolvedValue('UTC'),
      validateTimezone: vi.fn().mockReturnValue(true)
    };
    const service = new MyStatusService(registrationService, timezoneService);

    const payload = await service.buildStatusPayload(createUser());
    const embed = payload.embeds[0].toJSON();
    const field = embed.fields.find(f => f.name.includes('Week 42'));

    expect(field.value).toContain('**Time:**');
    expect(field.value).toContain('**Room:** 3');
    expect(field.value).toContain('• Test Player');
    expect(field.value).toContain('• Rookie 🌱');
  });

  it('returns invalid timezone embed when stored timezone is invalid', async () => {
    const registrationService = {
      getPlayerRegistrations: vi.fn()
    };
    const timezoneService = {
      getUserTimezone: vi.fn().mockResolvedValue('BAD/TZ'),
      validateTimezone: vi.fn().mockReturnValue(false)
    };
    const service = new MyStatusService(registrationService, timezoneService);

    const payload = await service.buildStatusPayload(createUser());
    const embed = payload.embeds[0].toJSON();

    expect(embed.title).toContain('Invalid Timezone');
    expect(registrationService.getPlayerRegistrations).not.toHaveBeenCalled();
  });
});

