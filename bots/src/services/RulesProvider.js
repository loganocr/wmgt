import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RULES_FILE_PATH = path.join(__dirname, '..', '..', 'data', 'tournament-rules.txt');

let cachedRules = null;

/**
 * Loads tournament rules text from the external file.
 * Caches the content after first read.
 * @returns {Promise<string>} The rules text content
 * @throws {Error} If the file cannot be read
 */
export async function getRulesText() {
  if (cachedRules !== null) {
    return cachedRules;
  }

  try {
    const content = await readFile(RULES_FILE_PATH, 'utf-8');
    cachedRules = content;
    return cachedRules;
  } catch (error) {
    throw new Error(`Failed to load tournament rules from ${RULES_FILE_PATH}: ${error.message}`);
  }
}

/**
 * Clears the cached rules text, forcing a reload on next call.
 */
export function clearCache() {
  cachedRules = null;
}
