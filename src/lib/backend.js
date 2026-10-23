import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const captchaSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
export const db =
  url && key && !url.includes("YOUR_PROJECT") ? createClient(url, key) : null;
export async function rpc(name, args) {
  const secured = ["open_room", "room_action"].includes(name);
  const { data, error } = await db
    .rpc(
      secured ? "secure_room_request" : name,
      secured
        ? { operation: name === "open_room" ? "open" : "action", ...args }
        : args,
    )
    .abortSignal(AbortSignal.timeout(15000));
  if (error) throw error;
  if (secured && data?.error) throw Error(data.error);
  if (secured && !data?.data)
    throw Error("Invalid server response. Reload and retry.");
  return secured ? data.data : data;
}
export async function signIn(captchaToken) {
  const { data, error } = await db.auth.getSession();
  if (error) throw error;
  if (data.session) return data.session.user;
  const result = await db.auth.signInAnonymously({ options: { captchaToken } });
  if (result.error) throw result.error;
  return result.data.user;
}
export async function readRoom(id) {
  const { data, error } = await db
    .from("rooms")
    .select("*")
    .eq("id", id)
    .single()
    .abortSignal(AbortSignal.timeout(15000));
  if (error) throw error;
  return data;
}
export async function measureClock() {
  // Select the quickest roundtrip to reduce asymmetric-network error.
  let best = { rtt: Infinity, offset: 0 };
  for (let i = 0; i < 3; i++) {
    const wall = Date.now(),
      start = performance.now();
    const server = await rpc("room_clock");
    const rtt = performance.now() - start;
    if (rtt < best.rtt)
      best = { rtt, offset: Number(server) - (wall + rtt / 2) };
  }
  return best.offset;
}
