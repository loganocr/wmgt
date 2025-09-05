create or replace package body wmg_verification_engine
is

--------------------------------------------------------------------------------
-- CONSTANTS
/**
 * @constant gc_scope_prefix Standard logger package name
 */
gc_scope_prefix constant VARCHAR2(31) := lower($$PLSQL_UNIT) || '.';
subtype scope_t is varchar2(128);

c_total_holes constant number := 18;

/**
 * Log procedure - uses logger if available, otherwise apex_debug
 *
 * @param p_msg Message to log
 * @param p_ctx Context/scope for the log entry
 */
procedure log(
    p_msg  in varchar2,
    p_ctx  in varchar2 default null
)
is
begin
  $IF $$NOLOGGER $THEN
  dbms_output.put_line('[' || p_ctx || '] ' || p_msg);
  apex_debug.message('[%s] %s', p_ctx, p_msg);
  $ELSE
  logger.log(p_text => p_msg, p_scope => p_ctx);
  $END
end log;

/**
 * Match a card player name to a tournament database player
 * Uses wmg_leaderboard_util.get_player for consistent player matching
 *
 * @param p_card_player_name Player name from card structure
 * @return Player ID if match found, NULL if no match
 */
function match_player(
    p_card_player_name in varchar2
) return number
is
  l_scope scope_t := gc_scope_prefix || 'match_player';
  l_player_id number;
begin
  log('BEGIN - matching player: ' || p_card_player_name, l_scope);
  
  -- Use existing wmg_leaderboard_util.get_player for consistent matching
  l_player_id := wmg_leaderboard_util.get_player(p_card_player_name);
  
  if l_player_id is not null then
    log('Player matched: ' || p_card_player_name || ' -> ID: ' || l_player_id, l_scope);
  else
    log('No match found for player: ' || p_card_player_name, l_scope);
  end if;
  
  log('END', l_scope);
  return l_player_id;
  
exception
  when others then
    log('Error matching player ' || p_card_player_name || ': ' || sqlerrm, l_scope);
    return null;
end match_player;

/**
 * Validate hole-by-hole scores between card and round data
 *
 * @param p_card_scores Card scores collection
 * @param p_round_scores Round scores collection  
 * @return TRUE if all scores match exactly, FALSE otherwise
 */
function validate_hole_scores(
    p_card_scores    in score_comparison_tbl,
    p_round_scores   in score_comparison_tbl
) return boolean
is
  l_scope scope_t := gc_scope_prefix || 'validate_hole_scores';
  l_match_count number := 0;
  l_total_holes number := 0;
begin
  log('BEGIN - validating hole scores', l_scope);
  
  -- Count total holes to validate
  l_total_holes := c_total_holes;
  
  if l_total_holes = 0 then
    log('No card scores to validate', l_scope);
    return false;
  end if;
  
  if p_round_scores.count != l_total_holes then
    log('Score count mismatch - Card: ' || l_total_holes || ', Round: ' || p_round_scores.count, l_scope);
    return false;
  end if;
  
  -- Compare each hole score
  for i in 1..l_total_holes loop
    if p_card_scores(i).card_score = p_round_scores(i).round_score and
       p_card_scores(i).hole_num = p_round_scores(i).hole_num then
      l_match_count := l_match_count + 1;
      log('Hole ' || p_card_scores(i).hole_num || ' matches: ' || p_card_scores(i).card_score, l_scope);
    else
      log('Hole ' || p_card_scores(i).hole_num || ' mismatch - Card: ' || 
          p_card_scores(i).card_score || ', Round: ' || p_round_scores(i).round_score, l_scope);
    end if;
  end loop;
  
  log('Matched ' || l_match_count || ' of ' || l_total_holes || ' holes', l_scope);
  log('END', l_scope);
  
  return (l_match_count = l_total_holes);
  
exception
  when others then
    log('Error validating hole scores: ' || sqlerrm, l_scope);
    return false;
end validate_hole_scores;

/**
 * Validate course total scores
 *
 * @param p_card_total Total from card structure
 * @param p_round_total Total from round data
 * @return TRUE if totals match exactly, FALSE otherwise
 */
function validate_course_totals(
    p_card_total     in number,
    p_round_total    in number
) return boolean
is
  l_scope scope_t := gc_scope_prefix || 'validate_course_totals';
begin
  log('BEGIN - validating totals - Card: ' || p_card_total || ', Round: ' || p_round_total, l_scope);
  
  if p_card_total is null or p_round_total is null then
    log('One or both totals are null', l_scope);
    return false;
  end if;
  
  if p_card_total = p_round_total then
    log('Totals match', l_scope);
    return true;
  else
    log('Totals do not match', l_scope);
    return false;
  end if;
  
  log('END', l_scope);
  
exception
  when others then
    log('Error validating course totals: ' || sqlerrm, l_scope);
    return false;
end validate_course_totals;

/**
 * Get hole-by-hole scores from card structure for a specific player and run
 *
 * @param p_card_run_id Card run ID
 * @param p_card_player_name Player name from card structure
 * @return Collection of card scores by hole
 */
function get_card_scores(
    p_card_run_id        in number,
    p_card_player_name   in varchar2
) return score_comparison_tbl
is
  l_scope scope_t := gc_scope_prefix || 'get_card_scores';
  l_scores score_comparison_tbl := score_comparison_tbl();
  l_score_rec score_comparison_rec;
begin
  log('BEGIN - getting card scores for player: ' || p_card_player_name, l_scope);
  
  -- Note: This assumes card structure tables exist at the specified path
  -- In a real implementation, this would use database links or external connections
  -- For now, this is a placeholder that demonstrates the expected structure
  
  for rec in (
    select hole_num, strokes
    from wmg_card_scores
    where run_id = p_card_run_id
      and player = p_card_player_name
    order by hole_num
  ) loop
    l_scores.extend;
    l_score_rec.hole_num := rec.hole_num;
    l_score_rec.card_score := rec.strokes;
    l_scores(l_scores.count) := l_score_rec;
    
    log('Card score - Hole ' || rec.hole_num || ': ' || rec.strokes, l_scope);
  end loop;
  
  log('Retrieved ' || l_scores.count || ' card scores', l_scope);
  log('END', l_scope);
  
  return l_scores;
  
exception
  when others then
    log('Error getting card scores: ' || sqlerrm, l_scope);
    return score_comparison_tbl();
end get_card_scores;

/**
 * Get hole-by-hole scores from tournament rounds for a specific player
 *
 * @param p_tournament_session_id Tournament session ID
 * @param p_player_id Player ID
 * @param p_course_id Course ID
 * @return Collection of round scores by hole
 */
function get_round_scores(
    p_tournament_session_id in number,
    p_player_id            in number,
    p_course_id            in number
) return score_comparison_tbl
is
  l_scope scope_t := gc_scope_prefix || 'get_round_scores';
  l_scores score_comparison_tbl := score_comparison_tbl();
  l_score_rec score_comparison_rec;
begin
  log('BEGIN - getting round scores for player ID: ' || p_player_id, l_scope);
  
  -- Get hole-by-hole scores from wmg_rounds table
  select player_id
       , course_id
       , h
       , score
    into l_score_rec.player_id
       , l_score_rec.course_id
       , l_score_rec.hole_num
       , l_score_rec.round_score
    from wmg_rounds_unpivot_mv u
       , wmg_tournament_sessions ts
   where ts.week = u.week
     and u.player_id = p_player_id
     and u.course_id = p_course_id
     and ts.id = p_tournament_session_id;
    
    l_scores(l_scores.count) := l_score_rec;
  
  log('Retrieved ' || l_scores.count || ' round scores', l_scope);
  log('END', l_scope);
  
  return l_scores;
  
exception
  when no_data_found then
    log('No round data found for player ' || p_player_id, l_scope);
    return score_comparison_tbl();
  when others then
    log('Error getting round scores: ' || sqlerrm, l_scope);
    return score_comparison_tbl();
end get_round_scores;



/**
 * Calculate course total from hole scores
 *
 * @param p_scores Collection of hole scores
 * @return Total score for the course
 */
function calculate_course_total(
    p_scores in score_comparison_tbl
) return number
is
  l_scope scope_t := gc_scope_prefix || 'calculate_course_total';
  l_total number := 0;
begin
  log('BEGIN - calculating course total', l_scope);
  
  if p_scores is null or p_scores.count = 0 then
    log('No scores provided for total calculation', l_scope);
    return null;
  end if;
  
  for i in 1..p_scores.count loop
    if p_scores(i).card_score is not null then
      l_total := l_total + p_scores(i).card_score;
    elsif p_scores(i).round_score is not null then
      l_total := l_total + p_scores(i).round_score;
    end if;
  end loop;
  
  log('Calculated total: ' || l_total, l_scope);
  log('END', l_scope);
  
  return l_total;
  
exception
  when others then
    log('Error calculating course total: ' || sqlerrm, l_scope);
    return null;
end calculate_course_total;

/**
 * Compare scores between card structure and tournament rounds for a single player
 *
 * @param p_tournament_session_id Tournament session ID
 * @param p_player_id Player ID from tournament database
 * @param p_card_player_name Player name from card structure
 * @param p_card_run_id Card run ID
 * @param p_course_id Course ID
 * @return Verification result record
 */
function compare_player_scores(
    p_tournament_session_id in number,
    p_player_id            in number,
    p_card_player_name     in varchar2,
    p_card_run_id          in number,
    p_course_id            in number
) return verification_result_rec
is
  l_scope scope_t := gc_scope_prefix || 'compare_player_scores';
  l_result verification_result_rec;
  l_card_scores score_comparison_tbl;
  l_round_scores score_comparison_tbl;
  l_card_total number;
  l_round_total number;
  l_mismatch_details varchar2(4000) := '';
begin
  log('BEGIN - comparing scores for player: ' || p_card_player_name, l_scope);
  
  -- Initialize result
  l_result.tournament_session_id := p_tournament_session_id;
  l_result.player_id := p_player_id;
  l_result.card_run_id := p_card_run_id;
  l_result.verification_status := 'FAILED';
  
  -- Get scores from both sources
  l_card_scores := get_card_scores(p_card_run_id, p_card_player_name);
  l_round_scores := get_round_scores(p_tournament_session_id, p_player_id, p_course_id);
  
  -- Check if we have data from both sources
  if l_card_scores.count = 0 then
    l_result.verification_status := 'NO_MATCH';
    l_result.mismatch_details := 'No card scores found for player';
    log('No card scores found', l_scope);
    return l_result;
  end if;
  
  if l_round_scores.count = 0 then
    l_result.verification_status := 'NO_MATCH';
    l_result.mismatch_details := 'No round scores found for player';
    log('No round scores found', l_scope);
    return l_result;
  end if;
  
  -- Validate hole-by-hole scores
  if not validate_hole_scores(l_card_scores, l_round_scores) then
    l_result.verification_status := 'FAILED';
    l_mismatch_details := 'Hole score mismatches found';
    
    -- Build detailed mismatch information
    for i in 1..least(l_card_scores.count, l_round_scores.count) loop
      if l_card_scores(i).card_score != l_round_scores(i).round_score then
        l_mismatch_details := l_mismatch_details || 
          ' | Hole ' || l_card_scores(i).hole_num || 
          ': Card=' || l_card_scores(i).card_score || 
          ', Round=' || l_round_scores(i).round_score;
      end if;
    end loop;
    
    l_result.mismatch_details := l_mismatch_details;
    log('Hole score validation failed', l_scope);
    return l_result;
  end if;
  
  -- Validate course totals
  l_card_total := calculate_course_total(l_card_scores);
  l_round_total := calculate_course_total(l_round_scores);
  
  if not validate_course_totals(l_card_total, l_round_total) then
    l_result.verification_status := 'FAILED';
    l_result.mismatch_details := 'Course total mismatch: Card=' || l_card_total || ', Round=' || l_round_total;
    log('Course total validation failed', l_scope);
    return l_result;
  end if;
  
  -- All validations passed
  l_result.verification_status := 'SUCCESS';
  l_result.mismatch_details := null;
  log('All score validations passed', l_scope);
  
  log('END', l_scope);
  return l_result;
  
exception
  when others then
    log('Error comparing player scores: ' || sqlerrm, l_scope);
    l_result.verification_status := 'FAILED';
    l_result.mismatch_details := 'Error during comparison: ' || sqlerrm;
    return l_result;
end compare_player_scores;

/**
 * Main verification procedure for room-level processing
 * Compares scores between card structure and tournament rounds for all players in a room
 *
 * @param p_tournament_session_id Tournament session ID
 * @param p_room_no Room number to verify
 * @param p_card_run_id Card run ID for comparison
 * @param x_verification_results Output collection of verification results
 */
procedure verify_room(
    p_tournament_session_id in number,
    p_room_no              in number,
    p_card_run_id          in number,
    x_verification_results out verification_result_tbl
)
is
  l_scope scope_t := gc_scope_prefix || 'verify_room';
  l_result verification_result_rec;
  l_player_id number;
  l_course_id number;
begin
  log('BEGIN - verifying room ' || p_room_no || ' for session ' || p_tournament_session_id, l_scope);
  
  -- Initialize results collection
  x_verification_results := verification_result_tbl();
  
  -- Get all card players for this run
  for card_player in (
    select distinct player
    from wmg_card_players
    where run_id = p_card_run_id
  ) loop
    
    log('Processing card player: ' || card_player.player, l_scope);
    
    -- Try to match the card player to a tournament player
    l_player_id := match_player(card_player.player);
    
    if l_player_id is null then
      -- Player could not be matched - log and skip
      log('Could not match player: ' || card_player.player, l_scope);
      
      l_result.tournament_session_id := p_tournament_session_id;
      l_result.room_no := p_room_no;
      l_result.player_id := null;
      l_result.card_run_id := p_card_run_id;
      l_result.verification_status := 'NO_MATCH';
      l_result.mismatch_details := 'Player not found in tournament database: ' || card_player.player;
      
      x_verification_results.extend;
      x_verification_results(x_verification_results.count) := l_result;
      
    else
      -- Player matched - get course information and compare scores
      -- Note: This assumes we can determine course from card run data
      -- In practice, this would need to be enhanced based on actual card structure
      
      begin
        -- Get course ID from card run (placeholder logic)
        select 1 into l_course_id from dual; -- This would be actual course lookup
        
        -- Compare scores for both courses in the room (as per requirements)
        for course_rec in (
          select distinct course_id
          from wmg_rounds
          where tournament_session_id = p_tournament_session_id
            and players_id = l_player_id
        ) loop
          
          l_result := compare_player_scores(
            p_tournament_session_id => p_tournament_session_id,
            p_player_id => l_player_id,
            p_card_player_name => card_player.player,
            p_card_run_id => p_card_run_id,
            p_course_id => course_rec.course_id
          );
          
          l_result.room_no := p_room_no;
          
          x_verification_results.extend;
          x_verification_results(x_verification_results.count) := l_result;
          
        end loop;
        
      exception
        when others then
          log('Error processing matched player ' || card_player.player || ': ' || sqlerrm, l_scope);
          
          l_result.tournament_session_id := p_tournament_session_id;
          l_result.room_no := p_room_no;
          l_result.player_id := l_player_id;
          l_result.card_run_id := p_card_run_id;
          l_result.verification_status := 'FAILED';
          l_result.mismatch_details := 'Error processing player: ' || sqlerrm;
          
          x_verification_results.extend;
          x_verification_results(x_verification_results.count) := l_result;
      end;
      
    end if;
    
  end loop;
  
  log('Completed room verification - processed ' || x_verification_results.count || ' players', l_scope);
  log('END', l_scope);
  
exception
  when others then
    log('Error verifying room: ' || sqlerrm, l_scope);
    raise;
end verify_room;

/**
 * Update verification status for a single tournament player
 * Implements atomic transaction handling for verification status updates
 *
 * @param p_tournament_session_id Tournament session ID
 * @param p_player_id Player ID to update
 * @param p_verified_flag Verification flag ('Y' or 'N')
 * @param p_verified_by Who verified the scorecard (default 'SYSTEM')
 * @param p_verified_note Optional verification note
 */
procedure update_verification_status(
    p_tournament_session_id in number,
    p_player_id            in number,
    p_verified_flag        in varchar2 default 'Y',
    p_verified_by          in varchar2 default 'SYSTEM',
    p_verified_note        in varchar2 default null
)
is
  l_scope scope_t := gc_scope_prefix || 'update_verification_status';
  l_rows_updated number := 0;
begin
  log('BEGIN - updating verification status for player ' || p_player_id || 
      ' in session ' || p_tournament_session_id, l_scope);
  
  -- Validate input parameters
  if p_tournament_session_id is null then
    raise_application_error(-20001, 'Tournament session ID cannot be null');
  end if;
  
  if p_player_id is null then
    raise_application_error(-20002, 'Player ID cannot be null');
  end if;
  
  if p_verified_flag not in ('Y', 'N') then
    raise_application_error(-20003, 'Verified flag must be Y or N');
  end if;
  
  -- Update verification status with atomic transaction
  update wmg_tournament_players
  set verified_score_flag = p_verified_flag,
      verified_by = p_verified_by,
      verified_on = current_timestamp,
      verified_note = p_verified_note
  where tournament_session_id = p_tournament_session_id
    and player_id = p_player_id;
  
  l_rows_updated := sql%rowcount;
  
  if l_rows_updated = 0 then
    log('No tournament player record found for session ' || p_tournament_session_id || 
        ', player ' || p_player_id, l_scope);
    raise_application_error(-20004, 'Tournament player record not found');
  elsif l_rows_updated = 1 then
    log('Successfully updated verification status: flag=' || p_verified_flag || 
        ', by=' || p_verified_by, l_scope);
  else
    log('Warning: Updated ' || l_rows_updated || ' records (expected 1)', l_scope);
  end if;
  
  log('END', l_scope);
  
exception
  when others then
    log('Error updating verification status: ' || sqlerrm, l_scope);
    raise;
end update_verification_status;

/**
 * Update verification status for multiple tournament players in batch
 * Processes verification results and updates database accordingly
 *
 * @param p_verification_results Collection of verification results to process
 */
procedure update_verification_status_batch(
    p_verification_results in verification_result_tbl
)
is
  l_scope scope_t := gc_scope_prefix || 'update_verification_status_batch';
  l_success_count number := 0;
  l_failed_count number := 0;
  l_no_match_count number := 0;
  l_verified_flag varchar2(1);
  l_verified_note varchar2(200);
begin
  log('BEGIN - batch updating verification status for ' || 
      p_verification_results.count || ' results', l_scope);
  
  if p_verification_results is null or p_verification_results.count = 0 then
    log('No verification results to process', l_scope);
    return;
  end if;
  
  -- Process each verification result
  for i in 1..p_verification_results.count loop
    
    -- Skip results with no player match
    if p_verification_results(i).player_id is null then
      l_no_match_count := l_no_match_count + 1;
      log('Skipping result with no player match: ' || 
          p_verification_results(i).mismatch_details, l_scope);
      continue;
    end if;
    
    -- Determine verification flag and note based on result status
    case p_verification_results(i).verification_status
      when 'SUCCESS' then
        l_verified_flag := 'Y';
        l_verified_note := 'Automatically verified by system';
        l_success_count := l_success_count + 1;
        
      when 'FAILED' then
        l_verified_flag := 'N';
        l_verified_note := substr('Verification failed: ' || 
                                p_verification_results(i).mismatch_details, 1, 200);
        l_failed_count := l_failed_count + 1;
        
      when 'NO_MATCH' then
        -- Don't update verification status for no match cases
        l_no_match_count := l_no_match_count + 1;
        log('No match case - not updating verification status for player ' || 
            p_verification_results(i).player_id, l_scope);
        continue;
        
      else
        log('Unknown verification status: ' || 
            p_verification_results(i).verification_status, l_scope);
        continue;
    end case;
    
    -- Update verification status for this player
    begin
      update_verification_status(
        p_tournament_session_id => p_verification_results(i).tournament_session_id,
        p_player_id => p_verification_results(i).player_id,
        p_verified_flag => l_verified_flag,
        p_verified_by => 'SYSTEM',
        p_verified_note => l_verified_note
      );
      
      log('Updated verification for player ' || p_verification_results(i).player_id || 
          ': ' || l_verified_flag, l_scope);
      
    exception
      when others then
        log('Error updating verification for player ' || p_verification_results(i).player_id || 
            ': ' || sqlerrm, l_scope);
        -- Continue processing other results even if one fails
    end;
    
  end loop;
  
  log('Batch update completed - Success: ' || l_success_count || 
      ', Failed: ' || l_failed_count || ', No Match: ' || l_no_match_count, l_scope);
  log('END', l_scope);
  
exception
  when others then
    log('Error in batch verification update: ' || sqlerrm, l_scope);
    raise;
end update_verification_status_batch;

end wmg_verification_engine;
/