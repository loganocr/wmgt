import { CourseLeaderboardService } from './CourseLeaderboardService.js';
import { config } from '../config/config.js';

/**
 * Service for handling race leaderboard API communication
 * Extends CourseLeaderboardService to inherit all authentication, caching, and error handling
 * Only overrides methods specific to race leaderboards (times instead of scores)
 */
export class RaceLeaderboardService extends CourseLeaderboardService {
  constructor() {
    super();
    this.serviceName = 'RaceLeaderboardService';
  }

  /**
   * Fetch race leaderboard data for a specific course
   * Overrides parent method to use race API endpoint
   * @param {string} courseCode - 3-letter course code (e.g., "ALE", "BBH")
   * @param {string} userId - Discord user ID to identify user's scores
   * @returns {Promise<Object>} Race leaderboard data with user context
   */
  async getRaceLeaderboard(courseCode, userId) {
    if (!courseCode || typeof courseCode !== 'string') {
      const error = new Error('Course code is required and must be a string');
      error.noRetry = true;
      throw error;
    }

    if (!userId || typeof userId !== 'string') {
      const error = new Error('User ID is required and must be a string');
      error.noRetry = true;
      throw error;
    }

    const normalizedCourseCode = courseCode.trim().toUpperCase();

    return this.retryHandler.executeWithRetry(
      async () => {
        try {
          this.logger.debug('Fetching race leaderboard', {
            courseCode: normalizedCourseCode,
            userId: userId
          });

          // Build endpoint URL for race leaderboard
          const endpoint = `${config.api.endpoints.leaderboards}/racecourse`;

          // Add course code and discord_id as query parameters
          const params = {
            course_code: normalizedCourseCode,
            discord_id: userId
          };

          const response = await this.authenticatedGet(endpoint, params);

          // Validate response structure
          if (!response) {
            const error = new Error('No response received from race leaderboards API');
            error.noRetry = true;
            throw error;
          }

          if (!response.items) {
            this.logger.warn('No items array in race leaderboard response', {
              courseCode: normalizedCourseCode,
              responseKeys: Object.keys(response)
            });

            // Return empty leaderboard structure for valid courses with no scores
            return {
              items: [],
              hasMore: false,
              count: 0,
              courseCode: normalizedCourseCode,
              userId: userId
            };
          }

          if (!Array.isArray(response.items)) {
            const error = new Error('Invalid race leaderboard data format - items not array');
            error.noRetry = true;
            throw error;
          }

          // Validate individual race leaderboard entries
          const validItems = response.items.filter((item, index) => {
            const isValid = item &&
              typeof item === 'object' &&
              typeof item.pos === 'number' &&
              typeof item.player_name === 'string' &&
              typeof item.round_speed_prepared === 'string';

            if (!isValid) {
              this.logger.warn('Invalid race leaderboard entry', {
                courseCode: normalizedCourseCode,
                itemIndex: index,
                item: item
              });
            }

            return isValid;
          });

          this.logger.debug('Race leaderboard fetched successfully', {
            courseCode: normalizedCourseCode,
            totalItems: response.items.length,
            validItems: validItems.length,
            hasMore: response.hasMore,
            count: response.count
          });

          return {
            ...response,
            items: validItems,
            courseCode: normalizedCourseCode,
            userId: userId
          };

        } catch (error) {
          // Enhanced error logging for debugging
          this.logger.error('Error fetching race leaderboard', {
            courseCode: normalizedCourseCode,
            userId: userId,
            errorMessage: error.message,
            errorCode: error.code,
            httpStatus: error.response?.status,
            httpStatusText: error.response?.statusText,
            responseData: error.response?.data,
            stack: error.stack
          });

          // Handle specific error cases with enhanced messaging
          if (error.response?.status === 404) {
            throw this.createCourseNotFoundError(normalizedCourseCode);
          }

          if (error.response?.status === 400) {
            const validationError = new Error(`Invalid course code '${normalizedCourseCode}'. Course codes should be 3 letters (e.g., ALE, BBH).`);
            validationError.noRetry = true;
            validationError.courseCode = normalizedCourseCode;
            validationError.errorType = 'INVALID_COURSE_CODE';
            throw validationError;
          }

          // Handle authentication errors
          if (error.response?.status === 401 || error.response?.status === 429 ||
            error.message?.includes('Authentication failed') ||
            error.message?.includes('OAuth2 client credentials')) {
            throw this.handleAuthenticationError(error, 'race_leaderboard');
          }

          // Handle service unavailable scenarios
          if (error.response?.status >= 500 || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            throw this.createApiUnavailableError(error, 'race_leaderboard');
          }

          throw error;
        }
      },
      {
        maxRetries: 3,
        shouldRetry: (error) => {
          // Don't retry on validation errors or course not found
          if (error.noRetry || error.response?.status === 404 || error.response?.status === 400) {
            return false;
          }

          // Retry on 401 (token expired) after clearing token
          if (error.response?.status === 401) {
            return true;
          }

          return this.retryHandler.shouldRetry(error);
        }
      },
      'getRaceLeaderboard'
    );
  }

  /**
   * Format race leaderboard data for display, identifying user scores and handling approval status
   * Overrides parent method to process round_speed_prepared and time_behind_prepared fields
   * @param {Object} apiResponse - Raw API response from getRaceLeaderboard
   * @param {string} userId - Discord user ID to identify user's scores
   * @returns {Object} Formatted race leaderboard data with user context
   */
  formatLeaderboardData(apiResponse, userId) {
    try {
      // Validate input parameters
      if (!apiResponse || typeof apiResponse !== 'object') {
        throw new Error('API response is required and must be an object');
      }

      if (!userId || typeof userId !== 'string') {
        throw new Error('User ID is required and must be a string');
      }

      // Extract course information
      const courseInfo = {
        code: apiResponse.courseCode || 'UNKNOWN',
        name: this.getCourseNameFromCode(apiResponse.courseCode),
        difficulty: this.getCourseDifficulty(apiResponse.courseCode)
      };

      // Handle empty leaderboard
      if (!apiResponse.items || !Array.isArray(apiResponse.items) || apiResponse.items.length === 0) {
        this.logger.debug('No race leaderboard entries found', {
          courseCode: courseInfo.code,
          userId: userId
        });

        return {
          course: courseInfo,
          entries: [],
          totalEntries: 0,
          userEntries: [],
          hasUserScores: false,
          lastUpdated: new Date()
        };
      }

      // Process race leaderboard entries
      const processedEntries = [];
      const userEntries = [];
      let hasUserScores = false;

      apiResponse.items.forEach((item, index) => {
        try {
          // Validate entry structure
          if (!item || typeof item !== 'object') {
            this.logger.warn('Invalid race leaderboard entry structure', {
              courseCode: courseInfo.code,
              entryIndex: index,
              entry: item
            });
            return;
          }

          // Ensure required fields exist
          const pos = typeof item.pos === 'number' ? item.pos : NaN;
          const playerName = typeof item.player_name === 'string' ? item.player_name.trim() : 'Unknown Player';
          const roundSpeedPrepared = typeof item.round_speed_prepared === 'string' ? item.round_speed_prepared : '0:00.00';
          const timeBehindPrepared = item.time_behind_prepared !== null && item.time_behind_prepared !== undefined 
            ? String(item.time_behind_prepared) 
            : null;
          const discordId = item.discord_id;
          const isApproved = Boolean(item.isapproved === 'true' ? true : false);
          const isCurrentUser = Boolean(discordId === userId);

          // Create processed entry
          const processedEntry = {
            position: pos,
            playerName: playerName,
            roundSpeedPrepared: roundSpeedPrepared,
            timeBehindPrepared: timeBehindPrepared,
            discordId: discordId,
            isApproved: isApproved,
            isCurrentUser: isCurrentUser
          };

          processedEntries.push(processedEntry);

          // Track user entries
          if (processedEntry.isCurrentUser) {
            userEntries.push(processedEntry);
            hasUserScores = true;
          }

        } catch (entryError) {
          this.logger.warn('Error processing race leaderboard entry', {
            courseCode: courseInfo.code,
            entryIndex: index,
            entry: item,
            error: entryError.message
          });
        }
      });

      // Sort entries by position (should already be sorted from API, but ensure consistency)
      processedEntries.sort((a, b) => a.position - b.position);

      // Log processing results
      this.logger.debug('Race leaderboard data formatted successfully', {
        courseCode: courseInfo.code,
        totalEntries: processedEntries.length,
        userEntries: userEntries.length,
        hasUserScores: hasUserScores,
        userId: userId
      });

      return {
        course: courseInfo,
        entries: processedEntries,
        totalEntries: apiResponse.count || processedEntries.length,
        userEntries: userEntries,
        hasUserScores: hasUserScores,
        lastUpdated: new Date()
      };

    } catch (error) {
      this.logger.error('Error formatting race leaderboard data', {
        userId: userId,
        apiResponse: apiResponse,
        error: error.message,
        stack: error.stack
      });

      // Return safe fallback structure
      return {
        course: {
          code: apiResponse?.courseCode || 'UNKNOWN',
          name: 'Unknown Course',
          difficulty: 'Unknown'
        },
        entries: [],
        totalEntries: 0,
        userEntries: [],
        hasUserScores: false,
        lastUpdated: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Format race leaderboard entries into display lines
   * Overrides parent method to display times with time behind values from API
   * @param {Object} leaderboardData - Formatted race leaderboard data
   * @returns {Array<string>} Array of formatted race leaderboard lines
   */
  formatLeaderboardLines(leaderboardData) {
    const displayEntries = leaderboardData.entries;
    const leaderboardLines = [];

    displayEntries.forEach((entry, index) => {
      let line = '`';  // open fixed width

      // Add position indicators for top 3
      if (entry.position === 1) {
        line += ' 🥇 ';
      } else if (entry.position === 2) {
        line += ' 🥈 ';
      } else if (entry.position === 3) {
        line += ' 🥉 ';
      } else {
        line += (entry.position < 10 ? ' ' : '') + `${entry.position}. `;
      }

      // Add time (round_speed_prepared)
      line += `${entry.roundSpeedPrepared}`;

      // Add time behind for positions 2+ (using time_behind_prepared from API)
      if (entry.position > 1 && entry.timeBehindPrepared !== null) {
        line += ` (+${entry.timeBehindPrepared})`;
      }

      line += '` ';  // close fixed width

      // Add player name (truncate if too long)
      const maxNameLength = 25;
      let playerName = entry.playerName;
      if (playerName.length > maxNameLength) {
        playerName = playerName.substring(0, maxNameLength - 3) + '...';
      }

      // Bold Top 3 players
      if (entry.position <= 3) {
        playerName = '**' + playerName + '**';
      }
      line += playerName;

      // Add user identification and approval status
      if (entry.isCurrentUser) {
        line += ' ⬅️ ';
        if (!entry.isApproved) {
          line += ' 📝';
        }
      }

      leaderboardLines.push(line);
    });

    return leaderboardLines;
  }

  /**
   * Create Discord embed for race leaderboard display with user highlighting
   * Overrides parent method to change title to "Race Leaderboard" and field name to "Top Race Times"
   * @param {Object} leaderboardData - Formatted race leaderboard data from formatLeaderboardData
   * @param {Object} courseInfo - Course information (optional, will use data from leaderboardData if not provided)
   * @returns {Object} Discord embed object
   */
  createLeaderboardEmbed(leaderboardData, courseInfo = null) {
    try {
      // Validate input
      if (!leaderboardData || typeof leaderboardData !== 'object') {
        throw new Error('Leaderboard data is required and must be an object');
      }

      // Use provided courseInfo or extract from leaderboardData
      const course = courseInfo || leaderboardData.course;
      if (!course) {
        throw new Error('Course information is required');
      }

      // Create embed structure
      const embed = {
        color: 0x00AE86, // Consistent bot theme color
        title: `🏁 ${course.name} Race Leaderboard`,
        description: `${course.code} - ${course.name} ${course.difficulty}\n`,
        fields: [],
        footer: {
          text: `Last updated: ${leaderboardData.lastUpdated.toLocaleString()}`
        },
        timestamp: leaderboardData.lastUpdated.toISOString()
      };

      // Handle empty leaderboard
      if (!leaderboardData.entries || leaderboardData.entries.length === 0) {
        embed.fields.push({
          name: '⏱️ Race Times',
          value: 'No race times recorded for this course yet. Be the first to submit!',
          inline: false
        });
        return embed;
      }

      const leaderboardLines = this.formatLeaderboardLines(leaderboardData);
      let textDisplay = leaderboardLines.join('\n');

      textDisplay = this.truncateTextDisplay(textDisplay);

      // Add leaderboard field
      embed.fields.push({
        name: '⏱️ Top Race Times',
        value: textDisplay,
        inline: false
      });

      // Add user summary if user has scores
      if (leaderboardData.hasUserScores && leaderboardData.userEntries.length > 0) {
        const userSummaryLines = [];

        leaderboardData.userEntries.forEach(userEntry => {
          const timeDisplay = userEntry.roundSpeedPrepared;
          const timeBehindDisplay = userEntry.timeBehindPrepared !== null ? ` (+${userEntry.timeBehindPrepared})` : '';
          const statusText = userEntry.isApproved ? '' : ' (Personal)';
          userSummaryLines.push(`Position ${userEntry.position}: ${timeDisplay}${timeBehindDisplay}${statusText}`);
        });

        embed.fields.push({
          name: '\n🎯 Your Time',
          value: userSummaryLines.join('\n'),
          inline: false
        });
      }

      // Add legend if there are personal scores
      const hasPersonalScores = leaderboardData.entries.some(entry => !entry.isApproved);
      if (hasPersonalScores) {
        embed.fields.push({
          name: '\n📋 Legend',
          value: '🥇🥈🥉 Top 3 positions\n📝 Personal (unapproved) times\n⬅️ **[YOU]** Your time',
          inline: false
        });
      }

      this.logger.debug('Discord embed created successfully', {
        courseCode: course.code,
        entriesDisplayed: leaderboardLines.length,
        totalEntries: leaderboardData.totalEntries,
        hasUserScores: leaderboardData.hasUserScores,
        hasPersonalScores: hasPersonalScores
      });

      return embed;

    } catch (error) {
      this.logger.error('Error creating Discord embed', {
        leaderboardData: leaderboardData,
        courseInfo: courseInfo,
        error: error.message,
        stack: error.stack
      });

      // Return error embed
      return {
        color: 0xFF0000, // Red color for error
        title: '❌ Error Creating Race Leaderboard',
        description: 'An error occurred while formatting the race leaderboard data.',
        fields: [{
          name: 'Error Details',
          value: error.message,
          inline: false
        }],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Create fallback text display for race leaderboard when embeds fail
   * Overrides parent method to change header to "Race Leaderboard"
   * @param {Object} leaderboardData - Formatted race leaderboard data from formatLeaderboardData
   * @param {Object} courseInfo - Course information (optional, will use data from leaderboardData if not provided)
   * @returns {string} Formatted text display with proper Discord character limit handling
   */
  createTextDisplay(leaderboardData, courseInfo = null) {
    try {
      // Validate input
      if (!leaderboardData || typeof leaderboardData !== 'object') {
        throw new Error('Leaderboard data is required and must be an object');
      }

      // Use provided courseInfo or extract from leaderboardData
      const course = courseInfo || leaderboardData.course;
      if (!course) {
        throw new Error('Course information is required');
      }

      // Start building text display
      let textDisplay = '';

      // Header
      textDisplay += `🏁 **${course.name} Race Leaderboard**\n`;
      textDisplay += `${course.code} - ${course.name} ${course.difficulty}\n`;
      textDisplay += `Last updated: ${leaderboardData.lastUpdated.toLocaleString()}\n\n`;

      // Handle empty leaderboard
      if (!leaderboardData.entries || leaderboardData.entries.length === 0) {
        textDisplay += '⏱️ **Race Times**\n';
        textDisplay += 'No race times recorded for this course yet. Be the first to play!\n';
        return this.truncateTextDisplay(textDisplay);
      }

      // Leaderboard section
      textDisplay += '⏱️ **Top Race Times**\n';

      const leaderboardLines = this.formatLeaderboardLines(leaderboardData);

      textDisplay += leaderboardLines.join('\n');
      return this.truncateTextDisplay(textDisplay);

    } catch (error) {
      this.logger.error('Error creating text display', {
        leaderboardData: leaderboardData,
        courseInfo: courseInfo,
        error: error.message,
        stack: error.stack
      });

      // Return error text
      return `❌ **Error Creating Race Leaderboard**\nAn error occurred while formatting the race leaderboard data.\n\nError: ${error.message}`;
    }
  }
}
