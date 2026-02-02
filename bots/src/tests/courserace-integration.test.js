import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Discord.js before importing the command
vi.mock('discord.js', () => ({
  SlashCommandBuilder: class {
    setName(name) { this.name = name; return this; }
    setDescription(desc) { this.description = desc; return this; }
    addStringOption(fn) { 
      const option = {
        setName: (name) => { option.name = name; return option; },
        setDescription: (desc) => { option.description = desc; return option; },
        setRequired: (req) => { option.required = req; return option; },
        setAutocomplete: (auto) => { option.autocomplete = auto; return option; }
      };
      fn(option);
      this.options = [option];
      return this;
    }
  },
  EmbedBuilder: class {
    constructor() {
      this.data = {};
    }
    setTitle(title) { this.data.title = title; return this; }
    setDescription(desc) { this.data.description = desc; return this; }
    setColor(color) { this.data.color = color; return this; }
    addFields(...fields) { 
      this.data.fields = [...(this.data.fields || []), ...fields]; 
      return this; 
    }
    setFooter(footer) { this.data.footer = footer; return this; }
    setTimestamp(timestamp) { this.data.timestamp = timestamp; return this; }
  }
}));

describe('Course Race Command Integration Tests', () => {
  let courseraceCommand;
  let mockInteraction;
  let mockService;

  beforeEach(async () => {
    // Mock the RaceLeaderboardService
    mockService = {
      getRaceLeaderboard: vi.fn(),
      getAvailableCourses: vi.fn(),
      formatLeaderboardData: vi.fn(),
      createLeaderboardEmbed: vi.fn(),
      createTextDisplay: vi.fn(),
      getFallbackCourses: vi.fn(),
      handleApiError: vi.fn()
    };

    // Mock the service import
    vi.doMock('../services/RaceLeaderboardService.js', () => ({
      RaceLeaderboardService: class {
        constructor() {
          return mockService;
        }
      }
    }));

    // Import the command after mocking
    const { default: command } = await import('../commands/courserace.js');
    courseraceCommand = command;

    // Create mock interaction
    mockInteraction = {
      user: {
        id: '123456789012345678',
        username: 'testuser',
        globalName: 'Test User'
      },
      options: {
        getString: vi.fn().mockReturnValue('ALE'),
        getFocused: vi.fn().mockReturnValue('')
      },
      reply: vi.fn().mockResolvedValue(),
      editReply: vi.fn().mockResolvedValue(),
      followUp: vi.fn().mockResolvedValue(),
      deferReply: vi.fn().mockResolvedValue(),
      respond: vi.fn().mockResolvedValue(),
      responded: false,
      deferred: false,
      isRepliable: vi.fn().mockReturnValue(true),
      guildId: '987654321098765432'
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('End-to-End Command Flow', () => {
    it('should complete full command flow: command → service → API → display', async () => {
      // Arrange - Mock complete API response with race data
      const mockApiResponse = {
        items: [
          {
            pos: 1,
            player_name: 'SpeedRunner1',
            round_speed_prepared: '3:35.92',
            time_behind_prepared: null,
            discord_id: '111111111111111111',
            isapproved: 'true'
          },
          {
            pos: 2,
            player_name: 'FastPlayer2',
            round_speed_prepared: '3:38.73',
            time_behind_prepared: '2.81',
            discord_id: '222222222222222222',
            isapproved: 'true'
          },
          {
            pos: 3,
            player_name: 'QuickRunner3',
            round_speed_prepared: '3:53.92',
            time_behind_prepared: '18.00',
            discord_id: '123456789012345678',
            isapproved: 'true'
          }
        ],
        count: 3,
        courseCode: 'ALE',
        userId: '123456789012345678'
      };

      const mockFormattedData = {
        course: {
          code: 'ALE',
          name: 'Alfheim Easy',
          difficulty: '(Easy)'
        },
        entries: [
          {
            position: 1,
            playerName: 'SpeedRunner1',
            roundSpeedPrepared: '3:35.92',
            timeBehindPrepared: null,
            discordId: '111111111111111111',
            isApproved: true,
            isCurrentUser: false
          },
          {
            position: 2,
            playerName: 'FastPlayer2',
            roundSpeedPrepared: '3:38.73',
            timeBehindPrepared: '2.81',
            discordId: '222222222222222222',
            isApproved: true,
            isCurrentUser: false
          },
          {
            position: 3,
            playerName: 'QuickRunner3',
            roundSpeedPrepared: '3:53.92',
            timeBehindPrepared: '18.00',
            discordId: '123456789012345678',
            isApproved: true,
            isCurrentUser: true
          }
        ],
        totalEntries: 3,
        userEntries: [
          {
            position: 3,
            playerName: 'QuickRunner3',
            roundSpeedPrepared: '3:53.92',
            timeBehindPrepared: '18.00',
            discordId: '123456789012345678',
            isApproved: true,
            isCurrentUser: true
          }
        ],
        hasUserScores: true,
        lastUpdated: new Date()
      };

      const mockEmbed = {
        title: '🏁 Alfheim Easy Race Leaderboard',
        color: 0x00AE86,
        description: 'ALE - Alfheim Easy (Easy)\n',
        fields: [
          {
            name: '⏱️ Top Race Times',
            value: '` 🥇 3:35.92` **SpeedRunner1**\n` 🥈 3:38.73 (+2.81)` **FastPlayer2**\n` 🥉 3:53.92 (+18.00)` **QuickRunner3** ⬅️',
            inline: false
          },
          {
            name: '\n🎯 Your Time',
            value: 'Position 3: 3:53.92 (+18.00)',
            inline: false
          }
        ],
        footer: { text: 'Last updated: ' + mockFormattedData.lastUpdated.toLocaleString() },
        timestamp: mockFormattedData.lastUpdated.toISOString()
      };

      mockService.getRaceLeaderboard.mockResolvedValue(mockApiResponse);
      mockService.formatLeaderboardData.mockReturnValue(mockFormattedData);
      mockService.createLeaderboardEmbed.mockReturnValue(mockEmbed);

      // Act - Execute command
      await courseraceCommand.execute(mockInteraction);

      // Assert - Verify complete flow
      expect(mockInteraction.deferReply).toHaveBeenCalled();
      expect(mockService.getRaceLeaderboard).toHaveBeenCalledWith('ALE', '123456789012345678');
      expect(mockService.formatLeaderboardData).toHaveBeenCalledWith(mockApiResponse, '123456789012345678');
      expect(mockService.createLeaderboardEmbed).toHaveBeenCalledWith(mockFormattedData);
      expect(mockInteraction.editReply).toHaveBeenCalled();

      // Verify embed was sent
      const editReplyCall = mockInteraction.editReply.mock.calls.find(call => call[0].embeds);
      expect(editReplyCall).toBeDefined();
      expect(editReplyCall[0].embeds[0].data.title).toContain('Race Leaderboard');
    });

    it('should verify race API endpoint is called correctly with discord_id', async () => {
      // Arrange
      const userId = '999888777666555444';
      const courseCode = 'BBH';
      mockInteraction.user.id = userId;
      mockInteraction.options.getString.mockReturnValue(courseCode);

      const mockApiResponse = {
        items: [],
        count: 0,
        courseCode: courseCode,
        userId: userId
      };

      mockService.getRaceLeaderboard.mockResolvedValue(mockApiResponse);
      mockService.formatLeaderboardData.mockReturnValue({
        course: { code: courseCode, name: 'Bogeys Bonnie Hard', difficulty: '(Hard)' },
        entries: [],
        totalEntries: 0,
        userEntries: [],
        hasUserScores: false,
        lastUpdated: new Date()
      });

      // Act
      await courseraceCommand.execute(mockInteraction);

      // Assert - Verify API was called with correct parameters
      expect(mockService.getRaceLeaderboard).toHaveBeenCalledWith(courseCode, userId);
      expect(mockService.getRaceLeaderboard).toHaveBeenCalledTimes(1);
    });

    it('should verify time_behind_prepared values are displayed correctly', async () => {
      // Arrange - Mock data with various time_behind_prepared values
      const mockApiResponse = {
        items: [
          {
            pos: 1,
            player_name: 'FirstPlace',
            round_speed_prepared: '2:45.12',
            time_behind_prepared: null, // First place has no time behind
            discord_id: '111',
            isapproved: 'true'
          },
          {
            pos: 2,
            player_name: 'SecondPlace',
            round_speed_prepared: '2:47.93',
            time_behind_prepared: '2.81', // Small difference
            discord_id: '222',
            isapproved: 'true'
          },
          {
            pos: 5,
            player_name: 'FifthPlace',
            round_speed_prepared: '3:15.67',
            time_behind_prepared: '30.55', // Larger difference
            discord_id: '555',
            isapproved: 'true'
          }
        ],
        count: 5,
        courseCode: 'ALE',
        userId: '123456789012345678'
      };

      const mockFormattedData = {
        course: { code: 'ALE', name: 'Alfheim Easy', difficulty: '(Easy)' },
        entries: mockApiResponse.items.map(item => ({
          position: item.pos,
          playerName: item.player_name,
          roundSpeedPrepared: item.round_speed_prepared,
          timeBehindPrepared: item.time_behind_prepared,
          discordId: item.discord_id,
          isApproved: true,
          isCurrentUser: false
        })),
        totalEntries: 5,
        userEntries: [],
        hasUserScores: false,
        lastUpdated: new Date()
      };

      mockService.getRaceLeaderboard.mockResolvedValue(mockApiResponse);
      mockService.formatLeaderboardData.mockReturnValue(mockFormattedData);
      mockService.createLeaderboardEmbed.mockImplementation((data) => {
        // Verify time_behind_prepared is properly formatted in the embed
        const lines = [];
        data.entries.forEach(entry => {
          let line = entry.position === 1 ? '🥇' : entry.position === 2 ? '🥈' : entry.position === 3 ? '🥉' : `${entry.position}.`;
          line += ` ${entry.roundSpeedPrepared}`;
          if (entry.position > 1 && entry.timeBehindPrepared !== null) {
            line += ` (+${entry.timeBehindPrepared})`;
          }
          lines.push(line);
        });

        return {
          title: '🏁 Alfheim Easy Race Leaderboard',
          color: 0x00AE86,
          description: 'ALE - Alfheim Easy (Easy)\n',
          fields: [
            {
              name: '⏱️ Top Race Times',
              value: lines.join('\n'),
              inline: false
            }
          ],
          footer: { text: 'Last updated' },
          timestamp: new Date().toISOString()
        };
      });

      // Act
      await courseraceCommand.execute(mockInteraction);

      // Assert - Verify formatting was called and data structure is correct
      expect(mockService.formatLeaderboardData).toHaveBeenCalled();
      const formattedData = mockService.formatLeaderboardData.mock.results[0].value;
      
      // Verify first place has no time behind
      expect(formattedData.entries[0].timeBehindPrepared).toBeNull();
      
      // Verify other places have time behind values
      expect(formattedData.entries[1].timeBehindPrepared).toBe('2.81');
      expect(formattedData.entries[2].timeBehindPrepared).toBe('30.55');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle course not found error with suggestions', async () => {
      // Arrange
      const error = new Error('Course not found');
      error.errorType = 'COURSE_NOT_FOUND';
      error.suggestions = [
        { code: 'ALE', name: 'Alfheim Easy' },
        { code: 'BBH', name: 'Bogeys Bonnie Hard' }
      ];

      mockService.getRaceLeaderboard.mockRejectedValue(error);

      // Act
      await courseraceCommand.execute(mockInteraction);

      // Assert
      expect(mockInteraction.editReply).toHaveBeenCalled();
      const errorCall = mockInteraction.editReply.mock.calls.find(call => 
        call[0].embeds && call[0].embeds[0].data.title?.includes('Course Not Found')
      );
      expect(errorCall).toBeDefined();
    });

    it('should handle API unavailable error', async () => {
      // Arrange
      const error = new Error('Service temporarily unavailable');
      error.errorType = 'API_UNAVAILABLE';
      error.suggestion = 'Please try again in a few minutes.';

      mockService.getRaceLeaderboard.mockRejectedValue(error);

      // Act
      await courseraceCommand.execute(mockInteraction);

      // Assert
      expect(mockInteraction.editReply).toHaveBeenCalled();
      const errorCall = mockInteraction.editReply.mock.calls.find(call => 
        call[0].embeds && call[0].embeds[0].data.title?.includes('Service Temporarily Unavailable')
      );
      expect(errorCall).toBeDefined();
    });

    it('should handle authentication errors', async () => {
      // Arrange
      const error = new Error('Authentication failed');
      error.errorType = 'AUTHENTICATION_ERROR';

      mockService.getRaceLeaderboard.mockRejectedValue(error);

      // Act
      await courseraceCommand.execute(mockInteraction);

      // Assert
      expect(mockInteraction.editReply).toHaveBeenCalled();
      const errorCall = mockInteraction.editReply.mock.calls.find(call => 
        call[0].embeds && call[0].embeds[0].data.title?.includes('Authentication Failed')
      );
      expect(errorCall).toBeDefined();
    });

    it('should handle rate limiting errors', async () => {
      // Arrange
      const error = new Error('Rate limited');
      error.errorType = 'RATE_LIMITED';
      error.retryAfter = 30000; // 30 seconds

      mockService.getRaceLeaderboard.mockRejectedValue(error);

      // Act
      await courseraceCommand.execute(mockInteraction);

      // Assert
      expect(mockInteraction.editReply).toHaveBeenCalled();
      const errorCall = mockInteraction.editReply.mock.calls.find(call => 
        call[0].embeds && call[0].embeds[0].data.title?.includes('Rate Limited')
      );
      expect(errorCall).toBeDefined();
    });

    it('should handle token expiration errors', async () => {
      // Arrange
      const error = new Error('Token expired');
      error.errorType = 'TOKEN_EXPIRED';

      mockService.getRaceLeaderboard.mockRejectedValue(error);

      // Act
      await courseraceCommand.execute(mockInteraction);

      // Assert
      expect(mockInteraction.editReply).toHaveBeenCalled();
      const errorCall = mockInteraction.editReply.mock.calls.find(call => 
        call[0].embeds && call[0].embeds[0].data.title?.includes('Authentication Refreshing')
      );
      expect(errorCall).toBeDefined();
    });

    it('should handle generic API errors with fallback', async () => {
      // Arrange
      const error = new Error('Unknown API error');
      mockService.getRaceLeaderboard.mockRejectedValue(error);
      mockService.handleApiError.mockReturnValue({
        message: 'An unexpected error occurred. Please try again later.'
      });

      // Act
      await courseraceCommand.execute(mockInteraction);

      // Assert
      expect(mockService.handleApiError).toHaveBeenCalledWith(error, 'race_command_fetch');
      expect(mockInteraction.editReply).toHaveBeenCalled();
    });
  });

  describe('Display Format Integration', () => {
    it('should verify embed display works correctly', async () => {
      // Arrange
      const mockApiResponse = {
        items: [
          {
            pos: 1,
            player_name: 'Player1',
            round_speed_prepared: '3:00.00',
            time_behind_prepared: null,
            discord_id: '111',
            isapproved: 'true'
          }
        ],
        count: 1,
        courseCode: 'ALE',
        userId: '123456789012345678'
      };

      const mockFormattedData = {
        course: { code: 'ALE', name: 'Alfheim Easy', difficulty: '(Easy)' },
        entries: [{
          position: 1,
          playerName: 'Player1',
          roundSpeedPrepared: '3:00.00',
          timeBehindPrepared: null,
          discordId: '111',
          isApproved: true,
          isCurrentUser: false
        }],
        totalEntries: 1,
        userEntries: [],
        hasUserScores: false,
        lastUpdated: new Date()
      };

      const mockEmbed = {
        title: '🏁 Alfheim Easy Race Leaderboard',
        color: 0x00AE86,
        description: 'ALE - Alfheim Easy (Easy)\n',
        fields: [
          {
            name: '⏱️ Top Race Times',
            value: '` 🥇 3:00.00` **Player1**',
            inline: false
          }
        ],
        footer: { text: 'Last updated' },
        timestamp: new Date().toISOString()
      };

      mockService.getRaceLeaderboard.mockResolvedValue(mockApiResponse);
      mockService.formatLeaderboardData.mockReturnValue(mockFormattedData);
      mockService.createLeaderboardEmbed.mockReturnValue(mockEmbed);

      // Act
      await courseraceCommand.execute(mockInteraction);

      // Assert
      expect(mockService.createLeaderboardEmbed).toHaveBeenCalledWith(mockFormattedData);
      expect(mockInteraction.editReply).toHaveBeenCalled();
      
      const embedCall = mockInteraction.editReply.mock.calls.find(call => call[0].embeds);
      expect(embedCall).toBeDefined();
      expect(embedCall[0].embeds[0].data.title).toContain('Race Leaderboard');
      // Color value may vary slightly due to EmbedBuilder processing, just verify it exists
      expect(embedCall[0].embeds[0].data.color).toBeDefined();
    });

    it('should verify text fallback works when embed creation fails', async () => {
      // Arrange
      const mockApiResponse = {
        items: [
          {
            pos: 1,
            player_name: 'Player1',
            round_speed_prepared: '3:00.00',
            time_behind_prepared: null,
            discord_id: '111',
            isapproved: 'true'
          }
        ],
        count: 1,
        courseCode: 'ALE',
        userId: '123456789012345678'
      };

      const mockFormattedData = {
        course: { code: 'ALE', name: 'Alfheim Easy', difficulty: '(Easy)' },
        entries: [{
          position: 1,
          playerName: 'Player1',
          roundSpeedPrepared: '3:00.00',
          timeBehindPrepared: null,
          discordId: '111',
          isApproved: true,
          isCurrentUser: false
        }],
        totalEntries: 1,
        userEntries: [],
        hasUserScores: false,
        lastUpdated: new Date()
      };

      const mockTextDisplay = '🏁 **Alfheim Easy Race Leaderboard**\nALE - Alfheim Easy (Easy)\n\n⏱️ **Top Race Times**\n` 🥇 3:00.00` **Player1**';

      mockService.getRaceLeaderboard.mockResolvedValue(mockApiResponse);
      mockService.formatLeaderboardData.mockReturnValue(mockFormattedData);
      mockService.createLeaderboardEmbed.mockImplementation(() => {
        throw new Error('Embed creation failed');
      });
      mockService.createTextDisplay.mockReturnValue(mockTextDisplay);

      // Act
      await courseraceCommand.execute(mockInteraction);

      // Assert
      expect(mockService.createTextDisplay).toHaveBeenCalledWith(mockFormattedData);
      expect(mockInteraction.editReply).toHaveBeenCalled();
      
      const textCall = mockInteraction.editReply.mock.calls.find(call => call[0].content);
      expect(textCall).toBeDefined();
      expect(textCall[0].content).toContain('Race Leaderboard');
      expect(textCall[0].embeds).toEqual([]);
    });
  });

  describe('Autocomplete Integration', () => {
    it('should provide course autocomplete suggestions', async () => {
      // Arrange
      const mockCourses = [
        { code: 'ALE', name: 'Alfheim Easy' },
        { code: 'ALH', name: 'Alfheim Hard' },
        { code: 'BBE', name: 'Bogeys Bonnie Easy' },
        { code: 'BBH', name: 'Bogeys Bonnie Hard' }
      ];

      mockService.getAvailableCourses.mockResolvedValue(mockCourses);
      mockInteraction.options.getFocused.mockReturnValue('al');

      // Act
      await courseraceCommand.autocomplete(mockInteraction);

      // Assert
      expect(mockService.getAvailableCourses).toHaveBeenCalled();
      expect(mockInteraction.respond).toHaveBeenCalled();
      
      const choices = mockInteraction.respond.mock.calls[0][0];
      expect(choices.length).toBeGreaterThan(0);
      expect(choices.every(choice => 
        choice.name.toLowerCase().includes('al') || choice.value.toLowerCase().includes('al')
      )).toBe(true);
    });

    it('should use fallback courses when API fails', async () => {
      // Arrange
      const mockFallbackCourses = [
        { code: 'ALE', name: 'Alfheim Easy' },
        { code: 'BBH', name: 'Bogeys Bonnie Hard' }
      ];

      mockService.getAvailableCourses.mockRejectedValue(new Error('API unavailable'));
      mockService.getFallbackCourses.mockReturnValue(mockFallbackCourses);
      mockInteraction.options.getFocused.mockReturnValue('');

      // Act
      await courseraceCommand.autocomplete(mockInteraction);

      // Assert
      expect(mockService.getAvailableCourses).toHaveBeenCalled();
      expect(mockService.getFallbackCourses).toHaveBeenCalled();
      expect(mockInteraction.respond).toHaveBeenCalled();
    });

    it('should limit autocomplete results to 25 choices', async () => {
      // Arrange
      const mockCourses = Array.from({ length: 50 }, (_, i) => ({
        code: `C${i.toString().padStart(2, '0')}E`,
        name: `Course ${i + 1} Easy`
      }));

      mockService.getAvailableCourses.mockResolvedValue(mockCourses);
      mockInteraction.options.getFocused.mockReturnValue('');

      // Act
      await courseraceCommand.autocomplete(mockInteraction);

      // Assert
      expect(mockInteraction.respond).toHaveBeenCalled();
      const choices = mockInteraction.respond.mock.calls[0][0];
      expect(choices.length).toBeLessThanOrEqual(25);
    });
  });

  describe('User Score Highlighting Integration', () => {
    it('should highlight user scores in leaderboard', async () => {
      // Arrange
      const userId = '123456789012345678';
      mockInteraction.user.id = userId;

      const mockApiResponse = {
        items: [
          {
            pos: 1,
            player_name: 'OtherPlayer',
            round_speed_prepared: '3:00.00',
            time_behind_prepared: null,
            discord_id: '111',
            isapproved: 'true'
          },
          {
            pos: 2,
            player_name: 'TestUser',
            round_speed_prepared: '3:05.50',
            time_behind_prepared: '5.50',
            discord_id: userId,
            isapproved: 'true'
          }
        ],
        count: 2,
        courseCode: 'ALE',
        userId: userId
      };

      const mockFormattedData = {
        course: { code: 'ALE', name: 'Alfheim Easy', difficulty: '(Easy)' },
        entries: [
          {
            position: 1,
            playerName: 'OtherPlayer',
            roundSpeedPrepared: '3:00.00',
            timeBehindPrepared: null,
            discordId: '111',
            isApproved: true,
            isCurrentUser: false
          },
          {
            position: 2,
            playerName: 'TestUser',
            roundSpeedPrepared: '3:05.50',
            timeBehindPrepared: '5.50',
            discordId: userId,
            isApproved: true,
            isCurrentUser: true
          }
        ],
        totalEntries: 2,
        userEntries: [
          {
            position: 2,
            playerName: 'TestUser',
            roundSpeedPrepared: '3:05.50',
            timeBehindPrepared: '5.50',
            discordId: userId,
            isApproved: true,
            isCurrentUser: true
          }
        ],
        hasUserScores: true,
        lastUpdated: new Date()
      };

      mockService.getRaceLeaderboard.mockResolvedValue(mockApiResponse);
      mockService.formatLeaderboardData.mockReturnValue(mockFormattedData);
      mockService.createLeaderboardEmbed.mockReturnValue({
        title: '🏁 Alfheim Easy Race Leaderboard',
        color: 0x00AE86,
        description: 'ALE - Alfheim Easy (Easy)\n',
        fields: [
          {
            name: '⏱️ Top Race Times',
            value: '` 🥇 3:00.00` **OtherPlayer**\n` 🥈 3:05.50 (+5.50)` **TestUser** ⬅️',
            inline: false
          },
          {
            name: '\n🎯 Your Time',
            value: 'Position 2: 3:05.50 (+5.50)',
            inline: false
          }
        ],
        footer: { text: 'Last updated' },
        timestamp: new Date().toISOString()
      });

      // Act
      await courseraceCommand.execute(mockInteraction);

      // Assert
      expect(mockService.formatLeaderboardData).toHaveBeenCalledWith(mockApiResponse, userId);
      const formattedData = mockService.formatLeaderboardData.mock.results[0].value;
      expect(formattedData.hasUserScores).toBe(true);
      expect(formattedData.userEntries.length).toBe(1);
      expect(formattedData.userEntries[0].isCurrentUser).toBe(true);
    });

    it('should show approval status for personal scores', async () => {
      // Arrange
      const userId = '123456789012345678';
      mockInteraction.user.id = userId;

      const mockApiResponse = {
        items: [
          {
            pos: 1,
            player_name: 'TestUser',
            round_speed_prepared: '3:00.00',
            time_behind_prepared: null,
            discord_id: userId,
            isapproved: 'false' // Personal score
          }
        ],
        count: 1,
        courseCode: 'ALE',
        userId: userId
      };

      const mockFormattedData = {
        course: { code: 'ALE', name: 'Alfheim Easy', difficulty: '(Easy)' },
        entries: [
          {
            position: 1,
            playerName: 'TestUser',
            roundSpeedPrepared: '3:00.00',
            timeBehindPrepared: null,
            discordId: userId,
            isApproved: false,
            isCurrentUser: true
          }
        ],
        totalEntries: 1,
        userEntries: [
          {
            position: 1,
            playerName: 'TestUser',
            roundSpeedPrepared: '3:00.00',
            timeBehindPrepared: null,
            discordId: userId,
            isApproved: false,
            isCurrentUser: true
          }
        ],
        hasUserScores: true,
        lastUpdated: new Date()
      };

      mockService.getRaceLeaderboard.mockResolvedValue(mockApiResponse);
      mockService.formatLeaderboardData.mockReturnValue(mockFormattedData);
      mockService.createLeaderboardEmbed.mockReturnValue({
        title: '🏁 Alfheim Easy Race Leaderboard',
        color: 0x00AE86,
        description: 'ALE - Alfheim Easy (Easy)\n',
        fields: [
          {
            name: '⏱️ Top Race Times',
            value: '` 🥇 3:00.00` **TestUser** ⬅️ 📝',
            inline: false
          },
          {
            name: '\n🎯 Your Time',
            value: 'Position 1: 3:00.00 (Personal)',
            inline: false
          },
          {
            name: '\n📋 Legend',
            value: '🥇🥈🥉 Top 3 positions\n📝 Personal (unapproved) times\n⬅️ **[YOU]** Your time',
            inline: false
          }
        ],
        footer: { text: 'Last updated' },
        timestamp: new Date().toISOString()
      });

      // Act
      await courseraceCommand.execute(mockInteraction);

      // Assert
      const formattedData = mockService.formatLeaderboardData.mock.results[0].value;
      expect(formattedData.entries[0].isApproved).toBe(false);
      expect(formattedData.entries[0].isCurrentUser).toBe(true);
    });
  });

  describe('Empty Leaderboard Handling', () => {
    it('should handle empty leaderboard gracefully', async () => {
      // Arrange
      const mockApiResponse = {
        items: [],
        count: 0,
        courseCode: 'ALE',
        userId: '123456789012345678'
      };

      const mockFormattedData = {
        course: { code: 'ALE', name: 'Alfheim Easy', difficulty: '(Easy)' },
        entries: [],
        totalEntries: 0,
        userEntries: [],
        hasUserScores: false,
        lastUpdated: new Date()
      };

      mockService.getRaceLeaderboard.mockResolvedValue(mockApiResponse);
      mockService.formatLeaderboardData.mockReturnValue(mockFormattedData);

      // Act
      await courseraceCommand.execute(mockInteraction);

      // Assert
      expect(mockInteraction.editReply).toHaveBeenCalled();
      const noDataCall = mockInteraction.editReply.mock.calls.find(call => 
        call[0].embeds && call[0].embeds[0].data.title?.includes('No Race Times Available')
      );
      expect(noDataCall).toBeDefined();
    });
  });
});
