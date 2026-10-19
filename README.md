# Syncora

Watch and listen together in a private room for up to **6 people**.

**[Open Syncora](https://syncoramoments.pages.dev/)**

## Features

- Private room codes, invite links and WhatsApp sharing.
- YouTube search, synchronized playback, restart video and Resync.
- Shared playlist with thumbnails, reorder, play next and automatic rotation.
- Live chat, full-screen playback and installation on Android and iPhone.

## Local development

Use Node.js 24.

```sh
npm ci
npm run dev
```

Choose **Explore the local demo** to try it without configuration. For shared rooms, copy `.env.example` to `.env.local` and follow the [setup guide](docs/DEPLOYMENT.md).

```sh
npm test
npm run build
```

## Project structure

```text
src/
  components/    Player, search, queue, chat and installation
  hooks/         Shared room lifecycle
  lib/           Backend, playback logic and storage
  main.jsx       App entry and layout
  style.css      Responsive styles
functions/api/   Server-side YouTube search
supabase/        Database schema and migrations
public/          App icons and hosting configuration
scripts/         Configuration and live checks
tests/           Automated tests
docs/            Setup and verification guides
```

## Notes

Built with React, Vite, Supabase and Cloudflare Pages. Pushes to `main` deploy automatically.

Keep the app visible for synchronization. iPhone may need a tap to enable sound; background playback and exact 0 ms synchronization are not guaranteed. Playback uses YouTube's official embedded player.

Rooms expire after 7 days. Invitations grant room access; chat is visible to members and the database administrator and is not end-to-end encrypted.

[Deployment](docs/DEPLOYMENT.md) · [YouTube search setup](docs/YOUTUBE-SEARCH.md) · [Verification](docs/VERIFICATION.md)
