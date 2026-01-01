--------------------------------------------------------
-- Automatic rank change tracking trigger
-- Monitors wmg_players.rank_code changes and creates history records
create or replace trigger wmg_players_rank_history_trg
    before update of rank_code on wmg_players
    for each row
    when (old.rank_code != new.rank_code)
declare
    l_change_type varchar2(20) := 'AUTOMATIC';
    l_changed_by varchar2(60);
    l_error_msg varchar2(4000);
begin
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
      , current_timestamp
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