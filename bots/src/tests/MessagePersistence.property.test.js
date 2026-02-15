import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { saveMessageReference, loadMessageReference } from '../utils/MessagePersistence.js';

// Use a unique temp directory per process to avoid parallel test conflicts
const TEST_DIR = path.join(os.tmpdir(), `msg-persist-pbt-${process.pid}`);

// Mock config to use the unique temp path
vi.mock('../config/config.js', () => ({
  config: {
    registration: {
      messageDataPath: path.join(os.tmpdir(), `msg-persist-pbt-${process.pid}`, 'registration-message.json')
    }
  }
}));

/**
 * Arbitrary: Discord snowflake ID — a string of 17-20 digits
 */
const arbSnowflake = () =>
  fc.integer({ min: 17, max: 20 }).chain(len =>
    fc.array(fc.integer({ min: 0, max: 9 }), { minLength: len, maxLength: len })
      .map(digits => digits.join(''))
  );

/**
 * Arbitrary: ISO 8601 timestamp string
 */
const arbISOTimestamp = () =>
  fc.date({ min: new Date('2020-01-01T00:00:00Z'), max: new Date('2030-12-31T23:59:59Z') })
    .filter(d => !isNaN(d.getTime()))
    .map(d => d.toISOString());

/**
 * Arbitrary: Valid message reference object matching the persisted schema
 */
const arbMessageReference = () =>
  fc.record({
    channelId: arbSnowflake(),
    messageId: arbSnowflake(),
    guildId: arbSnowflake(),
    createdAt: arbISOTimestamp(),
    lastUpdatedAt: arbISOTimestamp()
  });

describe('Feature: discord-tournament-registration, Property 1: Message reference persistence round trip', () => {
  beforeEach(async () => {
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  afterEach(async () => {
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  /**
   * Property 1: Message reference persistence round trip
   * Validates: Requirements 1.2
   *
   * For any valid message reference object (containing channelId, messageId,
   * guildId, and timestamps), saving it to the JSON file and then loading it
   * back should produce an equivalent object.
   */
  it('should round-trip any valid message reference through save and load', async () => {
    await fc.assert(
      fc.asyncProperty(arbMessageReference(), async (ref) => {
        await saveMessageReference(ref);
        const loaded = await loadMessageReference();

        expect(loaded).toEqual(ref);
      }),
      { numRuns: 100 }
    );
  });
});
