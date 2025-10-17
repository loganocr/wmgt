with rounds as (
select players_id, count(*) rounds
from wmg_rounds
where players_id>0
group by players_id
)
, aces as (
select player_id, count(*) aces
from wmg_rounds_unpivot_mv
where score = 1
group by player_id
)
, per_round as (
select p.id player_id, p.player_name, rounds, aces, round(aces/rounds,2) aces_per_round
from wmg_players_v p
  join rounds r on r.players_id = p.id
  join aces a on r.players_id = a.player_id 
)
select player_name, rounds, aces, aces_per_round
from per_round
where rounds >= 36
order by aces_per_round desc
/
