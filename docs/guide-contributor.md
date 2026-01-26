# Contributor Guide — Score Verification

As a Contributor, your primary role is **verifying scores** — ensuring that the scores players entered into the system match what's shown on their scorecard photos in Discord.

## Why Verification Matters

- **Fairness** — Everyone's scores must be accurate for fair competition
- **Badges** — Individual hole scores affect badge awards (aces, eagles, etc.)
- **Course Analysis** — Hole-by-hole data feeds into course statistics
- **Trust** — The community relies on accurate results

## The Verification Workflow

### Overview

1. Players post scorecard photos to **#wmgt-scorecards** on Discord
2. The verification bot attempts to read the scorecard and match it to entered scores
3. You review the bot's results and manually verify anything it couldn't confirm
4. Mark each player as verified once confirmed

### Accessing Verification

1. Navigate to **Menu → Verify Results** (Page 75)
2. Select the **Week** you're verifying (usually the current/most recent)
3. Filter by **Time Slot** or enter a specific **Room number** (number only, no "WMGT")
4. Alternatively, click a room name on the left sidebar to jump directly to it

## Understanding the Verification Status

Each player row shows verification status indicators for both courses:

### Bot Verification Squares

Look at the two course score columns (not the "Sum" columns). You'll see colored squares:

| Color        | Meaning | Action Required |
|--------------|---------|-----------------|
| 🟩 **Green** | Bot matched all holes and total — scores verified | No manual review needed |
| 🟥 **Red**   | Bot found the player but scores don't match | Manual review required |
| ⬜ **Grey**  | Bot couldn't match (posted before entry, username issue, or bot failure) | Manual review required |
| (none)      | No square at all | Manual review required |

**Tip:** If you see grey or no squares, click the **Verify** button (top right) to force the bot to re-run. If it still doesn't change, you must verify manually.

### The Checkmark Column (✅)

- ✅ Green checkmark — Scores match perfectly
- ❌ Red X — Discrepancy detected (differences highlighted in yellow)
- ☐ Empty box — Not yet compared

## Manual Verification Process

For any red, grey, or missing squares:

### Step 1: Compare the Numbers

On the main Verify Results page:
- **Sum columns** — Total of individual hole entries
- **Score columns** — Course totals the player entered

If these don't match, the totals will be **highlighted in yellow**.

### Step 2: Check Hole-by-Hole

Even if totals match, you must verify hole-by-hole entries:

1. **Click the player's username** to open their scorecard entry page
2. **Find their scorecard** in the #wmgt-scorecards Discord channel
3. **Compare each hole** — look for transposed numbers (e.g., entering 3 for hole 5 and 5 for hole 3)

> ⚠️ **Why this matters:** A transposed number can yield the same total but incorrectly awards or denies badges, and skews course analysis data.

### Step 3: Fix Errors

- **You can fix transposed numbers yourself** — just correct them on the entry page
- Click **Save Round** after making any changes
- If someone repeatedly makes entry errors, let them know to double-check before submitting

### Step 4: Mark as Verified

Once confirmed:
- On the **main page**: Click the checkbox in the **Verified** column
- Or on the **player's entry page**: Click **Round Verified**

**To reset and make changes:** Click the Verified box twice more to reset it.

### Step 5: Confirm Room Completion

Once everyone in a room is verified, the **room name on the left sidebar should show a checkmark**.

Players with no scores entered (no show, DNF, etc.) will show a red X in the third column but should still be marked as verified once you've confirmed their status.

## Reviewing Scorecards on Discord

When checking #wmgt-scorecards, verify:

### Start Time
- **1st round**: No more than 2 minutes after the time slot
- **2nd round**: No more than 2 minutes after the 1st round ends

### Players
- ✅ 2 or more players present (solo play not allowed)
- ✅ Players match room assignments
- ✅ Discord name matches WMG in-game name
- ✅ Same players in both rounds
- ✅ Anyone from a different room showing up?
- ❓ Did anyone no-show?

### Scores
- ✅ All players have scores on the last holes (no incomplete rounds)
- ✅ No suspiciously high stroke counts (stroke limit should be ON)

## Handling Issues

### Marking Player Issues

Use the **Actions** column buttons to mark issues:

| Issue         | When to Use |
|---------------|-------------|
| **No Show**   | Player didn't show up, or notified staff too late (after game started) |
| **No Scores** | Select only after 4+ hours have passed and score wasn't entered |
| **Rule Violation** | DNF, rage quit, or other violation decided by staff |

**Add a note** explaining the issue when applicable.

### Common Scenarios

#### Blurry/Missing Scorecard
1. Reply in #wmgt-scorecards asking if someone else has a better picture
2. The bot may read the new card and update verification status
3. Goal: Train players to post clear, straight, cropped scorecards

#### Late Start (2-3 minutes)
- Generally accepted, but ask why as an educational moment
- Bring to #staff channel if needed

#### Late Start (3+ minutes)
- Requires a good explanation
- Bring to #staff channel to decide
- Message the player/team privately with the decision

#### Glitches or Unusual Situations
1. Have the player enter their score as shown on the scorecard
2. Bring the issue to #staff channel for review
3. Message the player with the decision
4. If stroke relief is granted, WMGT staff will adjust their entry

## Rule Violations & Penalties

> ⚠️ **Important:** Straightforward infractions (DNF, no show, no scores) can be given directly. For complex situations, bring to #staff for a group decision.

### How Penalties Work

- **-1 Season Point**: Applied when player has scores entered AND an infraction marked
- **Week Discarded**: If only infraction (no scores), the week is discarded instead
- **Suspension**: Multiple infractions can result in registration ban for remainder of season

### When to Apply -1 Penalty

The penalty requires both:
1. Scores entered for that week
2. An infraction reason selected

**Common case:** Top 20 players who don't enter scores because results were "below their standards"
- Enter their scores manually
- Mark "No Scores" infraction
- This gives them the -1 instead of just discarding the week

For newer or casual players, having the week discarded is usually sufficient penalty.

### Suspension Warning Flow

1. First violation: Warning message appears when they register
2. Second violation: Cannot register, told to try again next season

## Quick Reference

### Page Navigation
- **Verify Results**: Menu → Verify Results
- **Player Entry**: Click username on Verify Results
- **Room Filter**: Click room name on left sidebar or enter room number

### Keyboard Shortcuts
- Clicking room name = filters AND refreshes results

### Status at a Glance
| See This         | Means This |
|------------------|------------|
| Green square     | Bot verified ✓ |
| Red square       | Bot mismatch — check manually |
| Grey/no square   | Bot failed — check manually |
| Yellow highlight | Sum ≠ Entered total |
| Room checkmark   | All players in room verified |

---

*Questions? Ask in the #staff channel on Discord.*
