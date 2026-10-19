# Activate YouTube search

Search uses the official YouTube Data API v3 through a Cloudflare Pages Function. The key stays on the server. Users must have a signed-in guest identity with an unexpired room. Results include eight embeddable videos; regional, age and playback restrictions may still apply.

1. Sign into [Google Cloud Console](https://console.cloud.google.com/) with the account you want to own Syncora's API access. Create or select a project named Syncora.
2. In **APIs & Services → Library**, enable **YouTube Data API v3**.
3. Open **APIs & Services → Credentials → Create credentials → API key**. Restrict the key to **YouTube Data API v3** under API restrictions. This server-side integration cannot use browser HTTP-referrer restrictions, and Pages does not provide fixed outbound IPs. Keep the key secret.
4. Review the project's YouTube API quotas and set a daily search quota you are comfortable with. Search runs only when someone submits the form, not on every keystroke. Guest authentication is not abuse-proof; Google's quota is the hard usage ceiling. Do not enable paid upgrades for this feature.
5. In Cloudflare **Workers & Pages → syncora → Settings → Variables and Secrets**, add **YOUTUBE_API_KEY** as a **Secret** for Production. Never use a `VITE_` prefix. The existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must also be available to the Function.
6. Redeploy the latest main commit after saving the secret. Join a room, search for a video and choose **Add to queue**. Confirm a second member sees the item. Do not paste the key in chat, commit it, or place it in the public frontend.

Until the secret is configured, search displays a setup message and pasting links continues to work. `npm run dev` serves the Vite frontend only; hosted Pages is required for the `/api/youtube-search` route. Endpoint tests mock Google and Supabase; they do not prove a real API key or quota is configured.

Search terms are sent to Google/YouTube. Metadata is displayed as text and not retained by this endpoint. Adding a result copies its video ID and title into the normal shared queue. Playback continues through the official embedded player, with the existing iPhone foreground/tap limitations.
