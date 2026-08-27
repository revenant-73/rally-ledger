# Stats Audit

Last updated: 2026-08-26

## Source Fields

All match stats are derived from `RallyEvent` rows plus set metadata.

- `pointWinner`: awards the point to `Us` or `Opponent`.
- `servingTeam`: identifies who served the rally.
- `classification`: `Earned`, `Gifted`, or `Neutral`.
- `outcomeType`: the scored outcome such as `Ace`, `Kill`, `Serve Error`, or `Attack Error`.
- `serverPlayerId`: our server when `servingTeam` is `Us`.
- `receivePlayerId`: our passer when `servingTeam` is `Opponent`.
- `metadata.serveResult`: our serve quality, normalized to `serveResult`.
- `metadata.receiveResult`: our pass quality, normalized to `receiveResult`.
- `metadata.rotation`: rotation used for side-out and point-scoring breakdowns.

Manual score adjustments are stored as neutral rallies and should not affect earned/gifted, serve, receive, or attack skill stats.

## Shared Helpers

`src/utils/rallyResults.ts` is the gatekeeper for serve and receive result counting.

- `getServeResult(rally)` only returns a result when `servingTeam === 'Us'`.
- `getReceiveResult(rally)` only returns a result when `servingTeam === 'Opponent'`.
- Our aces and serve errors can be inferred from `outcomeType` for older rows.
- Opponent aces can be inferred as our receive errors for older rows.

This prevents stray metadata from counting on the wrong serving side.

## Report Formulas

`src/utils/reportStats.ts` is the source of truth for match reports, season reports, text exports, and CSV exports.

- Our earned: `pointWinner === 'Us' && classification === 'Earned'`.
- Our gifted: `pointWinner === 'Opponent' && classification === 'Gifted'`.
- Opponent earned: `pointWinner === 'Opponent' && classification === 'Earned'`.
- Opponent gifted: `pointWinner === 'Us' && classification === 'Gifted'`.
- Serve attempts: our serve rallies with a valid serve result.
- Serve in percentage: `(serve attempts - serve errors) / serve attempts`.
- Serve KO percentage: `(aces + out-of-system serves) / serve attempts`.
- Serve KO count: `aces + out-of-system serves`; expanded serving reports also show out-of-system separately as `OOS`.
- Receive attempts: opponent serve rallies with a valid receive result.
- Pass score: `(3 * in-system + 2 * out-of-system + 1 * overpass) / receive attempts`.
- Kills: earned `Kill` outcomes won by us.
- Attack errors: gifted `Attack Error` outcomes won by the opponent.
- Kill/error net: `kills - attack errors`.
- Kill percentage: `kills / (kills + attack errors)`.
- Player point earners/gifters: attributed earned points are our `Earned` rallies; attributed gifted points are opponent points with our `Gifted` classification. Attribution uses `playerId` first, with server/passer fallback for older serve and receive rows.
- Team gift context: our unforced-error gifts are `pointWinner === 'Opponent' && classification === 'Gifted'`, grouped without player detail by `outcomeType`, `servingTeam`, score phase, score state, and `metadata.rotation` when present.

The current attack report is a kill/error report, not a full hitting percentage, because non-terminal attack attempts are not tracked.

## Live Dashboard Formulas

`src/hooks/dashboard/useDashboardMetrics.ts` derives live match-weather stats from active-match rallies.

- Set-level serve and receive panels use the active set only.
- Player serving and passing leaderboards use the active match.
- Side-out percentage uses rallies where the opponent served and we won the point.
- Point-scoring percentage uses rallies where we served and won the point.
- First-ball side-out is approximated as earned kills won by us on opponent serve.
- Rotation efficiency uses `metadata.rotation`.

Known limitation: live dashboard set summaries infer set order from available active-match rally rows. Completed post-match reports use persisted set records instead.

## Report Coverage

Current report surfaces include:

- Individual match page: match info, sets, earned/gifted balance, team gift context, serve report, receive report, kill report, top earner, top gifter, and filtered rally log.
- Individual match text/CSV exports: summary, serving, receiving, kill report, team gift context, set breakdown, and rally log.
- Season Reports page: season snapshot, skill snapshot, team gift context, point earners/gifters, serving leaders, receiving leaders, kill report, all-player tables, and match trends.
- Season CSV package: summary, match trends, player totals, team gift context, point leaders, serving, receiving, kill report, opponent breakdown, and practice plan.

## Validation

Use:

- `npm run lint`
- `npm run test -- --run`
- `npm run build`

Regression coverage should include serve/receive side guards, match-detail receive counts, report stat rollups, and report exports.
