# Rally Ledger — Product & Technical Specification

## 1. Product Purpose

**Rally Ledger** is a match-tracking app designed to help volleyball coaches and teams understand the live “weather” of a match.

The app does not try to record everything. It focuses on one practical question:

> Are we earning points, or are points being gifted?

The purpose is to help coaches, players, and teams **notice trends, adapt on the fly, and commit to useful next actions** during matches.

Rally Ledger should be fast enough to use live, simple enough for an assistant coach or manager to operate, and meaningful enough to guide decisions between points, during timeouts, between sets, and after matches.

---

## 2. Core Philosophy

Rally Ledger is built around three ideas:

### Notice

Make the current match conditions visible.

The app should show:
- where points are coming from
- where points are being lost
- whether the team is solving problems or repeating them
- whether the opponent is earning points or simply receiving gifts

### Adapt

Turn live information into useful coaching decisions.

The app should help coaches answer:
- Do we need to change serve targets?
- Are we giving away too many points from one skill area?
- Is one rotation leaking points?
- Are we attacking effectively or just surviving?
- Is the opponent actually beating us, or are we beating ourselves?

### Commit

Help the team choose one clear next action.

The app should not overwhelm coaches with too many numbers. It should help produce simple commitments such as:
- “Clean up serve errors.”
- “Keep pressure on Zone 1.”
- “Make them earn points.”
- “First contact before offense.”
- “Attack smart, not safe.”
- “Win the next three serve-pass exchanges.”

---

## 3. Target Users

### Primary Users

#### Head Coach

Uses the app to:
- monitor match trends
- guide timeout decisions
- identify set-to-set adjustments
- review match behavior after competition

#### Assistant Coach

Uses the app live during matches to:
- tag rally outcomes
- monitor rotation trends
- alert the head coach to useful patterns

#### Team Manager / Stat Helper

Uses the app to:
- quickly enter basic rally outcomes
- support the coaching staff without needing deep volleyball expertise

### Secondary Users

#### Players

May view simplified summaries:
- earned vs gifted points
- team trends
- set goals
- post-match reflection prompts

#### Program Director

May use app summaries to:
- compare team development over time
- identify program-wide patterns
- support coach education

---

## 4. Core App Identity

### App Name

**Rally Ledger**

### Possible Taglines

- **See the match. Shape the next point.**
- **Track what matters. Adapt while it matters.**
- **Notice. Adapt. Commit.**
- **A live match weather app for volleyball decisions.**

### Product Category

Live volleyball match tracking and decision-support app.

### App Type

- Progressive Web App preferred for early version
- Mobile-first design
- Tablet-friendly courtside interface
- Usable from iPhone, Android, iPad, Chromebook, or laptop browser

---

## 5. Core Concept: Match Weather

Rally Ledger should feel less like a spreadsheet and more like a **live weather dashboard for the match**.

Instead of weather conditions like rain, wind, and pressure, the app displays volleyball match conditions:

| Weather Concept | Volleyball Equivalent |
|---|---|
| Temperature | Match pressure / point flow |
| Wind direction | Momentum of earned/gifted points |
| Storm warning | Repeated error pattern |
| Pressure system | Rotation or skill breakdown |
| Forecast | Suggested next action |
| Radar | Live trend visualization |

The app should help coaches quickly understand:

> What is happening right now, what is building, and what should we do next?

---

## 6. Core Definitions

## Earned Points

An earned point is a point created by a team through direct pressure, execution, or successful problem-solving.

Examples:
- ace
- kill
- block
- forced opponent error caused by clear pressure
- opponent cannot handle an aggressive attack
- opponent cannot handle a tough serve

## Gifted Points

A gifted point is a point handed to the opponent through a mostly controllable mistake.

Examples:
- missed serve
- attack error with low pressure
- ball-handling error
- net violation
- center-line violation
- free ball error
- communication error on an easy ball
- rotation error
- wrong server
- obvious mental lapse

## Neutral / Contextual Outcomes

Some rally endings are not clearly earned or gifted. The app should allow neutral tagging when needed.

Examples:
- long rally with unclear cause
- defensive scramble ending in error
- high-pressure receive error
- opponent makes a low-error, high-quality play
- judgment call from coach/stat keeper

The app should avoid blaming players for difficult or low-control situations.

---

## 7. MVP Scope

The first version should be intentionally narrow.

### MVP Includes

- match creation
- roster setup
- opponent entry
- set tracking
- rotation tracking
- serve tracking
- rally outcome tagging
- earned/gifted categorization
- live dashboard
- timeout view
- between-set summary
- match history
- exportable match report

### MVP Does Not Include

- full advanced stat package
- video tagging
- automatic camera tracking
- AI recommendations
- recruiting tools
- tryout evaluations
- player development plans
- scouting reports
- practice design tools

---

## 8. Core Workflow

## 8.1 Pre-Match Setup

User opens the app and creates a match.

Required fields:
- match date
- opponent
- team
- level
- location
- match type

Optional fields:
- tournament name
- court number
- lineup
- starters
- notes

User selects roster and confirms available players.

---

## 8.2 Set Setup

Before each set, the user enters:

- starting rotation
- starting server
- whether team serves or receives first
- libero, if tracked
- optional lineup notes

The app should allow quick skipping if rotation tracking is not being used.

---

## 8.3 Live Rally Tracking

For each rally, the user records the outcome in a few taps.

Recommended input flow:

1. Who won the point?
   - Us
   - Opponent

2. How did the point end?
   - Ace
   - Kill
   - Block
   - Serve Error
   - Attack Error
   - Ball Handling Error
   - Net / Line Violation
   - Free Ball / Easy Ball Error
   - Forced Error
   - Other

3. Was it earned or gifted?
   - Earned by us
   - Gifted by us
   - Earned by opponent
   - Gifted by opponent
   - Neutral / unclear

4. Player involved, if relevant
   - optional
   - should not slow down live use

The app updates score, set state, and live dashboard immediately.

---

## 8.4 Timeout View

During a timeout, the app should have a quick “timeout card” view.

This view should show no more than 3–5 useful items:

- current score
- earned vs gifted balance
- biggest leak
- biggest strength
- suggested commitment

Example:

> We are +4 in earned points but -6 in gifted points.  
> Biggest leak: serve errors.  
> Timeout commitment: make them play the next three balls.

---

## 8.5 Between-Set View

Between sets, the app should summarize:

- final set score
- earned points
- gifted points
- serve pressure
- main scoring source
- main point leak
- rotation concern, if tracked
- suggested set-two focus

Example:

> Set 1: Lost 22–25  
> We earned 14. We gifted 11.  
> Opponent earned 10. Opponent gifted 8.  
> Main issue: we gave away too many points while serving.  
> Next set commitment: reduce serving errors and keep pressure on their left-back passer.

---

## 8.6 Post-Match Report

After the match, the app generates a summary:

- match result
- set scores
- total earned points
- total gifted points
- earned/gifted ratio
- point sources
- point leaks
- rotation trends
- player involvement, if tracked
- coach notes
- suggested practice themes

---

## 9. Main Screens

## 9.1 Home Screen

Purpose: quickly start or resume a match.

UI elements:
- Start New Match button
- Resume Live Match button
- Match History button
- Roster button
- Settings button

Recommended layout:
- clean card-based layout
- large buttons
- minimal text
- no clutter

---

## 9.2 New Match Screen

Fields:
- Team
- Opponent
- Date
- Level
- Match Type
- Location
- Roster Selection

Buttons:
- Start Match
- Save as Draft
- Cancel

---

## 9.3 Roster Screen

Purpose: manage players.

Fields:
- player name
- jersey number
- position
- active/inactive status
- optional photo
- optional graduation year
- optional team

Actions:
- add player
- edit player
- deactivate player
- import roster
- export roster

---

## 9.4 Live Match Screen

This is the main screen.

### Required UI Elements

- score display
- set number
- server indicator
- rotation indicator, if enabled
- last rally result
- large rally outcome buttons
- undo button
- timeout view button
- dashboard toggle

### Primary Input Buttons

Recommended first-level buttons:

- Us Point
- Opponent Point

After selecting point winner, show outcome buttons:

- Ace
- Kill
- Block
- Forced Error
- Serve Error
- Attack Error
- Ball Handling
- Net / Line
- Free Ball Error
- Other

Then show classification:

- Earned
- Gifted
- Neutral

The app should support a fast mode where common combinations can be logged with one tap.

Example fast buttons:
- Us Ace
- Us Kill
- Us Block
- Our Serve Error
- Our Attack Error
- Opponent Serve Error
- Opponent Attack Error

---

## 9.5 Live Dashboard Screen

Purpose: show match weather.

Recommended dashboard cards:

### Earned / Gifted Balance

Shows:
- our earned points
- our gifted points
- opponent earned points
- opponent gifted points

### Point Flow

Shows recent point sequence:
- green for us
- red/gray for opponent
- icons for earned/gifted

### Current Trend

Shows last 5–10 rallies:
- who is earning
- who is gifting
- whether the match is stabilizing or slipping

### Biggest Leak

Shows the most common way we are gifting points.

### Biggest Weapon

Shows the most common way we are earning points.

### Next Action

Displays one recommended coaching commitment based on current trend.

---

## 9.6 Timeout Card

Purpose: simplify live data into one coaching message.

Should show:
- score
- set
- last 5 rallies
- earned/gifted balance
- main leak
- suggested commitment

The timeout card should be readable in under 10 seconds.

---

## 9.7 Between-Set Summary

Purpose: guide set-to-set adaptation.

Should show:
- set score
- earned/gifted summary
- point source chart
- point leak chart
- rotation trend
- suggested next set focus
- coach note field

---

## 9.8 Match History

Purpose: review saved matches.

List view should show:
- date
- opponent
- result
- team
- earned/gifted ratio
- largest trend

Filters:
- team
- date range
- opponent
- match type
- result

---

## 9.9 Match Report Screen

Purpose: review and export a match.

Report sections:
- match overview
- set-by-set summary
- earned/gifted totals
- rally outcome totals
- rotation trends
- player involvement
- notes
- action items

Export formats:
- PDF eventually
- CSV
- Markdown
- copyable text summary

---

## 10. Core Features

## 10.1 Live Score Tracking

The app tracks:
- current set score
- match score
- serving team
- set number
- timeout count, optional
- side switch, optional

The score should update automatically after each rally.

---

## 10.2 Rally Outcome Tracking

Each rally should create a Rally Event record.

Tracked fields:
- match ID
- set ID
- rally number
- score before rally
- score after rally
- point winner
- serving team
- server
- rotation
- outcome type
- earned/gifted/neutral classification
- player involved
- notes
- timestamp

---

## 10.3 Earned/Gifted Classification

Each outcome should have a default classification, but the user should be able to override it.

Example defaults:

| Outcome | Default Classification |
|---|---|
| Ace | Earned |
| Kill | Earned |
| Block | Earned |
| Forced Error | Earned |
| Serve Error | Gifted |
| Attack Error | Gifted |
| Ball Handling Error | Gifted |
| Net / Line Violation | Gifted |
| Free Ball Error | Gifted |
| Other | Neutral |

---

## 10.4 Undo / Edit

The app must include a reliable undo function.

Required:
- undo last rally
- edit last rally
- edit earlier rally from rally log
- recalculate score after edit
- preserve edit history if possible

This is critical for live use.

---

## 10.5 Rotation Tracking

Rotation tracking should be optional.

When enabled, the app tracks:
- current rotation
- server
- point differential by rotation
- earned/gifted ratio by rotation
- leaks by rotation
- scoring sources by rotation

Rotation tracking should not be required for basic use.

---

## 10.6 Player Tracking

Player tracking should be optional during MVP.

When enabled, the app can track:
- player earning points
- player involved in gifted points
- server outcomes
- attacker outcomes
- blocker outcomes

The app should avoid turning into a blame tool. Player data should be framed around patterns and support.

---

## 10.7 Trend Alerts

The app should detect repeated patterns and surface them as simple alerts.

Examples:
- 3 serve errors in last 8 rallies
- opponent has earned 5 of last 7 points
- we have gifted 4 of last 6 points
- Rotation 2 is -5
- opponent is gifting points when forced to play longer rallies

Alerts should be calm, useful, and non-dramatic.

Recommended language:
- “Serve errors are becoming the main leak.”
- “Opponent is not earning much right now. Make them play.”
- “We are earning enough to stay in this set, but gifting too many points.”
- “Rotation 4 needs support.”

Avoid:
- “Critical failure”
- “Bad rotation”
- “Player is costing points”
- “Momentum lost”

---

## 10.8 Suggested Commitments

The app should provide simple action statements.

Examples:
- “Make them earn the next three points.”
- “Serve in with pressure.”
- “Attack deep middle until they solve it.”
- “First contact standard: playable ball first.”
- “Keep the rally alive and test their patience.”
- “Use the next timeout to reset serve-pass.”

The app should not overcoach. Suggestions should be short and actionable.

---

## 11. Data Structure

## 11.1 Teams Table

```sql
teams {
  id: string
  name: string
  level: string
  season: string
  created_at: datetime
  updated_at: datetime
}
```

---

## 11.2 Players Table

```sql
players {
  id: string
  team_id: string
  first_name: string
  last_name: string
  jersey_number: string
  position: string
  active: boolean
  photo_url: string
  created_at: datetime
  updated_at: datetime
}
```

---

## 11.3 Matches Table

```sql
matches {
  id: string
  team_id: string
  opponent_name: string
  match_date: date
  location: string
  match_type: string
  result: string
  notes: text
  created_at: datetime
  updated_at: datetime
}
```

---

## 11.4 Sets Table

```sql
sets {
  id: string
  match_id: string
  set_number: integer
  our_score: integer
  opponent_score: integer
  starting_server_team: string
  final_result: string
  created_at: datetime
  updated_at: datetime
}
```

---

## 11.5 Rally Events Table

```sql
rally_events {
  id: string
  match_id: string
  set_id: string
  rally_number: integer
  score_before_us: integer
  score_before_opponent: integer
  score_after_us: integer
  score_after_opponent: integer
  point_winner: string
  serving_team: string
  server_player_id: string
  rotation_number: integer
  outcome_type: string
  classification: string
  player_id: string
  notes: text
  created_at: datetime
}
```

---

## 11.6 Match Summaries Table

```sql
match_summaries {
  id: string
  match_id: string
  total_our_earned: integer
  total_our_gifted: integer
  total_opponent_earned: integer
  total_opponent_gifted: integer
  our_earned_gifted_ratio: float
  opponent_earned_gifted_ratio: float
  biggest_weapon: string
  biggest_leak: string
  suggested_focus: text
  created_at: datetime
  updated_at: datetime
}
```

---

## 12. Suggested Tech Stack

## Early Version

Recommended:
- React
- TypeScript
- Vite
- Tailwind CSS
- LocalStorage or IndexedDB for early prototype
- PWA support

Good for:
- fast build
- offline use
- browser-based testing
- easy phone/tablet access

## Scalable Version

Recommended:
- React or Next.js
- TypeScript
- Tailwind CSS
- Drizzle ORM
- Turso or SQLite
- Auth.js or Clerk, if login needed
- PWA support
- Cloud sync optional

## Why PWA First

A PWA fits the app because:
- coaches need quick access
- app stores slow down iteration
- browser-based install is enough
- offline mode matters in gyms
- tablet and phone use are both likely

---

## 13. Theme and Visual Design

## Design Feel

The app should feel:
- fast
- calm
- useful
- courtside-friendly
- readable under pressure
- closer to a weather dashboard than a spreadsheet

## Visual Style

Recommended:
- dark mode first
- high contrast
- large text
- large buttons
- minimal decoration
- clear icons
- no tiny controls during live tracking

## Color Direction

Suggested palette:

| Purpose | Color |
|---|---|
| Background | Deep navy / charcoal |
| Primary action | Teal |
| Positive / earned | Green |
| Warning / gifted | Amber |
| Opponent / negative | Red or muted coral |
| Neutral | Gray |
| Text | White / near-white |
| Secondary text | Cool gray |

Potential Century/TVVC-friendly palette:
- Black
- Teal
- Silver
- White
- Muted red/amber for alerts

## Typography

Use:
- clean sans-serif
- large numbers
- bold labels
- limited font weights

Avoid:
- tiny data tables during match
- decorative fonts
- cluttered icons
- overly technical stat abbreviations

---

## 14. UI Principles

### One-Hand Usability

The live match screen should be usable with one thumb on a phone.

### Two-Tap Default

Most common rally outcomes should be recordable in two taps.

### Fast Undo

Undo should always be visible.

### Live Clarity

The coach should understand the match state at a glance.

### No Blame Framing

The app should describe patterns, not attack players.

Use:
- “Main leak”
- “Current trend”
- “Needs support”
- “Gifted points”

Avoid:
- “Worst player”
- “Cost us”
- “Bad rotation”
- “Failure”

---

## 15. Live Dashboard Metrics

## Core Metrics

- Score
- Set number
- Match score
- Our earned points
- Our gifted points
- Opponent earned points
- Opponent gifted points
- Earned/gifted ratio
- Last 5 rallies
- Last 10 rallies
- Biggest point source
- Biggest point leak

## Optional Metrics

- rotation differential
- serve pressure trend
- player point involvement
- timeout impact
- set-to-set adjustment success
- first contact trend
- rally length estimate

---

## 16. Calculations

## Earned/Gifted Ratio

```text
earned_gifted_ratio = earned_points / gifted_points
```

If gifted points = 0, display:
- “Clean”
- or earned points with no ratio

## Gift Rate

```text
gift_rate = gifted_points / total_points_played
```

## Earn Rate

```text
earn_rate = earned_points / total_points_played
```

## Point Differential by Rotation

```text
rotation_point_differential = points_won_in_rotation - points_lost_in_rotation
```

## Recent Trend

Recommended:
- last 5 rallies
- last 10 rallies

Track:
- points won
- points lost
- earned points
- gifted points
- opponent earned points
- opponent gifted points

---

## 17. Match Weather Labels

The app may use simple labels to summarize current conditions.

Examples:

### Clean Pressure

We are earning points and gifting few.

### Gift Storm

We are giving away repeated points.

### Opponent Pressure

The opponent is earning points directly.

### Stable Exchange

Both teams are trading without a strong trend.

### Serve Leak

Serving errors are driving gifted points.

### Attack Leak

Attack errors are driving gifted points.

### Rotation Pressure

One rotation is creating a negative point trend.

### Opportunity Window

Opponent is gifting points. Stay steady and make them play.

---

## 18. Suggested Alert Logic

## Gift Storm

Trigger:
```text
our_gifted_points_in_last_6_rallies >= 3
```

Message:
> We are gifting too many points right now. Make them earn the next three.

## Serve Leak

Trigger:
```text
our_serve_errors_in_last_10_rallies >= 2
```

Message:
> Serve errors are becoming the main leak. Keep pressure, but make them play.

## Opponent Pressure

Trigger:
```text
opponent_earned_points_in_last_8_rallies >= 4
```

Message:
> Opponent is earning points directly. Identify the source and change the picture.

## Opportunity Window

Trigger:
```text
opponent_gifted_points_in_last_8_rallies >= 4
```

Message:
> Opponent is giving us points. Stay steady and extend rallies.

## Rotation Warning

Trigger:
```text
rotation_differential <= -4
```

Message:
> This rotation needs support. Consider timeout, sub, serve target, or receive adjustment.

---

## 19. Accessibility Requirements

The app should be accessible in a noisy gym and under time pressure.

Required:
- large tap targets
- high contrast
- readable text
- no reliance on color alone
- simple labels
- minimal nested menus
- offline capable
- responsive on phone and tablet

Recommended:
- haptic feedback on mobile
- confirmation animation after rally entry
- clear undo state
- large timeout card
- exportable plain text summary

---

## 20. Admin / Settings

## Team Settings

- team name
- season
- level
- roster
- default lineup
- color theme

## Match Settings

- rally tracking mode
- rotation tracking on/off
- player tracking on/off
- fast mode on/off
- neutral outcome on/off
- timeout alerts on/off

## Data Settings

- export data
- delete match
- reset season
- backup data
- import roster CSV

---

## 21. Reporting

## Match Summary Example

```text
Rally Ledger Match Report

Team: Century Varsity
Opponent: Example HS
Result: Lost 1–2

Overall:
Our earned points: 34
Our gifted points: 29
Opponent earned points: 31
Opponent gifted points: 25

Main weapon:
Kills from left-side attack

Main leak:
Serve errors and attack errors in transition

Match weather:
We were competitive when rallies extended, but gave away too many points in short exchanges.

Next practice focus:
Serve pressure with lower error rate.
Transition attacking under realistic pressure.
Rotation 3 receive-to-attack solutions.
```

---

## 22. Future Enhancements

## Version 2 Possibilities

- video tagging
- rally length tracking
- serve target mapping
- heat maps
- rotation lineup builder
- player trend reports
- team comparison reports
- scouting mode
- opponent tendencies
- AI-generated summaries
- coach voice notes
- Apple Watch quick tagging
- QR code match sharing
- cloud sync
- multi-user live tracking

## Version 3 Possibilities

- camera-assisted tagging
- live bench display
- player dashboard
- season trend models
- practice recommendations
- opponent scouting database
- integration with Hudl or similar tools

---

## 23. Build Priorities

## Priority 1

Build a reliable live match tracker.

Must work:
- score
- rally entry
- earned/gifted classification
- undo
- save match

## Priority 2

Build the live dashboard.

Must show:
- earned/gifted balance
- last 5 rallies
- biggest leak
- biggest weapon
- timeout card

## Priority 3

Build match history and reports.

Must allow:
- match review
- set review
- export
- notes

## Priority 4

Add rotation and player-level detail.

Only add after the core flow is smooth.

---

## 24. Development Guardrails

Do not let the app become a full stat program too early.

The app should not try to replace DataVolley, Hudl, Balltime, or advanced stat systems.

Rally Ledger should stay focused on:

> What is happening, what does it mean, and what should we do next?

Every feature should support live noticing, useful adaptation, or clear commitment.

If a feature slows down live use, hide it, simplify it, or remove it.

---

## 25. MVP Success Criteria

The MVP is successful if:

- a coach can start a match in under 30 seconds
- a rally can be logged in 2–4 taps
- undo works reliably
- the live dashboard is readable during play
- timeout view gives one useful coaching focus
- between-set view helps guide adjustment
- post-match summary identifies clear practice themes
- the app feels useful without needing perfect data

---

## 26. First Build Checklist

- [ ] Create app shell
- [ ] Create home screen
- [ ] Create roster screen
- [ ] Create new match screen
- [ ] Create live match screen
- [ ] Add score tracking
- [ ] Add rally outcome buttons
- [ ] Add earned/gifted classification
- [ ] Add undo
- [ ] Add local save
- [ ] Add live dashboard
- [ ] Add timeout card
- [ ] Add between-set summary
- [ ] Add match history
- [ ] Add exportable match report
- [ ] Test during a real or simulated match

---

## 27. Suggested First Prototype Constraint

The first prototype should track only:

- score
- set
- point winner
- outcome type
- earned/gifted/neutral
- last 10 rallies
- biggest leak
- biggest weapon

Do not add player tracking or rotation tracking until the live flow is easy.

This constraint protects the core purpose of the app.

---

## 28. Plain-English Product Summary

Rally Ledger is a live volleyball match app that helps coaches see whether points are being earned or gifted. Instead of overwhelming the bench with full stat sheets, it gives a simple match-weather view: what is happening right now, what trend is building, and what action the team should commit to next.

The app helps teams notice, adapt, and commit while the match is still happening.
