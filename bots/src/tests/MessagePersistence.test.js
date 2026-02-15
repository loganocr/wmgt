import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { saveMessageReference, loadMessageReference } from '../utils/MessagePersistence.js';

// Mock the config module to use a temp path for tests
vi.mock('../config/config.js', () => ({
  config: {
    registration: {
      messageDataPath: './test-tmp/registration-message.json'
    }
  }
}));

const TEST_DIR = './test-tmp';
const TEST_FILE = './test-tmp/registration-message.json';

describe('MessagePersistence', () => {
  beforeEach(async () => {
    // Clean up before each test
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore if doesn't exist
    }
  });

  afterEach(async () => {
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('saveMessageReference', () => {
    it('should create the directory and save the file', async () => {
      const data = {
        channelId: '1234567890123456789',
        messageId: '9876543210987654321',
        guildId: '1111111111111111111',
        createdAt: '2024-08-10T00:00:00Z',
        lastUpdatedAt: '2024-08-10T12:30:00Z'
      };

      await saveMessageReference(data);

      const content = await fs.readFile(TEST_FILE, 'utf-8');
      expect(JSON.parse(content)).toEqual(data);
    });

    it('should overwrite an existing file', async () => {
      const first = { channelId: '111', messageId: '222', guildId: '333', createdAt: '2024-01-01T00:00:00Z', lastUpdatedAt: '2024-01-01T00:00:00Z' };
      const second = { channelId: '444', messageId: '555', guildId: '666', createdAt: '2024-02-01T00:00:00Z', lastUpdatedAt: '2024-02-01T00:00:00Z' };

      await saveMessageReference(first);
      await saveMessageReference(second);

      const content = await fs.readFile(TEST_FILE, 'utf-8');
      expect(JSON.parse(content)).toEqual(second);
    });
  });

  describe('loadMessageReference', () => {
    it('should return null when the file does not exist', async () => {
      const result = await loadMessageReference();
      expect(result).toBeNull();
    });

    it('should load a previously saved reference', async () => {
      const data = {
        channelId: '1234567890123456789',
        messageId: '9876543210987654321',
        guildId: '1111111111111111111',
        createdAt: '2024-08-10T00:00:00Z',
        lastUpdatedAt: '2024-08-10T12:30:00Z'
      };

      await saveMessageReference(data);
      const result = await loadMessageReference();

      expect(result).toEqual(data);
    });

    it('should throw on malformed JSON', async () => {
      await fs.mkdir(TEST_DIR, { recursive: true });
      await fs.writeFile(TEST_FILE, 'not-json', 'utf-8');

      await expect(loadMessageReference()).rejects.toThrow();
    });
  });
});
