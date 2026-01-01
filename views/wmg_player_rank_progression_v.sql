create or replace view wmg_player_rank_progression_v
as
with rank_timeline as (
  -- Historical rank changes (excluding NEW status unless specifically needed)
  select h.player_id
       , h.old_rank_code
       , h.new_rank_code as rank_code
       , h.change_timestamp as start_date
       , h.change_reason
       , h.change_type
       , h.changed_by
       , h.tournament_session_id
       , lead(h.change_timestamp) over (partition by h.player_id order by h.change_timestamp) as end_date
       , row_number() over (partition by h.player_id order by h.change_timestamp) as rank_sequence
  from wmg_player_rank_history h
  where h.new_rank_code != 'NEW'  -- Exclude NEW status from progression display
  
  union all
  
  -- Current rank for players with no history (fallback scenario)
  select p.id as player_id
       , null as old_rank_code
       , p.rank_code
       , p.created_on as start_date
       , 'Initial rank assignment' as change_reason
       , 'INITIAL' as change_type
       , p.created_by as changed_by
       , null as tournament_session_id
       , null as end_date
       , 1 as rank_sequence
  from wmg_players p
  where p.rank_code != 'NEW'
    and not exists (
      select 1 
      from wmg_player_rank_history h 
      where h.player_id = p.id
    )
  
  union all
  
  -- NEW players who have never completed tournaments
  select p.id as player_id
       , null as old_rank_code
       , p.rank_code
       , p.created_on as start_date
       , 'Player registration' as change_reason
       , 'INITIAL' as change_type
       , p.created_by as changed_by
       , null as tournament_session_id
       , null as end_date
       , 1 as rank_sequence
  from wmg_players p
  where p.rank_code = 'NEW'
    and not exists (
      select 1 
      from wmg_rounds r 
      where r.players_id = p.id
    )
)
select rt.player_id
     , p.name as player_name
     , p.account as player_account
     , rt.rank_code
     , r.name as rank_name
     , r.display_seq as rank_display_seq
     , r.profile_class as rank_profile_class
     , rt.start_date
     , rt.end_date
     , case 
         when rt.end_date is null then 
           extract(day from (current_timestamp - rt.start_date))
         else 
           extract(day from (rt.end_date - rt.start_date))
       end as duration_days
     , rt.change_reason
     , rt.change_type
     , rt.changed_by
     , rt.tournament_session_id
     , ts.week as tournament_session_week
     , rt.rank_sequence
     , case when rt.end_date is null then 'Y' else 'N' end as is_current_rank
     -- Audit information
     , rt.start_date as change_timestamp
     , case 
         when rt.change_type = 'MANUAL' then 'Manual Change'
         when rt.change_type = 'AUTOMATIC' then 'Automatic Change'
         when rt.change_type = 'INITIAL' then 'Initial Assignment'
         when rt.change_type = 'SEASON_END' then 'Season End Promotion/Relegation'
         when rt.change_type = 'MIDSEASON' then 'Mid-Season Checkpoint'
         else rt.change_type
       end as change_type_display
from rank_timeline rt
  join wmg_players p on rt.player_id = p.id
  join wmg_ranks r on rt.rank_code = r.code
  left join wmg_tournament_sessions ts on rt.tournament_session_id = ts.id
order by rt.player_id, rt.rank_sequence
/

comment on table wmg_player_rank_progression_v is 'Complete rank progression timeline for all players, including NEW status for players who have never completed tournaments';
