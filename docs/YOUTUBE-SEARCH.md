# YouTube search setup

Search uses the official YouTube Data API through `/api/youtube-search`. The key stays on Cloudflare; requests require membership in an unexpired room.

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **YouTube Data API v3** and create an API key restricted to that API.
3. In Cloudflare Pages → **syncoramoments → Settings → Variables and Secrets**, save `YOUTUBE_API_KEY` as a production **Secret**. Never prefix it with `VITE_` or commit it.
4. Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are available to the function, then redeploy.
5. Join a room, search and add a result; verify another member sees it.

Review Google's daily quota. Search runs on submission; authenticated access does not replace abuse protection. Pages has no fixed outbound IP, so an IP restriction is unsuitable here; browser referrer restrictions are unsuitable for this server-side key.

`npm run dev` serves the frontend only. Test real search on hosted Pages. Pasting links works without the API key.

Search terms go to Google/YouTube. Results are limited to eight embeddable videos; playback restrictions can still apply. Adding a result saves its video ID and title in the shared queue.
