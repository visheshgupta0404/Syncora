# Verification record

## Automated

`npm test` executes model/playback/config tests and the actual application SQL in embedded Postgres (PGlite). No remote account or credentials are used. Tests cover:

- Supported YouTube links, invalid input and lookalike domains.
- Queue order, play next, removal, stale play/skip handling, chat and queue bounds.
- Playback timing and decisions for local seeking, drift, buffering and suppression.
- Privileged frontend key rejection.
- Rerunnable schema installation, two-member admission and outsider RLS isolation.
- Direct-write denial, unauthenticated RPC denial, server validation, author/time stamping.
- Idempotent command retry, stale-track transport rejection and double-skip protection.
- Seat release, replacement membership, last-member deletion, expiry, cleanup permissions and accepted-request limits.
- Private-presence read/write authorization under simulated Realtime session context.

`npm run build` validates public environment settings and emits the static bundle, install manifest and offline service worker. The GitHub verification workflow runs both commands on `main`.

## Local browser smoke test

Verified in the desktop in-app browser: lobby, demo room, official YouTube embed loading and playback, pause, ±10-second seek, queue additions and play-next ordering, chat, and a 390-pixel mobile viewport. Local demo persistence and final layout checks are recorded in the completion message. This browser viewport is not a physical iPhone or an iOS autoplay test.

## Hosted acceptance still required

The owner has no Supabase or Cloudflare accounts configured yet. Until provisioning and deployment, these boundaries cannot be verified:

| Check                                        | Expected result                                                       |
| -------------------------------------------- | --------------------------------------------------------------------- |
| Fresh anonymous session, including Turnstile | A valid session is created without exposing secret keys               |
| Device A creates; device B follows invite    | Both see identical current video, queue and chat                      |
| Device C joins in a fresh identity           | Server refuses a third member                                         |
| A plays/pauses/seeks; B repeats              | Both follow shared state after allowing local playback                |
| Both reach end simultaneously                | Exactly one queue item advances                                       |
| Both edit queue/chat concurrently            | Accepted edits persist without overwriting other edits                |
| Reload and Resume room                       | Membership, queue, chat and playback state are recovered              |
| Network interruption/background/foreground   | Reconnect fetches recover current state; no offline edits replay      |
| Release seat                                 | Released browser loses read/write access and a replacement can join   |
| Unauthorized direct read/write/presence      | Supabase rejects access outside membership                            |
| Expiry/cleanup                               | Expired room is inaccessible and removed on next cleanup              |
| Install on Android and iPhone                | Icons/standalone shell work; offline shell loads                      |
| New deployment                               | Update prompt appears and reload installs the new shell               |
| Full-screen/PiP                              | Native behavior/fallback is accurate; unavailable PiP is not promised |

Keep videos foregrounded on both phones. Ads, buffering and iOS restrictions can create temporary drift; use Resync. Physical-device playback, hosted Auth/PostgREST and WebSocket delivery have not been validated locally.
