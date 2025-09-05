create or replace package wmg_verification_engine
is

--------------------------------------------------------------------------------
--*
--* Scorecard Verification Automation Engine
--* Automatically verifies tournament scorecards by comparing data from the 
--* WMGT card structure repository against submitted rounds in the tournament database
--*
--------------------------------------------------------------------------------

-- Data types for score comparison and verification results
type score_comparison_rec is record (
    player_id     number,
    course_id     number,
    room_no       number,
    hole_num      number,
    card_score    number,
    round_score   number,
    match_flag    varchar2(1)
);

type score_comparison_tbl is table of score_comparison_rec;

type verification_result_rec is record (
    tournament_session_id number,
    room_no              number,
    player_id            number,
    verification_status  varchar2(20), -- 'SUCCESS', 'FAILED', 'NO_MATCH'
    mismatch_details     varchar2(4000),
    card_run_id          number
);

type verification_result_tbl is table of verification_result_rec;

-- Player matching functions
function match_player(
    p_card_player_name in varchar2
) return number;

-- Score retrieval functions
function get_card_scores(
    p_card_run_id        in number,
    p_card_player_name   in varchar2
) return score_comparison_tbl;

function get_round_scores(
    p_tournament_session_id in number,
    p_player_id            in number,
    p_course_id            in number
) return score_comparison_tbl;

-- Score validation procedures  
function validate_hole_scores(
    p_card_scores    in score_comparison_tbl,
    p_round_scores   in score_comparison_tbl
) return boolean;

function validate_course_totals(
    p_card_total     in number,
    p_round_total    in number
) return boolean;

function calculate_course_total(
    p_scores in score_comparison_tbl
) return number;

-- Score comparison functions
function compare_player_scores(
    p_tournament_session_id in number,
    p_player_id            in number,
    p_card_player_name     in varchar2,
    p_card_run_id          in number,
    p_course_id            in number
) return verification_result_rec;

-- Main verification procedure for room-level processing
procedure verify_room(
    p_tournament_session_id in number,
    p_room_no              in number,
    p_card_run_id          in number,
    x_verification_results out verification_result_tbl
);

-- Verification status update procedures
procedure update_verification_status(
    p_tournament_session_id in number,
    p_player_id            in number,
    p_verified_flag        in varchar2 default 'Y',
    p_verified_by          in varchar2 default 'SYSTEM',
    p_verified_note        in varchar2 default null
);

procedure update_verification_status_batch(
    p_verification_results in verification_result_tbl
);

end wmg_verification_engine;
/