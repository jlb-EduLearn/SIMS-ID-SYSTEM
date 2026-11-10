import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Scanner, useDevices } from "@yudiel/react-qr-scanner";
import { Network } from "@capacitor/network";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SCANNER_POPUP_MS } from "./config";
import * as api from "./lib/api";
import {
  clearSession,
  enqueue,
  formatCooldown,
  listPending,
  loadSession,
  lookupPerson,
  recordAccepted,
  removePending,
  replaceDirectory,
  saveSession,
  wasAcceptedRecently,
  type Person,
  type School,
} from "./lib/offline";

type Facing = "environment" | "user";
type Popup = {
  kind: "success" | "already" | "miss" | "queued";
  message: string;
  student: Person | null;
};

export default function App() {
  const devices = useDevices();
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [stationName, setStationName] = useState("");
  const [login, setLogin] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [facing, setFacing] = useState<Facing>("environment");
  const [deviceId, setDeviceId] = useState("");
  const [popup, setPopup] = useState<Popup | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastCodeRef = useRef("");
  const lastAtRef = useRef(0);
  const popupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncingRef = useRef(false);

  const constraints = useMemo(() => {
    if (deviceId) return { deviceId: { exact: deviceId } };
    return { facingMode: facing };
  }, [deviceId, facing]);

  const refreshPending = useCallback(async () => {
    setPending((await listPending()).length);
  }, []);

  const showPopup = useCallback((next: Popup) => {
    if (popupTimer.current) clearTimeout(popupTimer.current);
    setPopup(next);
    popupTimer.current = setTimeout(() => setPopup(null), SCANNER_POPUP_MS);
  }, []);

  const hydrateDirectory = useCallback(async (authToken: string) => {
    const data = await api.fetchDirectory(authToken);
    await replaceDirectory(data.people || []);
  }, []);

  const flushPending = useCallback(
    async (authToken: string) => {
      if (!navigator.onLine || syncingRef.current) return;
      const items = await listPending();
      if (!items.length) {
        await refreshPending();
        return;
      }
      syncingRef.current = true;
      try {
        const data = await api.syncScans(authToken, items);
        for (const result of data.results || []) {
          const id = result.clientId as string | undefined;
          if (!id || result.error) continue;
          await removePending(id);
          const student = result.student as Person | null;
          if (result.found && !result.alreadyScanned && student?.id) {
            await recordAccepted(
              student.id,
              result.scannedAt
                ? new Date(String(result.scannedAt)).getTime()
                : Date.now()
            );
          }
        }
      } catch {
        /* keep queue */
      } finally {
        syncingRef.current = false;
        await refreshPending();
      }
    },
    [refreshPending]
  );

  useEffect(() => {
    void StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
    void StatusBar.setBackgroundColor({ color: "#0b1220" }).catch(
      () => undefined
    );

    void (async () => {
      const status = await Network.getStatus().catch(() => ({
        connected: navigator.onLine,
      }));
      setOnline(Boolean(status.connected));

      const session = await loadSession();
      if (session.token && session.school) {
        setToken(session.token);
        setSchool(session.school);
        setStationName(session.stationName);
        setLogin(session.login);
        try {
          if (navigator.onLine) {
            const ctx = await api.fetchContext(session.token);
            setSchool(ctx.school);
            setStationName(ctx.stationName);
            setLogin(ctx.login);
            await saveSession({
              token: session.token,
              school: ctx.school,
              stationName: ctx.stationName,
              login: ctx.login,
            });
            await hydrateDirectory(session.token);
            await flushPending(session.token);
          }
        } catch {
          /* keep cached session */
        }
        await refreshPending();
      }
      setBooting(false);
    })();

    const sub = Network.addListener("networkStatusChange", (s) => {
      setOnline(s.connected);
    });
    return () => {
      void sub.then((h) => h.remove());
      if (popupTimer.current) clearTimeout(popupTimer.current);
    };
  }, [flushPending, hydrateDirectory, refreshPending]);

  useEffect(() => {
    if (!online || !token) return;
    void hydrateDirectory(token).catch(() => undefined);
    void flushPending(token);
    const t = setInterval(() => void flushPending(token), 20000);
    return () => clearInterval(t);
  }, [online, token, flushPending, hydrateDirectory]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const data = await api.login(username.trim(), password);
      await saveSession({
        token: data.token,
        school: data.school,
        stationName: data.stationName,
        login: data.login,
      });
      setToken(data.token);
      setSchool(data.school);
      setStationName(data.stationName);
      setLogin(data.login);
      await hydrateDirectory(data.token);
      await refreshPending();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await clearSession();
    setToken(null);
    setSchool(null);
    setPopup(null);
  }

  const onScan = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed || !token || busy || popup) return;
      const now = Date.now();
      if (trimmed === lastCodeRef.current && now - lastAtRef.current < 2000) {
        return;
      }
      lastCodeRef.current = trimmed;
      lastAtRef.current = now;
      setBusy(true);

      try {
        if (!navigator.onLine) {
          const person = await lookupPerson(trimmed);
          if (person) {
            const cool = await wasAcceptedRecently(person.id, now);
            if (cool.blocked) {
              showPopup({
                kind: "already",
                message: `Already scanned — try again in ${formatCooldown(cool.remainingMs)}`,
                student: person,
              });
              return;
            }
            await enqueue(trimmed, now);
            await recordAccepted(person.id, now);
            await refreshPending();
            showPopup({
              kind: "queued",
              message: "Saved offline — will sync when online",
              student: person,
            });
            return;
          }
          await enqueue(trimmed, now);
          await refreshPending();
          showPopup({
            kind: "miss",
            message: "No match offline — queued for server check",
            student: null,
          });
          return;
        }

        const pendingItem = await enqueue(trimmed, now);
        try {
          const data = await api.postScan(token, {
            code: trimmed,
            scannedAt: now,
            clientId: pendingItem.id,
          });
          await removePending(pendingItem.id);
          if (data.found && !data.alreadyScanned && data.student?.id) {
            await recordAccepted(data.student.id, now);
          }
          await refreshPending();

          if (data.alreadyScanned) {
            showPopup({
              kind: "already",
              message: data.message || "Already scanned",
              student: data.student || null,
            });
          } else if (data.found && data.student) {
            showPopup({
              kind: "success",
              message: data.message || "Welcome",
              student: data.student,
            });
          } else {
            showPopup({
              kind: "miss",
              message: data.message || "No matching student or card",
              student: null,
            });
          }
        } catch (err) {
          await refreshPending();
          showPopup({
            kind: "miss",
            message:
              err instanceof Error
                ? `${err.message} — kept in offline queue`
                : "Scan failed — queued",
            student: null,
          });
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, popup, refreshPending, showPopup, token]
  );

  if (booting) {
    return <div className="center">Starting scanner…</div>;
  }

  if (!token || !school) {
    return (
      <div className="login">
        <form className="login-card" onSubmit={handleLogin}>
          <h1>SIMS Scanner</h1>
          <p>Native tablet app — landscape camera left, school logo right.</p>
          {authError && <div className="error">{authError}</div>}
          <div className="field">
            <label htmlFor="user">Scanner username</label>
            <input
              id="user"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="age-scanner1"
              autoComplete="username"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="pass">Password</label>
            <input
              id="pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          <button className="btn primary" type="submit" disabled={authLoading}>
            {authLoading ? "Signing in…" : "Open scanner"}
          </button>
        </form>
      </div>
    );
  }

  const gradeLine = popup?.student
    ? [popup.student.gradeLabel, popup.student.section]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>{school.name}</h1>
          <p>
            {login} · {stationName}
          </p>
        </div>
        <div className="topbar-actions">
          <span className={`pill ${online ? "online" : "offline"}`}>
            {online ? "Online" : "Offline"}
            {pending > 0 ? ` · ${pending} queued` : ""}
          </span>
          <div className="seg">
            <button
              type="button"
              className={!deviceId && facing === "environment" ? "active" : ""}
              onClick={() => {
                setFacing("environment");
                setDeviceId("");
              }}
            >
              Back cam
            </button>
            <button
              type="button"
              className={!deviceId && facing === "user" ? "active" : ""}
              onClick={() => {
                setFacing("user");
                setDeviceId("");
              }}
            >
              Front cam
            </button>
          </div>
          {devices.length > 1 && (
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              style={{
                height: 34,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(0,0,0,.35)",
                color: "white",
                maxWidth: 160,
              }}
            >
              <option value="">Auto camera</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (!token) return;
              void hydrateDirectory(token)
                .then(() => flushPending(token))
                .catch(() => undefined);
            }}
          >
            Sync
          </button>
          <button type="button" className="btn ghost" onClick={() => void handleLogout()}>
            Sign out
          </button>
        </div>
      </header>

      <div className="station">
        {/* LEFT: scanner camera */}
        <section className="cam-pane">
          <div className="cam-frame">
            <Scanner
              onScan={(codes) => {
                const value = codes[0]?.rawValue;
                if (value) void onScan(value);
              }}
              onError={(err) =>
                setCameraError(err?.message || "Camera unavailable")
              }
              formats={["qr_code"]}
              sound
              allowMultiple
              scanDelay={1800}
              paused={Boolean(popup) || busy}
              constraints={constraints}
              styles={{
                container: { width: "100%", height: "100%" },
                video: { objectFit: "cover" },
              }}
              components={{ finder: true, torch: true }}
            />
            {cameraError && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: 12,
                  background: "rgba(127,29,29,.9)",
                  fontSize: 13,
                }}
              >
                {cameraError}
              </div>
            )}
          </div>
          <p className="cam-hint">
            Left = camera · Right = school logo / student card after scan
          </p>
        </section>

        {/* RIGHT: school logo / student popup */}
        <section className="logo-pane">
          <div>
            <div
              className={`card ${
                popup?.kind === "success" || popup?.kind === "queued"
                  ? "ok"
                  : popup?.kind === "already"
                    ? "warn"
                    : popup?.kind === "miss"
                      ? "bad"
                      : ""
              }`}
            >
              {!popup ? (
                school.logoUrl ? (
                  <img className="logo" src={school.logoUrl} alt={school.name} />
                ) : (
                  <div style={{ padding: 40, color: "#64748b" }}>
                    No school logo uploaded
                  </div>
                )
              ) : (
                <>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color:
                        popup.kind === "already"
                          ? "#b45309"
                          : popup.kind === "miss"
                            ? "#be123c"
                            : "#047857",
                    }}
                  >
                    {popup.kind === "success"
                      ? "Scan accepted"
                      : popup.kind === "queued"
                        ? "Saved offline"
                        : popup.kind === "already"
                          ? "Already scanned"
                          : "Not recognized"}
                  </div>
                  {popup.student ? (
                    <>
                      {popup.student.photoUrl ? (
                        <img
                          className="photo"
                          src={popup.student.photoUrl}
                          alt={popup.student.fullName}
                        />
                      ) : (
                        <div
                          className="photo"
                          style={{
                            display: "grid",
                            placeItems: "center",
                            background: "#e2e8f0",
                            fontSize: 56,
                            fontWeight: 700,
                            color: "#64748b",
                          }}
                        >
                          {popup.student.fullName.slice(0, 1)}
                        </div>
                      )}
                      <h2>{popup.student.fullName}</h2>
                      <div className="meta">{popup.student.studentId}</div>
                      <div className="meta">{gradeLine}</div>
                    </>
                  ) : (
                    <p style={{ marginTop: 28 }}>{popup.message}</p>
                  )}
                  <div className="status">{popup.message}</div>
                </>
              )}
            </div>

            {!popup ? (
              <div className="school-title">
                <h2>{school.name}</h2>
                <p>{school.code}</p>
              </div>
            ) : (
              <p
                style={{
                  marginTop: 14,
                  textAlign: "center",
                  color: "#bae6fd",
                  fontSize: 13,
                }}
              >
                Returning to school logo in 5 seconds…
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
