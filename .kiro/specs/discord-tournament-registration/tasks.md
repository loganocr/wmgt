# Implementation Plan: Discord Tournament Registration Button

## Overview

Implement a persistent Discord embed message with a "Register Now" button that serves as the primary entry point for tournament registration. The implementation builds on the existing `RegistrationService` and `TimezoneService`, adding a `RegistrationMessageManager` for message lifecycle management, a `RegistrationButtonHandler` for interaction flows, and a `/setup-wmgt-registration` admin command.

## Tasks

- [x] 1. Add configuration and message reference persistence
  - [x] 1.1 Add registration config entries to `bots/src/config/config.js`
    - Add `registration` block with `pollIntervalMs`, `idlePollIntervalMs`, `messageDataPath`, `channelId`, `pollingStartOffsetHrs`, `pollingEndOffsetHrs`, `playWindowEndOffsetHrs`
    - _Requirements: 6.1, 2.5_
  - [x] 1.2 Create message reference persistence utility
    - Create `bots/src/utils/MessagePersistence.js` with `saveMessageReference(data)` and `loadMessageReference()` functions
    - Save/load JSON to the configured `messageDataPath` (default `./data/registration-message.json`)
    - Handle missing file gracefully (return null on first run)
    - _Requirements: 1.1, 1.2_
  - [x] 1.3 Write property test for message reference round trip
    - **Property 1: Message reference persistence round trip**
    - **Validates: Requirements 1.2**

- [x] 2. Implement tournament state derivation and embed building
  - [x] 2.1 Create `bots/src/services/RegistrationMessageManager.js` with `deriveTournamentState(tournamentData)` method
    - Derive state as `registration_open`, `ongoing`, or `closed` based on tournament data, registration dates, and play window (first slot → last slot + 4hrs)
    - Handle null/empty tournament data as `closed`
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 2.2 Write property test for tournament state derivation
    - **Property 5: Tournament state derivation correctness**
    - **Validates: Requirements 2.1, 2.2, 2.3**
  - [x] 2.3 Implement `buildRegistrationMessage(tournamentData)` method on `RegistrationMessageManager`
    - Build embed and button components based on derived state
    - `registration_open`: green embed with tournament name, week, session date, courses, time slots, enabled "Register Now" button
    - `ongoing`: orange embed with "🏆 {Week} (In Progress)", UTC time slot, session date epoch timestamp, disabled button
    - `closed`: grey embed with "No active tournament" message, disabled button
    - _Requirements: 1.4, 1.5, 2.1, 2.2, 2.3_
  - [ ]* 2.4 Write property test for registration-open embed completeness
    - **Property 2: Registration-open embed completeness**
    - **Validates: Requirements 1.4, 1.5, 2.1**
  - [ ]* 2.5 Write property test for ongoing embed correctness
    - **Property 3: Ongoing embed correctness**
    - **Validates: Requirements 2.2, 5.3**
  - [ ]* 2.6 Write property test for closed embed correctness
    - **Property 4: Closed embed correctness**
    - **Validates: Requirements 2.3**

- [x] 3. Implement polling and message lifecycle
  - [x] 3.1 Implement `calculatePollingWindow(tournamentData)` and `calculatePlayWindow(tournamentData)` methods
    - Polling window: 2hrs before first slot → 8hrs after last slot (or next registration opens)
    - Play window: first slot → last slot + 4hrs
    - Account for `day_offset` in time slot calculations
    - _Requirements: 2.4, 2.5_
  - [x] 3.2 Implement `startPolling()` / `stopPolling()` with dual-interval logic
    - Active interval (default 60s) within polling window
    - Idle interval (default 1hr) outside polling window
    - On each poll: fetch tournament data, compare with last known state, update message if changed
    - _Requirements: 6.1, 6.2_
  - [x] 3.3 Implement `ensureMessageExists()` and `initialize()` methods
    - On init: load persisted reference, try to fetch the message from Discord
    - If message exists: resume polling and updating
    - If message missing: post a new one and persist the new reference
    - _Requirements: 1.2, 1.3_
  - [x] 3.4 Write property test for change detection
    - **Property 8: Change detection triggers embed update**
    - **Validates: Requirements 6.2**

- [x] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement button interaction handler for new registrations
  - [x] 5.1 Create `bots/src/services/RegistrationButtonHandler.js` with `handleRegisterButton(interaction)` method
    - Check tournament state: if `ongoing`, call `handleOngoingTournament()`
    - Fetch player registrations via `RegistrationService.getPlayerRegistrations()`
    - Route to `handleNewRegistration()` or `handleExistingRegistration()` based on result
    - All responses are ephemeral
    - _Requirements: 3.1, 4.1, 5.1_
  - [x] 5.2 Implement `handleNewRegistration(interaction, tournamentData)` flow
    - Show time slots via select menu (UTC + player timezone if available, UTC-only if no timezone stored)
    - On selection: show confirmation embed with time slot details
    - On confirm: call `RegistrationService.registerPlayer()`, show success/error
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [ ]* 5.3 Write property test for ongoing state lockout
    - **Property 6: Ongoing state blocks all modifications**
    - **Validates: Requirements 5.1, 5.2**

- [x] 6. Implement button interaction handler for existing registrations
  - [x] 6.1 Implement `handleExistingRegistration(interaction, registrationData, tournamentData)` flow
    - Display current registration details with "Change Time Slot" and "Unregister" buttons
    - _Requirements: 4.1, 4.2_
  - [x] 6.2 Implement `handleTimeSlotChange(interaction, currentRegistration, tournamentData)` flow
    - Unregister from current slot, then present time slot selection, then register for new slot
    - Show success/error after completion
    - _Requirements: 4.3, 4.5_
  - [x] 6.3 Implement `handleUnregister(interaction, currentRegistration)` flow
    - Show confirmation prompt, on confirm call `RegistrationService.unregisterPlayer()`, show result
    - _Requirements: 4.4, 4.5_
  - [ ]* 6.4 Write property test for existing registration management options
    - **Property 7: Existing registration shows management options**
    - **Validates: Requirements 4.2**

- [x] 7. Create setup command and wire into bot
  - [x] 7.1 Create `bots/src/commands/setupRegistration.js` slash command
    - Command name: `setup-wmgt-registration`
    - Requires Manage Messages permission
    - Posts the registration message in the current channel via `RegistrationMessageManager`
    - Persists the message reference
    - Responds with ephemeral confirmation to the admin
    - _Requirements: 1.1_
  - [x] 7.2 Wire `RegistrationMessageManager` and `RegistrationButtonHandler` into `bots/src/index.js`
    - Import and instantiate `RegistrationMessageManager` in the bot constructor
    - Call `manager.initialize()` in the `clientReady` event
    - Add `interactionCreate` listener that routes button interactions with `reg_` prefix to `RegistrationButtonHandler`
    - Register the `setup-wmgt-registration` command
    - Call `manager.stopPolling()` in the bot's `stop()` method
    - _Requirements: 1.2, 2.4, 2.5_

- [x] 8. Add error handling for button interactions and polling
  - [x] 8.1 Add error handling to `RegistrationButtonHandler`
    - API errors during registration: show error message with retry suggestion
    - API errors during unregistration: show error message, note registration is unchanged
    - API unreachable on button click: show "service temporarily unavailable" message
    - Interaction timeout: clean up with timeout message via collector `end` event
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 8.2 Add error handling to `RegistrationMessageManager` polling
    - API unreachable during poll: log error, retain last known state, retry next interval
    - Message deleted externally: detect "Unknown Message" error on edit, post new message, update reference
    - _Requirements: 1.3, 6.3_

- [x] 9. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- No backend (ORDS/PL/SQL) changes are needed — all existing endpoints are reused
- The `fast-check` library is needed for property-based tests (`npm install --save-dev fast-check`)
- Property tests validate universal correctness properties; unit tests validate specific examples and edge cases
