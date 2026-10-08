# Inspect a Home Screen app's saved match data

Use the original iPad and the original Home Screen app. Safari, Chrome, and an
installed Home Screen web app can have separate storage. An empty Safari copy
does not establish that the installed app's data is gone.

Keep Wi-Fi and cellular data off while inspecting. Do not clear website data,
remove the Home Screen app, sign out, start a new match, or sign in again before
the local matchbook snapshot is copied. Avoid refreshing an already open scorer.

## Inspect using a Mac

1. Enable **Web Inspector** under the iPad's Safari Advanced settings. On recent
   iPadOS versions Safari is under **Settings > Apps > Safari**; older versions
   place Safari directly in Settings.
2. Connect the iPad to a Mac by USB and trust the computer if prompted.
3. In Safari on the Mac, enable **Show features for web developers** in Advanced
   settings. Open **Develop > [iPad name]** and select the **Century Matchbook
   Home Screen app**, rather than a separate Safari tab. The app must be open to
   appear. Keep the iPad offline if it needs to be opened for inspection.
4. In that app's Web Inspector Console, run the backup command below first.
   Paste the copied text into a plain-text file named `ipad-matchbook-recovery.json`.
5. After saving the file, run the summary command. Send the backup for inspection
   before importing anything or changing the cloud copy.

### Copy the original snapshots

This reads only the historical matchbook snapshot keys and copies their original
strings. It does not include the user's session token, write browser data, or
send anything to the server. `copy()` is Safari Web Inspector's clipboard helper.

```js
copy(JSON.stringify({
  format: 'century-matchbook-device-recovery',
  version: 1,
  exportedAt: new Date().toISOString(),
  entries: Object.keys(localStorage)
    .filter(key => key === 'century-matchbook-rebuild-prototype' ||
      key.startsWith('century-matchbook-rebuild-prototype:team:'))
    .map(key => ({ key, value: localStorage.getItem(key) }))
}, null, 2));
```

### Show what is present

```js
Object.keys(localStorage)
  .filter(key => key === 'century-matchbook-rebuild-prototype' ||
    key.startsWith('century-matchbook-rebuild-prototype:team:'))
  .map(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      return {
        key,
        updatedAt: data.updatedAt,
        opponent: data.setup?.opponent,
        currentSet: data.setup?.setNumber,
        currentRallies: data.rallies?.length ?? 0,
        completedSets: data.completedSets?.map(set => ({
          setNumber: set.setNumber,
          rallies: set.rallies?.length ?? 0
        })) ?? [],
        archivedMatches: data.seasonMatches?.map(match => ({
          opponent: match.opponent,
          date: match.date,
          sets: match.sets?.length ?? 0
        })) ?? []
      };
    } catch {
      return { key, unreadable: true, note: 'Original text is preserved in the backup.' };
    }
  });
```

An empty result means no matching snapshots were found in the inspected storage
context. A found snapshot is evidence of retained data, but its sets and rallies
must be inspected to establish whether the missing sets are actually present.
The UI's Season Reports alone cannot establish this: unfinished data can remain
outside archived season matches.

## Why a regular recovery link is insufficient

A recovery page opened in Safari may inspect Safari's storage instead of the
Home Screen app's storage. In addition, the deployed service worker can intercept
new page URLs and load the cached scorer. Do not send a new recovery link to this
iPad as though it were guaranteed to bypass the normal app.

These instructions are prepared from the current storage contract and official
WebKit documentation. They do not mean the physical iPad has been inspected or
that its missing sets have been recovered.

References:
- https://webkit.org/web-inspector/enabling-web-inspector/
- https://webkit.org/web-inspector/console-command-line-api/
- https://webkit.org/blog/14787/webkit-features-in-safari-17-2/
