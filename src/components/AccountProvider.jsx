import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { db, rpc } from "../lib/backend";
import { cleanPlaylists, cleanRooms } from "../lib/library";
import { readSaved, save } from "../lib/storage";
import { parseInvite } from "../lib/model";
const AccountContext = createContext(null);
export const useAccount = () => useContext(AccountContext);
const permanent = (user) => Boolean(user && !user.is_anonymous);
const transferKey = "syncora:guest-transfer";

export default function AccountProvider({ children }) {
  const [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [library, setLibrary] = useState({ playlists: [], room_names: {} }),
    [rooms, setRooms] = useState([]),
    [error, setError] = useState(""),
    [transferError, setTransferError] = useState(""),
    [authBusy, setAuthBusy] = useState(false),
    [syncing, setSyncing] = useState(false),
    [transferPending, setTransferPending] = useState(false);
  const current = useRef(null),
    serial = useRef(Promise.resolve()),
    loading = useRef(false),
    revision = useRef(0),
    loginLock = useRef(false);
  const signedIn = permanent(user);
  const refresh = useCallback(async () => {
    const owner = current.current;
    const requestRevision = revision.current;
    if (!permanent(owner) || loading.current) return;
    loading.current = true;
    setSyncing(true);
    try {
      const session = (await db.auth.getSession()).data.session;
      if (session?.user?.id !== owner.id) return;
      const result = await rpc("account_library", { operation: "read" });
      if (result.error) throw Error(result.error);
      const { data, error: roomError } = await db
        .from("rooms")
        .select("id,code,expires_at")
        .contains("members", [owner.id])
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(20)
        .abortSignal(AbortSignal.timeout(15000));
      if (roomError) throw roomError;
      if (
        current.current?.id !== owner.id ||
        (await db.auth.getSession()).data.session?.user?.id !== owner.id
      )
        return;
      if (requestRevision === revision.current) setLibrary(result.data);
      setRooms(data || []);
      setError("");
    } catch (e) {
      if (current.current?.id === owner.id)
        setError(e.message || "Account sync failed. Retry when connected.");
    } finally {
      loading.current = false;
      setSyncing(false);
    }
  }, []);
  const mutate = useCallback((operation, payload) => {
    revision.current++;
    const owner = current.current?.id;
    const job = serial.current.then(async () => {
      if (
        !owner ||
        owner !== current.current?.id ||
        !permanent(current.current)
      )
        throw Error("Sign in again before saving changes.");
      setSyncing(true);
      try {
        if ((await db.auth.getSession()).data.session?.user?.id !== owner)
          throw Error("Your account changed. Retry this action.");
        const result = await rpc("account_library", { operation, payload });
        if (result.error) throw Error(result.error);
        if (current.current?.id !== owner) return false;
        setLibrary(result.data);
        setError("");
        return true;
      } catch (e) {
        setError(e.message);
        return false;
      } finally {
        setSyncing(false);
      }
    });
    serial.current = job.catch(() => false);
    return serial.current;
  }, []);
  async function importDeviceLibrary() {
    const owner = current.current?.id;
    const playlists = cleanPlaylists(readSaved("playlists"));
    const existing = new Set(library.playlists.map((item) => item.id));
    for (const item of playlists)
      if (
        current.current?.id !== owner ||
        (!existing.has(item.id) && !(await mutate("save_playlist", item)))
      )
        return false;
    const known = new Set(rooms.map((room) => room.id));
    for (const item of cleanRooms(readSaved("recentRooms")))
      if (
        current.current?.id !== owner ||
        (known.has(item.id) &&
          !(await mutate("name_room", { id: item.id, name: item.name })))
      )
        return false;
    return true;
  }
  async function completeTransfer() {
    let transfer;
    try {
      transfer = JSON.parse(sessionStorage.getItem(transferKey) || "null");
    } catch {}
    if (!transfer?.token || !permanent(current.current)) return;
    try {
      await rpc("claim_guest_transfer", { token: transfer.token });
      const { data: owned, error: ownedError } = await db
        .from("rooms")
        .select("id")
        .contains("members", [current.current.id]);
      if (ownedError) throw ownedError;
      const ids = new Set(owned.map((room) => room.id));
      const cloud = await rpc("account_library", { operation: "read" });
      if (cloud.error) throw Error(cloud.error);
      for (const room of cleanRooms(transfer.rooms))
        if (ids.has(room.id) && !cloud.data.room_names?.[room.id]) {
          const result = await rpc("account_library", {
            operation: "name_room",
            payload: { id: room.id, name: room.name },
          });
          if (result.error) throw Error(result.error);
        }
      save("recentRooms", null);
      sessionStorage.removeItem(transferKey);
      setTransferPending(false);
      setTransferError("");
      if (transfer.resume && ids.has(transfer.resume.id))
        save("room", { ...transfer.resume, ownerId: current.current.id });
      await refresh();
    } catch (e) {
      setTransferError(e.message);
      setTransferPending(true);
    }
  }
  useEffect(() => {
    if (!db) {
      setReady(true);
      return;
    }
    let active = true;
    let authQueue = Promise.resolve();
    const apply = async (session) => {
      if (!active) return;
      const previous = current.current;
      if (previous?.id !== session?.user?.id && permanent(session?.user))
        setReady(false);
      current.current = session?.user || null;
      setUser(current.current);
      if (previous?.id !== current.current?.id) {
        setLibrary({ playlists: [], room_names: {} });
        setRooms([]);
      }
      if (permanent(current.current)) {
        const saved = readSaved("room");
        if (saved?.ownerId && saved.ownerId !== current.current.id)
          save("room", null);
        await completeTransfer();
        await refresh();
      }
      const callbackError = new URL(location.href).searchParams.get(
        "error_description",
      );
      if (callbackError) setError(callbackError.slice(0, 300));
      const invite = sessionStorage.getItem("syncora:auth-invite");
      if (permanent(current.current) && parseInvite(invite || "")) {
        history.replaceState(
          null,
          "",
          `${location.pathname}#room=${parseInvite(invite)}`,
        );
        sessionStorage.removeItem("syncora:auth-invite");
      }
      if (active) setReady(true);
    };
    const enqueue = (session) => {
      authQueue = authQueue
        .then(() => apply(session))
        .catch((e) => {
          if (active) {
            setError(e.message);
            setReady(true);
          }
        });
    };
    db.auth.getSession().then(({ data, error }) => {
      if (error) {
        setError(error.message);
        setReady(true);
      } else enqueue(data.session);
    });
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_event, session) => {
      // Supabase auth callbacks must not await another Supabase operation.
      setTimeout(() => enqueue(session), 0);
    });
    const update = () => {
      if (!document.hidden) refresh();
    };
    const timer = setInterval(update, 30000);
    window.addEventListener("online", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      active = false;
      subscription.unsubscribe();
      clearInterval(timer);
      window.removeEventListener("online", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [refresh]);
  async function login() {
    if (!db) return setError("Account sign-in is unavailable.");
    if (loginLock.current) return;
    loginLock.current = true;
    setAuthBusy(true);
    setError("");
    try {
      const invite = parseInvite(location.href);
      if (invite) sessionStorage.setItem("syncora:auth-invite", invite);
      const {
        data: { session },
      } = await db.auth.getSession();
      if (session?.user?.is_anonymous) {
        const token = (crypto.randomUUID() + crypto.randomUUID()).replaceAll(
          "-",
          "",
        );
        await rpc("prepare_guest_transfer", { token });
        sessionStorage.setItem(
          transferKey,
          JSON.stringify({
            token,
            resume: readSaved("room"),
            rooms: cleanRooms(readSaved("recentRooms")),
          }),
        );
      }
      const result = await db.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: location.origin + "/",
          scopes: "openid email profile",
          queryParams: { prompt: "select_account" },
        },
      });
      if (result.error) throw result.error;
    } catch (e) {
      setError(e.message);
      loginLock.current = false;
      setAuthBusy(false);
    }
  }
  async function logout() {
    const { error } = await db.auth.signOut({ scope: "local" });
    if (error) {
      setError(error.message);
      return;
    }
    save("room", null);
    save("name", null);
    sessionStorage.removeItem(transferKey);
    current.current = null;
    setUser(null);
    setLibrary({ playlists: [], room_names: {} });
    setRooms([]);
    setError("");
    setTransferError("");
    setTransferPending(false);
  }
  const accountRooms = rooms
    .filter((room) => !library.room_names?.[room.id]?.hidden)
    .map((room) => ({
      id: room.id,
      code: room.code,
      name: library.room_names?.[room.id]?.name || "My room",
      lastUsed: new Date(room.expires_at).getTime() - 7 * 86400000,
      expiresAt: new Date(room.expires_at).getTime(),
    }));
  return (
    <AccountContext.Provider
      value={{
        user,
        signedIn,
        ready,
        library,
        rooms: accountRooms,
        error: transferError || error,
        authBusy,
        syncing,
        refresh,
        mutate,
        login,
        logout,
        importDeviceLibrary,
        transferPending,
        completeTransfer,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}
