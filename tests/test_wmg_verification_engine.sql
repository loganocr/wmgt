-- Unit tests for wmg_verification_engine package
-- Tests player matching logic and score validation functions

set serveroutput on

declare
  l_player_id number;
  l_player_name wmg_players_v.player_name%type;
  l_test_passed boolean;
  l_test_count number := 0;
  l_pass_count number := 0;
  
  -- Test data
  l_card_scores wmg_verification_engine.score_comparison_tbl;
  l_round_scores wmg_verification_engine.score_comparison_tbl;
  
  procedure run_test(p_test_name varchar2, p_condition boolean) is
  begin
    l_test_count := l_test_count + 1;
    if p_condition then
      l_pass_count := l_pass_count + 1;
      dbms_output.put_line('✓ PASS: ' || p_test_name);
    else
      dbms_output.put_line('✗ FAIL: ' || p_test_name);
    end if;
  end;
  
begin
  dbms_output.put_line('=== WMG Verification Engine Unit Tests ===');
  dbms_output.put_line('');
  
  -- Test 1: Player matching with valid player name
  dbms_output.put_line('--- Player Matching Tests ---');
  
  -- Test with a known player (assuming there's at least one player in wmg_players_v)
  begin
    select id into l_player_id 
    from wmg_players_v 
    where rownum = 1;
    
    -- Test exact match
    select player_name into l_player_name
    from wmg_players_v 
    where id = l_player_id;
    
    l_player_id := wmg_verification_engine.match_player(l_player_name);
    run_test('Player matching with exact name', l_player_id is not null);
    
  exception
    when no_data_found then
      dbms_output.put_line('! SKIP: No players found in database for testing');
  end;
  
  -- Test 2: Player matching with non-existent player
  l_player_id := wmg_verification_engine.match_player('NonExistentPlayer12345');
  run_test('Player matching with non-existent name returns null', l_player_id is null);
  
  -- Test 3: Player matching with null input
  l_player_id := wmg_verification_engine.match_player(null);
  run_test('Player matching with null input returns null', l_player_id is null);
  
  -- Test 4: Player matching with empty string
  l_player_id := wmg_verification_engine.match_player('');
  run_test('Player matching with empty string returns null', l_player_id is null);
  
  dbms_output.put_line('');
  dbms_output.put_line('--- Score Validation Tests ---');
  
  -- Test 5: Hole scores validation with matching scores
  l_card_scores := wmg_verification_engine.score_comparison_tbl();
  l_round_scores := wmg_verification_engine.score_comparison_tbl();
  
  -- Add matching test data
  for i in 1..3 loop
    l_card_scores.extend;
    l_round_scores.extend;
    
    l_card_scores(i).hole_num := i;
    l_card_scores(i).card_score := i + 3; -- Par + strokes
    
    l_round_scores(i).hole_num := i;
    l_round_scores(i).round_score := i + 3; -- Same score
  end loop;
  
  l_test_passed := wmg_verification_engine.validate_hole_scores(l_card_scores, l_round_scores);
  run_test('Hole scores validation with matching scores', l_test_passed = true);
  
  -- Test 6: Hole scores validation with mismatched scores
  l_round_scores(2).round_score := 99; -- Change one score
  l_test_passed := wmg_verification_engine.validate_hole_scores(l_card_scores, l_round_scores);
  run_test('Hole scores validation with mismatched scores', l_test_passed = false);
  
  -- Test 7: Hole scores validation with different counts
  l_round_scores.trim(1); -- Remove one element
  l_test_passed := wmg_verification_engine.validate_hole_scores(l_card_scores, l_round_scores);
  run_test('Hole scores validation with different counts', l_test_passed = false);
  
  -- Test 8: Course totals validation with matching totals
  l_test_passed := wmg_verification_engine.validate_course_totals(72, 72);
  run_test('Course totals validation with matching totals', l_test_passed = true);
  
  -- Test 9: Course totals validation with different totals
  l_test_passed := wmg_verification_engine.validate_course_totals(72, 73);
  run_test('Course totals validation with different totals', l_test_passed = false);
  
  -- Test 10: Course totals validation with null values
  l_test_passed := wmg_verification_engine.validate_course_totals(null, 72);
  run_test('Course totals validation with null card total', l_test_passed = false);
  
  l_test_passed := wmg_verification_engine.validate_course_totals(72, null);
  run_test('Course totals validation with null round total', l_test_passed = false);
  
  -- Test 11: Edge case - empty score collections
  l_card_scores := wmg_verification_engine.score_comparison_tbl();
  l_round_scores := wmg_verification_engine.score_comparison_tbl();
  l_test_passed := wmg_verification_engine.validate_hole_scores(l_card_scores, l_round_scores);
  run_test('Hole scores validation with empty collections', l_test_passed = false);
  
  -- Test 12: Course total calculation
  l_card_scores := wmg_verification_engine.score_comparison_tbl();
  for i in 1..3 loop
    l_card_scores.extend;
    l_card_scores(i).hole_num := i;
    l_card_scores(i).card_score := 4; -- Par 4 for each hole
  end loop;
  
  declare
    l_total number;
  begin
    l_total := wmg_verification_engine.calculate_course_total(l_card_scores);
    run_test('Course total calculation (3 holes x 4 strokes = 12)', l_total = 12);
  end;
  
  -- Test 13: Course total calculation with null scores
  l_card_scores(2).card_score := null;
  declare
    l_total number;
  begin
    l_total := wmg_verification_engine.calculate_course_total(l_card_scores);
    run_test('Course total calculation with null score (should be 8)', l_total = 8);
  end;
  
  -- Test 14: Course total calculation with empty collection
  l_card_scores := wmg_verification_engine.score_comparison_tbl();
  declare
    l_total number;
  begin
    l_total := wmg_verification_engine.calculate_course_total(l_card_scores);
    run_test('Course total calculation with empty collection returns null', l_total is null);
  end;
  
  dbms_output.put_line('');
  dbms_output.put_line('--- Verification Status Update Tests ---');
  
  -- Test 15: Update verification status - valid parameters
  declare
    l_session_id number;
    l_player_id number;
    l_verified_flag varchar2(1);
    l_verified_by varchar2(60);
    l_verified_on timestamp with local time zone;
    l_test_error boolean := false;
  begin
    -- Get a test session and player (if available)
    begin
      select ts.id, tp.player_id
      into l_session_id, l_player_id
      from wmg_tournament_sessions ts,
           wmg_tournament_players tp
      where ts.id = tp.tournament_session_id
        and rownum = 1;
      
      -- Test updating verification status
      wmg_verification_engine.update_verification_status(
        p_tournament_session_id => l_session_id,
        p_player_id => l_player_id,
        p_verified_flag => 'Y',
        p_verified_by => 'TEST_SYSTEM',
        p_verified_note => 'Unit test verification'
      );
      
      -- Verify the update worked
      select verified_score_flag, verified_by, verified_on
      into l_verified_flag, l_verified_by, l_verified_on
      from wmg_tournament_players
      where tournament_session_id = l_session_id
        and player_id = l_player_id;
      
      run_test('Update verification status - flag set correctly', l_verified_flag = 'Y');
      run_test('Update verification status - verified_by set correctly', l_verified_by = 'TEST_SYSTEM');
      run_test('Update verification status - verified_on set', l_verified_on is not null);
      
    exception
      when no_data_found then
        dbms_output.put_line('! SKIP: No tournament players found for verification update testing');
      when others then
        l_test_error := true;
        dbms_output.put_line('! ERROR in verification update test: ' || sqlerrm);
    end;
    
    run_test('Update verification status - no errors', not l_test_error);
    
  end;
  
  -- Test 16: Update verification status - invalid parameters
  declare
    l_error_caught boolean := false;
  begin
    -- Test with null session ID
    begin
      wmg_verification_engine.update_verification_status(
        p_tournament_session_id => null,
        p_player_id => 1,
        p_verified_flag => 'Y'
      );
    exception
      when others then
        l_error_caught := true;
    end;
    
    run_test('Update verification status - null session ID raises error', l_error_caught);
    
    -- Test with null player ID
    l_error_caught := false;
    begin
      wmg_verification_engine.update_verification_status(
        p_tournament_session_id => 1,
        p_player_id => null,
        p_verified_flag => 'Y'
      );
    exception
      when others then
        l_error_caught := true;
    end;
    
    run_test('Update verification status - null player ID raises error', l_error_caught);
    
    -- Test with invalid verified flag
    l_error_caught := false;
    begin
      wmg_verification_engine.update_verification_status(
        p_tournament_session_id => 1,
        p_player_id => 1,
        p_verified_flag => 'X'
      );
    exception
      when others then
        l_error_caught := true;
    end;
    
    run_test('Update verification status - invalid flag raises error', l_error_caught);
    
  end;
  
  -- Test 17: Batch verification status update
  declare
    l_results wmg_verification_engine.verification_result_tbl;
    l_result wmg_verification_engine.verification_result_rec;
    l_session_id number;
    l_player_id number;
    l_test_error boolean := false;
  begin
    -- Get test data if available
    begin
      select ts.id, tp.player_id
      into l_session_id, l_player_id
      from wmg_tournament_sessions ts,
           wmg_tournament_players tp
      where ts.id = tp.tournament_session_id
        and rownum = 1;
      
      -- Create test verification results
      l_results := wmg_verification_engine.verification_result_tbl();
      
      -- Add a successful verification result
      l_result.tournament_session_id := l_session_id;
      l_result.player_id := l_player_id;
      l_result.verification_status := 'SUCCESS';
      l_result.mismatch_details := null;
      l_results.extend;
      l_results(1) := l_result;
      
      -- Add a failed verification result (if we have another player)
      begin
        select tp2.player_id
        into l_player_id
        from wmg_tournament_players tp2
        where tp2.tournament_session_id = l_session_id
          and tp2.player_id != l_player_id
          and rownum = 1;
        
        l_result.player_id := l_player_id;
        l_result.verification_status := 'FAILED';
        l_result.mismatch_details := 'Test mismatch';
        l_results.extend;
        l_results(2) := l_result;
        
      exception
        when no_data_found then
          null; -- Only one player available for testing
      end;
      
      -- Test batch update
      wmg_verification_engine.update_verification_status_batch(l_results);
      
      run_test('Batch verification update - no errors', true);
      
    exception
      when no_data_found then
        dbms_output.put_line('! SKIP: No tournament players found for batch update testing');
      when others then
        l_test_error := true;
        dbms_output.put_line('! ERROR in batch update test: ' || sqlerrm);
    end;
    
    run_test('Batch verification update - completed without errors', not l_test_error);
    
  end;
  
  -- Test 18: Batch update with empty collection
  declare
    l_results wmg_verification_engine.verification_result_tbl;
    l_test_error boolean := false;
  begin
    l_results := wmg_verification_engine.verification_result_tbl();
    
    wmg_verification_engine.update_verification_status_batch(l_results);
    
    run_test('Batch verification update - empty collection handled', true);
    
  exception
    when others then
      l_test_error := true;
      dbms_output.put_line('! ERROR in empty batch test: ' || sqlerrm);
  end;
  
  -- Test 19: Batch update with null collection
  declare
    l_test_error boolean := false;
  begin
    wmg_verification_engine.update_verification_status_batch(null);
    
    run_test('Batch verification update - null collection handled', true);
    
  exception
    when others then
      l_test_error := true;
      dbms_output.put_line('! ERROR in null batch test: ' || sqlerrm);
  end;

  dbms_output.put_line('');
  dbms_output.put_line('--- Room-Level Verification Workflow Tests ---');
  
  -- Test 20: Complete room verification workflow
  declare
    l_session_id number;
    l_room_no number := 1;
    l_card_run_id number := 999999; -- Test run ID
    l_results wmg_verification_engine.verification_result_tbl;
    l_test_error boolean := false;
  begin
    -- Get a test session if available
    begin
      select id
      into l_session_id
      from wmg_tournament_sessions
      where rownum = 1;
      
      -- Test room verification with non-existent card run (should handle gracefully)
      wmg_verification_engine.verify_room(
        p_tournament_session_id => l_session_id,
        p_room_no => l_room_no,
        p_card_run_id => l_card_run_id,
        x_verification_results => l_results
      );
      
      -- Should return empty results for non-existent card run
      run_test('Room verification with non-existent card run returns empty results', 
               l_results is not null and l_results.count = 0);
      
    exception
      when no_data_found then
        dbms_output.put_line('! SKIP: No tournament sessions found for room verification testing');
      when others then
        l_test_error := true;
        dbms_output.put_line('! ERROR in room verification test: ' || sqlerrm);
    end;
    
    run_test('Room verification workflow - no errors', not l_test_error);
    
  end;
  
  -- Test 21: Single player verification
  declare
    l_session_id number;
    l_player_id number;
    l_results wmg_verification_engine.verification_result_tbl;
    l_test_error boolean := false;
  begin
    -- Get a test session and player if available
    begin
      select ts.id, tp.player_id
      into l_session_id, l_player_id
      from wmg_tournament_sessions ts
      join wmg_tournament_players tp on tp.tournament_session_id = ts.id
      where rownum = 1;
      
      -- Test single player verification (should handle no matching card runs gracefully)
      wmg_verification_engine.verify_player(
        p_tournament_session_id => l_session_id,
        p_player_id => l_player_id,
        p_card_run_id => null, -- Let it search for card runs
        x_verification_results => l_results
      );
      
      -- Should return exactly one result
      run_test('Single player verification returns one result', 
               l_results is not null and l_results.count = 1);
      
      if l_results.count > 0 then
        run_test('Single player verification result has correct player ID', 
                 l_results(1).player_id = l_player_id);
      end if;
      
    exception
      when no_data_found then
        dbms_output.put_line('! SKIP: No tournament players found for single player verification testing');
      when others then
        l_test_error := true;
        dbms_output.put_line('! ERROR in single player verification test: ' || sqlerrm);
    end;
    
    run_test('Single player verification workflow - no errors', not l_test_error);
    
  end;
  
  -- Test 22: Single player verification with invalid player ID
  declare
    l_session_id number;
    l_results wmg_verification_engine.verification_result_tbl;
    l_test_error boolean := false;
  begin
    -- Get a test session if available
    begin
      select id
      into l_session_id
      from wmg_tournament_sessions
      where rownum = 1;
      
      -- Test with non-existent player ID
      wmg_verification_engine.verify_player(
        p_tournament_session_id => l_session_id,
        p_player_id => 999999,
        p_card_run_id => null,
        x_verification_results => l_results
      );
      
      -- Should handle gracefully and return NO_MATCH result
      run_test('Single player verification with invalid player ID handled gracefully', 
               l_results is not null and l_results.count = 1);
      
      if l_results.count > 0 then
        run_test('Invalid player verification returns NO_MATCH status', 
                 l_results(1).verification_status = 'NO_MATCH');
      end if;
      
    exception
      when no_data_found then
        dbms_output.put_line('! SKIP: No tournament sessions found for invalid player testing');
      when others then
        l_test_error := true;
        dbms_output.put_line('! ERROR in invalid player test: ' || sqlerrm);
    end;
    
    run_test('Invalid player verification - no errors', not l_test_error);
    
  end;
  
  -- Test 23: Integration test - single player verification with results processing
  declare
    l_session_id number;
    l_player_id number;
    l_results wmg_verification_engine.verification_result_tbl;
    l_test_error boolean := false;
  begin
    -- Get a test session and player if available
    begin
      select ts.id, tp.player_id
      into l_session_id, l_player_id
      from wmg_tournament_sessions ts
      join wmg_tournament_players tp on tp.tournament_session_id = ts.id
      where rownum = 1;
      
      -- Run single player verification
      wmg_verification_engine.verify_player(
        p_tournament_session_id => l_session_id,
        p_player_id => l_player_id,
        p_card_run_id => null,
        x_verification_results => l_results
      );
      
      -- Process results with batch update (should handle single result)
      wmg_verification_engine.update_verification_status_batch(l_results);
      
      run_test('Single player verification with batch update completed', true);
      
    exception
      when no_data_found then
        dbms_output.put_line('! SKIP: No tournament players found for integration testing');
      when others then
        l_test_error := true;
        dbms_output.put_line('! ERROR in integration test: ' || sqlerrm);
    end;
    
    run_test('Single player integration test - no errors', not l_test_error);
    
  end;

  dbms_output.put_line('');
  dbms_output.put_line('=== Test Summary ===');
  dbms_output.put_line('Tests Run: ' || l_test_count);
  dbms_output.put_line('Tests Passed: ' || l_pass_count);
  dbms_output.put_line('Tests Failed: ' || (l_test_count - l_pass_count));
  
  if l_pass_count = l_test_count then
    dbms_output.put_line('✓ ALL TESTS PASSED');
  else
    dbms_output.put_line('✗ SOME TESTS FAILED');
  end if;
  
exception
  when others then
    dbms_output.put_line('ERROR in test execution: ' || sqlerrm);
end;
/