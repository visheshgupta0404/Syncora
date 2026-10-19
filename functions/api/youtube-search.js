const json = (body, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

export async function handleSearch({ request, env }, fetcher = fetch) {
  if (request.method !== "GET")
    return json({ error: "Method not allowed" }, 405);
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length > 100)
    return json({ error: "Enter a search between 1 and 100 characters." }, 400);
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer "))
    return json({ error: "Join a room before searching." }, 401);
  if (
    !env.YOUTUBE_API_KEY ||
    !env.VITE_SUPABASE_URL ||
    !env.VITE_SUPABASE_ANON_KEY
  )
    return json(
      {
        error:
          "YouTube search is awaiting setup. You can still paste a video link.",
      },
      503,
    );
  try {
    // Validate the guest token and room membership through RLS before spending quota.
    const membership = await fetcher(
      `${env.VITE_SUPABASE_URL}/rest/v1/rooms?select=id&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&limit=1`,
      {
        headers: { authorization, apikey: env.VITE_SUPABASE_ANON_KEY },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!membership.ok)
      return json({ error: "Your session expired. Rejoin the room." }, 401);
    const rooms = await membership.json();
    if (!Array.isArray(rooms) || !rooms.length)
      return json({ error: "Join a room before searching." }, 403);
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.search = new URLSearchParams({
      part: "snippet",
      type: "video",
      videoEmbeddable: "true",
      videoSyndicated: "true",
      maxResults: "8",
      q,
      key: env.YOUTUBE_API_KEY,
    });
    const upstream = await fetcher(url.toString(), {
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) {
      const body = await upstream.json().catch(() => ({}));
      const quota = body.error?.errors?.some((e) =>
        ["quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"].includes(
          e.reason,
        ),
      );
      return json(
        {
          error: quota
            ? "YouTube search has reached its usage limit. Try later or paste a link."
            : "YouTube search is unavailable. Try later or paste a link.",
        },
        quota ? 429 : 502,
      );
    }
    const body = await upstream.json();
    const items = (body.items || [])
      .filter((v) => /^[\w-]{11}$/.test(v.id?.videoId) && v.snippet?.title)
      .map((v) => ({
        id: v.id.videoId,
        title: v.snippet.title.slice(0, 120),
        channel: v.snippet.channelTitle || "",
        thumbnail: `https://i.ytimg.com/vi/${v.id.videoId}/mqdefault.jpg`,
      }));
    return json({ items });
  } catch {
    return json(
      { error: "Search could not connect. Try again or paste a link." },
      502,
    );
  }
}

export const onRequest = (context) => handleSearch(context);
