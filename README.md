# Syncora · milestone 1

React/Vite installable PWA for two people. Includes private invite codes, visible YouTube embeds, shared play/pause/seek/skip, queue add/remove/reorder/play-next, chat, full-screen and a native PiP help fallback. Local demo works immediately; cross-device mode requires Supabase configuration.

## Run

Requires Node 22.12+ (tested on Node 24).

```
npm ci
npm run dev
```

Open http://127.0.0.1:5173 and choose **Explore the local demo**. Demo state persists in this browser only. No fake remote partner is simulated.

## Connect Supabase (Free plan)

1. Create a free Supabase project. In Authentication → Providers, enable anonymous sign-ins. Enable CAPTCHA/rate limits before exposing publicly; if you require a CAPTCHA challenge, integrate that challenge in the sign-in UI before launch.
2. Run `supabase/schema.sql` once in the project's SQL editor. This is a new-project migration, not an idempotent script.
3. Copy `.env.example` to `.env.local`. Enter the project URL and public anon/publishable key. Never put a service-role or secret key in a VITE variable.
4. Restart the dev server. Create a room, privately share its code, and join from the second device. A third distinct authenticated user is rejected atomically.
5. Rooms expire after 7 days. Two browser identities claim the seats for the room's lifetime; leaving the screen does not release a seat. Clearing browser data creates a new identity. Create a new room if a seat is lost.

## Free deployment: Cloudflare Pages

Use a free `pages.dev` hostname; a purchased domain is unnecessary. Build command `npm run build`; output directory `dist`. Set the two VITE environment variables in the Pages project before building. Either connect a new Syncora repository or upload the built `dist` folder with Pages Direct Upload. No paid Functions or YouTube Data API key is needed.

Production must use HTTPS for installation and service workers. Android: browser menu → Install app. iPhone: open in Safari → Share → Add to Home Screen. Offline support caches the app shell only; YouTube and shared rooms require internet. Service-worker updates apply on a later visit (no forced reload during playback).

## Playback and privacy

- Uses the official YouTube IFrame Player API with visible controls and inline playback. Does not extract audio, download videos, hide ads/branding, or bypass embedding restrictions. Labels are user-entered; no scraping or metadata API is used.
- iOS may reject remote play/autoplay until each person taps the player. Keep the app visible; screen lock, backgrounding, ads, buffering and network delay can interrupt synchronization. This is approximate shared playback, not sample-accurate audio.
- Full-screen uses the standard iframe API where supported, otherwise the native player button. PiP is experimental: the app cannot access the cross-origin video's media element or force PiP. Use a native Safari/YouTube PiP control if offered; availability is not guaranteed on iPhone or in installed mode. No background-audio guarantee.
- Long random room codes act as invitations. Membership uses Supabase anonymous Auth, two-person capacity and RLS. Only members can read a room; versioned writes serialize concurrent queue/chat/transport edits. Both members are equally trusted editors. Messages are not end-to-end encrypted and project administrators can read them.
- Chat retains the latest 100 messages and queue is capped at 100. Expired rows are inaccessible but not automatically deleted; periodically remove expired rooms through Supabase administration to control storage. Anonymous account creation and room creation need abuse protections before a broad public launch.
- Realtime updates plus 15-second recovery fetches restore state after reconnecting. Device clock differences can affect playback position. Room expiry does not revoke already cached content. Do not share sensitive information in this first milestone.

## Verification and next milestone

`npm test` covers URL validation, queue order/skip/removal and bounded chat/playback timestamps. `npm run build` generates the PWA service worker and manifest. Browser smoke checks cover demo queue and chat. Live database migration, RLS, third-user rejection, competing edits, disconnect recovery and physical Android/iPhone playback still require a configured Supabase project and device testing.

Next: run those integration checks; add CAPTCHA flow and retention cleanup; improve clock-offset estimation, drift/buffering handling, room recovery and installation icons; then deploy the verified build. Raster 192/512 installation icons and an Apple touch icon are included.

Official references: [YouTube player](https://developers.google.com/youtube/iframe_api_reference), [embed parameters](https://developers.google.com/youtube/player_parameters), [Supabase anonymous Auth](https://supabase.com/docs/guides/auth/auth-anonymous), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase Free limits](https://supabase.com/docs/guides/platform/billing-on-supabase), [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [Safari video](https://developer.apple.com/documentation/webkit/delivering-video-content-for-safari).

# Syncora
