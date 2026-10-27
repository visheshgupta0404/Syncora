import test from "node:test";
import assert from "node:assert/strict";
import { requestGiphy, gifRendition } from "../src/lib/giphy.js";
import { getGiphyId } from "../src/lib/chat-media.js";

test("GIPHY search preserves provider URLs and stores only validated GIF identifiers", async () => {
  const result = await requestGiphy("search", { q: "happy & dancing", limit: "12", rating: "g" }, {
    key: "test-key", fetcher: async (url, options) => {
      assert.equal(url.origin, "https://api.giphy.com");
      assert.equal(url.searchParams.get("q"), "happy & dancing");
      assert.equal(url.searchParams.get("rating"), "g");
      assert.equal(options.cache, "no-store");
      return Response.json({ data: [{ id: "abc123" }] });
    },
  });
  assert.equal(result.data[0].id, "abc123");
  assert.equal(gifRendition({ images: { fixed_width: { url: "https://media.giphy.com/a.gif?cid=provider&rid=a.gif" } } }), "https://media.giphy.com/a.gif?cid=provider&rid=a.gif");
  assert.equal(getGiphyId("https://giphy.com/gifs/abc123"), "abc123");
  for (const value of ["https://giphy.com.evil.test/gifs/abc123", "https://giphy.com/gifs/../../x", "javascript:abc", null]) assert.equal(getGiphyId(value), null);
});

test("GIF provider errors and missing configuration produce safe messages", async () => {
  await assert.rejects(requestGiphy("search", {}, { key: "" }), /awaiting setup/);
  await assert.rejects(requestGiphy("search", {}, { key: "secret", fetcher: async () => Response.json({ error: "secret" }, { status: 429 }) }), /usage limit/);
  assert.equal(gifRendition({ images: { original: { url: "https://evil.test/a.gif" } } }), null);
});
