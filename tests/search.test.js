import test from "node:test";
import assert from "node:assert/strict";
import { handleSearch } from "../functions/api/youtube-search.js";
const env = {
  YOUTUBE_API_KEY: "private-test-key",
  VITE_SUPABASE_URL: "https://example.supabase.co",
  VITE_SUPABASE_ANON_KEY: "public-test-key",
};
const context = (query = "music", token = "Bearer guest") => ({
  env,
  request: new Request(
    `https://syncora.test/api/youtube-search?q=${encodeURIComponent(query)}`,
    { headers: token ? { Authorization: token } : {} },
  ),
});
test("search requires a valid query, configuration and guest session", async () => {
  assert.equal((await handleSearch(context(""))).status, 400);
  assert.equal((await handleSearch(context("x".repeat(101)))).status, 400);
  assert.equal((await handleSearch(context("music", null))).status, 401);
  assert.equal((await handleSearch({ ...context(), env: {} })).status, 503);
});
test("search enforces hosted room access before contacting YouTube", async () => {
  for (const [status, body, expected] of [
    [401, {}, 401],
    [200, [], 403],
  ]) {
    let calls = 0;
    const response = await handleSearch(context(), async () => {
      calls++;
      return Response.json(body, { status });
    });
    assert.equal(response.status, expected);
    assert.equal(calls, 1);
  }
});
test("search uses embeddable video filters and returns only safe result metadata", async () => {
  let calls = 0;
  const response = await handleSearch(
    context("A & B"),
    async (url, options) => {
      calls++;
      if (calls === 1) {
        assert.equal(options.headers.authorization, "Bearer guest");
        return Response.json([{ id: "room" }]);
      }
      const params = new URL(url).searchParams;
      assert.equal(params.get("q"), "A & B");
      assert.equal(params.get("videoEmbeddable"), "true");
      assert.equal(params.get("type"), "video");
      assert.equal(options.headers, undefined); // Never forward the guest token to Google.
      return Response.json({
        items: [
          {
            id: { videoId: "dQw4w9WgXcQ" },
            snippet: { title: "A &amp; B", channelTitle: "Channel" },
          },
          { id: { videoId: "bad" } },
        ],
      });
    },
  );
  const body = await response.json();
  assert.equal(body.items.length, 1);
  assert.equal(
    body.items[0].thumbnail,
    "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
  );
  assert.equal(JSON.stringify(body).includes(env.YOUTUBE_API_KEY), false);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
test("search handles quota, upstream failure and connection errors without leaking secrets", async () => {
  for (const [reason, expected] of [
    ["quotaExceeded", 429],
    ["keyInvalid", 502],
  ]) {
    let calls = 0;
    const response = await handleSearch(context(), async () =>
      ++calls === 1
        ? Response.json([{ id: "room" }])
        : Response.json({ error: { errors: [{ reason }] } }, { status: 403 }),
    );
    assert.equal(response.status, expected);
    assert.equal((await response.text()).includes(env.YOUTUBE_API_KEY), false);
  }
  assert.equal(
    (
      await handleSearch(context(), async () => {
        throw Error("secret internal detail");
      })
    ).status,
    502,
  );
});
