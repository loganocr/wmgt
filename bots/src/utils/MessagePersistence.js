import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/config.js';

/**
 * Utility for persisting and loading the registration message reference.
 * Stores channel ID, message ID, and metadata as a JSON file so the bot
 * can recover the message after restarts.
 */

/**
 * Save a message reference object to the configured JSON file.
 * Creates the parent directory if it doesn't exist.
 * @param {Object} data - Message reference data (channelId, messageId, guildId, createdAt, lastUpdatedAt)
 * @returns {Promise<void>}
 */
export async function saveMessageReference(data) {
  const filePath = config.registration.messageDataPath;
  const dir = path.dirname(filePath);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Load the persisted message reference from the configured JSON file.
 * Returns null if the file does not exist (e.g. first run).
 * @returns {Promise<Object|null>} The message reference object, or null if not found
 */
export async function loadMessageReference() {
  const filePath = config.registration.messageDataPath;

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}
