<div align="center">

<img src="public/icon.svg" width="88" height="88" alt="Syncora sound wave logo" />

# Syncora

### Different places. Same moment.

Watch, listen and hang out together in a private room for **up to 6 people**.

**[▶ Launch Syncora](https://syncoramoments.pages.dev/)** &nbsp; · &nbsp; [Quick start](#your-room-in-three-steps) &nbsp; · &nbsp; [Run locally](#for-developers)

[![Checks](https://github.com/visheshgupta0404/Syncora/actions/workflows/verify.yml/badge.svg)](https://github.com/visheshgupta0404/Syncora/actions/workflows/verify.yml)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=61DAFB&labelColor=10141f)
![Installable PWA](https://img.shields.io/badge/Installable-PWA-bdc6ff?style=flat&labelColor=10141f)

</div>

---

## ✦ Made for shared moments

| Watch together | Make it your room |
| :--- | :--- |
| **Search YouTube** — find videos without leaving the app | **Private invites** — room codes, links and WhatsApp sharing |
| **Shared controls** — play, pause, seek and restart | **Live conversation** — chat while you watch |
| **Reusable playlist** — thumbnails, reorder and play next | **Take it with you** — install on Android or iPhone |
| **Stay together** — catch up with Resync | **Know what's next** — current video and up-next labels |

## Your room in three steps

1. **Create** — [open Syncora](https://syncoramoments.pages.dev/), enter your name and create a room.
2. **Invite** — share the room link or send a WhatsApp invitation.
3. **Enjoy** — search for a video, add it to the queue and press play.

**Install it:** Android → browser install option. iPhone → Safari → Share → Add to Home Screen.

## For developers

**React · Vite · Supabase · Cloudflare Pages**

<details>
<summary><strong>Open local setup & project guide</strong></summary>

Use **Node.js 24**:

```sh
npm ci
npm run dev
```

Choose **Explore the local demo** to try the interface without configuration. For shared rooms, copy `.env.example` to `.env.local` and follow the [deployment guide](docs/DEPLOYMENT.md). YouTube search requires the server-side [API setup](docs/YOUTUBE-SEARCH.md).

```sh
npm test
npm run build
```

| Folder | Purpose |
| :--- | :--- |
| `src/` | UI components, room hooks and shared logic |
| `functions/` | Server-side YouTube search |
| `supabase/` | Schema, permissions and migrations |
| `public/` | Icons and hosting configuration |
| `tests/` · `scripts/` | Automated checks and maintenance tools |
| `docs/` | Setup and verification guides |

Pushes to `main` deploy automatically. Keep local secrets in ignored environment files.

</details>

## A few things to know

Keep Syncora visible while listening. iPhone may need a tap to enable sound. YouTube buffering and device restrictions mean **exact 0 ms sync and background playback aren't guaranteed**.

Rooms expire after **7 days**. Share invitations privately. Chat is visible to room members and the database administrator; it is not end-to-end encrypted. Videos play through YouTube's official embedded player.

---

<div align="center">

**A little closer, wherever you are.**

[Open Syncora](https://syncoramoments.pages.dev/) &nbsp; · &nbsp; [Deployment](docs/DEPLOYMENT.md) &nbsp; · &nbsp; [Verification](docs/VERIFICATION.md)

</div>
