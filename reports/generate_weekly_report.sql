-- Weekly Tournament Report Generator
-- Usage: @generate_weekly_report.sql S18W03
-- This script runs all analysis queries and formats output for AI analysis

SET PAGESIZE 0
SET LINESIZE 1000
SET FEEDBACK OFF
SET HEADING ON
SET ECHO OFF

DEFINE week_code = '&1'

PROMPT ========================================
PROMPT WEEKLY TOURNAMENT ANALYSIS: &week_code
PROMPT ========================================

PROMPT 
PROMPT === WEEK STATISTICS ===
SELECT 
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

PROMPT 
PROMPT === TOP 10 LEADERBOARD ===
SELECT 
    pos, player_name, account, country_code, rank_code, points, total_score, easy, hard
FROM wmg_tournament_session_points_v
WHERE week = '&week_code' AND completed_ind = 'Y' AND pos <= 10
ORDER BY pos;

PROMPT 
PROMPT === RANK PERFORMANCE ANALYSIS ===
SELECT 
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

PROMPT 
PROMPT === OVERPERFORMERS (EXCLUDING TOP 3) ===
WITH rank_averages AS (
    SELECT rank_code, AVG(pos) as avg_pos
    FROM wmg_tournament_session_points_v
    WHERE week = '&week_code' AND completed_ind = 'Y'
    GROUP BY rank_code
)
SELECT 
    p.player_name, p.account, p.country_code, p.rank_code, p.pos, p.points, p.total_score,
    ROUND(p.pos - ra.avg_pos, 1) as positions_above_avg
FROM wmg_tournament_session_points_v p
JOIN rank_averages ra ON p.rank_code = ra.rank_code
WHERE p.week = '&week_code' AND p.completed_ind = 'Y' 
    AND p.pos > 3
    AND (p.pos - ra.avg_pos) <= -10
ORDER BY (p.pos - ra.avg_pos) ASC;

PROMPT 
PROMPT === COUNTRY PERFORMANCE ===
WITH country_stats AS (
    SELECT 
        country_code,
        COUNT(*) as players,
        ROUND(AVG(pos), 1) as avg_position,
        MIN(pos) as best_position,
        ROUND(AVG(total_score), 2) as avg_score
    FROM wmg_tournament_session_points_v
    WHERE week = '&week_code' AND completed_ind = 'Y' AND country_code IS NOT NULL
    GROUP BY country_code
),
best_performers AS (
    SELECT DISTINCT
        p.country_code,
        FIRST_VALUE(p.player_name) OVER (PARTITION BY p.country_code ORDER BY p.pos) as best_performer
    FROM wmg_tournament_session_points_v p
    WHERE p.week = '&week_code' AND p.completed_ind = 'Y' AND p.country_code IS NOT NULL
)
SELECT 
    cs.country_code, cs.players, cs.avg_position, cs.best_position, 
    bp.best_performer, cs.avg_score
FROM country_stats cs
JOIN best_performers bp ON cs.country_code = bp.country_code
ORDER BY cs.best_position ASC, cs.avg_position ASC;

PROMPT 
PROMPT === SPECIAL ACHIEVEMENTS ===
PROMPT 
PROMPT -- Most Balanced Performance (Top 20)
SELECT 
    'BALANCED' as achievement_type,
    player_name, account, country_code, rank_code, pos, easy, hard,
    ABS(easy - hard) as score_difference, total_score
FROM wmg_tournament_session_points_v
WHERE week = '&week_code' AND completed_ind = 'Y' AND pos <= 20
ORDER BY ABS(easy - hard) ASC
FETCH FIRST 3 ROWS ONLY;

PROMPT 
PROMPT -- Best Hard Course Performance
SELECT 
    'HARD_COURSE_MASTER' as achievement_type,
    player_name, account, country_code, rank_code, pos, easy, hard, total_score
FROM wmg_tournament_session_points_v
WHERE week = '&week_code' AND completed_ind = 'Y'
ORDER BY hard ASC
FETCH FIRST 3 ROWS ONLY;

PROMPT 
PROMPT -- Biggest Easy/Hard Gap
SELECT 
    'BIGGEST_GAP' as achievement_type,
    player_name, account, country_code, rank_code, pos, easy, hard,
    ABS(easy - hard) as score_difference, total_score
FROM wmg_tournament_session_points_v
WHERE week = '&week_code' AND completed_ind = 'Y'
ORDER BY ABS(easy - hard) DESC
FETCH FIRST 3 ROWS ONLY;

PROMPT 
PROMPT ========================================
PROMPT END OF REPORT DATA FOR &week_code
PROMPT ========================================