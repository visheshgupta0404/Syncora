<div align="center">

<img src="public/icon.svg" width="88" height="88" alt="Syncora flowing S logo" />

# Syncora

### Different places. Same moment.

Watch, listen and hang out together in a private room for **up to 6 people**.

**[▶ Launch Syncora](https://syncoraconnect.pages.dev/)** &nbsp; · &nbsp; [Quick start](#your-room-in-three-steps) &nbsp; · &nbsp; [Run locally](#for-developers)

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

1. **Create** — [open Syncora](https://syncoraconnect.pages.dev/), enter your name and create a room.
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

Choose **Explore the local demo** to try the interface without configuration.

For shared rooms:

1. Enable anonymous sign-in in Supabase and run `supabase/schema.sql` for a new database. Existing databases use the ordered SQL migrations.
2. Copy `.env.example` to `.env.local` and set the public Supabase URL/key. Never expose a service-role key.
3. Deploy `main` on Cloudflare Pages using `npm run build`, output `dist`, and Node.js 24. Set the public Supabase variables in Pages too.
4. For search, enable YouTube Data API v3 and save an API-restricted `YOUTUBE_API_KEY` as a server-only Pages secret.
5. For CAPTCHA, deploy `VITE_TURNSTILE_SITE_KEY` first, then enable **Turnstile by Cloudflare** in Supabase Auth with the matching secret. The site key is public; the secret stays in Supabase.

Local Vite serves the frontend; the search endpoint runs on Cloudflare Pages. Search has per-guest limits and a shared 80-request daily ceiling; pasting video links remains available.

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

Pushes to `main` deploy automatically. Keep local secrets in ignored environment files.

</details>

## A few things to know

Enjoy shared playback with your room and use **Resync** to catch up when needed. Keep Syncora open while watching or listening. On iPhone, tap the YouTube player to enable sound.

Rooms expire after **7 days of inactivity**. Joining or using room controls, the queue or chat renews this period. Share invitations privately. Chat is visible to room members and the database administrator; it is not end-to-end encrypted. Videos play through YouTube's official embedded player.

---

<div align="center">

**A little closer, wherever you are.**

[Try Syncora](https://syncoraconnect.pages.dev/)

</div>
