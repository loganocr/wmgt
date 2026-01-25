with registered_players as (
    select account
    from wmg_players
    where id in (
        select player_id
        from wmg_tournament_players
        where tournament_session_id in (
        select id
        from wmg_tournament_sessions
        where week like 'S19W03%'
      )
       and active_ind = 'Y'
    )
)
, votes as (
    select replace(user_name, '  (discord)') u
    from (
        select user_name, count(*)
        from logger_logs
        where scope = 'wmg_util.cast_player_vote'
        and time_stamp > trunc(sysdate, 'IW') -1 + 18/24 -- last_sunday
        group by user_name
    )
)
select u
from votes
minus
select account
from registered_players
order by 1
/
