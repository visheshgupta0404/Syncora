# Security review — 23 October 2026

Scope: source review, local adversarial PostgreSQL/API tests, dependency audit, and deployment checks. No flooding, credential guessing, or destructive tests against production.

## Confirmed findings and fixes

| Finding | Risk | Change |
| --- | --- | --- |
| Any room member could send unlimited YouTube searches | High: exhaust the shared Google quota | Atomic database reservation before Google: 6/minute and 30/rolling day per guest; 80/rolling day across the deployment. Refusals return HTTP 429; unavailable authorization fails closed. |
| Failed room-code guesses rolled back their rate counters | High: guessing bypassed the advertised limit | New secure RPC commits its budget outside the inner exception block; 10 open attempts/minute including failures. Old direct room-open/action RPC permissions revoked. |
| Rejected commands rolled back counters; JSON objects could be coerced into message/title strings | Medium: malformed-input traffic bypassed counters and accepted unintended types | Persistent outer command budget (120/minute), explicit JSON string/object checks, and generic errors for unexpected database failures. |
| Five-room limit was only per guest identity | Medium: repeated guest identities could multiply room creation | Shared ceiling of 200 room-creation attempts per rolling day, in addition to existing per-guest limits. Joining existing rooms remains available. |
| Search trusted unbounded result count/channel metadata from upstream | Low: unexpected responses could expand payloads or break rendering | At most eight results; require string titles, bound channel/title lengths, discard invalid video IDs. |
| CSP did not constrain form submission destinations | Defense in depth | Added `form-action 'self'`. |

Limits use database time and atomic counters, not browser timers or process-local memory. Daily windows are rolling 24-hour buckets, not midnight resets. Failed Google calls still consume reservations, deliberately preventing retry amplification. The search ceiling is conservative and shared between hostnames using this database. It is not a guarantee about Google's available quota, particularly if the key is used elsewhere.

## Verified protections

- Outsiders cannot read or change private rooms; six-seat cap and private-presence policies hold.
- Queue/message sizes, video identifiers, playback positions, and command IDs are bounded; message sender/time are server-stamped.
- Duplicate command retries do not repeat mutations; stale-track commands cannot resurrect removed videos.
- Expired rooms cannot be accessed or revived. Cleanup remains admin-only.
- Private search key stays server-side; guest tokens are not forwarded to Google. Errors do not return secrets.
- React renders messages/titles as text. There is no user-controlled HTML rendering path; entity decoding uses a detached textarea.
- `npm audit` reports zero known vulnerabilities at review time. This does not establish absence of unknown vulnerabilities.

## Operational limits and remaining risk

- **Anonymous identities are not people.** An attacker can obtain new guest identities subject to Supabase Auth limits. The live dashboard confirms 30 anonymous sign-ins per hour per IP and CAPTCHA disabled. Configure Supabase Auth CAPTCHA with a Turnstile key for stronger bot protection. The application currently treats CAPTCHA as optional; no CAPTCHA credentials were invented or embedded.
- **Direct Supabase reads, Realtime connections, clock requests and anonymous sign-in are provider endpoints.** Application mutation/search budgets do not impose a deployment-wide IP limit on them. Provider quotas, Auth rate limits, monitoring and appropriate edge/network protections are still necessary. A Cloudflare rule on the website does not protect a separately reachable Supabase URL.
- A malicious valid member can control playback, remove queue entries or fill the room's chat within limits. Equal control is intentional; host/moderator roles, mute/kick and invitations tied to accounts would be additional product work.
- Room codes are bearer invitations. Anyone receiving one can join if a seat is available. Public sharing of codes defeats their privacy. Existing short codes retain their 40-bit entropy; they are not user passwords.
- Global caps protect spending/storage but can themselves be exhausted, temporarily denying legitimate requests. Paste-video links continue to work when search is exhausted. Alerting or account-based budgets would improve availability.
- Existing clients using revoked RPCs must reload to receive the secured client. No legacy fallback is provided because it would reopen the bypass.
- This review is not a claim of complete security, DDoS resistance, or unlimited free-tier capacity.

## Verification

32 local tests cover existing room workflows plus persistent failed-attempt limits, revoked legacy RPCs, malformed commands, membership/search limits, global caps, and fail-closed API responses. Run `npm test`, `npm run build`, and `npm audit` after changes.

Apply `supabase/migrations/20261023_security_budgets.sql` before using the updated client/API. `supabase/schema.sql` includes the same migration for fresh installations. Keep schema and migrations in sync; do not reapply older function-replacement migrations after the latest security migration.


### Hosted verification

The security migration was applied successfully to the production Supabase project. The hosted disposable-room check passed seven independent guest sessions, six-seat admission/seventh-seat rejection, outsider RLS isolation, private Realtime/presence, retry deduplication, queue rotation, playback, concurrent chat, and seat replacement. The test room was released; seven guest Auth records remain for administrator retention review. The Pages build is deployed with the new API/client, CSP includes `form-action`, and unauthenticated search returns 401. Live privilege checks confirm legacy mutation RPCs are blocked, secure RPC/search reservation are enabled, and search-budget RLS is enabled.
