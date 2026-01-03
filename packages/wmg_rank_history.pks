create or replace package wmg_rank_history
is

--------------------------------------------------------------------------------
--*
--* Package for managing player rank history and historical rank lookups
--*
--------------------------------------------------------------------------------

-- Type definitions for batch processing
type rec_round_rank_type is record(
    round_id                number
  , player_id               number
  , round_timestamp         timestamp with local time zone
  , effective_rank_code     varchar2(10)
  , rank_name               varchar2(32)
  , rank_was_new            varchar2(1)  -- 'Y' if rank was NEW at time of round
);

type tab_round_rank_type is table of rec_round_rank_type;

-- Type definitions for player progression
type rec_player_progression_type is record(
    player_id               number
  , player_name             varchar2(60)
  , rank_code               varchar2(10)
  , rank_name               varchar2(32)
  , start_date              timestamp with local time zone
  , end_date                timestamp with local time zone
  , duration_days           number
  , change_reason           varchar2(500)
  , change_type             varchar2(20)
  , changed_by              varchar2(60)
  , rank_sequence           number
  , is_current_rank         varchar2(1)
  , progression_type        varchar2(20)  -- 'ACTIVE_RANK' or 'NEW_PLAYER'
);

type tab_player_progression_type is table of rec_player_progression_type;

g_historical_override   boolean := false;
g_change_timestamp      wmg_player_rank_history.change_timestamp%type;
g_tournament_session_id wmg_tournament_sessions.id%type;

--------------------------------------------------------------------------------
-- Get the effective rank for a player at a specific point in time
--------------------------------------------------------------------------------
function get_player_rank_at_time(
    p_player_id   in wmg_players.id%type
  , p_timestamp   in timestamp with local time zone
) return varchar2;

--------------------------------------------------------------------------------
-- Get historical ranks for multiple rounds efficiently
--------------------------------------------------------------------------------
function get_rounds_with_historical_ranks(
    p_round_ids in apex_t_number
) return tab_round_rank_type pipelined;

--------------------------------------------------------------------------------
-- Get the effective rank for a specific round
--------------------------------------------------------------------------------
function get_round_effective_rank(
    p_round_id in number
) return varchar2;

--------------------------------------------------------------------------------
-- Get complete progression timeline for a player (including NEW status handling)
--------------------------------------------------------------------------------
function get_player_progression(
    p_player_id in wmg_players.id%type
  , p_include_new in varchar2 default 'N'  -- 'Y' to include NEW status in results
) return tab_player_progression_type pipelined;

--------------------------------------------------------------------------------
-- Check if a player has completed any tournaments
--------------------------------------------------------------------------------
function has_completed_tournament(
    p_player_id in wmg_players.id%type
) return varchar2;  -- Returns 'Y' or 'N'

--------------------------------------------------------------------------------
-- Seed historical ranks based on tournament session performance
-- Calculates ranks based on session results and applies promotion/relegation rules
--------------------------------------------------------------------------------
function seed_historical_ranks_from_session(
    p_tournament_session_id in wmg_tournament_sessions.id%type
  , p_checkpoint_type in varchar2 default 'END_SEASON'  -- 'END_SEASON', 'WEEK_6', 'WEEK_12'
  , p_season_number in number default null  -- Season number for context
) return number;  -- Returns number of players processed

--------------------------------------------------------------------------------
-- Calculate session end ranks based on tournament performance
-- Applies standard promotion/relegation rules based on points thresholds
--------------------------------------------------------------------------------
procedure calculate_session_end_ranks(
    p_tournament_session_id in wmg_tournament_sessions.id%type
);


--------------------------------------------------------------------------------
-- Apply midseason promotions and relegations (Week 6 checkpoint)
-- Uses point thresholds to determine rank changes at mid-season
--------------------------------------------------------------------------------
procedure apply_midseason_promotions_relegations(
    p_tournament_session_id in wmg_tournament_sessions.id%type
);

--------------------------------------------------------------------------------
-- Apply automatic promotion rules based on tournament finishes
-- Handles Top 3/10/25 automatic promotions during seasons
--------------------------------------------------------------------------------
procedure apply_automatic_promotions(
    p_tournament_session_id in wmg_tournament_sessions.id%type
);

--------------------------------------------------------------------------------
-- Seed Season 16 end-of-season ranks as baseline
-- Establishes initial historical data for all participating players
--------------------------------------------------------------------------------
procedure seed_season_baseline(
    p_tournament_session_id in wmg_tournament_sessions.id%type
);

--------------------------------------------------------------------------------
-- Apply comprehensive season checkpoint seeding
-- Combines point-based rankings with automatic promotion rules
--------------------------------------------------------------------------------
procedure apply_comprehensive_checkpoint_seeding(
    p_tournament_session_id in wmg_tournament_sessions.id%type
  , p_checkpoint_type in varchar2
  , p_include_auto_promotions in varchar2 default 'Y'
);


end wmg_rank_history;
/