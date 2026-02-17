# Implementation Plan: Registration Rules Display

## Overview

Add a tournament rules display step to the new registration flow. The implementation creates a rules file, a RulesProvider service to load it, and a rules display step in RegistrationButtonHandler between time slot selection and confirmation.

## Tasks

- [x] 1. Create the tournament rules file and RulesProvider service
  - [x] 1.1 Create `bots/data/tournament-rules.txt` with the tournament rules content
    - Use the exact rules text provided in the feature request
    - _Requirements: 2.1_

  - [x] 1.2 Create `bots/src/services/RulesProvider.js` with `getRulesText()` and `clearCache()` functions
    - Read from `bots/data/tournament-rules.txt` using `fs/promises`
    - Cache content in a module-level variable after first read
    - `clearCache()` resets the cached value to null
    - On file read failure, throw an error with a descriptive message
    - _Requirements: 2.1, 2.2_

  - [ ]* 1.3 Write property tests for RulesProvider in `bots/src/tests/RulesProvider.property.test.js`
    - **Property 1: Rules file content round trip**
    - **Validates: Requirements 2.1**
    - Generate arbitrary UTF-8 text with fast-check, write to a temp rules file, call `getRulesText()`, assert returned content matches
    - Use temp directory and mock the file path for isolation
    - Min 100 iterations

  - [ ]* 1.4 Write unit tests for RulesProvider in `bots/src/tests/RulesProvider.test.js`
    - Test: file exists returns content
    - Test: file missing throws error
    - Test: cached value returned on second call without re-reading file
    - Test: `clearCache()` forces re-read on next call
    - _Requirements: 2.1, 2.2_

- [x] 2. Add rules display step to RegistrationButtonHandler
  - [x] 2.1 Add `_handleRulesDisplay` method to `RegistrationButtonHandler`
    - Import `RulesProvider` at top of file
    - Build a Discord embed with title "📜 Tournament Rules", rules text as description, and footer
    - Add "I Acknowledge the Rules" (Success, ✅) and "Cancel" (Danger, ❌) buttons
    - On acknowledge: call `_handleTimeSlotConfirmation` with the stored parameters
    - On cancel: show cancellation message
    - On timeout (5 min): show timeout message
    - If `getRulesText()` fails: log error, show fallback message, proceed directly to confirmation
    - _Requirements: 1.1, 1.3, 1.4, 2.2, 2.3, 3.1, 3.2, 3.3_

  - [x] 2.2 Modify `handleNewRegistration` to call `_handleRulesDisplay` instead of `_handleTimeSlotConfirmation`
    - In the collector's `reg_timeslot_select` handler, replace the call to `_handleTimeSlotConfirmation` with `_handleRulesDisplay`
    - Pass through all existing parameters (interaction, selectInteraction, tournamentData, formattedSlots, timezone)
    - _Requirements: 1.1, 1.2_

  - [ ]* 2.3 Write property test for rules embed construction in `bots/src/tests/RulesProvider.property.test.js`
    - **Property 2: Rules text preservation in embed**
    - **Validates: Requirements 2.3, 3.2**
    - Extract the embed-building logic into a testable helper or test the embed construction directly
    - Generate arbitrary strings with fast-check, build the embed, assert description matches input
    - Min 100 iterations

  - [ ]* 2.4 Write unit tests for `_handleRulesDisplay` in `bots/src/tests/RegistrationButtonHandler.test.js`
    - Test: rules embed contains correct title, description, and footer
    - Test: acknowledge button proceeds to confirmation step
    - Test: cancel button shows cancellation message
    - Test: fallback behavior when rules file fails to load
    - Test: `handleTimeSlotChange` does not display rules
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.2, 3.1, 3.3_

- [ ] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The existing `handleTimeSlotChange` method requires no modifications — it already goes directly to registration without a rules step
- Property tests use `fast-check` (already in devDependencies) with Vitest
- The rules file uses Discord markdown formatting which is preserved as-is in embed descriptions
