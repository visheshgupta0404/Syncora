import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("link preview metadata is present in initial HTML for social crawlers", async () => {
  const html = await readFile(
    new URL("../index.html", import.meta.url),
    "utf8",
  );
  const meta = (attribute, name) =>
    html.match(
      new RegExp(`<meta\\s+${attribute}="${name}"\\s+content="([^"]+)"`),
    )?.[1];
  const description = meta("name", "description");
  assert.ok(description.length >= 100);
  assert.equal(meta("property", "og:description"), description);
  assert.equal(meta("property", "og:type"), "website");
  assert.equal(meta("property", "og:url"), "https://syncoramoments.pages.dev/");
  assert.equal(
    meta("property", "og:image"),
    "https://syncoramoments.pages.dev/social-preview.png",
  );
  assert.equal(meta("name", "twitter:card"), "summary_large_image");
  assert.equal(meta("name", "twitter:image"), meta("property", "og:image"));
  assert.ok(meta("property", "og:image:alt").length > 20);
});

test("social preview PNG exists and matches declared dimensions", async () => {
  const image = await readFile(
    new URL("../public/social-preview.png", import.meta.url),
  );
  assert.equal(image.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
  const html = await readFile(
    new URL("../index.html", import.meta.url),
    "utf8",
  );
  assert.match(html, /property="og:image:width" content="1200"/);
  assert.match(html, /property="og:image:height" content="630"/);
});
