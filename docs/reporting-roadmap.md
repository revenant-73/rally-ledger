# Reporting Roadmap

Last updated: 2026-08-30

## Goals

Rally Ledger should turn tracked rally data into coach-friendly reports that are useful during post-match review, parent/player communication, and season-long practice planning.

The reporting experience should have three layers:

1. Single-match report views inside the app.
2. Downloadable and copyable report formats.
3. Cumulative team and player reports across a season.

## Single-Match Report View

The existing match detail screen should become the primary post-match report. It should keep the current compact mobile-first style, but organize the data into review sections:

- Match snapshot: opponent, date, location, match type, result, and set scores.
- Coach takeaway: biggest weapon, biggest leak, and suggested practice focus.
- Earned/gifted balance: our earned points, our gifted points, opponent earned points, and opponent gifted points.
- Serve report: attempts, aces, errors, serve-in percentage, KO percentage, and player serving leaders.
- Receive report: attempts, 3-pass, 2-pass, overpass, ace/error, average pass score, and player passing leaders.
- Kill report: kills, attack errors, kill/error net, kill percentage, and player attacking leaders.
- Set-by-set breakdown: final score, earned/gifted split, serve pressure, and passing score.
- Player impact: top earners, top gifters, serve leaders, and pass leaders.
- Done: Rally log with filters by set, player, outcome type, earned/gifted/neutral classification, serving side, and rotation.

## Downloadable Reports

Exports should be useful without requiring another tool first.

Recommended order:

1. Copyable text summary
   - Fastest option for texts, email, and coach notes.
   - Should include match snapshot, set scores, key stats, player leaders, and practice focus.

2. CSV downloads
   - Best for Google Sheets or Excel.
   - Useful CSV files:
     - Match summary.
     - Player serving.
     - Player receiving.
     - Kill report.
     - Set summaries.
     - Rally log.
   - Season report CSV files:
     - Season summary.
     - Match trends.
     - Player totals across serve and receive.
     - Player serving.
     - Player receiving.
     - Kill report.
     - Opponent breakdown.
     - Practice plan.

3. Done: print-friendly report
   - Use browser print/save-to-PDF before adding a heavy PDF-generation dependency.
   - Print styles hide app navigation/actions and convert report views to white-paper layouts.

## Cumulative Season Reports

Add a Reports area for team-wide trends across multiple matches.

Suggested filters:

- Team.
- Season.
- Date range.
- Match type.
- Opponent.
- Result.
- Player.

Core season report sections:

- Season snapshot: matches played, record, sets won/lost, rallies tracked, earned/gifted balance.
- Done: visual team trend charts for earned/gifted points, serve-in percentage, serve KO percentage, pass score, and kill/error net by match.
- Serve season report: team serve percentage, KO percentage, aces, errors, pressure serves, and player leaderboard.
- Receive season report: team pass score, 3-pass/2-pass/overpass/error counts, and player leaderboard.
- Kill season report: team kills, attack errors, kill/error net, kill percentage, and player leaderboard.
- Expandable all-player serving and receiving tables for roster-complete stat review.
- Expandable all-player kill report table for roster-complete attacking review.
- Earned/gifted report: top scoring sources, top leaks, and cumulative player point earners/gifters.
- Player development view: per-player recent form compared with season average.
- Done: practice planning view with auto-generated priorities, player watch list, and recent-match check from season trends.

Completed report filters:

- Date range.
- Match type.
- Opponent.
- Result.
- Filtered match count.
- Clear filters action.

## Implementation Order

1. Done: extract shared report/stat helpers so live, match-detail, export, and season reports use the same calculations.
2. Done: add copyable single-match text summaries.
3. Done: add CSV downloads for match summary, player serving, player receiving, set summaries, and rally logs.
4. Done: add a season report API action that fetches all authorized match, set, rally, and player data for selected teams.
5. Done: add a Reports page with team/season filtering and cumulative stat views.
6. Done: add copyable text and CSV downloads for season reports.
7. Done: add print styles and native print controls for browser save-to-PDF.
8. Done: expand season downloads into a coach-ready CSV package with player totals, opponent breakdown, and practice plan files.
9. Done: add cumulative report filters for date range, match type, opponent, and result.
10. Done: add expandable all-player serving and receiving stat tables to cumulative reports.
11. Done: add kill reports with kills, attack errors, kill/error net, individual-match cards, match-trend columns, all-player season rows, and CSV export files.
12. Done: add a stats audit document covering report formulas, live dashboard formulas, and coverage boundaries.
13. Done: add cumulative player point earner/gifter leaderboards and point-leaders CSV exports.
14. Done: add filtered rally logs to individual match reports for set, player, outcome, classification, serving side, and rotation drill-down.
15. Done: add richer season trend charts to the Reports page using existing match trend data.
16. Done: add richer print/export report layouts with paper headers, print metadata, and complete player stat tables that print even when expandable on-screen sections are collapsed.
17. Done: organize match and season report screens into task-based sections so coaches can jump to overview, skills, players, trends/gifts, and rally detail without scrolling through every stat block.
18. Done: replace the horizontal report section scroller with an all-device dropdown so mobile and tablet users can change report views without sideways scrolling.
19. Done: collapse season report filters into an accordion so the report content stays higher on mobile and tablet screens unless filters are being edited.
20. Done: add a practice plan report view that turns season stats into prioritized training blocks, player watch rows, and latest-match context.
21. Consider a dedicated PDF rendering pipeline only if browser print/save-to-PDF is not enough for coach packets.

## Validation

Use the project standard checks after implementation:

- `npm run lint`
- `npm run test -- --run`
- `npm run build`

Manual UI validation should include desktop and mobile widths, especially for stat tables and export buttons.
