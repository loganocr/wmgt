begin

    for s in (
        select *
        from wmg_tournament_sessions
        -- where id = 777
        where id not in (753, 765, 777)
          and round_num = 12 or week = 'S12W06'
        order by session_date
    )
    loop
      logger.log('==============================');
      wmg_rank_history.seed_season_baseline(p_tournament_session_id => s.id);
    end loop;
end;
/


