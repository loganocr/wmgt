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

g_historical_override boolean := false;
g_change_timestamp    wmg_player_rank_history.change_timestamp%type;

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

end wmg_rank_history;
/