import { test } from "node:test";
import assert from "node:assert/strict";
import { validateConfig } from "../scripts/config.js";
test("frontend configuration rejects privileged Supabase keys", () => {
  const url = "https://example.supabase.co";
  assert.doesNotThrow(() => validateConfig({}));
  assert.throws(() => validateConfig({}, true), /public project/);
  assert.doesNotThrow(() =>
    validateConfig({
      VITE_SUPABASE_URL: url,
      VITE_SUPABASE_ANON_KEY: "sb_publishable_public",
    }),
  );
  assert.throws(
    () =>
      validateConfig({
        VITE_SUPABASE_URL: url,
        VITE_SUPABASE_ANON_KEY: "sb_secret_secret",
      }),
    /Never expose/,
  );
  const key = `header.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.signature`;
  assert.throws(
    () =>
      validateConfig({ VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: key }),
    /Only the public/,
  );
});
