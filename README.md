# Syncora

A private listening room for two, built with React, Vite, Supabase and an installable PWA shell. Designed for Android and iPhone. The application can run as a local demo without any account or credentials; sharing across devices needs a Supabase project.

## Features

- Random private invitation codes and shareable links; database-enforced two-person capacity.
- Official YouTube player with visible native controls; shared play/pause, seek slider, ±10 seconds, skip and manual resync.
- Shared queue: add, remove, reorder, play immediately and play next; up to 100 videos.
- Room chat, persistent listener name and latest 100 messages; messages carry server-assigned authors and timestamps.
- Room recovery after reload, connection status, private presence, reconnect fetches, local offline detection and explicit seat release.
- Server-clock offset measurement and drift correction. Track-scoped commands prevent stale playback events from advancing or rewinding another video.
- Full-screen with a native-player fallback on iPhone. Experimental PiP guidance for native browser/player options; no forced PiP or audio extraction.
- Install icons, cached offline app shell, update notification, optional Cloudflare Turnstile, server-side validation, bounded retry deduplication and request limits.

## Run locally

Node 22.12+ is required; Node 24 is used in CI.

```sh
npm ci
npm run dev
```

Open the printed localhost address and select **Explore the local demo**. The demo saves in this browser only and pauses restored playback. Demo storage is separate from shared rooms. Shared-room chat is never copied to localStorage by Syncora; Supabase stores its authentication session there.

```sh
npm test       # model, playback decisions, config checks, actual Postgres/RLS tests
npm run build # production bundle, manifest and service worker in dist/
npm run preview
```

## Connect and deploy

Production: [syncora-a6v.pages.dev](https://syncora-a6v.pages.dev/).

Cloudflare Pages is connected to this repository's `main` branch with automatic deployments, build command `npm run build`, output directory `dist`, and Node 24. Public Supabase connection settings are configured in Pages. The owner's free Supabase project is configured in Mumbai; its schema and anonymous Auth are enabled, and hosted room/realtime checks have passed. Local connection settings stay in ignored `.env.local`; no keys are committed. See [the deployment guide](docs/DEPLOYMENT.md) to reproduce the setup.

Copy `.env.example` to `.env.local`, fill in the Supabase URL and **public publishable/anon key**, then restart Vite. Run `supabase/schema.sql` in the Supabase SQL editor and enable anonymous authentication. The schema can be rerun and upgrades milestone 1. It removes the old whole-state writer in favor of validated commands.

Never put a service-role key, secret key, database password or Turnstile secret in a `VITE_` variable. The build checks for common privileged-key mistakes. Frontend environment variables become public in the built JavaScript.

## Room behavior and privacy

Invitation codes use random UUIDs without separators. Only two authenticated identities may claim a room. Both have equal control; display names are labels, not verified identities. Invitation links use URL fragments, and the fragment is removed before mounting the YouTube player so its widget does not receive the invitation in the page URL.

**Back to lobby** keeps your seat and offers Resume room. **Release my seat** removes membership; the last release deletes the room and history. New members can see retained queue and chat. Browser-data deletion loses the anonymous identity; create a new room if the old seat cannot be released. Rooms expire after seven days. Expired rooms are inaccessible and are removed on a subsequent room-open request, or by the admin-only cleanup function.

Chat is not end-to-end encrypted. Both members and the Supabase project administrator can read it. Do not treat a room code as an account password or share the invitation publicly. Private presence is restricted by Realtime authorization policies. Authentication CAPTCHA should be enabled before public exposure. Per-identity limits apply to accepted room opens and edits; CAPTCHA and Supabase Auth rate limits protect identity creation. This small two-person app is not a hardened public multi-tenant service.

Commands are applied under a database row lock, with 512 recent command receipts per room to deduplicate immediate network retries. Automatic end-of-video skip checks the current queue item so two players cannot skip twice. Old-track transport and removed-item edits are ignored. Offline edits are rejected rather than replayed later. Realtime delivers updates; a 15-second recovery fetch and visibility/network events restore state when needed. Presence counts identities, so two tabs from the same browser count once.

## YouTube and iPhone limitations

Uses the official IFrame Player API. Syncora does not download or extract media, hide ads/branding, cover player controls, or bypass embedding restrictions. Loading the player/video contacts YouTube. Labels are user-entered; no YouTube Data API key is needed.

Each iPhone may require a direct tap to enable sound. Keep both apps visible: screen lock, app switching, ads and buffering can disrupt playback or synchronization. Playback is approximate, not sample-accurate; **Resync** catches a device up. There is no background-audio guarantee.

The cross-origin embed does not expose its video element to Syncora. The PiP button explains how to use a native Safari/YouTube/browser PiP option if offered. Programmatically forced PiP is not implemented or promised on iPhone, Android or installed PWAs. Full-screen uses the browser API where available and otherwise the YouTube player button.

Install on Android through the browser's **Install app** option. On iPhone use **Safari → Share → Add to Home Screen**. Installation and service workers require HTTPS (localhost is allowed for development). Only the app shell is cached; YouTube and shared rooms still need internet. Updates apply when you choose the update button, which reloads the app.

## Verification

See [verification notes and remaining device checks](docs/VERIFICATION.md). Database tests use embedded Postgres through PGlite with simulated Supabase Auth/Realtime session context. They execute the real schema and RLS policies, but do not substitute for a hosted Supabase Auth/PostgREST/WebSocket test or physical iPhone/Android tests.

CI runs on pushes to `main`. The optional Cloudflare deployment workflow runs manually after account/project configuration. This repository follows the user's preference to work directly on `main` and push completed changes after checks pass.

## Official references

[YouTube API](https://developers.google.com/youtube/iframe_api_reference) · [embed parameters](https://developers.google.com/youtube/player_parameters) · [Supabase anonymous Auth](https://supabase.com/docs/guides/auth/auth-anonymous) · [CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha) · [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization) · [Cloudflare Pages](https://developers.cloudflare.com/pages/get-started/git-integration/) · [Safari video](https://developer.apple.com/documentation/webkit/delivering-video-content-for-safari)
