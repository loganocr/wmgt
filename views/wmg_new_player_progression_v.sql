create or replace force view wmg_new_player_progression_v
as
select p.id as player_id
     , p.name as player_name
     , p.account as player_account
     , p.rank_code
     , r.name as rank_name
     , r.display_seq as rank_display_seq
     , r.profile_class as rank_profile_class
     , r.list_class as rank_list_class
     , p.created_on as registration_date
     , null as end_date
     , extract(day from (current_timestamp - p.created_on)) as days_since_registration
     , 'Player registered but has not completed first tournament' as status_reason
     , 'NEW' as change_type
     , p.created_by as registered_by
     , null as tournament_session_id
     , null as tournament_session_week
     , 1 as rank_sequence
     , 'Y' as is_current_rank
     -- Audit information
     , p.created_on as change_timestamp
     , 'New Player Registration' as change_type_display
     -- Tournament completion check
     , case 
         when exists (
           select 1 
           from wmg_rounds rd
             join wmg_tournament_players tp on rd.players_id = tp.player_id
           where tp.player_id = p.id
             and tp.total_score is not null
         ) then 'Y'
         else 'N'
       end as has_completed_tournament
from wmg_players p
  join wmg_ranks r on p.rank_code = r.code
where p.rank_code = 'NEW'
  -- Only show players who truly haven't completed tournaments
  and not exists (
    select 1 
    from wmg_rounds rd
      join wmg_tournament_players tp on rd.players_id = tp.player_id
    where tp.player_id = p.id
      and tp.total_score is not null
  )
order by p.created_on desc
/

comment on table wmg_new_player_progression_v is 'Display logic for NEW players who have not completed their first tournament';