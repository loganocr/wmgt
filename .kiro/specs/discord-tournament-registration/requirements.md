# Requirements Document

## Introduction

This feature adds a permanent, highlighted Discord message (embed) with a "Register Now" button to a designated channel. Instead of requiring players to discover and use slash commands, the registration message is always visible and interactive. Clicking the button opens an ephemeral interaction flow that guides the player through time slot selection and registration. The message dynamically updates to reflect the current tournament state — showing available sessions when registration is open, the currently playing time slot when the tournament is ongoing, and a closed state when no registration is available. Players who are already registered are offered options to change their time slot or unregister.

## Glossary

- **Registration_Message**: The permanent Discord embed message posted in a designated channel that displays tournament information and contains the "Register Now" button
- **Bot**: The WMGT Discord bot (Node.js, Discord.js v14) that manages the Registration_Message and handles button interactions
- **Registration_Service**: The existing service layer (`RegistrationService.js`) that communicates with the ORDS REST API for registration operations
- **Tournament_Session**: A weekly tournament event with a session date, available time slots, and courses
- **Time_Slot**: A specific UTC time at which a player can play in a tournament session
- **Ephemeral_Interaction**: A Discord interaction response visible only to the user who triggered it
- **Tournament_State**: The current phase of a tournament session: `registration_open`, `ongoing`, or `closed`

## Requirements

### Requirement 1: Persistent Registration Message

**User Story:** As a tournament administrator, I want a permanent registration message posted in a Discord channel, so that players always have a visible entry point for tournament registration.

#### Acceptance Criteria

1. WHEN an administrator issues a setup command, THE Bot SHALL post a Registration_Message embed in the specified channel and persist the channel ID and message ID for future updates
2. WHEN the Bot starts or restarts, THE Bot SHALL retrieve the persisted message reference and resume updating the Registration_Message
3. IF the persisted Registration_Message no longer exists in the channel, THEN THE Bot SHALL post a new Registration_Message and update the persisted reference
4. THE Registration_Message SHALL display the current tournament name, session week, session date, courses, and available time slots
5. THE Registration_Message SHALL contain a "Register Now" button that is always visible when registration is open

### Requirement 2: Dynamic Tournament State Display

**User Story:** As a tournament player, I want the registration message to show the current tournament state, so that I know whether registration is open, the tournament is in progress, or registration is closed.

#### Acceptance Criteria

1. WHILE the Tournament_State is `registration_open`, THE Registration_Message SHALL display available time slots, course information, and an enabled "Register Now" button
2. WHILE the Tournament_State is `ongoing`, THE Registration_Message SHALL display the currently playing time slot and a disabled "Register Now" button with a label indicating the tournament is in progress
3. WHILE the Tournament_State is `closed`, THE Registration_Message SHALL display a message indicating no active tournament and a disabled button
4. WHEN the Tournament_State changes, THE Bot SHALL update the Registration_Message within 60 seconds to reflect the new state
5. THE Bot SHALL poll the backend API at a configurable interval to detect Tournament_State changes

### Requirement 3: New Player Registration Flow

**User Story:** As a tournament player, I want to click "Register Now" and be guided through time slot selection, so that I can register without knowing slash commands.

#### Acceptance Criteria

1. WHEN a player clicks the "Register Now" button, THE Bot SHALL respond with an Ephemeral_Interaction showing available time slots for the current session
2. WHEN displaying time slots, THE Bot SHALL show each time slot in both UTC and the player's stored timezone preference
3. WHEN a player selects a time slot, THE Bot SHALL display a confirmation prompt with the selected time slot details
4. WHEN a player confirms registration, THE Bot SHALL call the Registration_Service to register the player and display a success or failure message
5. IF the player has no stored timezone preference, THEN THE Bot SHALL display time slots in UTC only and suggest using the `/timezone` command

### Requirement 4: Existing Registration Management

**User Story:** As a registered player, I want to manage my existing registration when I click the button, so that I can change my time slot or unregister.

#### Acceptance Criteria

1. WHEN a registered player clicks the "Register Now" button, THE Bot SHALL detect the existing registration and display the current registration details
2. WHEN displaying existing registration details, THE Bot SHALL offer "Change Time Slot" and "Unregister" options
3. WHEN a player selects "Change Time Slot", THE Bot SHALL present the available time slots and process the change as an unregister followed by a new registration
4. WHEN a player selects "Unregister", THE Bot SHALL display a confirmation prompt before calling the Registration_Service to remove the registration
5. WHEN a registration change or cancellation succeeds, THE Bot SHALL display a confirmation with the updated status

### Requirement 5: Tournament Ongoing Lockout

**User Story:** As a tournament system, I want to prevent registration changes while the tournament is ongoing, so that the tournament schedule remains stable during play.

#### Acceptance Criteria

1. WHILE the Tournament_State is `ongoing`, WHEN a player clicks the "Register Now" button, THE Bot SHALL respond with an Ephemeral_Interaction explaining that registration is locked because the tournament is in progress
2. WHILE the Tournament_State is `ongoing`, THE Bot SHALL prevent new registrations, time slot changes, and unregistrations through the button interaction
3. WHILE the Tournament_State is `ongoing`, THE Registration_Message SHALL display which time slot is currently playing

### Requirement 6: Registration Message Auto-Update

**User Story:** As a tournament player, I want the registration message to stay current without manual intervention, so that I always see accurate tournament information.

#### Acceptance Criteria

1. THE Bot SHALL update the Registration_Message at a configurable polling interval (default: 60 seconds)
2. WHEN tournament data changes between polls, THE Bot SHALL update the Registration_Message embed content to reflect the latest data
3. IF the backend API is unreachable during a poll, THEN THE Bot SHALL retain the last known state and retry on the next interval
4. WHEN the Bot updates the Registration_Message, THE Bot SHALL preserve the message ID so that the message remains in the same position in the channel

### Requirement 7: Error Handling and Resilience

**User Story:** As a tournament player, I want clear feedback when something goes wrong, so that I know what happened and what to do next.

#### Acceptance Criteria

1. IF the Registration_Service returns an error during registration, THEN THE Bot SHALL display the error message in the Ephemeral_Interaction with a suggestion to retry
2. IF the Registration_Service returns an error during unregistration, THEN THE Bot SHALL display the error message and preserve the current registration state
3. IF the button interaction times out before the player completes the flow, THEN THE Bot SHALL dismiss the Ephemeral_Interaction gracefully
4. IF the backend API is unreachable when a player clicks the button, THEN THE Bot SHALL inform the player that the service is temporarily unavailable
