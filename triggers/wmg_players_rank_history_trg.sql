--------------------------------------------------------
-- Automatic rank change tracking trigger
-- Monitors wmg_players.rank_code changes and creates history records
create or replace trigger wmg_players_rank_history_trg
    before update of rank_code on wmg_players
    for each row
    when (old.rank_code != new.rank_code)
declare
    l_change_type wmg_player_rank_history.change_type%type := 'AUTOMATIC';
    l_changed_by wmg_player_rank_history.changed_by%type;
    l_change_timestamp wmg_player_rank_history.change_timestamp%type := current_timestamp;
    l_error_msg varchar2(4000);
begin

    if wmg_rank_history.g_historical_override then
      logger.log('exiting wmg_players_rank_history_trg with g_historical_override=true', 'wmg_players_rank_history_trg');
      return;  -- we're doing an historical override so exit because it's all controlled
    end if;
      
    -- Determine who made the change
    l_changed_by := coalesce(
                        sys_context('APEX$SESSION','app_user')
                      , regexp_substr(sys_context('userenv','client_identifier'),'^[^:]*')
                      , sys_context('userenv','session_user')
                      , 'SYSTEM'
                    );
    
    -- Determine change type based on context
    -- If changing from NEW to an active rank, it's an initial assignment
    if :old.rank_code = 'NEW' and :new.rank_code != 'NEW' then
        l_change_type := 'INITIAL';
    end if;
    
    -- Insert history record
    insert into wmg_player_rank_history (
        player_id
      , old_rank_code
      , new_rank_code
      , change_timestamp
      , change_type
      , changed_by
      , change_reason
    ) values (
        :new.id        -- player_id
      , :old.rank_code
      , :new.rank_code
      , l_change_timestamp
      , l_change_type
      , l_changed_by
      , case 
            when l_change_type = 'INITIAL' then 'First active rank assignment'
            else 'Automatic rank change'
        end
    );
    
exception
    when others then
      logger.log_error('Unable to change player_id ' || :new.id || ' to the rank of "' || :new.rank_code || '"');
      raise;
end wmg_players_rank_history_trg;
/