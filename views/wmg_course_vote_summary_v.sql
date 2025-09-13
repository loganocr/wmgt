create or replace view wmg_course_vote_summary_v
as
select case 
when vote is null then 'Total' 
when vote = -1 then 'Down' 
when vote = 1 then 'Up'
when vote = 0 then 'Withhold'
else to_char(vote)
end as vote_type
, votes
from (
  select vote, count(*) votes
  from wmg_course_vote_back
  group by rollup(vote)
)
order by vote desc nulls last
/
