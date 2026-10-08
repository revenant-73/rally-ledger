# Courtside offline scoring

The primary scorer at `/` stores each match document on this device before
attempting a cloud upload. The document includes the current rallies, completed
sets, match lifecycle, roster, lineups, and finished season matches. Historical
browser-storage keys and the `matchbookPrototypeV1` cloud key are retained.

## Coach workflow

- On each scoring device, sign in and open the team while connected. Wait for
  **Ready to reopen offline on this device** on Match Day. **Check offline setup**
  checks the downloaded team and cached app and requests persistent storage
  where supported. Prepare each team you intend to score; a listed team without
  its downloaded matchbook is not available offline.
- After setup, the Home Screen app can be fully closed and reopened without
  internet. Resume a match or start a new one using that team's saved roster.
- **Offline workspace · saved on this device** means scoring is local and cloud
  uploads await a connection and a fresh account access check.
- If the connection drops, keep scoring on the same device. The amber notice
  says **Connection lost · saved on this device**.
- A Wi-Fi network can remain connected while internet requests fail. In that
  case, the notice says **Cloud unavailable · saved on this device**.
- Keep the app open or bring it back to the foreground after reconnection.
  Access verification and uploads retry automatically; **Saved to cloud** means
  the server acknowledged the latest entries. **Check connection** also retries
  access verification. The match screen and unsent entries remain intact while
  verification is pending.
- Use **Download backup** after a match, or whenever the connection is unstable.
  The JSON file includes the whole team matchbook document, including unfinished
  sets. Keep it for support-assisted recovery; an import screen is not included.
- If **Device storage problem** appears, download a backup immediately. Local
  persistence cannot be promised when storage is full or blocked.
- App updates wait until the match is finished and cloud saving is confirmed.
  **Update app** appears on Match Day when an update is available; it stays
  disabled while a match or upload is unfinished. New installations use a
  prompted service worker rather than reloading automatically during scoring.

Do not clear browser/site data or switch devices with pending entries. Files and
browser storage are separate copies. The browser can remove local storage; this
implementation does not promise permanent device retention.

## Recovery and upload behavior

The existing per-team local snapshot gains a `localSync` field with the pending
flag and last acknowledged cloud timestamp. It is local-only. Startup prefers a
pending local document over cloud data. For pre-upgrade snapshots without a
pending flag, a newer local timestamp is also recovered.

The last in-flight snapshot is also retained until acknowledged. If its response
is lost while newer entries are recorded, that exact snapshot is retried first
(including after restart) before uploading the newer entries. This prevents a
successful-but-unacknowledged save from being mistaken for another device's edit.

Local writes run after React commits a scoring change, before the browser paints
the updated score. Cloud writes
are debounced for 700 ms and serialized, with complete newer snapshots replacing
older queued snapshots. Requests time out after 12 seconds; transient failures
retry every 10 seconds. Reconnection, focus, and foreground events trigger a
retry. This is foreground sync; no upload happens while the app is closed.

The authenticated `teams` function's `save-matchbook` action checks team permission
and atomically compares the cloud timestamp before updating only the matchbook
metadata field. Exact repeated snapshots are accepted, including when a previous
response was lost. A competing cloud change returns 409 and pauses uploads while
preserving the local snapshot. Download a backup and resolve the competing copy
with support. Automatic merging or force-overwriting is deliberately absent.

An account-specific, versioned device directory records team names and IDs only
after fresh online access verification. It grants no server permission or admin
rights and requires a local matchbook snapshot for every available team. The
cached service worker supplies the application shell and lazy-loaded assets on
a cold offline launch. Reopening does not depend on React Query's cached access
response (access responses remain excluded from persisted queries).

After a cold offline launch, or loss of connection during scoring, cloud saving
stays paused until a fresh access response succeeds after reconnection. A direct
browser online-event listener covers a missed React Query online transition, and
local-workspace access checks retry every 10 seconds while the browser reports
online. Revalidation does not replace local entries or reset the match screen.

Explicit access/session denial still blocks reopening; signing out or revocation
removes the offline directory while leaving match snapshots intact for recovery.
Network failures do not erase the saved identity. First sign-in, new cloud teams,
and administrative access changes require internet. Offline access supports only
the primary scorer at `/`; the legacy `/app` workflow keeps its online gate.

## Verification

Automated coverage checks local recovery over stale cloud data, two completed
sets, quota failures, late acknowledgments, offline reconnection, online network
failures, request timeouts, serialized uploads, permission failures, and conflicts.
Cloud compare-and-save SQL is exercised against a disposable in-memory SQLite
database, not the production database.

Browser QA uses the production build and its actual generated service worker,
an isolated persistent Chromium profile, and intercepted APIs. The browser is
closed and restarted twice with the network disabled. Two completed 25-point
sets survive those restarts, a backup exports offline, and a deliberately delayed
access response blocks all matchbook uploads until verification finishes. The
same Set 3 setup screen remains open after successful automatic upload. Phone
(390×844) and tablet (1024×768) layouts are checked with no JavaScript errors.
This is simulated connectivity and viewport testing, not physical iPad or
production cloud validation. Physical iPad Home Screen acceptance is still
required before relying on this at a live match.

## iPad acceptance after deployment

Use a disposable test team and preserve any recovery-sensitive original data.
Open the Home Screen app online, sign in, open the test team, and confirm the
ready message. Turn off both Wi-Fi and cellular data (or use Airplane Mode).
Close and reopen the same Home Screen app. Resume or set up a test match, score
and save sets, then close and reopen again. Confirm the scores, roster, and sets
and download a backup. Restore internet, leave the app open, and wait for
**Saved to cloud**. Verify those test sets from another authorized device.
Do not clear site data or remove/reinstall the Home Screen app during this test.
