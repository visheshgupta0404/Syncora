# Free deployment

Cloudflare Pages project `syncora` serves [syncora-a6v.pages.dev](https://syncora-a6v.pages.dev/) and automatically builds commits to `main`. Production settings are `npm run build`, output `dist`, Node 24, and the public Supabase URL/publishable key. These must be configured in Pages; serving the repository root instead of `dist` produces a blank app.

The owner's free Supabase project is configured in Mumbai with the application schema and anonymous sign-in enabled. Local connection settings are saved only in ignored `.env.local`. Hosted API/realtime checks have passed. Optional CAPTCHA setup and physical-phone acceptance remain. The steps below document how to reproduce the setup.

## 1. Supabase

1. Sign up at [Supabase](https://supabase.com/dashboard), create a project on the **Free** plan, and keep the database password private.
2. Open **SQL Editor**, paste the entire [schema](../supabase/schema.sql), and run it. The script is transactional and rerunnable. It creates room tables, membership policies, validated command functions and private-presence policies. It also enables `rooms` in the `supabase_realtime` publication when that publication exists.
3. In **Authentication**, enable **Anonymous sign-ins**. Do not enable public table writes. Keep the generated RLS policies.
4. Copy the project URL and public publishable key (or legacy `anon` key) from the project's API settings. Do not copy the secret/service-role key.
5. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Restart Vite. Create a room and join from a separate browser identity to test both seats.

If upgrading a previously deployed milestone 1, apply the new schema and deploy the new frontend together: `save_room` is intentionally removed, and old clients must reload.

## 2. Bot verification

For a public URL, use [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/get-started/), available without a paid plan.

1. Create a Turnstile widget for your actual deployment hostname (add localhost only if you also need local verification).
2. Put the widget's **secret key in Supabase Auth's CAPTCHA settings**, choose Turnstile, and enable CAPTCHA protection. Supabase verifies the token server-side.
3. Put only the widget's **site key** in `VITE_TURNSTILE_SITE_KEY`. Rebuild/redeploy when the public site key changes.
4. Test a fresh browser session. The widget appears before anonymous sign-in; expired tokens must be renewed. Already authenticated users do not need to repeat it.

The local demo works without Turnstile. Do not enable CAPTCHA in Supabase without providing the matching frontend site key or fresh sign-ins will fail. Configure the supplied Supabase Auth rate limits as well; room-edit limits alone do not protect anonymous signup.

## 3. Cloudflare Pages (recommended)

Sign up at [Cloudflare](https://dash.cloudflare.com/). No purchased domain is needed. Use a free `pages.dev` hostname.

In **Workers & Pages → Create → Pages → Connect Git**, select `visheshgupta0404/Syncora` and set:

| Setting                          | Value                     |
| -------------------------------- | ------------------------- |
| Production branch                | `main`                    |
| Build command                    | `npm run build`           |
| Output directory                 | `dist`                    |
| Node version variable            | `NODE_VERSION=24`         |
| Public project URL variable      | `VITE_SUPABASE_URL`       |
| Public key variable              | `VITE_SUPABASE_ANON_KEY`  |
| Optional public CAPTCHA site key | `VITE_TURNSTILE_SITE_KEY` |

Deploy and use the generated HTTPS URL on both phones. With Git integration, future pushes to `main` deploy automatically. `_headers` applies browser security headers and preserves the origin referrer required by YouTube embeds. It allows the standard `*.supabase.co` endpoints; update CSP if using a custom Supabase domain.

Do not select a paid plan or custom domain for this six-person project. Free tiers have quotas and may pause inactive services; check [Supabase limits](https://supabase.com/docs/guides/platform/billing-on-supabase) and [Pages limits](https://developers.cloudflare.com/pages/platform/limits/).

## Alternative: manual GitHub Actions deployment

The supplied **Deploy to Cloudflare Pages** workflow is optional. Use it instead of Pages Git integration if you prefer manual deploys. First create a Pages project named, for example, `syncora` with production branch `main`.

In GitHub repository settings, set these **Actions variables**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (public publishable key)
- `CLOUDFLARE_PAGES_PROJECT` (exact existing Pages project name)
- `VITE_TURNSTILE_SITE_KEY` if enabled

Set these **Actions secrets**:

- `CLOUDFLARE_API_TOKEN`: token scoped to the intended account with Pages edit permissions.
- `CLOUDFLARE_ACCOUNT_ID`: your Cloudflare account identifier.

Run **Actions → Deploy to Cloudflare Pages → Run workflow**, choosing `main`. It installs dependencies, runs tests, builds with the public settings and deploys `dist`. It will fail rather than deploy an unconfigured shared-room build. The verification workflow runs automatically on every push to `main`.

## 4. Retention and maintenance

Room-open calls remove expired rooms and stale request counters. When nobody opens a room, old rows remain inaccessible until cleanup runs. For scheduled removal, use Supabase Cron to run `select public.cleanup_syncora();` daily, or execute it manually from the SQL editor. Execution is restricted to the database owner/service role.

Anonymous Auth users are separate from room data. Review Supabase's [anonymous user cleanup guidance](https://supabase.com/docs/guides/auth/auth-anonymous) as usage grows; this app does not delete user accounts automatically.

## 5. Acceptance on Android and iPhone

Use the checks in [VERIFICATION.md](VERIFICATION.md) before calling the hosted service complete. Start in normal browsers, then repeat in installed mode. Share the invitation privately; a seventh fresh browser should be refused. Never promise PiP/background audio if the native browser/player does not offer it.

## Upgrade existing rooms to six seats

For short room codes, run `supabase/migrations/20261019_short_room_codes.sql` before deploying the frontend. It shortens existing long codes and retains them as aliases so old invitations continue working. New room-code collisions are retried automatically.

For scheduled synchronization, run `supabase/migrations/20261019_scheduled_playback.sql` after the rotating-playlist migration, then deploy the matching frontend and reload every connected device. It changes playback timestamps to shared deadlines 1500ms ahead without changing room data.

After the reusable-playlist migration, run `supabase/migrations/20261019_rotating_playlist.sql` to keep the active video first and rotate completed/skipped videos to the bottom. Existing entries and playback position are preserved. Refresh all open apps after deployment.

For reusable playlists, also run `supabase/migrations/20261019_reusable_playlist.sql` before deploying the matching frontend. It preserves existing queue entries and puts any legacy current video at the beginning of the list. Previously consumed videos cannot be recovered. Reload open apps after this upgrade. The playlist persists until explicitly edited or the room expires after seven days.

For an existing installation, run `supabase/migrations/20261019_six_member_rooms.sql` in the SQL editor before deploying the updated frontend. This replaces the admission function and increases the retry receipt window; it preserves room IDs, invitation codes, memberships, queues and messages. New installations can use the full `supabase/schema.sql`. Existing two-person rooms gain four available seats.
