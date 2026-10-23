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
    // Atomic database reservation validates membership and commits abuse budgets.
    const reservation = await fetcher(
      `${env.VITE_SUPABASE_URL}/rest/v1/rpc/reserve_youtube_search`,
      {
        method: "POST",
        headers: {
          authorization,
          apikey: env.VITE_SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: "{}",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!reservation.ok)
      return json(
        { error: "Search authorization is unavailable. Rejoin or try later." },
        reservation.status === 401 ? 401 : 503,
      );
    const budget = await reservation.json();
    if (budget?.status !== 200) {
      const status = [401, 403, 429].includes(budget?.status)
        ? budget.status
        : 503;
      return json(
        {
          error:
            status === 429
              ? "Search limit reached. Wait a minute or paste a video link. Daily limits may apply."
              : "Join a room before searching.",
        },
        status,
      );
    }
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
    const items = (Array.isArray(body.items) ? body.items : [])
      .slice(0, 8)
      .filter(
        (v) =>
          /^[\w-]{11}$/.test(v.id?.videoId) &&
          typeof v.snippet?.title === "string",
      )
      .map((v) => ({
        id: v.id.videoId,
        title: v.snippet.title.slice(0, 120),
        channel:
          typeof v.snippet.channelTitle === "string"
            ? v.snippet.channelTitle.slice(0, 120)
            : "",
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
