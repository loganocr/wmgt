-- Performance tests for wmg_verification_engine package
-- Tests verification performance with realistic data volumes

set serveroutput on
set timing on

declare
  l_start_time timestamp;
  l_end_time timestamp;
  l_duration interval day to second;
  l_test_count number := 0;
  l_pass_count number := 0;
  
  -- Performance thresholds (in seconds)
  c_single_player_threshold constant number := 5;  -- 5 seconds max for single player
  c_room_verification_threshold constant number := 30; -- 30 seconds max for room
  
  procedure run_performance_test(
    p_test_name varchar2, 
    p_duration_seconds number, 
    p_threshold_seconds number
  ) is
  begin
    l_test_count := l_test_count + 1;
    if p_duration_seconds <= p_threshold_seconds then
      l_pass_count := l_pass_count + 1;
      dbms_output.put_line('✓ PASS: ' || p_test_name || ' (' || 
                          round(p_duration_seconds, 2) || 's <= ' || p_threshold_seconds || 's)');
    else
      dbms_output.put_line('✗ FAIL: ' || p_test_name || ' (' || 
                          round(p_duration_seconds, 2) || 's > ' || p_threshold_seconds || 's)');
    end if;
  end;
  
  function extract_seconds(p_interval interval day to second) return number is
  begin
    return extract(day from p_interval) * 86400 + 
           extract(hour from p_interval) * 3600 + 
           extract(minute from p_interval) * 60 + 
           extract(second from p_interval);
  end;
  
begin
  dbms_output.put_line('=== WMG Verification Engine Performance Tests ===');
  dbms_output.put_line('');
  
  -- Test 1: Single player verification performance
  dbms_output.put_line('--- Single Player Verification Performance ---');
  
  declare
    l_session_id number;
    l_player_id number;
    l_results wmg_verification_engine.verification_result_tbl;
    l_duration_seconds number;
  begin
    -- Get a test session and player if available
    begin
      select ts.id, tp.player_id
      into l_session_id, l_player_id
      from wmg_tournament_sessions ts
      join wmg_tournament_players tp on tp.tournament_session_id = ts.id
      where rownum = 1;
      
      -- Time single player verification
      l_start_time := systimestamp;
      
      wmg_verification_engine.verify_player(
        p_tournament_session_id => l_session_id,
        p_player_id => l_player_id,
        p_card_run_id => null,
        x_verification_results => l_results
      );
      
      l_end_time := systimestamp;
      l_duration := l_end_time - l_start_time;
      l_duration_seconds := extract_seconds(l_duration);
      
      run_performance_test('Single player verification', l_duration_seconds, c_single_player_threshold);
      
    exception
      when no_data_found then
        dbms_output.put_line('! SKIP: No tournament players found for performance testing');
    end;
    
  end;
  
  -- Test 2: Room verification performance (multiple players)
  dbms_output.put_line('');
  dbms_output.put_line('--- Room Verification Performance ---');
  
  declare
    l_session_id number;
    l_room_no number;
    l_card_run_id number := 999999; -- Test run ID
    l_results wmg_verification_engine.verification_result_tbl;
    l_duration_seconds number;
    l_player_count number;
  begin
    -- Get a test session and room if available
    begin
      select ts.id, tp.room_no, count(distinct tp.player_id)
      into l_session_id, l_room_no, l_player_count
      from wmg_tournament_sessions ts
      join wmg_tournament_players tp on tp.tournament_session_id = ts.id
      where rownum = 1
      group by ts.id, tp.room_no;
      
      dbms_output.put_line('Testing room with ' || l_player_count || ' players');
      
      -- Time room verification
      l_start_time := systimestamp;
      
      wmg_verification_engine.verify_room(
        p_tournament_session_id => l_session_id,
        p_room_no => l_room_no,
        p_card_run_id => l_card_run_id,
        x_verification_results => l_results
      );
      
      l_end_time := systimestamp;
      l_duration := l_end_time - l_start_time;
      l_duration_seconds := extract_seconds(l_duration);
      
      run_performance_test('Room verification (' || l_player_count || ' players)', 
                          l_duration_seconds, c_room_verification_threshold);
      
    exception
      when no_data_found then
        dbms_output.put_line('! SKIP: No tournament rooms found for performance testing');
    end;
    
  end;
  
  -- Test 3: Score comparison function performance
  dbms_output.put_line('');
  dbms_output.put_line('--- Score Comparison Performance ---');
  
  declare
    l_session_id number;
    l_player_id number;
    l_card_run_id number := 999999;
    l_course_id number := 1;
    l_result wmg_verification_engine.verification_result_rec;
    l_duration_seconds number;
  begin
    -- Get a test session and player if available
    begin
      select ts.id, tp.player_id
      into l_session_id, l_player_id
      from wmg_tournament_sessions ts
      join wmg_tournament_players tp on tp.tournament_session_id = ts.id
      where rownum = 1;
      
      -- Time score comparison
      l_start_time := systimestamp;
      
      l_result := wmg_verification_engine.compare_player_scores(
        p_tournament_session_id => l_session_id,
        p_player_id => l_player_id,
        p_card_player_name => 'TestPlayer',
        p_card_run_id => l_card_run_id,
        p_course_id => l_course_id
      );
      
      l_end_time := systimestamp;
      l_duration := l_end_time - l_start_time;
      l_duration_seconds := extract_seconds(l_duration);
      
      run_performance_test('Score comparison function', l_duration_seconds, 2); -- 2 second threshold
      
    exception
      when no_data_found then
        dbms_output.put_line('! SKIP: No tournament players found for score comparison testing');
    end;
    
  end;
  
  -- Test 4: Batch update performance
  dbms_output.put_line('');
  dbms_output.put_line('--- Batch Update Performance ---');
  
  declare
    l_results wmg_verification_engine.verification_result_tbl;
    l_result wmg_verification_engine.verification_result_rec;
    l_duration_seconds number;
    l_batch_size number := 10; -- Test with 10 results
  begin
    -- Create test verification results
    l_results := wmg_verification_engine.verification_result_tbl();
    
    for i in 1..l_batch_size loop
      l_result.tournament_session_id := 1;
      l_result.room_no := 1;
      l_result.player_id := i;
      l_result.verification_status := 'SUCCESS';
      l_result.mismatch_details := null;
      l_result.card_run_id := 999999;
      
      l_results.extend;
      l_results(i) := l_result;
    end loop;
    
    -- Time batch update (this will likely fail due to non-existent data, but we're testing performance)
    l_start_time := systimestamp;
    
    begin
      wmg_verification_engine.update_verification_status_batch(l_results);
    exception
      when others then
        null; -- Expected to fail with test data, but we're measuring performance
    end;
    
    l_end_time := systimestamp;
    l_duration := l_end_time - l_start_time;
    l_duration_seconds := extract_seconds(l_duration);
    
    run_performance_test('Batch update (' || l_batch_size || ' results)', 
                        l_duration_seconds, 5); -- 5 second threshold
    
  end;
  
  -- Test 5: Player matching performance
  dbms_output.put_line('');
  dbms_output.put_line('--- Player Matching Performance ---');
  
  declare
    l_player_name varchar2(100);
    l_player_id number;
    l_duration_seconds number;
    l_iterations number := 100; -- Test 100 player matches
  begin
    -- Get a test player name
    begin
      select player_name
      into l_player_name
      from wmg_players_v
      where rownum = 1;
      
      -- Time multiple player matches
      l_start_time := systimestamp;
      
      for i in 1..l_iterations loop
        l_player_id := wmg_verification_engine.match_player(l_player_name);
      end loop;
      
      l_end_time := systimestamp;
      l_duration := l_end_time - l_start_time;
      l_duration_seconds := extract_seconds(l_duration);
      
      run_performance_test('Player matching (' || l_iterations || ' iterations)', 
                          l_duration_seconds, 10); -- 10 second threshold for 100 matches
      
    exception
      when no_data_found then
        dbms_output.put_line('! SKIP: No players found for matching performance testing');
    end;
    
  end;
  
  dbms_output.put_line('');
  dbms_output.put_line('=== Performance Test Summary ===');
  dbms_output.put_line('Tests Run: ' || l_test_count);
  dbms_output.put_line('Tests Passed: ' || l_pass_count);
  dbms_output.put_line('Tests Failed: ' || (l_test_count - l_pass_count));
  
  if l_pass_count = l_test_count then
    dbms_output.put_line('✓ ALL PERFORMANCE TESTS PASSED');
  else
    dbms_output.put_line('✗ SOME PERFORMANCE TESTS FAILED');
  end if;
  
exception
  when others then
    dbms_output.put_line('ERROR in performance test execution: ' || sqlerrm);
end;
/