# Century Matchbook App Audit Roadmap

Last updated: 2026-08-29

## Current Health

- `npm run lint` passes.
- `npm run test -- --run` passes.
- `npm run build` passes.
- Latest confirmed production deploy: `b80d342 fix: activate deployed app updates`.
- Vite reports a large client chunk, so code splitting is worth addressing after core reliability work.

## Highest Priority Changes

1. Move database writes behind server APIs.
   - Done for core roster, match, set, and rally workflows.
   - Done: obsolete browser database client import path has been removed.

2. Make rally + score + live-state writes atomic.
   - Rally creation, set score update, and serving/rotation metadata should not be able to partially succeed.
   - Short-term improvement: use LibSQL batch writes for the rally insert and set update.
   - Longer-term improvement: move the full scoring command to a server function that validates ownership and writes all related state together.

3. Sort rallies explicitly before "latest rally" behavior.
   - Undo, recent trend calculations, and history views depend on rally order.
   - Queries should order rallies by `rallyNumber` and use `createdAt` as a tie-breaker where useful.

4. Hydrate rally metadata consistently.
   - Live queries map `serveResult`, `receiveResult`, and `receivePlayerId` out of `rally.metadata`.
   - Historical match details should use the same mapping so post-match serve and receive stats are accurate.

## Security Upgrades

- Replace localStorage-only auth with a real session token or cookie-backed session.
- Add rate limiting and signup controls to the auth function.
- Avoid returning or trusting mutable client-side user records as authority.
- Keep destructive operations, especially reset/delete flows, behind server authorization.

## Product And UX Upgrades

- Add a visible pending/offline queue count during live matches.
- Done: disable rapid repeated scoring taps while a point write, manual score adjustment, or undo is pending.
- Add clearer recovery messaging when a rally fails to save.
- Done: add initial export/share flows for post-match and season reports (copyable text, text download, CSV bundle).
- Done: add initial cumulative season reports for team/player trends across matches.
- Done: add match-level setup for best-of format, fixed scrimmage formats, target scores, and deciding-set target.

## Analytics Upgrades

- Extract shared stat helpers for live dashboard and match detail pages.
- Add set-aware summaries using actual set records, not inferred rally order.
- Add tests for out-of-order rally rows, multi-set summaries, and historical metadata hydration.
- Track more context for first-ball side-out instead of approximating from outcome type alone.

## Performance Upgrades

- Code-split route-level pages, especially dashboard/history/report views.
- Avoid mutating arrays during render by copying before sorting.
- Consider memoized player lookup maps where dashboard calculations repeatedly call `players.find`.

## Suggested Implementation Order

1. Continue tablet and large-phone layout validation in real scorer-table workflows.
2. Address bundle/code-splitting after the live scoring path is consistently reliable.

## Implementation Notes

- Done: deterministic rally ordering and shared rally normalization.
- Done: live and historical rally reads hydrate metadata consistently.
- Done: live rally save and undo use one atomic write batch.
- Done: scoring and undo are moved behind a Netlify function.
- Done: match creation, match updates, set creation, and set updates are moved behind Netlify functions.
- Done: roster creation/update and player add/delete writes are moved behind Netlify functions.
- Done: team, player, match, active-set, and rally reads are moved behind Netlify functions.
- Done: auth issues signed session tokens, and functions reject missing or invalid sessions.
- Done: auth has basic rate limiting and configurable signup controls.
- Done: multi-coach access model supports global admins, assigned team coaches, and program-wide roster/report visibility.
- Done: Settings includes an admin-only Coach Access panel for assigning and removing roster-specific coach permissions.
- Done: Settings reset is admin-only and no longer appears for normal coach accounts.
- Done: local and example Turso config use server-only `TURSO_*` env names instead of browser-exposed `VITE_*` names.
- Done: Netlify functions use the LibSQL web transport to avoid native optional package failures in production.
- Done: roster and new-match screens use permission-aware controls so coaches can view shared rosters but only edit/start matches for assigned teams.
- Done: admins can delete rosters through a server-side cascade that removes related players, matches, sets, rallies, and coach assignments.
- Done: historical match details include report copy/download controls, and `/reports` shows initial cumulative season stats using shared report helpers.
- Done: coaches/admins can delete individual matches through a server-side cascade that removes related sets and rallies from history and reports.
- Done: serve reports infer one-tap ACE/ERR entries from outcome-only rally rows so older tracked scrimmages are counted correctly.
- Remaining: consider cookie-backed sessions and durable/distributed rate limiting before public launch.
- Done: added richer season trend charts to the Reports page.
- Done: added richer print/export report layouts with paper headers, print metadata, and complete player stat tables for coach packets.
- Done: added a live workflow audit and fixed two match-day reliability issues: active-set transitions now reset entry/serving state, and live rally entry locks while saves are pending.
- Done: switched the live match route to dynamic viewport height so iPad/tablet browsers are less likely to clip the scoring controls.
- Done: active matches can be resumed from History and Home using database-backed active match records, not only the browser's local activeMatch state.
- Done: added explicit service-worker registration so newly deployed PWA bundles activate more reliably.
- Done: tightened the recent rally audit strip for tablet landscape layouts so it consumes less vertical space.
- Done: authenticated production QA validated a controlled serve ace, serve error, receive-to-kill rally, side-out rotation, live dashboard, match report, season report, and QA match cleanup.
- Done: authenticated production QA validated undo from saved ace through live score, recent-rally strip, and live dashboard; found that Abandon Match only navigated home and fixed it to delete the active match through the existing server-side cascade.
- Done: deployed and production-verified the Abandon Match fix with a disposable `QA Abandon Verify` match; a pre-existing active `Test` match remains untouched.
- Done: authenticated production QA validated a fixed two-set match through both set completions, manual match closeout, completed match report, and QA cleanup; found and fixed fixed-format set target handling so fixed two-set and single-set matches use the standard target instead of the deciding target.
- Done: deployed and production-verified the fixed-format target correction on Netlify deploy `6a92d2cb75e3cc0008faea40`; disposable `QA Target Verify` and `QA Single Target` matches confirmed two-set set 2 and single-set set 1 both use target 25, then were deleted.
- Done: production-verified substitution display and attribution with disposable `QA Sub Verify`; #7 Kaia substituted into zone 4, appeared as `SUB 7 FOR #1`, received a credited kill, appeared in live stats as the top earner, appeared in the completed report's kill/top-earner/rally-log sections, and the QA match was deleted.
- Done: added focused automated coverage for database-backed active-match resume from Home/History, fixed-format match completion screens, report total-to-set reconciliation, and PWA service-worker/query bootstrap wiring. Verified with `npm run lint`, `npm run test -- --run`, and `npm run build`.
- Done: improved active-match lifecycle controls so Home lists every active match with a Manage shortcut, History groups active and completed matches separately, and active cleanup uses explicit "Abandon active match" wording while completed cleanup uses "Delete completed match" wording.
- Done: hardened game-night offline/update feedback with a visible status chip for Synced, Syncing, Offline, and queued paused writes, plus an Update Ready action that lets the scorer choose when to reload instead of forcing an automatic refresh.
