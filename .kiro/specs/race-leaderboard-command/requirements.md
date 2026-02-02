# Requirements Document

## Introduction

This document specifies the requirements for a new Discord bot `/courserace` command that displays race speedrun leaderboards for Walkabout Mini Golf courses. The command will follow the same patterns as the existing `/course` command but display race times instead of scores. The API provides pre-formatted time values including `time_behind_prepared`, eliminating the need for any time calculations in the bot code.

## Glossary

- **Race_Leaderboard_System**: The Discord bot command and service that fetches and displays race speedrun results
- **Race_API**: The ORDS REST endpoint `/leaderboards/racecourse` that provides race speedrun data
- **Discord_Bot**: The Node.js Discord bot application that processes slash commands
- **Course_Code**: A 3-letter identifier for a golf course (e.g., "ALE", "BBH")
- **Round_Speed_Prepared**: Pre-formatted time string ready for display (format: MM:SS.ms)
- **Time_Behind_Prepared**: Pre-formatted time difference from first place, provided by the API (e.g., "2.81")
- **Medal_Indicator**: Visual emoji indicators (🥇🥈🥉) for top 3 positions
- **User_Highlighting**: Visual indicator (⬅️) showing the current user's position in the leaderboard
- **Approval_Status**: Indicator (📝) showing whether a score is approved or personal

## Requirements

### Requirement 1: Race Command Registration

**User Story:** As a Discord user, I want to use a `/courserace` command, so that I can view race speedrun leaderboards for courses.

#### Acceptance Criteria

1. WHEN a user types `/courserace` in Discord, THE Discord_Bot SHALL display the command with autocomplete for course selection
2. THE Discord_Bot SHALL register the `/courserace` command with a required course parameter
3. WHEN the command is invoked, THE Discord_Bot SHALL defer the reply to allow time for API processing

### Requirement 2: Course Selection with Autocomplete

**User Story:** As a Discord user, I want to select a course using autocomplete, so that I can easily find the course I'm interested in.

#### Acceptance Criteria

1. WHEN a user begins typing in the course field, THE Discord_Bot SHALL provide autocomplete suggestions
2. THE Discord_Bot SHALL filter courses based on both course code and course name
3. THE Discord_Bot SHALL prioritize exact code matches over partial name matches
4. THE Discord_Bot SHALL limit autocomplete results to 25 courses per Discord API requirements
5. IF the course API is unavailable, THEN THE Discord_Bot SHALL provide fallback course suggestions

### Requirement 3: Race Leaderboard Data Retrieval

**User Story:** As a Discord user, I want to see race speedrun results for a course, so that I can compare my times with other players.

#### Acceptance Criteria

1. WHEN a valid course code is provided, THE Race_Leaderboard_System SHALL fetch data from the Race_API endpoint
2. THE Race_Leaderboard_System SHALL include the user's Discord ID as a query parameter to identify user scores
3. WHEN the API returns data, THE Race_Leaderboard_System SHALL validate the response structure
4. IF the response contains invalid entries, THEN THE Race_Leaderboard_System SHALL filter them out and log warnings
5. THE Race_Leaderboard_System SHALL handle empty leaderboards gracefully with appropriate messaging

### Requirement 4: Time Display Formatting

**User Story:** As a Discord user, I want to see race times in a clear format, so that I can easily understand the results.

#### Acceptance Criteria

1. THE Race_Leaderboard_System SHALL display times using the Round_Speed_Prepared format from the API
2. WHEN displaying the first place entry, THE Race_Leaderboard_System SHALL show only the time without a time behind value
3. WHEN displaying positions 2 and below, THE Race_Leaderboard_System SHALL display the Time_Behind_Prepared value from the API
4. THE Race_Leaderboard_System SHALL format Time_Behind_Prepared values with a plus sign in parentheses (e.g., "(+2.81)")
5. THE Race_Leaderboard_System SHALL preserve the time format precision from the API (MM:SS.ms)

### Requirement 5: Leaderboard Visual Presentation

**User Story:** As a Discord user, I want to see a visually organized leaderboard, so that I can quickly identify top performers and my own position.

#### Acceptance Criteria

1. THE Race_Leaderboard_System SHALL display Medal_Indicator emojis for positions 1-3
2. WHEN displaying position 1, THE Race_Leaderboard_System SHALL use 🥇
3. WHEN displaying position 2, THE Race_Leaderboard_System SHALL use 🥈
4. WHEN displaying position 3, THE Race_Leaderboard_System SHALL use 🥉
5. WHEN displaying positions 4 and below, THE Race_Leaderboard_System SHALL use numeric position indicators
6. THE Race_Leaderboard_System SHALL bold player names for top 3 positions
7. THE Race_Leaderboard_System SHALL truncate player names longer than 25 characters

### Requirement 6: User Score Identification

**User Story:** As a Discord user, I want to see my own scores highlighted, so that I can quickly find my position in the leaderboard.

#### Acceptance Criteria

1. WHEN the current user has scores in the leaderboard, THE Race_Leaderboard_System SHALL add User_Highlighting indicators
2. THE Race_Leaderboard_System SHALL display ⬅️ next to the user's entries
3. IF a user score is not approved, THEN THE Race_Leaderboard_System SHALL display the Approval_Status indicator (📝)
4. THE Race_Leaderboard_System SHALL create a separate "Your Score" section summarizing user entries
5. THE Race_Leaderboard_System SHALL indicate whether user scores are approved or personal

### Requirement 7: Error Handling and Fallbacks

**User Story:** As a Discord user, I want clear error messages when something goes wrong, so that I know what action to take.

#### Acceptance Criteria

1. IF a course is not found, THEN THE Race_Leaderboard_System SHALL display an error with suggested alternative courses
2. IF the Race_API is unavailable, THEN THE Race_Leaderboard_System SHALL display a service unavailable message with retry suggestions
3. IF authentication fails, THEN THE Race_Leaderboard_System SHALL display an authentication error message
4. IF rate limiting occurs, THEN THE Race_Leaderboard_System SHALL display the retry-after time
5. IF embed creation fails, THEN THE Race_Leaderboard_System SHALL fall back to text-based display
6. THE Race_Leaderboard_System SHALL log all errors with appropriate context for debugging

### Requirement 8: Embed Display Format

**User Story:** As a Discord user, I want to see race results in a rich embed format, so that the information is easy to read and visually appealing.

#### Acceptance Criteria

1. THE Race_Leaderboard_System SHALL create a Discord embed with the title "Race Leaderboard"
2. THE Race_Leaderboard_System SHALL include course code and name in the embed description
3. THE Race_Leaderboard_System SHALL display a "Top Race Times" field with formatted entries
4. IF the user has scores, THEN THE Race_Leaderboard_System SHALL include a "Your Time" field
5. IF personal scores exist, THEN THE Race_Leaderboard_System SHALL include a legend explaining indicators
6. THE Race_Leaderboard_System SHALL include a timestamp showing when the data was last updated
7. THE Race_Leaderboard_System SHALL use consistent color theming with other bot commands

### Requirement 9: Text Fallback Display

**User Story:** As a Discord user, I want to see race results even if embeds fail, so that I can always access the information.

#### Acceptance Criteria

1. IF embed creation fails, THEN THE Race_Leaderboard_System SHALL create a text-based display
2. THE Race_Leaderboard_System SHALL include all essential information in the text display
3. THE Race_Leaderboard_System SHALL truncate text displays to fit Discord's 2000 character limit
4. THE Race_Leaderboard_System SHALL indicate when content is truncated and show remaining entry count
5. THE Race_Leaderboard_System SHALL maintain readability in text format with proper line breaks

### Requirement 10: Code Reuse and Refactoring

**User Story:** As a developer, I want to maximize code reuse from the existing `/course` command, so that the implementation is simple, maintainable, and consistent.

#### Acceptance Criteria

1. THE Race_Leaderboard_System SHALL reuse the existing CourseLeaderboardService authentication logic
2. THE Race_Leaderboard_System SHALL reuse the existing course autocomplete functionality
3. THE Race_Leaderboard_System SHALL reuse ALL existing error handling patterns from the `/course` command without introducing new error handling
4. THE Race_Leaderboard_System SHALL reuse the existing embed creation patterns with minimal modifications
5. THE Race_Leaderboard_System SHALL reuse the existing text fallback display logic
6. WHERE shared functionality exists between course and race leaderboards, THE Race_Leaderboard_System SHALL refactor common code into reusable methods
7. THE Race_Leaderboard_System SHALL only implement new code for race-specific logic (displaying time_behind_prepared from API, race API endpoint)

### Requirement 11: Service Architecture

**User Story:** As a developer, I want the race leaderboard service to follow the same patterns as existing services, so that the codebase remains maintainable and consistent.

#### Acceptance Criteria

1. THE Race_Leaderboard_System SHALL extend BaseAuthenticatedService for OAuth2 authentication
2. THE Race_Leaderboard_System SHALL use the shared TokenManager for authentication token management
3. THE Race_Leaderboard_System SHALL use the shared RetryHandler for API retry logic
4. THE Race_Leaderboard_System SHALL use the shared Logger for structured logging
5. THE Race_Leaderboard_System SHALL use the shared ErrorHandler for error processing
6. THE Race_Leaderboard_System SHALL implement circuit breaker patterns for API resilience
7. THE Race_Leaderboard_System SHALL cache course data to reduce API calls
