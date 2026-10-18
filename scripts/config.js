export function validateConfig(env, required = false) {
  const url = env.VITE_SUPABASE_URL || "",
    key = env.VITE_SUPABASE_ANON_KEY || "";
  const placeholder =
    url.includes("YOUR_PROJECT") || key.includes("YOUR_PUBLIC");
  if (!url && !key && !required) return;
  if (placeholder && !required) return;
  if (!url || !key || placeholder)
    throw Error(
      "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the Supabase public project settings.",
    );
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw Error("Invalid Supabase URL");
  }
  if (
    parsed.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(parsed.hostname)
  )
    throw Error("Supabase must use HTTPS");
  if (key.startsWith("sb_secret_"))
    throw Error(
      "Never expose a Supabase secret key in the frontend. Use the publishable key.",
    );
  if (key.split(".").length === 3) {
    let payload;
    try {
      payload = JSON.parse(
        Buffer.from(key.split(".")[1], "base64url").toString(),
      );
    } catch {
      throw Error("Invalid legacy Supabase key");
    }
    if (payload.role !== "anon")
      throw Error("Only the public anon key belongs in the frontend.");
  }
}
