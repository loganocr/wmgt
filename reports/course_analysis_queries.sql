-- =====================================================
-- WMGT Course Analysis SQL Queries
-- Use these queries to gather data for weekly course analysis reports
-- =====================================================

-- 1. GET CURRENT/UPCOMING TOURNAMENT WEEK AND COURSES
-- =====================================================
SELECT 
    ts.week,
    ts.session_date,
    ts.completed_ind,
    ts.registration_closed_flag,
    ts.rooms_open_flag,
    t.name as tournament_name
FROM wmg_tournament_sessions ts
JOIN wmg_tournaments t ON ts.tournament_id = t.id
WHERE ts.completed_ind = 'N'
ORDER BY ts.session_date;

-- 2. GET TOURNAMENT COURSES FOR SPECIFIC WEEK
-- =====================================================
-- Replace 'S18W03' with the actual week code
SELECT 
    ts.week,
    c.code,
    c.name,
    c.course_mode,
    c.id as course_id
FROM wmg_tournament_sessions ts 
JOIN wmg_tournament_courses tc ON ts.id = tc.tournament_session_id 
JOIN wmg_courses c ON tc.course_id = c.id 
WHERE ts.week = 'S18W03'  -- UPDATE THIS
ORDER BY c.code, c.course_mode;

-- 3. COURSE DIFFICULTY RANKINGS - EASY COURSES
-- =====================================================
SELECT 
    c.code,
    c.name,
    c.course_mode,
    AVG(cs.score_avg) as overall_avg,
    RANK() OVER (ORDER BY AVG(cs.score_avg) DESC) as difficulty_rank_among_easy,
    COUNT(DISTINCT cs.h) as holes_analyzed
FROM wmg_courses c
JOIN wmg_course_stats_v cs ON c.id = cs.course_id
WHERE c.course_mode = 'E'
GROUP BY c.code, c.name, c.course_mode
ORDER BY difficulty_rank_among_easy;

-- 4. COURSE DIFFICULTY RANKINGS - HARD COURSES
-- =====================================================
SELECT 
    c.code,
    c.name,
    c.course_mode,
    AVG(cs.score_avg) as overall_avg,
    RANK() OVER (ORDER BY AVG(cs.score_avg) DESC) as difficulty_rank_among_hard,
    COUNT(DISTINCT cs.h) as holes_analyzed
FROM wmg_courses c
JOIN wmg_course_stats_v cs ON c.id = cs.course_id
WHERE c.course_mode = 'H'
GROUP BY c.code, c.name, c.course_mode
ORDER BY difficulty_rank_among_hard;

-- 5. COURSE RECORDS AND STATISTICS
-- =====================================================
-- Replace course codes in WHERE clause
SELECT 
    c.code,
    c.name,
    c.course_mode,
    MIN(r.final_score) as best_score,
    COUNT(*) as total_rounds,
    ROUND(AVG(r.final_score), 2) as avg_score,
    MAX(r.final_score) as worst_score
FROM wmg_courses c
JOIN wmg_rounds r ON c.id = r.course_id
WHERE c.code IN ('20H', 'CBE') AND r.final_score IS NOT NULL  -- UPDATE THESE
GROUP BY c.code, c.name, c.course_mode
ORDER BY c.code;

-- 6. COURSE INFORMATION AND RELEASE DATES
-- =====================================================
-- Replace course codes in WHERE clause
SELECT 
    c.code,
    c.name,
    c.course_mode,
    c.release_date,
    c.course_emoji,
    c.factoids,
    MAX(r.round_played_on) as last_played,
    COUNT(DISTINCT r.week) as weeks_played
FROM wmg_courses c
LEFT JOIN wmg_rounds r ON c.id = r.course_id
WHERE c.code IN ('20H', 'CBE')  -- UPDATE THESE
GROUP BY c.code, c.name, c.course_mode, c.release_date, c.course_emoji, c.factoids
ORDER BY c.code;

-- 7. TOP 5 BEST SCORES (RECORD HOLDERS)
-- =====================================================
-- Replace course codes in WHERE clause
SELECT * FROM (
    SELECT 
        c.code,
        c.name,
        p.name as player_name,
        r.final_score,
        r.week,
        ROW_NUMBER() OVER (PARTITION BY c.code ORDER BY r.final_score ASC) as rank
    FROM wmg_courses c
    JOIN wmg_rounds r ON c.id = r.course_id
    JOIN wmg_players p ON r.players_id = p.id
    WHERE c.code IN ('20H', 'CBE') AND r.final_score IS NOT NULL  -- UPDATE THESE
) WHERE rank <= 5
ORDER BY code, rank;

-- 8. TOP 5 WORST SCORES (FOR CONTEXT)
-- =====================================================
-- Replace course codes in WHERE clause
SELECT * FROM (
    SELECT 
        c.code,
        c.name,
        p.name as player_name,
        r.final_score,
        r.week,
        ROW_NUMBER() OVER (PARTITION BY c.code ORDER BY r.final_score DESC) as rank
    FROM wmg_courses c
    JOIN wmg_rounds r ON c.id = r.course_id
    JOIN wmg_players p ON r.players_id = p.id
    WHERE c.code IN ('20H', 'CBE') AND r.final_score IS NOT NULL  -- UPDATE THESE
) WHERE rank <= 5
ORDER BY code, rank;

-- 9. HOLE-BY-HOLE DIFFICULTY ANALYSIS
-- =====================================================
-- Replace course codes in WHERE clause
SELECT 
    cs.course_code,
    cs.h as hole_number,
    cs.difficulty,
    cs.score_avg,
    RANK() OVER (PARTITION BY cs.course_code ORDER BY cs.difficulty DESC) as hardest_rank,
    RANK() OVER (PARTITION BY cs.course_code ORDER BY cs.difficulty ASC) as easiest_rank
FROM wmg_course_stats_v cs
WHERE cs.course_code IN ('20H', 'CBE')  -- UPDATE THESE
ORDER BY cs.course_code, cs.h;

-- 10. UNICORN ACHIEVEMENTS
-- =====================================================
-- Replace course codes in WHERE clause
SELECT 
    c.code,
    COUNT(u.id) as unicorn_count,
    COUNT(DISTINCT u.player_id) as unique_unicorn_players
FROM wmg_courses c
LEFT JOIN wmg_player_unicorns u ON c.id = u.course_id
WHERE c.code IN ('20H', 'CBE')  -- UPDATE THESE
GROUP BY c.code
ORDER BY c.code;

-- 11. OVERALL COURSE AVERAGE (FOR COMPARISON)
-- =====================================================
SELECT 
    AVG(score_avg) as overall_course_average,
    COUNT(DISTINCT course_code) as total_courses
FROM wmg_course_stats_v;

-- =====================================================
-- USAGE INSTRUCTIONS:
-- 1. Update the week code in query #2
-- 2. Update course codes in queries #5-10 based on results from #2
-- 3. Run queries in order to gather all necessary data
-- 4. Use results to populate the course_analysis_template.md
-- =====================================================