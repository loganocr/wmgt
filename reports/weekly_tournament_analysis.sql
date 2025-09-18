-- Weekly Tournament Analysis Report
-- Usage: Replace 'S18W02' with desired week code
-- Author: Generated for WMG Tournament Analysis

DEFINE week_code = '&1'

-- Overall Week Statistics
SELECT 'WEEK_STATS' as report_section,
    '&week_code' as week,
    COUNT(*) as total_players,
    COUNT(DISTINCT country_code) as countries_represented,
    ROUND(AVG(total_score), 2) as avg_total_score,
    MIN(total_score) as best_total_score,
    MAX(total_score) as worst_total_score,
    ROUND(AVG(easy), 2) as avg_easy_score,
    ROUND(AVG(hard), 2) as avg_hard_score,
    COUNT(CASE WHEN rank_code = 'ELITE' THEN 1 END) as elite_players,
    COUNT(CASE WHEN rank_code = 'PRO' THEN 1 END) as pro_players,
    COUNT(CASE WHEN rank_code = 'SEMI' THEN 1 END) as semi_players,
    COUNT(CASE WHEN rank_code = 'AMA' THEN 1 END) as amateur_players,
    COUNT(CASE WHEN total_score <= -40 THEN 1 END) as players_under_40,
    COUNT(CASE WHEN easy < hard THEN 1 END) as better_on_easy,
    COUNT(CASE WHEN hard < easy THEN 1 END) as better_on_hard
FROM wmg_tournament_session_points_v
WHERE week = '&week_code' AND completed_ind = 'Y';

-- Top 10 Leaderboard
SELECT 'TOP_10' as report_section,
    player_name, account, country_code, rank_code, pos, points, total_score, easy, hard
FROM wmg_tournament_session_points_v
WHERE week = '&week_code' AND completed_ind = 'Y' AND pos <= 10
ORDER BY pos;

-- Rank Performance Analysis
SELECT 'RANK_ANALYSIS' as report_section,
    rank_code,
    COUNT(*) as players_in_rank,
    ROUND(AVG(pos), 1) as avg_position,
    ROUND(AVG(points), 2) as avg_points,
    MIN(pos) as best_position,
    COUNT(CASE WHEN pos <= 10 THEN 1 END) as top_10_count
FROM wmg_tournament_session_points_v
WHERE week = '&week_code' AND completed_ind = 'Y' AND rank_code IS NOT NULL
GROUP BY rank_code
ORDER BY avg_points DESC;

-- Overperformers (excluding top 3)
WITH rank_averages AS (
    SELECT rank_code, AVG(pos) as avg_pos
    FROM wmg_tournament_session_points_v
    WHERE week = '&week_code' AND completed_ind = 'Y'
    GROUP BY rank_code
)
SELECT 'OVERPERFORMERS' as report_section,
    p.player_name, p.account, p.country_code, p.rank_code, p.pos, p.points, p.total_score,
    ROUND(p.pos - ra.avg_pos, 1) as positions_above_avg
FROM wmg_tournament_session_points_v p
JOIN rank_averages ra ON p.rank_code = ra.rank_code
WHERE p.week = '&week_code' AND p.completed_ind = 'Y' 
    AND p.pos > 3  -- Exclude podium
    AND (p.pos - ra.avg_pos) <= -15  -- 15+ positions better than rank average
ORDER BY (p.pos - ra.avg_pos) ASC;

-- Country Performance
WITH country_best AS (
    SELECT country_code, MIN(pos) as best_pos,
        FIRST_VALUE(player_name) OVER (PARTITION BY country_code ORDER BY pos) as best_player
    FROM wmg_tournament_session_points_v
    WHERE week = '&week_code' AND completed_ind = 'Y' AND country_code IS NOT NULL
)
SELECT DISTINCT 'COUNTRY_STATS' as report_section,
    cs.country_code, COUNT(*) OVER (PARTITION BY cs.country_code) as players,
    ROUND(AVG(p.pos) OVER (PARTITION BY cs.country_code), 1) as avg_position,
    cs.best_pos, cs.best_player,
    ROUND(AVG(p.total_score) OVER (PARTITION BY cs.country_code), 2) as avg_score
FROM wmg_tournament_session_points_v p
JOIN country_best cs ON p.country_code = cs.country_code
WHERE p.week = '&week_code' AND p.completed_ind = 'Y'
ORDER BY cs.best_pos, avg_position;

-- Special Achievements
SELECT 'BALANCED_PERFORMANCE' as report_section,
    player_name, account, country_code, rank_code, pos, easy, hard,
    ABS(easy - hard) as score_difference, total_score
FROM wmg_tournament_session_points_v
WHERE week = '&week_code' AND completed_ind = 'Y' AND pos <= 20
ORDER BY ABS(easy - hard) ASC
FETCH FIRST 3 ROWS ONLY;

SELECT 'BEST_HARD_COURSE' as report_section,
    player_name, account, country_code, rank_code, pos, easy, hard, total_score
FROM wmg_tournament_session_points_v
WHERE week = '&week_code' AND completed_ind = 'Y'
ORDER BY hard ASC
FETCH FIRST 3 ROWS ONLY;