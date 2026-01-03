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
        logger.log_error(p_text => apex_string.format('Error in get_rounds_with_historical_ranks: %s', sqlerrm)
                    , p_scope => l_scope);
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
        logger.log_error(p_text => apex_string.format('Error in get_round_effective_rank for round_id=%s: %s', 
                        p_round_id, sqlerrm)
                    , p_scope => l_scope);
        return null;
end get_round_effective_rank;




--------------------------------------------------------------------------------
-- Check if a player has completed any tournaments
-- Used for NEW player display logic
--------------------------------------------------------------------------------
function has_completed_tournament(
    p_player_id in wmg_players.id%type
) return varchar2
is
    l_scope constant varchar2(128) := gc_scope_prefix || 'has_completed_tournament';
    l_count number;
begin
    
    select count(*)
    into l_count
    from wmg_rounds r
    where r.players_id = p_player_id
      and r.final_score is not null
      and rownum = 1;  -- Just need to know if any exist
    
    return case when l_count > 0 then 'Y' else 'N' end;
    
exception
    when others then
        logger.log_error(p_text => apex_string.format('Error in has_completed_tournament for player_id=%s: %s', 
                        p_player_id, sqlerrm)
                    , p_scope => l_scope);
        return 'N';  -- Default to no tournaments completed on error
end has_completed_tournament;




--------------------------------------------------------------------------------
-- Get complete progression timeline for a player
-- Handles both active rank progression and NEW player display logic
--------------------------------------------------------------------------------
function get_player_progression(
    p_player_id in wmg_players.id%type
  , p_include_new in varchar2 default 'N'
) return tab_player_progression_type pipelined
is
    l_scope constant varchar2(128) := gc_scope_prefix || 'get_player_progression';
    l_result rec_player_progression_type;
    l_player_name wmg_players.name%type;
    l_current_rank wmg_players.rank_code%type;
    l_registration_date wmg_players.created_on%type;
    l_has_tournaments varchar2(1);
begin
    
    -- Get basic player information
    begin
        select name, rank_code, created_on
        into l_player_name, l_current_rank, l_registration_date
        from wmg_players
        where id = p_player_id;
    exception
        when no_data_found then
            return;  -- Player doesn't exist
    end;
    
    -- Check if player has completed tournaments
    l_has_tournaments := has_completed_tournament(p_player_id);
    
    -- Handle NEW players who haven't completed tournaments
    if l_current_rank = 'NEW' and l_has_tournaments = 'N' then
        if p_include_new = 'Y' then
            l_result.player_id := p_player_id;
            l_result.player_name := l_player_name;
            l_result.rank_code := 'NEW';
            
            -- Get rank name
            select name into l_result.rank_name from wmg_ranks where code = 'NEW';
            
            l_result.start_date := l_registration_date;
            l_result.end_date := null;
            l_result.duration_days := extract(day from (current_timestamp - l_registration_date));
            l_result.change_reason := 'Player registered but has not completed first tournament';
            l_result.change_type := 'NEW';
            l_result.changed_by := null;  -- Registration doesn't track who created
            l_result.rank_sequence := 1;
            l_result.is_current_rank := 'Y';
            l_result.progression_type := 'NEW_PLAYER';
            
            pipe row(l_result);
        end if;
        return;  -- No active rank history for NEW players
    end if;
    
    -- Get active rank progression from history
    for rec in (
        select h.old_rank_code
             , h.new_rank_code
             , h.change_timestamp
             , h.change_reason
             , h.change_type
             , h.changed_by
             , r.name as rank_name
             , lead(h.change_timestamp) over (order by h.change_timestamp) as next_change_timestamp
             , row_number() over (order by h.change_timestamp) as rank_sequence
        from wmg_player_rank_history h
          join wmg_ranks r on h.new_rank_code = r.code
        where h.player_id = p_player_id
          and (p_include_new = 'Y' or h.new_rank_code != 'NEW')  -- Exclude NEW unless requested
        order by h.change_timestamp
    )
    loop
        l_result.player_id := p_player_id;
        l_result.player_name := l_player_name;
        l_result.rank_code := rec.new_rank_code;
        l_result.rank_name := rec.rank_name;
        l_result.start_date := rec.change_timestamp;
        l_result.end_date := rec.next_change_timestamp;
        l_result.duration_days := case 
            when rec.next_change_timestamp is null then 
                extract(day from (current_timestamp - rec.change_timestamp))
            else 
                extract(day from (rec.next_change_timestamp - rec.change_timestamp))
        end;
        l_result.change_reason := rec.change_reason;
        l_result.change_type := rec.change_type;
        l_result.changed_by := rec.changed_by;
        l_result.rank_sequence := rec.rank_sequence;
        l_result.is_current_rank := case when rec.next_change_timestamp is null then 'Y' else 'N' end;
        l_result.progression_type := 'ACTIVE_RANK';
        
        pipe row(l_result);
    end loop;
    
    -- If no history exists but player has active rank, create fallback entry
    if sql%rowcount = 0 and l_current_rank != 'NEW' then
        l_result.player_id := p_player_id;
        l_result.player_name := l_player_name;
        l_result.rank_code := l_current_rank;
        
        -- Get rank name
        select name into l_result.rank_name from wmg_ranks where code = l_current_rank;
        
        l_result.start_date := l_registration_date;
        l_result.end_date := null;
        l_result.duration_days := extract(day from (current_timestamp - l_registration_date));
        l_result.change_reason := 'Initial rank assignment (no history available)';
        l_result.change_type := 'INITIAL';
        l_result.changed_by := null;
        l_result.rank_sequence := 1;
        l_result.is_current_rank := 'Y';
        l_result.progression_type := 'ACTIVE_RANK';
        
        pipe row(l_result);
    end if;
    
    return;
    
exception
    when others then
        logger.log_error(p_text => apex_string.format('Error in get_player_progression for player_id=%s: %s', 
                        p_player_id, sqlerrm)
                    , p_scope => l_scope);
        return;
end get_player_progression;
--------------------------------------------------------------------------------
-- Seed historical ranks based on tournament session performance
-- This is the main seeding function that delegates to specific checkpoint handlers
--------------------------------------------------------------------------------
function seed_historical_ranks_from_session(
    p_tournament_session_id in wmg_tournament_sessions.id%type
  , p_checkpoint_type in varchar2 default 'END_SEASON'
  , p_season_number in number default null
) return number
is
    l_scope constant varchar2(128) := gc_scope_prefix || 'seed_historical_ranks_from_session';
    l_players_processed number := 0;
    l_session_week wmg_tournament_sessions.week%type;
    l_tournament_id wmg_tournament_sessions.tournament_id%type;
begin
    
    -- Get session information
    select week, tournament_id
    into l_session_week, l_tournament_id
    from wmg_tournament_sessions
    where id = p_tournament_session_id;
    
    log('Starting historical rank seeding for session ' || p_tournament_session_id || 
        ', checkpoint: ' || p_checkpoint_type || ', week: ' || l_session_week, l_scope);
    
    -- Route to appropriate seeding function based on checkpoint type
    case p_checkpoint_type
        when 'END_SEASON' then
            apply_comprehensive_checkpoint_seeding(
                p_tournament_session_id, p_checkpoint_type, 'Y'
            );
        when 'WEEK_6' then
            apply_comprehensive_checkpoint_seeding(
                p_tournament_session_id, p_checkpoint_type, 'Y'
            );
        when 'WEEK_12' then
            apply_comprehensive_checkpoint_seeding(
                p_tournament_session_id, p_checkpoint_type, 'Y'
            );
        when 'SEASON_16_BASELINE' then
            apply_comprehensive_checkpoint_seeding(
                p_tournament_session_id, p_checkpoint_type, 'N'
            );
        else
            raise_application_error(-20001, 'Invalid checkpoint type: ' || p_checkpoint_type);
    end case;
    
    log('Completed historical rank seeding. Players processed: ' || l_players_processed, l_scope);
    
    return l_players_processed;
    
exception
    when others then
        logger.log_error(p_text => apex_string.format('Error in seed_historical_ranks_from_session for session_id=%s, checkpoint=%s: %s', 
                        p_tournament_session_id, p_checkpoint_type, sqlerrm)
                    , p_scope => l_scope);
        raise;
end seed_historical_ranks_from_session;





--------------------------------------------------------------------------------
-- Calculate session end ranks based on tournament performance
-- Applies final season rankings based on total points accumulated
--------------------------------------------------------------------------------
procedure calculate_session_end_ranks(
    p_tournament_session_id in wmg_tournament_sessions.id%type
)
is
    l_scope constant varchar2(128) := gc_scope_prefix || 'calculate_session_end_ranks';
    l_players_processed number := 0;
    l_session_week wmg_tournament_sessions.week%type;
    l_session_date wmg_tournament_sessions.session_date%type;
    l_change_timestamp timestamp with local time zone;
    l_new_rank varchar2(10);
    l_current_rank varchar2(10);
    l_reason varchar2(500);
begin
   log('BEGIN calculate_session_end_ranks', l_scope);
    
    -- Get session information
    select week, session_date
    into l_session_week, l_session_date
    from wmg_tournament_sessions
    where id = p_tournament_session_id;
    
    -- Use session date as change timestamp, or current time if null
    l_change_timestamp := coalesce(l_session_date, current_timestamp);
    
    log('Calculating end-of-season ranks for session ' || p_tournament_session_id || 
        ', week: ' || l_session_week, l_scope);
    
    -- Calculate final ranks based on total points for the season
    -- Using Season 17/18 rules: Elite 90+, Pro 64-89, Semi-Pro 44-63, Amateur <44
    for player_rec in (
        select tp.player_id
             , p.name as player_name
             , p.rank_code as current_rank
             , sum(nvl(tp.points, 0)) as total_points
        from wmg_tournament_players tp
          join wmg_players p on tp.player_id = p.id
          join wmg_tournament_sessions ts on tp.tournament_session_id = ts.id
        where ts.tournament_id = (
            select tournament_id 
            from wmg_tournament_sessions 
            where id = p_tournament_session_id
        )
          and tp.active_ind = 'Y'
          and p.rank_code != 'NEW'  -- Only process players with active ranks
        group by tp.player_id, p.name, p.rank_code
        having sum(nvl(tp.points, 0)) > 0  -- Only players who earned points
    )
    loop
        -- Determine new rank based on total points
        if player_rec.total_points >= 90 then
            l_new_rank := 'ELITE';
        elsif player_rec.total_points >= 64 then
            l_new_rank := 'PRO';
        elsif player_rec.total_points >= 44 then
            l_new_rank := 'SEMI';
        else
            l_new_rank := 'AMA';
        end if;
        
        l_current_rank := player_rec.current_rank;
        
        -- Only create history record if rank is changing
        if l_current_rank != l_new_rank then
            l_reason := 'End-of-season rank assignment based on ' || player_rec.total_points
                    || ' total points in week: ' ||  l_session_week;
            
            -- Insert historical rank record
            insert into wmg_player_rank_history (
                player_id, old_rank_code, new_rank_code, change_timestamp,
                change_reason, change_type, changed_by, tournament_session_id
            ) values (
                player_rec.player_id, l_current_rank, l_new_rank, l_change_timestamp,
                l_reason, 'SEASON_END', 'SYSTEM_SEEDING', p_tournament_session_id
            );
            
            -- Update player's current rank
            update wmg_players 
            set rank_code = l_new_rank
            where id = player_rec.player_id;
            
            l_players_processed := l_players_processed + 1;
            
            log('.. Updated "' || player_rec.player_name || '"" from ' || l_current_rank || 
                ' to ' || l_new_rank || ' (' || player_rec.total_points || ' points)', l_scope);
        end if;
    end loop;
    
    commit;
    
    log('.. Players processed: ' || l_players_processed, l_scope);
    
    log('END', l_scope);
    
exception
    when others then
        rollback;
        logger.log_error(p_text => apex_string.format('Error in calculate_session_end_ranks for session_id=%s: %s', 
                        p_tournament_session_id, sqlerrm)
                    , p_scope => l_scope);
        raise;
end calculate_session_end_ranks;




--------------------------------------------------------------------------------
-- Apply midseason promotions and relegations (Week 6 checkpoint)
-- Uses point thresholds to determine rank changes at mid-season
--------------------------------------------------------------------------------
procedure apply_midseason_promotions_relegations(
    p_tournament_session_id in wmg_tournament_sessions.id%type
)
is
    l_scope constant varchar2(128) := gc_scope_prefix || 'apply_midseason_promotions_relegations';

    l_players_processed number := 0;
    l_session_week wmg_tournament_sessions.week%type;
    l_session_date wmg_tournament_sessions.session_date%type;
    l_change_timestamp timestamp with local time zone;
    l_new_rank varchar2(10);
    l_current_rank varchar2(10);
    l_reason varchar2(500);
begin
    log('BEGIN apply_midseason_promotions_relegations', l_scope);

    -- Get session information
    select week, session_date
    into l_session_week, l_session_date
    from wmg_tournament_sessions
    where id = p_tournament_session_id;
    
    -- Use session date as change timestamp, or current time if null
    l_change_timestamp := coalesce(l_session_date, current_timestamp);
    
   
    log('.. Applying midseason promotions/relegations for session ' || p_tournament_session_id || 
        ', week: ' || l_session_week, l_scope);
    
    -- Calculate midseason ranks based on points accumulated up to this session
    -- Using Season 17/18 Week 6 rules: Elite 45+, Pro 32-44, Semi-Pro 22-31, Amateur <22
    for player_rec in (
        select tp.player_id
             , p.name as player_name
             , p.rank_code as current_rank
             , sum(nvl(tp.points, 0)) as total_points
        from wmg_tournament_players tp
          join wmg_players p on tp.player_id = p.id
          join wmg_tournament_sessions ts on tp.tournament_session_id = ts.id
        where ts.tournament_id = (
            select tournament_id 
            from wmg_tournament_sessions 
            where id = p_tournament_session_id
        )
          and ts.id <= p_tournament_session_id  -- Only sessions up to this point
          and tp.active_ind = 'Y'
          and p.rank_code != 'NEW'  -- Only process players with active ranks
        group by tp.player_id, p.name, p.rank_code
        having sum(nvl(tp.points, 0)) > 0  -- Only players who earned points
    )
    loop
        l_current_rank := player_rec.current_rank;
        l_new_rank := l_current_rank;  -- Default to no change
        
        -- Apply promotion/relegation rules based on current rank and points
        case l_current_rank
            when 'ELITE' then
                if player_rec.total_points < 45 then
                    l_new_rank := 'PRO';  -- Relegation from Elite
                end if;
            when 'PRO' then
                if player_rec.total_points >= 45 then
                    l_new_rank := 'ELITE';  -- Promotion to Elite
                elsif player_rec.total_points < 32 then
                    l_new_rank := 'SEMI';  -- Relegation to Semi-Pro
                end if;
            when 'SEMI' then
                if player_rec.total_points >= 32 then
                    l_new_rank := 'PRO';  -- Promotion to Pro
                elsif player_rec.total_points < 22 then
                    l_new_rank := 'AMA';  -- Relegation to Amateur
                end if;
            when 'AMA' then
                if player_rec.total_points >= 22 then
                    l_new_rank := 'SEMI';  -- Promotion to Semi-Pro
                end if;
        end case;
        
        -- Only create history record if rank is changing
        if l_current_rank != l_new_rank then
            l_reason := 'checkpoint rank adjustment based on ' || 
                       player_rec.total_points || ' points in ' || 
                       'week ' || l_session_week;
            
            -- Insert historical rank record
            insert into wmg_player_rank_history (
                player_id, old_rank_code, new_rank_code, change_timestamp,
                change_reason, change_type, changed_by, tournament_session_id
            ) values (
                player_rec.player_id, l_current_rank, l_new_rank, l_change_timestamp,
                l_reason, 'MIDSEASON', 'SYSTEM_SEEDING', p_tournament_session_id
            );
            
            -- Update player's current rank
            update wmg_players 
            set rank_code = l_new_rank
            where id = player_rec.player_id;
            
            l_players_processed := l_players_processed + 1;
            
            log('.. Updated player ' || player_rec.player_name || ' from ' || l_current_rank || 
                ' to ' || l_new_rank || ' (' || player_rec.total_points || ' points)', l_scope);
        end if;
    end loop;
    
    commit;
    
    log('.. Players processed: ' || l_players_processed, l_scope);

    log('END apply_midseason_promotions_relegations', l_scope);
    
exception
    when others then
        rollback;
        logger.log_error(p_text => 'Error in apply_midseason_promotions_relegations for session_id='
                       || p_tournament_session_id
                      , p_scope => l_scope);
        raise;
end apply_midseason_promotions_relegations;




--------------------------------------------------------------------------------
-- Apply automatic promotion rules based on tournament finishes
-- Handles Top 3/10/25 automatic promotions during seasons
--------------------------------------------------------------------------------
procedure apply_automatic_promotions(
    p_tournament_session_id in wmg_tournament_sessions.id%type
)
is
    l_scope constant varchar2(128) := gc_scope_prefix || 'apply_automatic_promotions';
    l_players_processed number := 0;
    l_session_week wmg_tournament_sessions.week%type;
    l_session_date wmg_tournament_sessions.session_date%type;
    l_change_timestamp timestamp with local time zone;
    l_new_rank varchar2(10);
    l_current_rank varchar2(10);
    l_reason varchar2(500);
begin
    
    log('BEGIN apply_automatic_promotions');
    g_historical_override := true; -- turn off the trigger

    -- Get session information
    select week, session_date
    into l_session_week, l_session_date
    from wmg_tournament_sessions
    where id = p_tournament_session_id;
    
    -- Use session date as change timestamp, or current time if null
    l_change_timestamp := coalesce(l_session_date, current_timestamp);
    
    log('Applying automatic promotions for session ' || p_tournament_session_id || 
        ', week: ' || l_session_week, l_scope);
    
    -- Apply automatic promotions based on tournament finishes
    -- Elite: Top 3 finish, Pro: Top 10 finish, Semi-Pro: Top 25 finish
    for player_rec in (
        select tp.player_id
             , p.name as player_name
             , p.rank_code as current_rank
             , min(tsp.pos) as best_finish
        from wmg_tournament_players tp
          join wmg_players p on tp.player_id = p.id
          join wmg_tournament_session_points_v tsp on tp.tournament_session_id = tsp.tournament_session_id 
                                                   and tp.player_id = tsp.player_id
          join wmg_tournament_sessions ts on tp.tournament_session_id = ts.id
        where ts.tournament_id = (
            select tournament_id 
            from wmg_tournament_sessions 
            where id = p_tournament_session_id
        )
          and ts.id <= p_tournament_session_id  -- Only sessions up to this point
          and tp.active_ind = 'Y'
          and p.rank_code != 'NEW'  -- Only process players with active ranks
          and tsp.pos is not null   -- Must have valid position
        group by tp.player_id, p.name, p.rank_code
    )
    loop
        l_current_rank := player_rec.current_rank;
        l_new_rank := l_current_rank;  -- Default to no change
        
        -- Apply automatic promotion rules based on best finish
        case l_current_rank
            when 'AMA' then
                if player_rec.best_finish <= 25 then
                    l_new_rank := 'SEMI';  -- Top 25 promotes to Semi-Pro
                elsif player_rec.best_finish <= 10 then
                    l_new_rank := 'PRO';  -- Top 10 promotes to Pro
                elsif player_rec.best_finish <= 3 then
                    l_new_rank := 'ELITE';  -- Top 3 promotes to Elite
                end if;
            when 'SEMI' then
                if player_rec.best_finish <= 10 then
                    l_new_rank := 'PRO';  -- Top 10 promotes to Pro
                elsif player_rec.best_finish <= 3 then
                    l_new_rank := 'ELITE';  -- Top 3 promotes to Elite
                end if;
            when 'PRO' then
                if player_rec.best_finish <= 3 then
                    l_new_rank := 'ELITE';  -- Top 3 promotes to Elite
                end if;
            -- Elite players cannot be promoted further
        end case;
        
        -- Only create history record if rank is changing
        if l_current_rank != l_new_rank then
            l_reason := 'Automatic promotion based on Top ' || player_rec.best_finish || 
                       ' finish in week ' || l_session_week;
            
            -- Insert historical rank record
            insert into wmg_player_rank_history (
                player_id, old_rank_code, new_rank_code, change_timestamp,
                change_reason, change_type, changed_by, tournament_session_id
            ) values (
                player_rec.player_id, l_current_rank, l_new_rank, l_change_timestamp,
                l_reason, 'AUTOMATIC', 'SYSTEM_SEEDING', p_tournament_session_id
            );
            
            -- Update player's current rank
            update wmg_players 
            set rank_code = l_new_rank
            where id = player_rec.player_id;
            
            l_players_processed := l_players_processed + 1;
            
            log('Auto-promoted player ' || player_rec.player_name || ' from ' || l_current_rank || 
                ' to ' || l_new_rank || ' (Top ' || player_rec.best_finish || ' finish)', l_scope);
        end if;
    end loop;
    
    commit;
    
    log('.. Players processed: ' || l_players_processed, l_scope);
    
    log('END', l_scope);
    
exception
    when others then
        rollback;
        logger.log_error(p_text => 'Error in apply_automatic_promotions for session_id=' 
                      || p_tournament_session_id
                    , p_scope => l_scope);
        raise;
end apply_automatic_promotions;



--------------------------------------------------------------------------------
-- Seed Positions after the end of a Season
-- Establishes initial historical data for all participating players
--------------------------------------------------------------------------------
procedure seed_season_baseline(
    p_tournament_session_id in wmg_tournament_sessions.id%type
)
is
    l_scope constant varchar2(128) := gc_scope_prefix || 'seed_season_baseline';
    l_players_processed number := 0;
    l_session_week wmg_tournament_sessions.week%type;
    l_session_date wmg_tournament_sessions.session_date%type;
    l_change_timestamp timestamp with local time zone;
    l_new_rank varchar2(10);
    l_current_rank varchar2(10);
    l_reason varchar2(500);
begin
    
    log('BEGIN seed_season_baseline', l_scope);

    g_historical_override := true; -- turn off the trigger

    -- Get session information
    -- select week, nvl(completed_on, session_date)
    select week
         , case
            when session_date < to_date('01/09/2023', 'DD/MM/YYYY') then  -- before these dates the completed_on did not reflect when the tournament close
              cast(session_date + 1 as timestamp with local time zone) 
            else
              completed_on
            end
    into l_session_week, l_session_date
    from wmg_tournament_sessions
    where id = p_tournament_session_id;
    
    -- Use session date as change timestamp, or current time if null
    l_change_timestamp := coalesce(l_session_date, current_timestamp);
    
    log('.. Seeding Season baseline ranks for session ' || p_tournament_session_id
      || ', week: ' || l_session_week
      || ', change_timestamp: ' || l_change_timestamp
        , l_scope);
    
    -- Create baseline historical records for Season 16 final standings
    -- This establishes the first historical rank for all participating players
    for player_rec in (
        select tp.player_id
             , p.name as player_name
             , p.rank_code as current_rank
             , sum(nvl(tp.points, 0)) as total_points
             , rank() over (order by sum(nvl(tp.points, 0)) desc) as final_position
        from wmg_tournament_players tp
          join wmg_players p on tp.player_id = p.id
          join wmg_tournament_sessions ts on tp.tournament_session_id = ts.id
        where ts.tournament_id = (
            select tournament_id 
            from wmg_tournament_sessions 
            where id = p_tournament_session_id
        )
          and tp.active_ind = 'Y'
          and tp.discarded_points_flag is null
          and p.rank_code != 'NEW'  -- Only process players with active ranks
        group by tp.player_id, p.name, p.rank_code
        having sum(nvl(tp.points, 0)) > 0  -- Only players who earned points
        order by total_points desc
    )
    loop
    
        l_current_rank := player_rec.current_rank;
        l_players_processed := l_players_processed + 1;
        
        -- Determine Season final rank based on total points and position
        -- Use more conservative Season thresholds
        if player_rec.total_points >= 90 or player_rec.final_position <= 10 then
            l_new_rank := 'ELITE';
        elsif player_rec.total_points >= 64 or player_rec.final_position <= 25 then
            l_new_rank := 'PRO';
        elsif player_rec.total_points >= 44 or player_rec.final_position <= 50 then
            l_new_rank := 'SEMI';
        else
            l_new_rank := 'AMA';
        end if;
        
        -- Determine the player is changing rank or maintaining
        if l_current_rank = l_new_rank then
            log('.. Player ' || player_rec.player_name || ' is already ' || l_new_rank, l_scope);
        else

            l_reason := 'End-of-season rank assignment based on ' || 
                    player_rec.total_points || ' total points (Position: ' || 
                    player_rec.final_position || ')';
            
            -- Insert historical rank record (this is the baseline, so old_rank_code can be null)
            insert into wmg_player_rank_history (
                player_id, old_rank_code, new_rank_code, change_timestamp,
                change_reason, change_type, changed_by, tournament_session_id
            ) values (
                player_rec.player_id, null, l_new_rank, l_change_timestamp,
                l_reason, 'INITIAL', 'SYSTEM_SEEDING', p_tournament_session_id
            );
            
            -- Update player's current rank
            update wmg_players 
            set rank_code = l_new_rank
            where id = player_rec.player_id;

            log('.. Set Season baseline for player ' || player_rec.player_name || 
                ' to ' || l_new_rank || ' (' || player_rec.total_points || ' points, pos ' || 
                player_rec.final_position || ')', l_scope);

        end if;

    end loop;
    
    log('.. Players processed: ' || l_players_processed, l_scope);
    
    log('END', l_scope);
    
exception
    when others then
        rollback;
        logger.log_error(p_text => apex_string.format('Error in seed_season_baseline for session_id=%s: %s', 
                        p_tournament_session_id, sqlerrm)
                    , p_scope => l_scope);
        raise;
end seed_season_baseline;




--------------------------------------------------------------------------------
-- Apply comprehensive season checkpoint seeding
-- Combines point-based rankings with automatic promotion rules
--------------------------------------------------------------------------------
procedure apply_comprehensive_checkpoint_seeding(
    p_tournament_session_id in wmg_tournament_sessions.id%type
  , p_checkpoint_type in varchar2
  , p_include_auto_promotions in varchar2 default 'Y'
)
is
    l_scope constant varchar2(128) := gc_scope_prefix || 'apply_comprehensive_checkpoint_seeding';
    l_total_processed number := 0;
    l_point_based_changes number := 0;
    l_auto_promotions number := 0;
    l_session_week wmg_tournament_sessions.week%type;
begin
   log('BEGIN apply_comprehensive_checkpoint_seeding', l_scope);

    g_historical_override := true; -- turn off the trigger

    -- Get session information
    select week
    into l_session_week
    from wmg_tournament_sessions
    where id = p_tournament_session_id;
    
    log('Starting comprehensive checkpoint seeding for session ' || p_tournament_session_id
       || ', checkpoint: ' || p_checkpoint_type
       || ', week: ' || l_session_week, l_scope);
    
    -- Step 1: Apply point-based rank changes
    case p_checkpoint_type
        when 'END_SEASON' then
            calculate_session_end_ranks(p_tournament_session_id);
        when 'WEEK_6' then
            apply_midseason_promotions_relegations(p_tournament_session_id);
        when 'WEEK_12' then
            apply_midseason_promotions_relegations(p_tournament_session_id);
        when 'SEASON_BASELINE' then
            seed_season_baseline(p_tournament_session_id);
        else
            raise_application_error(-20002, 'Invalid checkpoint type for comprehensive seeding: ' || p_checkpoint_type);
    end case;
    
    -- Step 2: Apply automatic promotions if requested and not baseline seeding
    if p_include_auto_promotions = 'Y' and p_checkpoint_type != 'SEASON_16_BASELINE' then
        apply_automatic_promotions(p_tournament_session_id);
    end if;
    
    l_total_processed := l_point_based_changes + l_auto_promotions;
    
    log('.. Point-based changes: ' || l_point_based_changes || 
        ', Auto promotions: ' || l_auto_promotions || ', Total: ' || l_total_processed, l_scope);
    
    log('END', l_scope);
    
exception
    when others then
        logger.log_error(p_text => apex_string.format('Error in apply_comprehensive_checkpoint_seeding for session_id=%s, checkpoint=%s: %s', 
                        p_tournament_session_id, p_checkpoint_type, sqlerrm)
                    , p_scope => l_scope);
        raise;
end apply_comprehensive_checkpoint_seeding;

end wmg_rank_history;
/