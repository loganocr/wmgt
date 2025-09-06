set serveroutput on size UNLIMITED
declare
    p_tournament_session_id NUMBER := 2349; -- S17W12: CLE and CLH
    p_player_id             NUMBER := 4185; --	porkpiedoofus
    p_room_no               NUMBER := 23; -- WMGT23

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
select id, time_stamp, text, scope
from logger_logs_5_min
/
