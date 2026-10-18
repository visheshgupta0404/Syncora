import { useEffect, useRef, useState } from "react";
import { db, measureClock, readRoom, rpc, signIn } from "./backend";
import { initialState, reduce } from "./model";
import { readSaved, save } from "./storage";

export function useRoom(notify) {
  const [room, setRoom] = useState(null),
    [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Not connected"),
    [online, setOnline] = useState(navigator.onLine);
  const [offset, setOffset] = useState(0),
    [presence, setPresence] = useState(0);
  const ref = useRef(null),
    epoch = useRef(0),
    chain = useRef(Promise.resolve()),
    actor = useRef(null);
  const notice = useRef(notify);
  notice.current = notify;
  const accept = (r, generation) => {
    if (
      generation !== epoch.current ||
      (ref.current && r.id !== ref.current.id)
    )
      return;
    if (ref.current && r.version < ref.current.version) return;
    ref.current = r;
    setRoom(r);
  };
  const reset = () => {
    epoch.current++;
    ref.current = null;
    setRoom(null);
    setPresence(0);
    save("room", null);
    history.replaceState(null, "", location.pathname);
  };
  async function open(invite, captchaToken) {
    setBusy(true);
    const generation = ++epoch.current;
    try {
      if (!db)
        throw Error(
          "Connect a Supabase project to create a shared room. You can explore the local demo now.",
        );
      if (!navigator.onLine)
        throw Error("You are offline. Reconnect before joining.");
      actor.current = await signIn(captchaToken);
      const r = await rpc("open_room", { invite: invite || null });
      if (generation !== epoch.current) return;
      ref.current = null;
      accept(r, generation);
      save("room", { id: r.id, code: r.code });
      history.replaceState(null, "", `#room=${r.code}`);
      setStatus("Connecting…");
    } catch (e) {
      notice.current(e.message);
    } finally {
      setBusy(false);
    }
  }
  function demo() {
    const generation = ++epoch.current;
    const saved = readSaved("demo");
    const state =
      saved && Array.isArray(saved.queue) && Array.isArray(saved.messages)
        ? saved
        : initialState();
    // Pause restored demo playback until the listener chooses Play.
    state.playing = false;
    ref.current = null;
    accept(
      { id: "demo", code: "LOCAL-DEMO", members: [], state, version: 0 },
      generation,
    );
    setStatus("Local demo · this browser only");
    setPresence(1);
  }
  useEffect(() => {
    let active = true;
    const restore = async () => {
      const saved = readSaved("room");
      if (
        !db ||
        !saved?.id ||
        (location.hash && location.hash !== `#room=${saved.code}`)
      )
        return;
      setBusy(true);
      const generation = epoch.current;
      try {
        const {
          data: { session },
        } = await db.auth.getSession();
        if (!session) {
          save("room", null);
          return;
        }
        actor.current = session.user;
        const r = await readRoom(saved.id);
        if (active) {
          accept(r, generation);
          setStatus("Reconnecting…");
        }
      } catch (e) {
        if (active) {
          if (e.code === "PGRST116") save("room", null);
          else
            notice.current(
              "Could not restore the room. Check your connection and use Resume room.",
            );
        }
      } finally {
        if (active) setBusy(false);
      }
    };
    restore();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const on = () => setOnline(true),
      off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  useEffect(() => {
    if (!room || room.id === "demo") return;
    let active = true,
      refreshing = false,
      subscribed = false;
    const generation = epoch.current,
      id = room.id;
    async function refresh() {
      if (!active || refreshing || !navigator.onLine) return;
      refreshing = true;
      try {
        const r = await readRoom(id);
        if (!active) return;
        accept(r, generation);
        setStatus(subscribed ? "Live room" : "Connected · recovery mode");
      } catch (e) {
        if (!active) return;
        if (e.code === "PGRST116") {
          reset();
          notice.current(
            "This room expired or your seat was released. Create or join a room.",
          );
        } else setStatus("Reconnecting…");
      } finally {
        refreshing = false;
      }
    }
    const channel = db
      .channel(`room:${id}`, {
        config: {
          private: true,
          presence: { key: actor.current?.id || crypto.randomUUID() },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${id}`,
        },
        (e) => {
          if (active) accept(e.new, generation);
        },
      )
      .on("presence", { event: "sync" }, () => {
        if (active) setPresence(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (s) => {
        if (!active) return;
        subscribed = s === "SUBSCRIBED";
        setStatus(subscribed ? "Live room" : "Reconnecting…");
        if (subscribed) {
          await channel.track({ online_at: new Date().toISOString() });
          refresh();
        }
      });
    async function clock() {
      try {
        const n = await measureClock();
        if (active) setOffset(n);
      } catch {}
    }
    const visible = () => {
      if (!document.hidden) {
        refresh();
        clock();
      }
    };
    const timer = setInterval(() => {
      if (!document.hidden) refresh();
    }, 15000);
    const clockTimer = setInterval(clock, 120000);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", visible);
    clock();
    refresh();
    return () => {
      active = false;
      clearInterval(timer);
      clearInterval(clockTimer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", visible);
      db.removeChannel(channel);
    };
  }, [room?.id]);
  function dispatch(action) {
    const id = ref.current?.id,
      generation = epoch.current,
      commandId = crypto.randomUUID();
    const job = chain.current.then(async () => {
      if (generation !== epoch.current || !id || ref.current?.id !== id)
        return false;
      if (id === "demo") {
        const state = reduce(ref.current.state, action);
        if (!save("demo", state))
          notice.current(
            "Browser storage is unavailable. The demo will not survive a reload.",
          );
        accept(
          { ...ref.current, state, version: ref.current.version + 1 },
          generation,
        );
        return true;
      }
      if (!navigator.onLine)
        throw Error(
          "You are offline. Reconnect and try again; commands are not queued offline.",
        );
      // Retry ambiguous network failures with the same ID; the server deduplicates.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const r = await rpc("room_action", {
            room_id: id,
            command_id: commandId,
            action,
          });
          accept(r, generation);
          return true;
        } catch (e) {
          if (attempt || e.code || !navigator.onLine) throw e;
        }
      }
    });
    chain.current = job.catch((e) => {
      notice.current(e.message || "The change could not be saved. Try again.");
      return false;
    });
    return chain.current;
  }
  async function leave(release = false) {
    if (release && ref.current?.id !== "demo") {
      setBusy(true);
      try {
        await rpc("leave_room", { room_id: ref.current.id });
        reset();
      } catch (e) {
        notice.current(e.message);
      } finally {
        setBusy(false);
      }
    } else {
      const saved =
        ref.current?.id !== "demo"
          ? { id: ref.current?.id, code: ref.current?.code }
          : null;
      reset();
      if (saved?.id) save("room", saved);
    }
  }
  return {
    room,
    state: room?.state || initialState(),
    busy,
    status: online ? status : "Offline · reconnect to sync",
    online,
    offset: room?.id === "demo" ? 0 : offset,
    presence,
    open,
    demo,
    dispatch,
    leave,
  };
}
