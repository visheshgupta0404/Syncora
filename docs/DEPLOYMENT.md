# Deployment

Production: **https://syncoramoments.pages.dev/**. Cloudflare Pages builds `main` automatically. The previous `syncora-a6v.pages.dev` address remains available for existing links.

## Supabase

1. Create a free project and enable **Authentication → Anonymous sign-ins**.
2. Run [`supabase/schema.sql`](../supabase/schema.sql) for a new installation. Keep its RLS policies enabled.
3. Copy `.env.example` to `.env.local`; set the project URL and public publishable/anon key.

Never commit credentials or put a service-role key, database password or server secret in a `VITE_` variable. Frontend variables are public.

## Cloudflare Pages

Connect the GitHub repository with these settings:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Output directory | `dist` |
| `NODE_VERSION` | `24` |
| Public variables | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Server-only secret | `YOUTUBE_API_KEY` — see [search setup](#youtube-search) |

The API function needs the Supabase variables as well. Redeploy after changing variables or secrets. Guest sessions and installed apps belong to each hostname; rejoin using the room code when changing addresses.

CAPTCHA is enabled in production. For a new installation, create a Cloudflare Turnstile widget for the app hostname. Set `VITE_TURNSTILE_SITE_KEY` in Pages and deploy first; then enable CAPTCHA in **Supabase Auth → Attack Protection**, select **Turnstile by Cloudflare** and save the matching secret. Selecting hCaptcha with a Turnstile key rejects valid tokens. Keep Auth rate limits enabled.

## YouTube search

Search uses the official YouTube Data API through `/api/youtube-search`. The key stays on Cloudflare; requests require membership in an unexpired room.

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **YouTube Data API v3** and create an API key restricted to that API.
3. In Cloudflare Pages → **syncoramoments → Settings → Variables and Secrets**, save `YOUTUBE_API_KEY` as a production **Secret**. Never prefix it with `VITE_` or commit it.
4. Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are available to the function, then redeploy.
5. Join a room, search and add a result; verify another member sees it.

Review Google's daily quota. Search runs on submission; authenticated access does not replace abuse protection. Pages has no fixed outbound IP, so an IP restriction is unsuitable here; browser referrer restrictions are unsuitable for this server-side key.

`npm run dev` serves the frontend only. Test real search on hosted Pages. Pasting links works without the API key.

Search terms go to Google/YouTube. Results are limited to eight embeddable videos; playback restrictions can still apply. Adding a result saves its video ID and title in the shared queue.

## Existing databases

The current deployment already has these migrations. For older installations, apply only missing migrations in this order, then deploy and reload clients:

1. `20261019_six_member_rooms.sql`
2. `20261019_reusable_playlist.sql`
3. `20261019_rotating_playlist.sql`
4. `20261019_scheduled_playback.sql`
5. `20261019_short_room_codes.sql`
6. `20261021_inactivity_expiry.sql` — renews expiry after joins and accepted actions; existing deadlines stay until the next use.
7. `20261023_security_budgets.sql` — persistent failed-attempt budgets, secured room RPCs, shared room-creation and YouTube search caps. Reload existing clients after applying.

Files are in [`supabase/migrations/`](../supabase/migrations/). Short-code migration retains legacy invitation aliases.

## Maintenance

Room-open requests clean expired rooms; administrators can also run `select public.cleanup_syncora();`. Anonymous Auth accounts need separate review. Free services have quotas and may pause inactive projects.

Run the [verification checklist](VERIFICATION.md) after setup. Physical Android/iPhone acceptance remains necessary.
