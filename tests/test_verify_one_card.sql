set serveroutput on size UNLIMITED
declare
    p_tournament_session_id NUMBER := 2364; -- S17W12: CLE and CLH
    -- p_player_id             NUMBER := 4185; --	porkpiedoofus
    -- p_player_id             NUMBER := 3213; --	Kyda
    -- p_player_id             NUMBER := 7007; --	MasterDom
    p_player_id             NUMBER := 6950;
    p_room_no               NUMBER := 2; -- WMGT24

    l_result wmg_verification_engine.verification_result_rec;
    l_room   VARCHAR2(20);
begin

    wmg_verification_engine.verify_room(
        p_tournament_session_id => p_tournament_session_id,
        p_room_no               => p_room_no
    );

end;
/


set serveroutput on size UNLIMITED
declare
    p_tournament_session_id NUMBER := 2364; -- S17W12: CLE and CLH
    -- p_player_id             NUMBER := 4185; --	porkpiedoofus
    -- p_player_id             NUMBER := 3213; --	Kyda
    -- p_player_id             NUMBER := 7007; --	MasterDom
    p_player_id             NUMBER := 6950;
    p_room_no               NUMBER := 3; -- WMGT24

    l_result wmg_verification_engine.verification_result_rec;
    l_room   VARCHAR2(20);
begin

    wmg_verification_engine.verify_player(
        p_tournament_session_id => p_tournament_session_id,
        p_player_id             => p_player_id,
        p_room_no               => p_room_no,
        x_verification_result   => l_result
    );

    dbms_output.put_line('l_result.tournament_session_id:' || l_result.tournament_session_id);
    dbms_output.put_line('l_result.room_no:' || l_result.room_no);
    dbms_output.put_line('l_result.player_id:' || l_result.player_id);
    dbms_output.put_line('l_result.card_run_id:' || l_result.card_run_id);
    dbms_output.put_line('l_result.verification_status:' || l_result.verification_status);
    dbms_output.put_line('l_result.mismatch_details:' || l_result.mismatch_details);
end;
/
select id, time_stamp, text, scope, call_stack
from logger_logs_5_min
where scope = 'wmg_verification_engine.verify_player'
/
select id, time_stamp, text, scope, call_stack
from logger_logs
where scope = 'wmg_verification_engine.verify_player'
/
rollback;
commit;

select *
from wmg_card_runs
where id = 83
/
select *
from wmg_card_scores_v
where run_id = 83
/
update wmg_card_scores
set strokes = 4
where player = 'MasterDominator'
and hole_num = 11
and run_id = 83
/
select *
from wmg_players_v
where player_name like 'Master%'
/
  select player_id
       , course_id
       , h
       , score
    -- into l_score_rec.player_id
    --    , l_score_rec.course_id
    --    , l_score_rec.hole_num
    --    , l_score_rec.round_score
    from wmg_rounds_unpivot_mv u
       , wmg_tournament_sessions ts
   where ts.week = u.week
     and u.player_id = 4185
     and u.course_id = 563
     and ts.id = 2349;
