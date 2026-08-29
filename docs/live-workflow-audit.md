# Live Workflow Audit

Last updated: 2026-08-29

## Scope

This audit covers the real match-day workflow:

- Match setup and set start.
- Live rally entry.
- Score persistence.
- Serve, receive, and terminal-player attribution.
- Rotation and lineup state across sets.
- Tablet/iPad live-screen layout.
- Post-match report handoff.

## Initial Findings

### High: live scoring state could carry across sets

`useLiveMatchLogic` initialized serving state, rotation, lineup, and selected rally-entry fields from the first active set. When a new active set became current, fields such as `servingTeam`, `serverPlayerId`, selected outcome state, and current rotation were not guaranteed to reset to the new set defaults if the new set metadata did not explicitly include every value.

Match-day impact:

- A new set could begin with the prior set's serving side.
- Server confirmation could be skipped or pointed at the wrong player.
- Rally attribution could feel wrong from the first point of a new set.

Status: fixed and deployed. The hook now treats `activeSet.id` changes as a hard transition and resets entry state from the new set's metadata or `startingServerTeam`.

### High: rapid taps could race while a point save was pending

The live scoring surface allowed additional rally-entry taps while the previous point save was still pending. Because the client builds the rally payload from the current active-set score and current rally list length, very fast repeated taps can create stale score/rally snapshots before React Query has reconciled the optimistic update.

Match-day impact:

- A point could appear to be ignored or overwritten.
- Rally numbers and score-before/after values could become confusing.
- User confidence drops because the app gives no strong "saving this point" state.

Status: fixed and deployed. The live page now uses a local save lock for rally completion, manual score changes, and undo. The rally-entry panel shows a visible `Saving point...` overlay while locked.

### Medium: iPad browser chrome can compress the live screen

The live match screen used `min-h-screen`, which can behave poorly in tablet browsers where the browser chrome changes the usable viewport. The app's live workflow is dense by design, so even a small viewport-height mismatch can push the action area into an awkward or clipped layout.

Match-day impact:

- Rally-entry controls may not fit predictably on iPad.
- The scorer may need to use another device even though the screen size should be adequate.

Status: partially fixed. The root live screen now uses dynamic viewport height (`h-dvh max-h-dvh`) and hides root overflow so the score, court, rally-entry area, and action bar are constrained to the actual visible viewport. Authenticated production QA at 1024 x 768 still showed the court consuming too much vertical space, so this pass adds landscape-tablet density rules that cap and narrow the court and reserve the remaining height for rally entry.

### Medium: Home showed Resume Live Match without a loaded active match

The home screen rendered `Resume Live Match` unconditionally. Production QA showed the button could appear even when `/match/live` immediately redirected home because no active match was loaded in the client context.

Match-day impact:

- The scorer can think a live match exists or that resume is broken.
- It creates uncertainty before a match starts.

Status: superseded by the deployed database-backed resume flow. Home now shows `Resume vs ...` for the current local active match or the first active match returned from the database.

### Medium: New Match submit button could sit below iPad landscape viewport

Production QA at 1024 x 768 showed the `Create Match` button below the visible viewport until manually scrolled into view.

Match-day impact:

- Match setup is harder on tablets in landscape orientation.
- A scorer can believe required setup is complete but miss the final action.

Status: fixed and deployed. The submit action is now fixed to the bottom of the viewport with enough page padding to prevent overlap.

### Low: some live/report leader labels still used abbreviated names

Serve/receive report cards already show `#number FirstName`, but live dashboard leaderboards and match-detail top earner/gifter labels still used last names or abbreviated labels.

Match-day impact:

- Player attribution is harder to scan quickly.
- It conflicts with the agreed reporting label convention.

Status: fixed and deployed. Dashboard leaderboards, live skill tables, top serve missers, and match-detail top earner/gifter labels now use first names.

### High: active matches were hard to resume from another browser/session

Production QA on 2026-08-28 showed two active matches in History. Clicking an active match opened the post-match report route (`/match/history/:matchId`) instead of live scoring, and Home did not show a resume action when the active match was not already present in that browser's local `activeMatch` state.

Match-day impact:

- A scorer could reopen the app and see active matches but land on reports instead of the scoring screen.
- Starting from a different device or browser could hide the resume action even though the database still had active matches.
- It made the beginning of a live workflow feel broken or uncertain.

Status: fixed and deployed. History now routes active matches through `resumeMatch()` to `/match/live`, while completed matches still open the report. Home now shows `Resume vs ...` using the current active match or the first active match returned from the database.

### Medium: production PWA could keep serving stale bundles after deploys

During production QA, Netlify had successfully deployed the active-match resume fix, but the signed-in QA browser continued to show the old History/Home behavior until the stale service worker was manually cleared.

Match-day impact:

- A fix can be deployed but not appear on the scorer's device.
- Coaches may think a deployment failed when the device is actually running an old cached PWA bundle.

Status: fixed and deployed. The app now explicitly registers the service worker with `virtual:pwa-register`, uses immediate registration, and reloads when a refreshed bundle is needed.

## Production QA Notes

Authenticated production QA on 2026-08-28 created and then deleted a disposable match named `QA Workflow Audit Delete Me`.

Observed results:

- Serve ace and serve error both persisted and updated the live score correctly.
- Serve stats on the live dashboard matched the test sequence: one ace, one error, 50% in, 50% KO.
- Receive quality and receiver selection persisted for an opponent serve.
- End-match from the live More menu completed the test match and returned to Home.
- The deleted QA match no longer appeared in History after cleanup.
- Two older active test/practice matches remained in production History and were not modified.
- On 2026-08-28, production QA found that active matches opened reports instead of live scoring from History. Fixed and deployed in `7cbb344`.
- On 2026-08-28, production QA found the signed-in browser could keep a stale PWA bundle after a successful deploy. Fixed and deployed in `b80d342`.
- After clearing the stale QA service worker, production at tablet size confirmed History showed `Resume scoring`, active matches opened `/match/live`, Home showed `Resume vs test 2`, and no browser errors were reported.

Important limitation:

- The intended kill-entry path was not fully validated in that production pass because the selected terminal outcome was accidentally `Ace` instead of `Kill`.

## Browser QA Still Needed

The next authenticated browser validation pass should cover:

1. iPad/tablet portrait: 768 x 1024.
2. iPad/tablet landscape: 1024 x 768 and 1180 x 820.
3. Two-set workflow from new match through match completion.
4. Rapid-tap prevention during point save.
5. Serve attribution: predicted server, manual server selection, ace, error, in-system, and KO.
6. Receive attribution: receive quality, receiver selection, opponent ace.
7. Substitution display and attribution after a sub.
8. Reports after the test match.
9. Kill attribution from receive sequence through dashboard and match-detail report.
10. Active-match cleanup workflow for old practice/test matches.

## Validation Commands

Use the project standard checks after fixes:

- `npm run lint`
- `npm run test -- --run`
- `npm run build`

Use browser QA with authenticated app access before calling the full workflow production-ready.
