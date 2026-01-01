create or replace package body wmg_rank_history
is

-- CONSTANTS
gc_scope_prefix constant VARCHAR2(31) := lower($$PLSQL_UNIT) || '.';


/**
 * Log either via logger or apex.debug
 *
 *
 * @example
 * 
 * @issue
 *
 * @author Jorge Rimblas
 * @created January 15, 2023
 * @param p_msg
 * @param p_ctx
 * @return
 */
procedure log(
    p_msg  in varchar2
  , p_ctx  in varchar2 default null
)
is
begin
  $IF $$NO_LOGGER $THEN
  dbms_output.put_line('[' || p_ctx || '] ' || p_msg);
  apex_debug.message('[%s] %s', p_ctx, p_msg);
  $ELSE
  logger.log(p_text => p_msg, p_scope => p_ctx);
  $END

end log;


--------------------------------------------------------------------------------
-- Get the effective rank for a player at a specific point in time
-- Handles NEW status and fallback scenarios as per requirements
--------------------------------------------------------------------------------
function get_player_rank_at_time(
    p_player_id   in wmg_players.id%type
  , p_timestamp   in timestamp with local time zone
) return varchar2
is
    l_scope constant varchar2(128) := gc_scope_prefix || 'get_player_rank_at_time';
    l_effective_rank wmg_player_rank_history.new_rank_code%type;
    l_current_rank wmg_player_rank_history.new_rank_code%type;
begin
    
    -- First, try to find the most recent rank change before the given timestamp
    begin
        select new_rank_code
        into l_effective_rank
        from (
            select new_rank_code
                 , change_timestamp
                 , row_number() over (order by change_timestamp desc) as rn
            from wmg_player_rank_history
            where player_id = p_player_id
              and change_timestamp <= p_timestamp
        )
        where rn = 1;
        
        return l_effective_rank;
        
    exception
        when no_data_found then
            -- No rank history found before the timestamp
            -- Check if player exists and get their current rank as fallback
            begin
                select rank_code
                into l_current_rank
                from wmg_players
                where id = p_player_id;
                
                -- If current rank is not NEW, return it as fallback
                -- If current rank is NEW, the player was NEW at the time
                return l_current_rank;
                
            exception
                when no_data_found then
                    -- Player doesn't exist
                    return null;
            end;
    end;
    
exception
    when others then
        -- Log error and return null for safety
        logger.log_error(p_text => apex_string.format('Error in get_player_rank_at_time for player_id=%s, timestamp=%s: %s', 
                        p_player_id, to_char(p_timestamp), sqlerrm)
                    , p_scope => l_scope);
        return null;
end get_player_rank_at_time;

--------------------------------------------------------------------------------
-- Get historical ranks for multiple rounds efficiently
-- Supports batch processing for performance
--------------------------------------------------------------------------------
function get_rounds_with_historical_ranks(
    p_round_ids in apex_t_number
) return tab_round_rank_type pipelined
is
    l_scope constant varchar2(128) := gc_scope_prefix || 'get_rounds_with_historical_ranks';
    l_result rec_round_rank_type;
begin
    
    -- Process all rounds in a single query for efficiency
    for rec in (
        select r.id as round_id
             , r.players_id as player_id
             , r.created_on as round_timestamp
             , wmg_rank_history.get_player_rank_at_time(r.players_id, r.created_on) as effective_rank_code
        from wmg_rounds r
        where r.id in (select column_value from table(p_round_ids))
    )
    loop
        l_result.round_id := rec.round_id;
        l_result.player_id := rec.player_id;
        l_result.round_timestamp := rec.round_timestamp;
        l_result.effective_rank_code := rec.effective_rank_code;
        
        -- Get rank name and determine if it was NEW
        if rec.effective_rank_code is not null then
            begin
                select name
                into l_result.rank_name
                from wmg_ranks
                where code = rec.effective_rank_code;
                
                l_result.rank_was_new := case when rec.effective_rank_code = 'NEW' then 'Y' else 'N' end;
                
            exception
                when no_data_found then
                    l_result.rank_name := rec.effective_rank_code; -- fallback to code
                    l_result.rank_was_new := 'N';
            end;
        else
            l_result.rank_name := null;
            l_result.rank_was_new := 'N';
        end if;
        
        pipe row(l_result);
    end loop;
    
    return;
    
exception
    when others then
        apex_debug.error('Error in get_rounds_with_historical_ranks: %s', sqlerrm);
        return;
end get_rounds_with_historical_ranks;

--------------------------------------------------------------------------------
-- Get the effective rank for a specific round
-- Convenience function for single round lookups
--------------------------------------------------------------------------------
function get_round_effective_rank(
    p_round_id in number
) return varchar2
is
    l_scope constant varchar2(128) := gc_scope_prefix || 'get_round_effective_rank';
    l_player_id number;
    l_round_timestamp timestamp with local time zone;
begin
    
    -- Get player and timestamp for the round
    select players_id, created_on
    into l_player_id, l_round_timestamp
    from wmg_rounds
    where id = p_round_id;
    
    -- Use the main function to get the effective rank
    return get_player_rank_at_time(l_player_id, l_round_timestamp);
    
exception
    when no_data_found then
        return null;
    when others then
        apex_debug.error('Error in get_round_effective_rank for round_id=%s: %s', 
                        p_round_id, sqlerrm);
        return null;
end get_round_effective_rank;

end wmg_rank_history;
/