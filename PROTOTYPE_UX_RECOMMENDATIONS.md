# Prototype UX Recommendations

## Direction

The rebuild should keep protecting the core concept: record the terminal rally event as quickly and reliably as possible. Anything that helps setup, lineup, reports, or review should stay secondary to the live-entry tap path.

## Prioritized Changes

1. Simplify the setup path.
   The first setup surface should let a scorer start a set quickly with opponent, set number, serving or receiving, starting rotation, and court side. Full roster and lineup editing should be available, but not shown by default.

2. Separate start-set setup from roster and lineup management.
   Roster entry and lineup editing are important, but they are lower-frequency tasks. Put them behind explicit edit buttons so the normal courtside path stays short.

3. Reduce tablet-landscape scrolling pressure.
   The live screen should keep the event buttons visible first. Current lineup, recent rallies, and summary should remain compact, collapsible, or limited to the most recent few items when vertical space is tight.

4. Make Summary temporary.
   The in-match summary should behave like a quick overlay or drawer. It should be easy to open for context and easy to dismiss so the default screen returns to scoring mode.

5. Tighten control labels.
   Use labels that describe the immediate action: Setup, Edit Lineup, Sub, Court Side, Start Set. Avoid vague labels such as Change when the scorer is moving quickly.

6. Avoid reopening full setup unnecessarily.
   Once a usable roster and lineup exist locally, the prototype should default to the scoring screen. Setup should stay one tap away, but it should not block live entry by default.

7. Treat reporting as two related views.
   Each completed match needs its own breakdown by set, earned/gifted balance, scoring source, and player attribution. The season report should combine every match for the selected roster and keep the same questions visible: where we earn, who earns, where we gift, and who gifts.

8. Provide explicit test-data cleanup.
   Production testing will create disposable rosters and match runs. The prototype needs report-level controls to delete a specific match, clear the current match, or delete the current roster plus lineup and match data, with confirmations before destructive actions.

9. Make set boundaries explicit.
   A set should be ended deliberately so reports can link multiple sets inside the same match. Ending a set should preserve the completed set in the current match report, clear the rally-entry surface, and send the scorer back through setup for the next set's side, serve/receive, rotation, and lineup confirmation.

## Started Implementation

- Make the app open directly to the live scoring screen with saved/default setup.
- Rework the setup sheet so the quick start controls are first.
- Hide roster and lineup management behind explicit edit buttons.
- Rename the live lineup action from Change to Edit Lineup.
- Move Summary out of the persistent live layout and into a temporary overlay.
- Limit Recent Rallies to the last three by default and tighten support-panel spacing for tablet landscape.
- Add a 45-rally scripted set fixture that verifies a 25-20 result, earned/gifted totals, player attribution, undo, and correction recalculation.
- Add prototype match and season report aggregation so the new concept can show a match-by-match breakdown and a combined season report.
- Move data cleanup out of Start Set and into Reports, with per-match deletion plus current-match and roster cleanup actions.
- Rename the live setup control from serving/receiving status to Match Setup, add a dedicated End Set action, and keep ended sets linked in the current match report.

## Validation Added

- Model test coverage now includes a realistic full-set rally log with one-tap events, player selections, team/unclear attribution, and opponent error subtypes.
- Browser dogfooding now includes a visible full-set tap sequence through the prototype, ending at 25-20 with the live summary opened.
- Reporting coverage now verifies set-level match reports and cumulative season totals from the same rally summary model.
