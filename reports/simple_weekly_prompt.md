# Simple Weekly Tournament Analysis Prompt

**Prompt to use with AI:**

```
Connect to wmgt database and analyze Week [WEEK_CODE] tournament results. 

Create a comprehensive report including:
1. Top 3 podium finishers
2. Overall week statistics (players, countries, scores)
3. Player of the Week (someone outside top 3 who overperformed)
4. Interesting insights about rank performance, country representation, and course difficulty
5. Notable achievements and storylines

Focus on finding hidden gems, underdog stories, and interesting patterns beyond just the leaderboard. Make it engaging with emojis and highlight exceptional performances relative to player rankings.

Use data from wmg_tournament_session_points_v where week = '[WEEK_CODE]'.
```

**Usage:** Just replace [WEEK_CODE] with the actual week (e.g., S18W02) and paste into chat.