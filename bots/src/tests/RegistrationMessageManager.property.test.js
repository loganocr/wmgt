import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import moment from 'moment-timezone';
import RegistrationMessageManager from '../services/RegistrationMessageManager.js';

// Mock config
vi.mock('../config/config.js', () => ({
  config: {
    registration: {}
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

// --- Arbitraries ---

const KNOWN_TIME_SLOTS = ['22:00', '00:00', '02:00', '04:00', '08:00', '12:00', '16:00', '18:00', '20:00'];
const DAY_OFFSETS = [-1, 0];

const arbTimeSlot = () =>
  fc.record({
    time: fc.constantFrom(...KNOWN_TIME_SLOTS),
    day_offset: fc.constantFrom(...DAY_OFFSETS)
  });

const arbTimeSlots = () =>
  fc.uniqueArray(arbTimeSlot(), {
    minLength: 1,
    maxLength: 5,
    comparator: (a, b) => a.time === b.time && a.day_offset === b.day_offset
  });

/**
 * Arbitrary: tournament data for `registration_open` state.
 * tournament_state: 'open'
 */
const arbRegistrationOpenData = () =>
  fc.record({
    timeSlots: arbTimeSlots(),
    futureCloseHours: fc.integer({ min: 1, max: 72 }),
    sessionDaysAhead: fc.integer({ min: 0, max: 14 })
  }).map(({ timeSlots, futureCloseHours, sessionDaysAhead }) => {
    const now = moment.utc();
    return {
      tournament_state: 'open',
      registration_open: true,
      close_registration_on: now.clone().add(futureCloseHours, 'hours').toISOString(),
      session_date: now.clone().add(sessionDaysAhead, 'days').startOf('day').format('YYYY-MM-DD'),
      available_time_slots: timeSlots
    };
  });

/**
 * Arbitrary: tournament data for `ongoing` state.
 * tournament_state: 'ongoing'
 */
const arbOngoingData = () =>
  fc.record({
    timeSlots: arbTimeSlots(),
    sessionDaysAhead: fc.integer({ min: 0, max: 5 })
  }).map(({ timeSlots, sessionDaysAhead }) => {
    const now = moment.utc();
    return {
      tournament_state: 'ongoing',
      registration_open: false,
      close_registration_on: now.clone().subtract(1, 'day').toISOString(),
      session_date: now.clone().add(sessionDaysAhead, 'days').startOf('day').format('YYYY-MM-DD'),
      available_time_slots: timeSlots
    };
  });

/**
 * Arbitrary: tournament data for `closed` state.
 * Null, empty object, undefined, or data with tournament_state: 'closed'.
 */
const arbClosedData = () =>
  fc.oneof(
    fc.constant(null),
    fc.constant({}),
    fc.constant(undefined),
    fc.integer({ min: 10, max: 30 }).map(daysAhead => {
      const now = moment.utc();
      return {
        tournament_state: 'closed',
        registration_open: false,
        close_registration_on: now.clone().subtract(1, 'day').toISOString(),
        session_date: now.clone().add(daysAhead, 'days').startOf('day').format('YYYY-MM-DD'),
        available_time_slots: [{ time: '22:00', day_offset: -1 }]
      };
    })
  );


// --- Property Tests ---

describe('Feature: discord-tournament-registration, Property 5: Tournament state derivation correctness', () => {
  let manager;

  beforeEach(() => {
    manager = new RegistrationMessageManager(null, null);
  });

  /**
   * Property 5.1: The derived state is always exactly one of the three valid states.
   * Validates: Requirements 2.1, 2.2, 2.3
   *
   * For any tournament data (including null/empty), deriveTournamentState must
   * return exactly one of 'registration_open', 'ongoing', or 'closed'.
   */
  it('should always return exactly one of the three valid states', () => {
    const VALID_STATES = ['registration_open', 'ongoing', 'closed'];

    const arbAnyTournamentData = fc.oneof(
      arbRegistrationOpenData(),
      arbOngoingData(),
      arbClosedData()
    );

    fc.assert(
      fc.property(arbAnyTournamentData, (data) => {
        const state = manager.deriveTournamentState(data);
        expect(VALID_STATES).toContain(state);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.2: If tournament_state is 'open', state must be 'registration_open'.
   * Validates: Requirements 2.1, 2.2, 2.3
   */
  it('should return "registration_open" when tournament_state is "open"', () => {
    fc.assert(
      fc.property(arbRegistrationOpenData(), (data) => {
        const state = manager.deriveTournamentState(data);
        expect(state).toBe('registration_open');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.3: If tournament_state is 'ongoing', state must be 'ongoing'.
   * Validates: Requirements 2.1, 2.2, 2.3
   */
  it('should return "ongoing" when tournament_state is "ongoing"', () => {
    fc.assert(
      fc.property(arbOngoingData(), (data) => {
        const state = manager.deriveTournamentState(data);
        expect(state).toBe('ongoing');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.4: Null, undefined, or empty data always yields 'closed'.
   * Validates: Requirements 2.1, 2.2, 2.3
   */
  it('should return "closed" for null, undefined, or empty data', () => {
    const arbNullish = fc.constantFrom(null, undefined, {});

    fc.assert(
      fc.property(arbNullish, (data) => {
        const state = manager.deriveTournamentState(data);
        expect(state).toBe('closed');
      }),
      { numRuns: 100 }
    );
  });
});


// --- Property 8: Change detection triggers embed update ---

const COURSE_NAMES = ['Sweetopia', 'El Dorado', 'Labyrinth', 'Myst', 'Shangri-La', 'Quixote', 'Upside Town', 'Meow Wolf'];
const TOURNAMENT_NAMES = ['WMGT Season 10', 'WMGT Season 11', 'WMGT Season 12'];
const WEEKS = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'];

const arbCourse = () =>
  fc.record({
    name: fc.constantFrom(...COURSE_NAMES)
  });

const arbCourses = () =>
  fc.uniqueArray(arbCourse(), {
    minLength: 1,
    maxLength: 3,
    comparator: (a, b) => a.name === b.name
  });

const arbFullTournamentData = () =>
  fc.record({
    tournament_name: fc.constantFrom(...TOURNAMENT_NAMES),
    week: fc.constantFrom(...WEEKS),
    sessionDaysAhead: fc.integer({ min: 0, max: 14 }),
    futureCloseHours: fc.integer({ min: 1, max: 72 }),
    courses: arbCourses(),
    timeSlots: arbTimeSlots()
  }).map(({ tournament_name, week, sessionDaysAhead, futureCloseHours, courses, timeSlots }) => {
    const now = moment.utc();
    return {
      tournament_state: 'open',
      tournament_name,
      week,
      registration_open: true,
      close_registration_on: now.clone().add(futureCloseHours, 'hours').toISOString(),
      session_date: now.clone().add(sessionDaysAhead, 'days').startOf('day').format('YYYY-MM-DD'),
      courses,
      available_time_slots: timeSlots
    };
  });

const arbModifiedPair = () =>
  arbFullTournamentData().chain((base) => {
    return fc.constantFrom('tournament_name', 'week', 'courses', 'time_slots', 'tournament_state', 'close_registration_on', 'session_date')
      .chain((field) => {
        const modified = { ...base, courses: [...base.courses], available_time_slots: [...base.available_time_slots] };

        switch (field) {
          case 'tournament_name':
            return fc.constantFrom(...TOURNAMENT_NAMES.filter(n => n !== base.tournament_name).concat(['WMGT Special Event']))
              .map(name => {
                modified.tournament_name = name;
                return { base, modified };
              });

          case 'week':
            return fc.constantFrom(...WEEKS.filter(w => w !== base.week).concat(['Week 7']))
              .map(week => {
                modified.week = week;
                return { base, modified };
              });

          case 'courses':
            return arbCourses()
              .filter(c => JSON.stringify(c) !== JSON.stringify(base.courses))
              .map(courses => {
                modified.courses = courses;
                return { base, modified };
              });

          case 'time_slots':
            return arbTimeSlots()
              .filter(ts => JSON.stringify(ts) !== JSON.stringify(base.available_time_slots))
              .map(timeSlots => {
                modified.available_time_slots = timeSlots;
                return { base, modified };
              });

          case 'tournament_state':
            // Change state to closed — this changes the derived state entirely
            modified.tournament_state = 'closed';
            modified.registration_open = false;
            return fc.constant({ base, modified });

          case 'close_registration_on':
            return fc.integer({ min: 1, max: 72 })
              .filter(h => {
                const newClose = moment.utc().add(h, 'hours').toISOString();
                return newClose !== base.close_registration_on;
              })
              .map(h => {
                modified.close_registration_on = moment.utc().add(h, 'hours').toISOString();
                return { base, modified };
              });

          case 'session_date':
            return fc.integer({ min: 0, max: 14 })
              .filter(d => {
                const newDate = moment.utc().add(d, 'days').startOf('day').format('YYYY-MM-DD');
                return newDate !== base.session_date;
              })
              .map(d => {
                modified.session_date = moment.utc().add(d, 'days').startOf('day').format('YYYY-MM-DD');
                return { base, modified };
              });

          default:
            return fc.constant({ base, modified });
        }
      });
  });

describe('Feature: discord-tournament-registration, Property 8: Change detection triggers embed update', () => {
  let manager;

  beforeEach(() => {
    manager = new RegistrationMessageManager(null, null);
  });

  /**
   * Property 8: For any two distinct tournament data snapshots where at least
   * one field differs, the manager should detect the change (via JSON.stringify
   * comparison) and produce a different embed via buildRegistrationMessage().
   *
   * Validates: Requirements 6.2
   */
  it('should produce different embeds for distinct tournament data snapshots', () => {
    fc.assert(
      fc.property(arbModifiedPair(), ({ base, modified }) => {
        const baseJson = JSON.stringify(base);
        const modifiedJson = JSON.stringify(modified);
        expect(baseJson).not.toBe(modifiedJson);

        const baseMessage = manager.buildRegistrationMessage(base);
        const modifiedMessage = manager.buildRegistrationMessage(modified);

        const baseEmbedJson = JSON.stringify(baseMessage);
        const modifiedEmbedJson = JSON.stringify(modifiedMessage);
        expect(baseEmbedJson).not.toBe(modifiedEmbedJson);
      }),
      { numRuns: 100 }
    );
  });
});
