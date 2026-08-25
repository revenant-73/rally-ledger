# Reporting Roadmap

Last updated: 2026-08-25

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
- Set-by-set breakdown: final score, earned/gifted split, serve pressure, and passing score.
- Player impact: top earners, top gifters, serve leaders, and pass leaders.
- Rally log: a later enhancement with filters by set, player, outcome type, earned/gifted, and serve/receive.

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
     - Set summaries.
     - Rally log.
   - Season report CSV files:
     - Season summary.
     - Match trends.
     - Player totals across serve and receive.
     - Player serving.
     - Player receiving.
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
- Team trends: earned points per match, gifted points per match, serve-in percentage, serve KO percentage, and pass score by match.
- Serve season report: team serve percentage, KO percentage, aces, errors, pressure serves, and player leaderboard.
- Receive season report: team pass score, 3-pass/2-pass/overpass/error counts, and player leaderboard.
- Earned/gifted report: top scoring sources and top leaks.
- Player development view: per-player recent form compared with season average.
- Practice planning view: auto-generated focus areas from the season trends.

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
10. Add richer dedicated print/export report layouts if coaches need more polished packets later.

## Validation

Use the project standard checks after implementation:

- `npm run lint`
- `npm run test -- --run`
- `npm run build`

Manual UI validation should include desktop and mobile widths, especially for stat tables and export buttons.
