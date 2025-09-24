# Weekly Course Analysis Report Workflow

This document outlines the step-by-step process for creating consistent weekly course analysis reports.

## Prerequisites
- Access to wmgt database via SQLcl
- Course analysis template and reference files in `/reports` directory

## Step-by-Step Workflow

### 1. Connect to Database
```bash
# Connect to wmgt database
mcp_sqlcl_connect wmgt
```

### 2. Identify Current Tournament Week
Run the first query from `course_analysis_queries.sql`:
```sql
SELECT 
    ts.week,
    ts.session_date,
    ts.completed_ind,
    t.name as tournament_name
FROM wmg_tournament_sessions ts
JOIN wmg_tournaments t ON ts.tournament_id = t.id
WHERE ts.completed_ind = 'N'
ORDER BY ts.session_date;
```

### 3. Get Tournament Courses
Update and run query #2 with the week code from step 2:
```sql
-- Update 'S18W03' with actual week code
SELECT ts.week, c.code, c.name, c.course_mode, c.id as course_id
FROM wmg_tournament_sessions ts 
JOIN wmg_tournament_courses tc ON ts.id = tc.tournament_session_id 
JOIN wmg_courses c ON tc.course_id = c.id 
WHERE ts.week = 'S18W03'  -- UPDATE THIS
ORDER BY c.code, c.course_mode;
```

### 4. Gather Course Difficulty Rankings
Run queries #3 and #4 to get difficulty rankings:
- Query #3: Easy course rankings (1-35)
- Query #4: Hard course rankings (1-35)

### 5. Collect Course Data
Update course codes in queries #5-11 and run them:
- Query #5: Course records and statistics
- Query #6: Course information and release dates
- Query #7: Top 5 best scores (record holders)
- Query #8: Top 5 worst scores (for context)
- Query #9: Hole-by-hole difficulty analysis
- Query #10: Unicorn achievements
- Query #11: Overall course average (for comparison)

### 6. Determine Difficulty Tiers
Using `difficulty_tier_reference.md`:
- Map each course's ranking to appropriate difficulty tier
- Select appropriate comparison language
- Choose strategic insights language

### 7. Populate Template
Using `course_analysis_template.md`, replace all placeholders:

#### Course-Specific Variables:
- `{{SEASON}}` - Current season (e.g., "Season 18")
- `{{WEEK_NUM}}` - Week number (e.g., "03")
- `{{EASY_CODE}}` / `{{HARD_CODE}}` - Course codes
- `{{EASY_COURSE_NAME}}` / `{{HARD_COURSE_NAME}}` - Full course names
- `{{EASY_EMOJI}}` / `{{HARD_EMOJI}}` - Course emojis
- `{{EASY_RANK}}` / `{{HARD_RANK}}` - Difficulty rankings within category
- `{{EASY_DIFFICULTY_TIER}}` / `{{HARD_DIFFICULTY_TIER}}` - Tier descriptions
- `{{EASY_AVG_SCORE}}` / `{{HARD_AVG_SCORE}}` - Average hole scores
- `{{EASY_COMPARISON_TEXT}}` / `{{HARD_COMPARISON_TEXT}}` - Comparison language

#### Performance Variables:
- `{{EASY_RECORD}}` / `{{HARD_RECORD}}` - Course records
- `{{EASY_RECORD_HOLDER}}` / `{{HARD_RECORD_HOLDER}}` - Record holder names
- `{{EASY_TOP_PERFORMERS}}` / `{{HARD_TOP_PERFORMERS}}` - Top 5 formatted list
- `{{EASY_HARD_HOLES}}` / `{{HARD_HARD_HOLES}}` - Most difficult holes
- `{{EASY_EASY_HOLES}}` / `{{HARD_EASY_HOLES}}` - Easiest holes

#### Statistical Variables:
- `{{EASY_TOTAL_ROUNDS}}` / `{{HARD_TOTAL_ROUNDS}}` - Total rounds played
- `{{EASY_AVG_FINAL_SCORE}}` / `{{HARD_AVG_FINAL_SCORE}}` - Average final scores
- `{{EASY_WEEKS_PLAYED}}` / `{{HARD_WEEKS_PLAYED}}` - Weeks in rotation
- `{{EASY_RELEASE_DATE}}` / `{{HARD_RELEASE_DATE}}` - Release dates
- `{{EASY_FACTOIDS}}` / `{{HARD_FACTOIDS}}` - Course factoids (if any)

#### Strategic Variables:
- `{{EASY_UNICORN_INFO}}` / `{{HARD_UNICORN_INFO}}` - Unicorn achievement info
- `{{EASY_STRATEGIC_INSIGHTS}}` / `{{HARD_STRATEGIC_INSIGHTS}}` - Strategic advice
- `{{COMBINED_AVERAGE}}` - Combined average score prediction
- `{{WINNING_SCORE_PREDICTION}}` - Predicted winning scores

### 8. Format and Review
- Ensure all placeholders are replaced
- Check emoji usage and formatting
- Verify difficulty tier language matches reference guide
- Review strategic insights for accuracy and helpfulness

### 9. Save Report
Save as: `reports/S##W##_Course_Analysis_Report.md`
- Replace ## with actual season and week numbers

### 10. Quality Check
- Verify all course codes are correct
- Confirm difficulty rankings are within-category (Easy vs Easy, Hard vs Hard)
- Check that strategic advice matches difficulty tiers
- Ensure unicorn information is accurate

## File Naming Convention
- Weekly reports: `S##W##_Course_Analysis_Report.md`
- Example: `S18W03_Course_Analysis_Report.md`

## Reference Files
- `course_analysis_template.md` - Base template with placeholders
- `course_analysis_queries.sql` - All necessary SQL queries
- `difficulty_tier_reference.md` - Difficulty tier language guide
- `course_analysis_workflow.md` - This workflow document

## Tips for Consistency
1. Always use within-category rankings (Easy vs Easy, Hard vs Hard)
2. Reference specific course examples when describing difficulty
3. Use appropriate emoji for course themes and difficulty
4. Keep strategic insights actionable and specific
5. Include historical context when relevant
6. Maintain consistent tone and formatting across weeks

## Troubleshooting
- If course codes don't match, check tournament_courses query results
- If difficulty rankings seem off, verify you're comparing within the same category
- If unicorn data is missing, the course may not be eligible yet
- If factoids are empty, that's normal for many courses