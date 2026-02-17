# Requirements Document

## Introduction

This feature adds tournament rules display to the Discord bot's registration flow. When a player initiates a new registration and selects a time slot, the bot displays the tournament rules before proceeding to confirmation. The rules are only shown during new registrations, not when a player changes their existing time slot. The rules text is stored in an external file to allow easy updates without code changes.

## Glossary

- **Registration_Flow**: The sequence of Discord interactions a player goes through to register for a tournament session, starting from clicking "Register Now" and ending with a confirmed registration.
- **New_Registration**: A registration attempt by a player who does not have an active registration for the current tournament session.
- **Time_Slot_Change**: The process where an already-registered player switches to a different time slot within the same tournament session.
- **Rules_Display**: A Discord embed message showing the tournament rules text to the player during the registration flow.
- **Rules_File**: An external text file containing the tournament rules content, stored in the bot's project directory.
- **Confirmation_Step**: The step in the registration flow where the player reviews their selected time slot and confirms or cancels the registration.
- **Bot**: The WMGT Discord bot application that handles player interactions via slash commands and button interactions.

## Requirements

### Requirement 1: Display Tournament Rules During New Registration

**User Story:** As a tournament player, I want to see the tournament rules when I register for the first time, so that I am aware of the expectations before committing to a time slot.

#### Acceptance Criteria

1. WHEN a player selects a time slot during a New_Registration, THE Bot SHALL display the Rules_Display containing the full tournament rules text before proceeding to the Confirmation_Step.
2. WHEN a player is performing a Time_Slot_Change, THE Bot SHALL proceed directly to the time slot selection without displaying the Rules_Display.
3. WHEN the Rules_Display is shown, THE Bot SHALL include a button to acknowledge the rules and proceed to the Confirmation_Step.
4. WHEN the Rules_Display is shown, THE Bot SHALL include a button to cancel the registration.

### Requirement 2: Load Rules From External File

**User Story:** As a tournament administrator, I want the rules text stored in a separate file, so that I can update the rules without modifying bot code.

#### Acceptance Criteria

1. THE Bot SHALL load the tournament rules text from the Rules_File at startup or when the rules are needed.
2. IF the Rules_File is missing or unreadable, THEN THE Bot SHALL log an error and display a fallback message indicating that rules could not be loaded.
3. WHEN the Rules_File content is loaded, THE Bot SHALL render the text as a Discord embed preserving the formatting of the rules.

### Requirement 3: Rules Display Formatting

**User Story:** As a tournament player, I want the rules to be clearly formatted in the Discord message, so that I can easily read and understand them.

#### Acceptance Criteria

1. WHEN the Rules_Display is shown, THE Bot SHALL present the rules in a Discord embed with a descriptive title.
2. WHEN the Rules_Display is shown, THE Bot SHALL preserve bullet points and line breaks from the Rules_File content.
3. WHEN the Rules_Display is shown, THE Bot SHALL include a footer directing the player to the tournament website for full details.
