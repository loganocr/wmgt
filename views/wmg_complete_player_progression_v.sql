PRO .. wmg_complete_player_progression_v

create or replace force view wmg_complete_player_progression_v
as
-- Active rank progression (from wmg_player_rank_progression_v)
select player_id
     , player_name
     , player_account
     , rank_code
     , rank_name
     , rank_display_seq
     , rank_profile_class
     , rank_list_class
     , start_date
     , end_date
     , duration_days
     , change_reason
     , change_type
     , changed_by
     , tournament_session_id
     , tournament_session_week
     , rank_sequence
     , is_current_rank
     , change_timestamp
     , change_type_display
     , 'ACTIVE_RANK' as progression_type
from wmg_player_rank_progression_v

union all

-- NEW players who haven't completed tournaments
select player_id
     , player_name
     , player_account
     , rank_code
     , rank_name
     , rank_display_seq
     , rank_profile_class
     , rank_list_class
     , registration_date as start_date
     , end_date
     , days_since_registration as duration_days
     , status_reason as change_reason
     , change_type
     , registered_by as changed_by
     , tournament_session_id
     , tournament_session_week
     , rank_sequence
     , is_current_rank
     , change_timestamp
     , change_type_display
     , 'NEW_PLAYER' as progression_type
from wmg_new_player_progression_v
order by player_id, rank_sequence
/
show errors

comment on table wmg_complete_player_progression_v is 'Complete player progression view including both active rank history and NEW player display logic';