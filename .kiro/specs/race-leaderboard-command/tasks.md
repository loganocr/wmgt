# Implementation Plan: Race Leaderboard Command

## Overview

This implementation plan creates a new `/courserace` Discord bot command by maximizing code reuse from the existing `/course` command. The approach is to copy and minimally modify the command handler, then create a service that extends `CourseLeaderboardService` to override only race-specific methods. No new error handling is needed - all error scenarios are handled by the mature, stable parent service.

## Tasks

- [ ] 1. Create RaceLeaderboardService extending CourseLeaderboardService
  - Create `bots/src/services/RaceLeaderboardService.js`
  - Extend `CourseLeaderboardService` to inherit all authentication, caching, and error handling
  - Override `getRaceLeaderboard()` method to use `/leaderboards/racecourse` endpoint
  - Override `formatLeaderboardData()` to process `round_speed_prepared` and `time_behind_prepared` fields
  - Override `formatLeaderboardLines()` to display times with time behind values from API
  - Override `createLeaderboardEmbed()` to change title to "Race Leaderboard" and field name to "Top Race Times"
  - Override `createTextDisplay()` to change header to "Race Leaderboard"
  - _Requirements: 3.1, 4.1, 4.2, 4.3, 4.4, 4.5, 8.1, 8.3, 10.1, 10.4, 10.5, 10.7, 11.1, 11.2_

- [ ]* 1.1 Write property test for time behind display formatting
  - **Property 1: Time Behind Display Formatting**
  - **Validates: Requirements 4.3, 4.4**

- [ ]* 1.2 Write property test for first place time behind
  - **Property 2: First Place Has No Time Behind**
  - **Validates: Requirements 4.2**

- [ ]* 1.3 Write property test for time format preservation
  - **Property 3: Time Format Preservation**
  - **Validates: Requirements 4.1, 4.5**

- [ ]* 1.4 Write property test for API response validation
  - **Property 8: API Response Validation and Filtering**
  - **Validates: Requirements 3.3, 3.4**

- [ ]* 1.5 Write unit tests for RaceLeaderboardService
  - Test time behind display for positions 1 and 2+
  - Test valid API response formatting
  - Test empty leaderboard handling
  - Test invalid entry filtering
  - _Requirements: 3.4, 3.5, 4.2, 4.3, 4.4_

- [ ] 2. Create courserace command handler
  - Copy `bots/src/commands/course.js` to `bots/src/commands/courserace.js`
  - Change command name from 'course' to 'courserace'
  - Change command description to 'Display race leaderboard times for a selected course'
  - Replace `CourseLeaderboardService` import with `RaceLeaderboardService`
  - Update display strings: "Course Leaderboard" → "Race Leaderboard", "Top Scores" → "Top Race Times"
  - Keep all error handling, autocomplete, and interaction logic identical (no changes needed)
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 10.2, 10.3_

- [ ]* 2.1 Write property test for medal indicators and position display
  - **Property 4: Medal Indicators and Position Display**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

- [ ]* 2.2 Write property test for player name truncation
  - **Property 5: Player Name Truncation**
  - **Validates: Requirements 5.7**

- [ ]* 2.3 Write property test for user score highlighting
  - **Property 6: User Score Highlighting**
  - **Validates: Requirements 6.1, 6.2, 6.3**

- [ ]* 2.4 Write property test for user score summary section
  - **Property 7: User Score Summary Section**
  - **Validates: Requirements 6.4, 6.5**

- [ ]* 2.5 Write property test for embed content requirements
  - **Property 11: Embed Content Requirements**
  - **Validates: Requirements 8.2, 8.4, 8.5, 8.6**

- [ ]* 2.6 Write property test for embed fallback behavior
  - **Property 13: Embed Fallback Behavior**
  - **Validates: Requirements 7.5, 9.1, 9.2**

- [ ]* 2.7 Write unit tests for courserace command
  - Test command registration
  - Test autocomplete functionality (inherited)
  - Test user highlighting
  - Test approval status indicators
  - _Requirements: 1.1, 1.2, 2.1, 6.1, 6.2, 6.3_

- [ ] 3. Verify autocomplete and shared functionality
  - Verify course autocomplete works with courserace command (inherited from parent)
  - Verify fallback courses are available when API is unavailable (inherited from parent)
  - Verify authentication token management works (inherited from parent)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.2, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [ ]* 3.1 Write property test for autocomplete course filtering
  - **Property 10: Autocomplete Course Filtering**
  - **Validates: Requirements 2.2, 2.3, 2.4**

- [ ]* 3.2 Write property test for Discord ID query parameter
  - **Property 9: Discord ID Query Parameter**
  - **Validates: Requirements 3.2**

- [ ]* 3.3 Write property test for authentication token reuse
  - **Property 14: Authentication Token Reuse**
  - **Validates: Requirements 11.2**

- [ ] 4. Test text display and truncation
  - Verify text fallback display works when embed creation fails (inherited from parent)
  - Verify text truncation at 2000 character limit (inherited from parent)
  - Verify truncation indicator shows remaining entry count (inherited from parent)
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.5_

- [ ]* 4.1 Write property test for text display truncation
  - **Property 12: Text Display Truncation**
  - **Validates: Requirements 9.3, 9.4**

- [ ] 5. Integration testing and validation
  - Test end-to-end flow: command → service → API → display
  - Verify race API endpoint is called correctly
  - Verify time_behind_prepared values are displayed correctly
  - Verify all inherited error handling works (no new error handling needed)
  - Verify embed and text fallback both work
  - _Requirements: 3.1, 3.2, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [ ]* 5.1 Write integration tests for courserace command
  - Test command registration with Discord
  - Test API integration with race endpoint
  - Test Discord interaction (embed and text display)
  - _Requirements: 1.1, 1.2, 3.1, 8.1, 8.7_

- [ ] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Maximum code reuse: ~90% of code is inherited from existing `/course` command
- No new error handling needed - all error scenarios handled by mature parent service
- API provides `time_behind_prepared` ready to print - no calculations needed
- Property tests should run minimum 100 iterations each
- All authentication, caching, and retry logic inherited from `CourseLeaderboardService`
