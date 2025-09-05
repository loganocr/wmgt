# Requirements Document

## Introduction

The WMGT system currently has a manual scorecard verification process where tournament administrators must review and validate player scorecards after each tournament session. This feature will automate the verification process by matching scorecards from the WMGT card structure against submitted rounds in the database. The system will verify players, match hole-by-hole scores, and validate totals for both courses in each room. When all scores match perfectly, the system will automatically verify the scorecard by updating the wmg_tournament_players table (verified_score_flag, verified_by, verified_on).

## Requirements

### Requirement 1

**User Story:** As a tournament administrator, I want scorecards to be automatically verified by matching them against the WMGT card structure data, so that accurate scorecards are automatically approved without manual intervention.

#### Acceptance Criteria

1. WHEN a tournament round is completed THEN the system SHALL retrieve scorecard data from the WMGT card structure repository
2. WHEN scorecard data is available THEN the system SHALL match players between the card structure and submitted rounds in the database
3. WHEN players are matched THEN the system SHALL verify each hole score for both courses in the room
4. WHEN all hole scores and course totals match exactly THEN the system SHALL automatically set verified_score_flag to true
5. WHEN automatic verification occurs THEN the system SHALL populate verified_by with 'SYSTEM' and verified_on with current timestamp

### Requirement 2

**User Story:** As a tournament administrator, I want the system to handle scorecard mismatches appropriately, so that discrepancies are flagged for manual review while maintaining data integrity.

#### Acceptance Criteria

1. WHEN player matching fails between card structure and database THEN the system WONT do anything and the manual review process will continue as before


### Requirement 3

**User Story:** As a tournament administrator, I want a dashboard a database view to monitor verification status, flagged scorecards, so that I can efficiently handle manual review tasks.

#### Acceptance Criteria

1. WHEN quering the verification dashboard view THEN the system SHALL display current verification queue status


### Requirement 4

**User Story:** As a system administrator, I want the system to integrate with the WMGT card structure repository, so that scorecard verification can access the compared against the AI imported tournament round data.

#### Acceptance Criteria

1. WHEN verification runs THEN the system SHALL connect to the WMGT card structure at /Users/rimblas/Dropbox/work/repos/wmg_scorecards/install
2. WHEN accessing card data THEN the system SHALL read from wmg_card_players, wmg_card_runs, and wmg_card_scores tables
3. WHEN processing room verification THEN the system SHALL match by rooms, course, and player
4. WHEN card structure is unavailable THEN the system SHALL take no action.
5. WHEN card data is processed THEN the system SHALL handle both courses per room in the verification logic

