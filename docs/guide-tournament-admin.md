# Tournament Admin Guide

As a Tournament Admin, you're responsible for running the weekly WMGT tournament — from setup through closing. This guide walks you through the entire weekly workflow.

## Weekly Schedule Overview

| Day | Time (Central) | Admin Action |
|-----|----------------|--------------|
| **Sunday** | After previous tournament closes | Set up next week's session |
| **Sunday** | 4-6 PM | Open registration |
| **Saturday** | 3:00 PM | Registration closes automatically (1 hr before tee time) |
| **Saturday** | ~3:30 PM | Assign rooms |
| **Saturday** | 3:45-3:55 PM | Open rooms |
| **Saturday** | 4:00 PM (22:00 UTC) | Tournament begins |
| **Sat → Sun** | During tournament | Monitor, handle issues |
| **Sunday** | After last scores entered | Verify all scores |
| **Sunday** | After verification complete | Close the tournament |

## The Tournament Admin Dashboard

Navigate to **Menu → Tournament Admin** (Page 500) to access your main control center.

The dashboard shows:
- **Current Session** — The active tournament week
- **Signups** — Registration counts (registered vs unregistered)
- **Scorecards** — How many players have entered scores vs total registered
- **Issues** — Players with flagged problems
- **Promotions** — Players eligible for rank upgrades (Elite, Pro, Semi-Pro)
- **Week Promo** — Promotional image for the current week

## Weekly Workflow

### Phase 1: Setting Up Next Week (Sunday)

After the previous tournament closes:

1. **Open the Tournament Sessions dialog**
   - From Tournament Admin dashboard, click the **Sessions** button (or navigate to Sessions page)
   - Click **Add Session** to create a new week

2. **Configure the new session:**
   - **Week**: Auto-generates based on round number (e.g., "S19W06")
   - **Round Number**: The week number within the season (1-12)
   - **Session Date**: The Saturday of the tournament
   - **Easy Course**: Select the easier course for this week
   - **Hard Course**: Select the harder course for this week
   - **Open Registration On**: When registration should open (typically Sunday afternoon)
   - **Close Registration On**: When registration closes (typically Saturday, 1 hour before tee time)

3. **Save the session**

4. **Announce the courses**
   - Post in Discord with the week's courses so players can practice

### Phase 2: Registration Period (Sunday → Saturday)

During this phase, players register through Discord or the website.

**Monitoring registration:**
- Check the Tournament Admin dashboard for signup counts
- The **Registrations** button shows who has registered and their selected time slots

**Handling registration issues:**
- Players can register/unregister themselves until registration closes
- Admins can manually register or unregister players if needed via **Registrations** page

### Phase 3: Pre-Tournament Setup (Saturday, ~30 min before start)

#### Step 1: Assign Rooms (~3:30 PM Central)

Once registration closes:

1. Go to **Tournament Admin** dashboard
2. Look for the **Assign Rooms** button/action
3. The system will:
   - Group registered players by time slot
   - Randomly assign them to rooms (2-4 players per room)
   - Create room names (WMGT1, WMGT2, etc.)

> ⚠️ **Single-player slots**: If a time slot has only one player, they need to be moved to another slot or paired with an admin-designated player.

#### Step 2: Open Rooms (~3:45-3:55 PM Central)

Once rooms are assigned:

1. Click **Open Rooms**
2. This makes room assignments visible to players
3. Players can now see their room assignment on the **Room Selections & Assignments** page

> 🕐 **Timing**: Open rooms about 15-30 minutes before the first tee time so players can find their room and join a few minutes early.

### Phase 4: Tournament In Progress (Saturday 4 PM → Sunday)

During the tournament:

**Monitor the dashboard:**
- Watch scorecard submission counts
- Keep an eye on the Issues region

**Handle issues as they arise:**
- Late starts → Discuss in #staff channel
- Glitches → Have player enter scores as shown, then review in #staff
- No-shows → Will be flagged during verification

**Score entry closes automatically:**
- Each time slot's score entry closes 4 hours after their start time
- The system submits scheduled jobs to close each time slot

### Phase 5: Verification (After Tournament)

Once players have entered their scores:

1. Navigate to **Menu → Verify Results**
2. Work through each room systematically
3. Follow the [Contributor Guide](guide-contributor.md) for verification procedures
4. Ensure all players are marked as verified
5. Ensure all rooms show checkmarks

### Phase 6: Closing the Tournament (Sunday)

Once verification is complete:

1. Go to **Tournament Admin** → **Sessions**
2. Select the current session
3. Click **Close Weekend Tournament...**
4. Confirm the action

**What happens when you close:**
- Results are finalized
- Season points are calculated and applied
- Rank promotions are processed automatically:
  - **Top 3** → Elite rank
  - **4-10** → Pro rank
  - **11-25** → Semi-Pro rank
- Penalties (-1 points) are applied for infractions
- Badge snapshots are taken
- 🎊 Confetti!

> ⚠️ **This is difficult to undo** — Make sure verification is complete before closing.

## Key Pages Reference

| Page | Purpose |
|------|---------|
| **Tournament Admin** (500) | Main dashboard |
| **Sessions** (530) | View/manage tournament seasons |
| **Tournament Sessions** (532) | Create/edit individual weeks |
| **Registrations** | View/manage player registrations |
| **Room Selections & Assignments** (40) | View room assignments (public page) |
| **Verify Results** (75) | Score verification |
| **Tournament Issues** (535) | View all flagged issues |
| **Messages** (540) | Manage tournament messages |

## Managing Registrations

### Registering a Player Manually

1. Go to **Registrations** page
2. Find or add the player
3. Select their time slot
4. Save

### Unregistering a Player

1. Go to **Registrations** page
2. Find the player
3. Remove their registration

> ⚠️ **After registration closes**: Changes should only be made for exceptional circumstances. Once rooms are assigned, moving players becomes more complex.

### Handling No-Shows

During verification:
1. Mark the player with **No Show** action
2. They will receive an infraction
3. Multiple infractions can lead to suspension

## Managing Issues

### Viewing Issues

- **Tournament Admin dashboard** → Issues region shows current problems
- **View Issues** button → Full list of all flagged players

### Issue Types

| Issue | Meaning |
|-------|---------|
| **No Show** | Player didn't show up or notified too late |
| **No Scores** | Player hasn't entered scores (mark after 4+ hours) |
| **Rule Violation** | DNF, rage quit, or other staff-decided violation |

### Applying Penalties

- **-1 Season Point**: Requires both scores entered AND infraction marked
- **Week Discarded**: If only infraction, no scores — week doesn't count
- For intentional score non-entry by top players: Enter their scores manually, then mark infraction

## Room Management

### Resetting Room Assignments

If something goes wrong with room assignments:
1. Go to session management
2. Use **Reset Room Assignments** option
3. Re-run **Assign Rooms**

### Handling Room Issues During Tournament

- If players need to move rooms, note it in #staff and verify carefully
- Cross-room players should be flagged for manual verification

## Troubleshooting

### Player Can't Register
- Check if registration is open (between open/close dates)
- Check if player has an active suspension
- Verify player account exists and is linked to Discord

### Room Assignments Not Showing
- Verify rooms have been assigned
- Verify rooms have been opened
- Check the session is set as current

### Score Entry Closed Early
- Each time slot closes 4 hours after start
- Check the job scheduler ran correctly
- Admins can manually enter scores if needed

### Verification Bot Not Working
- Click the **Verify** button to force re-run
- Check that scorecard was posted BEFORE scores were entered
- Some usernames with special characters may not match

## Best Practices

1. **Set up next week promptly** after closing — players want to know the courses and practice
2. **Monitor #staff channel** during tournament for issues
3. **Communicate delays** — If you're running late on room assignments, let players know
4. **Document unusual situations** — Add notes when handling edge cases
5. **Verify before closing** — Double-check all rooms have checkmarks

## Emergency Contacts

If you encounter a situation you can't handle:
- Post in **#staff** Discord channel
- Tag **El Jorge** for major issues
- Document everything that happened

---

*Questions? Ask in the #staff channel on Discord.*
