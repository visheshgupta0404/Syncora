import test from "node:test";
import assert from "node:assert/strict";
import { getGifUrl } from "../src/lib/chat-media.js";

test("GIF messages accept only direct HTTPS media from approved providers", () => {
  assert.equal(
    getGifUrl("https://media.giphy.com/media/test/giphy.gif?tracking=1#x"),
    "https://media.giphy.com/media/test/giphy.gif?tracking=1#x",
  );
  assert.equal(
    getGifUrl(" https://media2.giphy.com/media/test/giphy.gif "),
    "https://media2.giphy.com/media/test/giphy.gif",
  );
  assert.equal(
    getGifUrl("https://media.tenor.com/test/hello.gif"),
    "https://media.tenor.com/test/hello.gif",
  );
  for (const value of [
    null,
    "hello",
    "javascript:alert(1)",
    "data:image/gif;base64,abc",
    "http://media.giphy.com/a.gif",
    "https://media.giphy.com.evil.test/a.gif",
    "https://evil.test/a.gif",
    "https://media.giphy.com@evil.test/a.gif",
    "https://user:pass@media.giphy.com/a.gif",
    "https://media.giphy.com:8443/a.gif",
    "https://media.giphy.com/a.svg",
    "https://giphy.com/gifs/test",
    "https://media.giphy.com/" + "a".repeat(500) + ".gif",
  ]) {
    assert.equal(getGifUrl(value), null, String(value));
  }
});
