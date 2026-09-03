# Century Matchbook Rebuild Brief

## Project goal

Rebuild the Century volleyball match-tracking app from the ground up as a fast, low-friction tool for live match use.

The app is not intended to record everything that happens during a rally. It should record only:

1. How the rally started: Century serving or receiving.
2. Century's rotation at the start of the rally.
3. How the rally ended: who won the point and the terminal action.
4. The responsible Century player, only when useful and reasonably identifiable.

The primary success criterion is entry speed and clarity during a live match. If a feature makes live entry harder, it should be removed or moved out of the live-entry workflow.

## Non-negotiable product principles

- Design the live-entry interface before designing the database or analytics screens.
- Build a working front-end prototype with mock data first.
- Do not reuse complexity from the previous app unless it directly supports this brief.
- Do not track contacts or events occurring between serve and the terminal action.
- Most rallies must take one tap to record; player-attributed events may take a second tap.
- Avoid dropdowns, small icons, dense tables, scrolling, and confirmation dialogs during live entry.
- The complete live-entry interface must fit on a typical tablet in landscape orientation without scrolling.
- Every recorded rally must be undoable immediately.
- Score, possession, rotation, and server should be derived from the rally log whenever practical so corrections cannot corrupt later statistics.
- Use plain volleyball language. Do not display database or statistical jargon to the user.

## Phase 1: interactive live-entry prototype

Before implementing authentication, a production database, exports, or detailed reports, build an interactive prototype that can simulate a complete set.

The prototype must demonstrate:

- Match/set setup.
- Rally entry using the terminal-event controls below.
- Automatic score updates.
- Automatic serving/receiving changes.
- Automatic rotation advancement on a Century sideout.
- Current-server handling.
- Player attribution.
- Undo and correction.
- A simple post-set summary calculated from the recorded rallies.

Pause after this prototype and evaluate the interface through simulated rapid entry. Do not proceed to infrastructure work until the live flow is approved.

## Setup flow

Keep setup short enough to complete courtside.

### Team roster

- Maintain a reusable Century roster containing player name, number, and active/inactive status.
- Before a match, allow the scorer to select the participating players or use the default active roster.
- Player buttons should emphasize jersey number and use the name as secondary text.

### Match

Required:

- Opponent name.
- Participating Century roster.

Optional:

- Date, location, competition, and notes.

Defaults should be used whenever possible.

### Set

At the beginning of each set, ask for:

- Set number.
- Whether Century begins serving or receiving.
- Century's starting rotation, R1 through R6.
- Current server if Century begins serving.

Do not require a full formal lineup-management workflow for the first version. The current server must always be visible and easy to change. The app may remember the most recently used server for each rotation and suggest that player the next time Century serves in that rotation.

## Live-entry screen

The live-entry screen is the core product. Optimize it for a coach or manager watching the court while tapping quickly.

### Persistent header

Always show:

- Century score and opponent score in large type.
- Set number.
- A highly visible `SERVING` or `RECEIVING` state.
- Current Century rotation, R1-R6.
- Current server when Century is serving.
- `Undo` button.
- A compact `Correct` or `Edit last rally` control.

Tapping the rotation or server should permit a quick correction without leaving the screen.

### Terminal-event controls

Use two clearly separated areas: `CENTURY POINT` and `OPPONENT POINT`. Do not rely on color alone to distinguish them.

#### Century point

1. `ACE`
   - Credit the current server automatically.
   - Counts as a Century earned point.
   - Counts as a successful serve, serve attempt, ace, and breakpoint when Century was serving.

2. `KILL`
   - Prompt for the Century player.
   - Counts as a Century earned point.

3. `BLOCK`
   - Prompt for the Century player.
   - Include `TEAM BLOCK` when a single player should not be credited.
   - Counts as a Century earned point.

4. `THEIR ERROR`
   - Prompt for `Serve`, `Attack`, or `Other`.
   - No opponent player is needed.
   - Counts as a gift received by Century.

#### Opponent point

1. `KILL`
   - No Century player attribution.
   - Counts as an opponent-earned point.

2. `BLOCK`
   - No Century player attribution.
   - Counts as an opponent-earned point.

3. `ACE / RECEIVE ERROR`
   - Prompt for a Century receiver or `TEAM / UNCLEAR`.
   - Counts as a Century gift conceded through serve receive.

4. `SERVE ERROR`
   - Charge the current Century server automatically.
   - Counts as a Century gift conceded.
   - Counts as a serve attempt but not a serve in.

5. `ATTACK ERROR`
   - Prompt for the Century player or `TEAM / UNCLEAR`.
   - Counts as a Century gift conceded.

6. `BALL-CONTROL ERROR`
   - Prompt for the Century player or `TEAM / UNCLEAR`.
   - Use for a terminal non-attack contact error, including an unplayable set or other ball-control mistake that immediately ends the rally.
   - Counts as a Century gift conceded.

7. `VIOLATION`
   - Prompt for the Century player or `TEAM / UNCLEAR`.
   - Covers net, centerline, rotation, illegal-contact, and similar violations.
   - Counts as a Century gift conceded.

Keep these categories mutually exclusive. Record the single event that ended the rally. Do not also charge an attack error on an opponent block or a defensive error on an opponent kill.

### Player selection

- Use a large button grid or bottom sheet, not a dropdown.
- Jersey number should be the largest element.
- Include `TEAM / UNCLEAR` so the scorer is never forced to guess.
- Selecting the player completes and saves the rally immediately.
- Provide a clear back/cancel action if the wrong event was tapped.

### Speed and interaction requirements

- One tap: events that need no Century player attribution.
- One tap: Century ace and Century serve error because the server is already known.
- Two taps: kills, blocks, receive errors, attack errors, ball-control errors, and violations that need a player.
- `Their Error` may take two taps because only an error type—not a player—is required.
- Use touch targets of at least 56px, preferably 64px or larger on tablets.
- Give immediate visual feedback when a rally is recorded.
- Do not use a confirmation step for normal rally entry.
- Prevent accidental double-entry with a short interaction lock or idempotent event handling, without making the interface feel delayed.

## Rally and rotation state rules

At the start of each rally, save whether Century is serving or receiving and the current Century rotation.

After the rally:

| Starting state | Result | Next state |
|---|---|---|
| Century serving | Century wins | Continue serving; same rotation and server |
| Century serving | Opponent wins | Century receives; same rotation |
| Century receiving | Opponent wins | Continue receiving; same rotation |
| Century receiving | Century wins | Century rotates forward one position and begins serving |

When Century gains serve, display the suggested server for the new rotation. Make it possible to confirm or change the server with one obvious action. Remember corrections for that set when helpful, but never make server correction difficult because of substitutions or libero serving rules.

Rotation should wrap from R6 to R1.

## Core calculations

All calculations must be derivable from the rally log. Display both totals and per-set values where useful.

### Score

- Century score = all rallies won by Century.
- Opponent score = all rallies won by the opponent.

### Century point sources

- Earned points = Century aces + kills + blocks.
- Gifts received = opponent serve errors + opponent attack errors + opponent other errors.
- Century total points = earned points + gifts received.

### Opponent point sources

- Opponent-earned points = opponent kills + opponent blocks.
- Century gifts conceded = receive errors + serve errors + attack errors + ball-control errors + violations.
- Opponent total points = opponent-earned points + Century gifts conceded.

These labels should remain explicit. Do not use the ambiguous label `gifted points` without indicating whether the app means gifts received or gifts conceded.

### Breakpoint percentage

Breakpoint percentage measures how often Century wins a rally that begins with Century serving.

`Breakpoint % = Century points won while serving / total Century service rallies`

Calculate for:

- Team overall.
- Each set.
- Each Century rotation.
- Each server.

### Sideout percentage

Although it was not part of the initial list, include sideout percentage because it requires no additional input and directly complements breakpoint percentage.

`Sideout % = Century points won while receiving / total Century receive rallies`

Calculate for:

- Team overall.
- Each set.
- Each Century rotation.

### Serving

- Serve attempts = all rallies that begin with Century serving.
- Serve errors = service rallies ending immediately as `SERVE ERROR`.
- Serves in = serve attempts - serve errors.
- Serve IN % = serves in / serve attempts.
- Ace % = Century aces / serve attempts.
- Breakpoints while serving = Century-won service rallies.
- Points won and lost during each player's service runs.

Calculate serving results for the team and for each server. Handle zero-denominator cases with `--`, not `0%`.

### Rotation performance

For R1 through R6, show:

- Total rallies.
- Points won and lost.
- Point differential.
- Earned points.
- Gifts received.
- Gifts conceded.
- Breakpoint percentage while serving.
- Sideout percentage while receiving.

Keep serving and receiving performance distinguishable; a single combined win percentage can conceal the source of a rotation problem.

### Player contribution

For each Century player, show:

- Earned points: aces, kills, and credited blocks.
- Gifts conceded: serve, receive, attack, ball-control, and violation errors charged to that player.
- Earned-minus-gifts balance.
- Serving attempts, serves in, serve IN %, aces, ace %, and breakpoint % as server.

Team/unassigned events must remain in team totals but must not be assigned arbitrarily to an individual.

## Reports and in-match information

The live screen should prioritize entry, not analytics. Provide a compact, optional in-match summary reachable with one tap and dismissible immediately.

Suggested in-match summary:

- Current-set earned points, gifts received, and gifts conceded.
- Team breakpoint % and sideout %.
- Current rotation's breakpoint or sideout performance.
- Serve IN %.
- Recent service-run results.

The post-match report may be more detailed and should include:

- Match and set scoring.
- Point-source breakdowns.
- Rotation comparison.
- Player contribution table.
- Team and individual serving table.
- Simple filters for match/set and serving/receiving.

Do not add speculative coaching recommendations in the first version. Present trustworthy evidence that the coach can interpret.

## Corrections and reliability

### Undo

- `Undo` removes or voids the most recent rally immediately.
- Score, possession, rotation, server, and every statistic must recalculate correctly.
- Provide a brief, non-blocking option to restore an accidentally undone rally if practical.

### Edit last rally

Allow correction of:

- Winner.
- Terminal event.
- Credited or charged player.
- Starting serving/receiving state.
- Starting rotation.
- Server.

After any correction, recalculate the set state from the rally history rather than applying fragile incremental patches.

### Offline behavior

Live match entry must continue if the internet connection is weak or absent.

- Save rallies locally immediately.
- Never lose a recorded rally because a network request failed.
- Clearly but unobtrusively indicate unsynced data.
- Sync when connectivity returns if a backend is included.

For the prototype and earliest usable version, reliable local persistence is more important than authentication or multi-device sync.

## Suggested data model

Use an event-log model centered on immutable rally records. Exact implementation may follow the existing stack, but the conceptual model should include:

### Match

- ID
- opponent
- date/time
- location/competition, optional
- selected roster

### Set

- ID
- match ID
- set number
- initial serving/receiving state
- initial rotation
- status: active/completed

### Rally

- ID
- set ID
- sequence number
- timestamp
- Century state at rally start: serving or receiving
- Century rotation at rally start: R1-R6
- Century server ID when serving
- winner: Century or opponent
- terminal event
- error subtype where applicable
- credited Century player ID, nullable
- charged Century player ID, nullable
- team/unclear attribution flag
- active/voided status for undo history

Store the raw facts. Derive display categories and percentages from them rather than permanently storing calculated totals.

## Visual design direction

- Mobile-first responsive PWA, optimized first for a tablet in landscape orientation.
- Century Jaguars visual identity: teal, black, white, and restrained silver.
- Strong contrast suitable for a bright gym.
- Large typography and buttons.
- Clear text labels paired with color; never communicate meaning through color alone.
- Keep animation brief and functional.
- Prevent the screen from sleeping during an active set when the platform permits.
- Make the interface usable without hover and with imprecise taps.

## Scope exclusions for the first version

Do not add these until the core workflow is proven:

- Contact-by-contact rally tracking.
- Passing ratings.
- Shot or court-location charts.
- Lineup/substitution administration beyond quick server correction.
- Opponent player statistics.
- Video synchronization.
- Predictive recommendations.
- Complex user roles or permissions.
- Custom report builders.
- Knockout percentage.

## Acceptance tests

The first usable version is complete only when all of the following are true:

1. A scorer can set up a match and begin a set in under 60 seconds using an existing roster.
2. A complete simulated 25-point set can be entered without scrolling the live screen.
3. At least 80% of rallies can be entered with one tap; player-attributed rallies require no more than two taps.
4. The scorer can look away after a tap and trust that the event was recorded.
5. Score, possession, rotation, and current server update correctly under all four state transitions.
6. Undoing and editing rallies restores the correct score, rotation, possession, serving data, and reports.
7. Breakpoint %, sideout %, serve IN %, and ace % match hand-calculated test fixtures.
8. Rotation and player totals reconcile with the underlying rally log.
9. The app remains functional through a simulated loss of network connectivity and a page refresh.
10. No KO%, passing grades, or intermediate-rally tracking appears in the live workflow.

## Implementation sequence

1. Inspect the existing project only to identify reusable roster data, styling assets, and deployment constraints. Do not inherit its interaction model automatically.
2. Create the state model and calculation tests for rallies, scoring, possession, rotations, breakpoint %, sideout %, and serving.
3. Build the live-entry prototype with mock roster data and local state.
4. Test by rapidly entering several scripted sets, including corrections, long service runs, sideouts, substitutions of the current server, and offline refreshes.
5. Present the prototype for usability approval.
6. Only after approval, add durable persistence, roster management, reports, export, authentication, and deployment as needed.

When tradeoffs arise, protect live-entry speed, legibility, and data reliability before adding more information.
