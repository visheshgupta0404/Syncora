import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getBuiltinGif, reactions } from "../src/lib/reactions.js";

test("bundled GIF messages resolve only known reactions and include offline animation assets", async () => {
  assert.equal(reactions.length, new Set(reactions.map((item) => item.id)).size);
  for (const item of reactions) {
    assert.equal(getBuiltinGif(`syncora:gif:${item.id}`), `/gifs/${item.id}.gif`);
    const gif = await readFile(new URL(`../public/gifs/${item.id}.gif`, import.meta.url));
    assert.equal(gif.subarray(0, 6).toString(), "GIF89a");
    assert.ok(gif.includes(Buffer.from("NETSCAPE2.0")));
    const png = await readFile(new URL(`../public/gifs/${item.id}.png`, import.meta.url));
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  }
  for (const value of [null, "syncora:gif:../../private", "syncora:gif:unknown", "https://evil.test/hello.gif"]) assert.equal(getBuiltinGif(value), null);
});
