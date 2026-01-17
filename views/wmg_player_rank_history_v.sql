create or replace view wmg_player_rank_history_v
as
select p.player_name
     , pr.*
     , ts.week tournament_session_week
from wmg_player_rank_history pr
 join wmg_players_v p on pr.player_id = p.id
 left join wmg_tournament_sessions ts on ts.id = pr.tournament_session_id
/