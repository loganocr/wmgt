# KWT Tournament Recap Template - New Tokens Required

## Overview
This document lists all the new substitution tokens that need to be implemented in the `wmg_notification.tournament_recap_template` procedure to support the KWT tournament format.

## Existing Tokens (Already Available)
These tokens are already implemented in the current WMGT template:
- `#SEASON#` - Tournament season (e.g., "S18", "KWT11")
- `#WEEK_NUM#` - Week number
- `#FIRST_PLACE#` - First place finisher(s)
- `#SECOND_PLACE#` - Second place finisher(s) 
- `#THIRD_PLACE#` - Third place finisher(s)
- `#DIAMOND_PLAYERS#` - Players with most aces
- `#COCONUT_PLAYERS#` - Players with par or under for all 36 holes
- `#EASY_CODE#` - Easy course code
- `#HARD_CODE#` - Hard course code
- `#EASY_TOP_PLAYERS#` - Top performers on easy course
- `#HARD_TOP_PLAYERS#` - Top performers on hard course

## New Tokens Required for KWT

### Basic Tournament Info
- `#LOCATION_NAME#` - Tournament location name (e.g., "VENICE")
- `#TOTAL_PLAYERS#` - Total number of players in tournament

### Badge Counts
- `#COCONUT_COUNT#` - Number of coconut badges awarded
- `#DIAMOND_COUNT#` - Number of diamond badges awarded  
- `#CACTUS_COUNT#` - Number of cactus badges awarded
- `#DUCK_COUNT#` - Number of duck badges awarded
- `#LADYBUG_COUNT#` - Number of ladybug badges awarded

### Division-Specific Top 3 Results
- `#AMA_TOP_3#` - Amateur division top 3 (format: "1ST @player1 2ND @player2 3RD @player3")
- `#SEMI_TOP_3#` - Semi-Pro division top 3
- `#PRO_TOP_3#` - Pro division top 3  
- `#ELITE_TOP_3#` - Elite division top 3
- `#OVERALL_TOP_3#` - Overall tournament top 3

### Division-Specific Course Performance
- `#AMA_TOP_EASY_SCORE#` - Best easy course score in Amateur division
- `#AMA_TOP_EASY_PLAYERS#` - Player(s) with best Amateur easy score
- `#AMA_TOP_HARD_SCORE#` - Best hard course score in Amateur division
- `#AMA_TOP_HARD_PLAYERS#` - Player(s) with best Amateur hard score

- `#SEMI_TOP_EASY_SCORE#` - Best easy course score in Semi-Pro division
- `#SEMI_TOP_EASY_PLAYERS#` - Player(s) with best Semi-Pro easy score
- `#SEMI_TOP_HARD_SCORE#` - Best hard course score in Semi-Pro division
- `#SEMI_TOP_HARD_PLAYERS#` - Player(s) with best Semi-Pro hard score

- `#PRO_TOP_EASY_SCORE#` - Best easy course score in Pro division
- `#PRO_TOP_EASY_PLAYERS#` - Player(s) with best Pro easy score
- `#PRO_TOP_HARD_SCORE#` - Best hard course score in Pro division
- `#PRO_TOP_HARD_PLAYERS#` - Player(s) with best Pro hard score

- `#ELITE_TOP_EASY_SCORE#` - Best easy course score in Elite division
- `#ELITE_TOP_EASY_PLAYERS#` - Player(s) with best Elite easy score
- `#ELITE_TOP_HARD_SCORE#` - Best hard course score in Elite division
- `#ELITE_TOP_HARD_PLAYERS#` - Player(s) with best Elite hard score

### Overall Course Performance
- `#OVERALL_TOP_EASY_SCORE#` - Best overall easy course score
- `#OVERALL_TOP_EASY_PLAYERS#` - Player(s) with best overall easy score
- `#OVERALL_TOP_HARD_SCORE#` - Best overall hard course score
- `#OVERALL_TOP_HARD_PLAYERS#` - Player(s) with best overall hard score

### Promotions
- `#AMA_PROMOTIONS#` - Amateur players promoted to Semi-Pro (format: "PROMOTION TO @KWT11 SEMI-PRO DIVISION @player1")
- `#SEMI_PROMOTIONS#` - Semi-Pro players promoted to Pro
- `#PRO_PROMOTIONS#` - Pro players promoted to Elite (if applicable)

### Badge Details
- `#DIAMOND_ACE_COUNT#` - Number of aces for diamond badge winners
- `#CACTUS_PLAYERS#` - Detailed cactus badge winners with multipliers (e.g., "@player1 @player2 X2")
- `#DUCK_PLAYERS#` - Detailed duck badge winners with multipliers (e.g., "@player1 X3 @player2 X2")

## Implementation Notes

### Conditional Compilation in PL/SQL Code
The conditional compilation should be implemented in the `wmg_notification.tournament_recap_template` procedure, not in the template file itself. The PL/SQL code should detect the tournament type and use the appropriate template:

```sql
$IF env.kwt $THEN
  -- Use KWT template and generate KWT-specific tokens
  apex_mail.prepare_template (
      p_static_id    => 'KWT_TOURNAMENT_RECAP'
    , p_placeholders => l_kwt_placeholders
    , p_subject      => l_subject
    , p_html         => l_html
    , p_text         => l_text
  );
$ELSE
  -- Use WMGT template and generate WMGT-specific tokens
  apex_mail.prepare_template (
      p_static_id    => 'TOURNAMENT_RECAP'
    , p_placeholders => l_wmgt_placeholders
    , p_subject      => l_subject
    , p_html         => l_html
    , p_text         => l_text
  );
$END
```

### Data Sources
The tokens will need to query from:
- `wmg_tournament_session_points_v` - For rankings and scores by division
- `wmg_rounds_v` - For ace counts and badge calculations
- `wmg_tournament_sessions_v` - For location/tournament info
- Badge calculation logic will need to be implemented based on KWT rules

### Format Consistency
- Player mentions should use `@username` format
- Scores should include the minus sign (e.g., "-16")
- Multiple players should be space-separated
- Multipliers should use "X2", "X3" format for repeated achievements

## Priority Implementation Order
1. Basic tournament info (`#LOCATION_NAME#`, `#TOTAL_PLAYERS#`)
2. Badge counts (all `#*_COUNT#` tokens)
3. Division top 3 results (all `#*_TOP_3#` tokens)
4. Division course performance (all score/player tokens)
5. Promotions (all `#*_PROMOTIONS#` tokens)
6. Detailed badge information (cactus/duck details)