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
| Server-only secret | `YOUTUBE_API_KEY` — see [search setup](YOUTUBE-SEARCH.md) |

The API function needs the Supabase variables as well. Redeploy after changing variables or secrets. Guest sessions and installed apps belong to each hostname; rejoin using the room code when changing addresses.

Optional CAPTCHA: configure a Turnstile secret in **Supabase Auth**, and its public site key as `VITE_TURNSTILE_SITE_KEY` in Pages. Configure both together before enabling CAPTCHA. Use Supabase Auth rate limits to protect anonymous sign-in.

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

## Optional manual deployment

The GitHub **Deploy to Cloudflare Pages** workflow is an alternative to Git integration. Configure repository variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `CLOUDFLARE_PAGES_PROJECT` and optional `VITE_TURNSTILE_SITE_KEY`; configure secrets `CLOUDFLARE_API_TOKEN` (Pages edit access) and `CLOUDFLARE_ACCOUNT_ID`. Run the workflow on `main`.
