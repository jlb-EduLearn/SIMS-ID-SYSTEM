import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Scanner, useDevices } from "@yudiel/react-qr-scanner";
import { App as CapacitorApp } from "@capacitor/app";
import { Network } from "@capacitor/network";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SCANNER_POPUP_MS } from "./config";
import * as api from "./lib/api";
import {
  beginCameraSession,
  endCameraSession,
  isActiveCameraSession,
  stopAllCameraStreams,
  waitForCameraRequests,
  withCameraSession,
  type CameraSession,
} from "./lib/camera-gate";
import {
  cachePhotos,
  toDataUrl,
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

const CAMERA_FACING_KEY = "sims-native-scanner-facing";
const CAMERA_DEVICE_KEY = "sims-native-scanner-device";

function storedFacing(): Facing {
  try {
    return localStorage.getItem(CAMERA_FACING_KEY) === "user"
      ? "user"
      : "environment";
  } catch {
    return "environment";
  }
}

function storedDeviceId() {
  try {
    return localStorage.getItem(CAMERA_DEVICE_KEY) || "";
  } catch {
    return "";
  }
}

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
  const [facing, setFacing] = useState<Facing>(storedFacing);
  const [deviceId, setDeviceId] = useState(storedDeviceId);
  const [popup, setPopup] = useState<Popup | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [camera, setCamera] = useState<CameraSession | null>(null);
  const [stopping, setStopping] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const lastCodeRef = useRef("");
  const lastAtRef = useRef(0);
  const popupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncingRef = useRef(false);
  const scanLockRef = useRef(false);
  const scanningRef = useRef(false);
  const shutdownRef = useRef<Promise<void> | null>(null);

  const constraints = useMemo(
    () =>
      withCameraSession(
        deviceId ? { deviceId: { exact: deviceId } } : { facingMode: facing },
        camera
      ),
    [deviceId, facing, camera]
  );

  // Camera stays off until the operator presses Start. Stopping blocks new
  // camera requests, releases tracks, waits for in-flight requests, and only
  // then unmounts the Scanner.
  const stopCamera = useCallback(() => {
    if (shutdownRef.current) return shutdownRef.current;
    scanningRef.current = false;
    setStopping(true);
    const run = (async () => {
      await endCameraSession();
      flushSync(() => setCamera(null));
      stopAllCameraStreams();
    })();
    shutdownRef.current = run.finally(() => {
      shutdownRef.current = null;
      setStopping(false);
    });
    return shutdownRef.current;
  }, []);

  const startCamera = useCallback(() => {
    if (shutdownRef.current || scanningRef.current) return;
    const session = beginCameraSession();
    scanningRef.current = true;
    setCameraError(null);
    setCamera(session);
  }, []);

  const selectCamera = useCallback(
    (next: { facing: Facing; deviceId: string }) => {
      void (async () => {
        const restart = scanningRef.current;
        if (restart || shutdownRef.current) await stopCamera();
        setCameraError(null);
        setFacing(next.facing);
        setDeviceId(next.deviceId);
        try {
          localStorage.setItem(CAMERA_FACING_KEY, next.facing);
          localStorage.setItem(CAMERA_DEVICE_KEY, next.deviceId);
        } catch {
          /* preference only */
        }
        if (restart) startCamera();
      })();
    },
    [startCamera, stopCamera]
  );

  // appStateChange(false) fires only when the activity is fully stopped. A
  // plain pause, such as the camera permission dialog, must not end the
  // session that requested the permission.
  useEffect(() => {
    const appState = CapacitorApp.addListener("appStateChange", (state) => {
      if (!state.isActive) void stopCamera();
    });
    return () => {
      void appState.then((h) => h.remove()).catch(() => undefined);
      scanningRef.current = false;
      void endCameraSession();
    };
  }, [stopCamera]);

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
    const people = data.people || [];
    await replaceDirectory(people);
    void cachePhotos(people).then(replaceDirectory).catch(() => undefined);
  }, []);

  const persistSession = useCallback(
    async (input: {
      token: string;
      school: School;
      stationName: string;
      login: string;
    }) => {
      const logoUrl = await toDataUrl(input.school.logoUrl);
      const school = { ...input.school, logoUrl };
      await saveSession({ ...input, school });
      setSchool(school);
    },
    []
  );

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
            setStationName(ctx.stationName);
            setLogin(ctx.login);
            await persistSession({
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
  }, [flushPending, hydrateDirectory, persistSession, refreshPending]);

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
      setSchool(data.school);
      await persistSession({
        token: data.token,
        school: data.school,
        stationName: data.stationName,
        login: data.login,
      });
      setToken(data.token);
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

  // Clears only the signed-in session. Pending offline scans, the accepted
  // cooldown history and the cached directory stay in IndexedDB and sync after
  // the next sign-in.
  async function handleSignOut() {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await stopCamera();
      await waitForCameraRequests();
      stopAllCameraStreams();
      await clearSession();
      if (popupTimer.current) clearTimeout(popupTimer.current);
      setPopup(null);
      setCameraError(null);
      setConfirmSignOut(false);
      setSettingsOpen(false);
      setPassword("");
      setAuthError(null);
      setToken(null);
      setSchool(null);
    } catch (err) {
      setSignOutError(
        err instanceof Error ? err.message : "Could not sign out. Try again."
      );
    } finally {
      setSigningOut(false);
    }
  }

  useEffect(() => {
    const back = CapacitorApp.addListener("backButton", () => {
      if (confirmSignOut) {
        if (!signingOut) setConfirmSignOut(false);
      } else if (settingsOpen) {
        setSettingsOpen(false);
      } else {
        void CapacitorApp.exitApp().catch(() => undefined);
      }
    });
    return () => {
      void back.then((h) => h.remove()).catch(() => undefined);
    };
  }, [confirmSignOut, settingsOpen, signingOut]);

  const onScan = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed || !token || busy || popup || settingsOpen) return;
      if (!scanningRef.current || scanLockRef.current) return;
      const now = Date.now();
      if (trimmed === lastCodeRef.current && now - lastAtRef.current < 2000) {
        return;
      }
      lastCodeRef.current = trimmed;
      lastAtRef.current = now;
      scanLockRef.current = true;
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
        scanLockRef.current = false;
        setBusy(false);
      }
    },
    [busy, popup, refreshPending, settingsOpen, showPopup, token]
  );

  if (booting) {
    return <div className="center">Starting scanner…</div>;
  }

  if (!token || !school) {
    return (
      <div className="login">
        <form className="login-card" onSubmit={handleLogin}>
          <h1>SIMS Scanner</h1>
          <p>
            Sign in with this station&apos;s scanner account. The camera stays
            off until you press Start Scanner.
          </p>
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

  const selectedDevice = deviceId
    ? devices.find((d) => d.deviceId === deviceId)
    : undefined;
  const cameraLabel = deviceId
    ? selectedDevice?.label || "Specific camera"
    : facing === "user"
      ? "Front camera"
      : "Rear camera";
  const syncNow = () => {
    if (!token) return;
    void hydrateDirectory(token)
      .then(() => flushPending(token))
      .catch(() => undefined);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-title">
          <h1>{school.name}</h1>
          <p>
            {stationName || login} · {cameraLabel}
          </p>
        </div>
        <div className="topbar-actions">
          <span className={`pill ${online ? "online" : "offline"}`}>
            {online ? "Online" : "Offline"}
            {pending > 0 ? ` · ${pending} queued` : ""}
          </span>
          {camera ? (
            <button
              type="button"
              className="btn danger"
              disabled={stopping || signingOut}
              onClick={() => void stopCamera()}
            >
              {stopping ? "Stopping…" : "Stop Scanner"}
            </button>
          ) : (
            <button
              type="button"
              className="btn primary"
              disabled={stopping || signingOut}
              onClick={startCamera}
            >
              {stopping ? "Stopping…" : "Start Scanner"}
            </button>
          )}
          <button type="button" className="btn" onClick={syncNow}>
            Sync
          </button>
          <button
            type="button"
            className="btn settings-btn"
            aria-haspopup="dialog"
            onClick={() => setSettingsOpen(true)}
          >
            <span aria-hidden="true">⚙</span> Settings
          </button>
        </div>
      </header>

      <div className="station">
        {/* LEFT: scanner camera */}
        <section className="cam-pane">
          <div className="cam-frame">
            {camera ? (
              <Scanner
                key={camera.id}
                onScan={(codes) => {
                  if (!isActiveCameraSession(camera)) return;
                  const value = codes[0]?.rawValue;
                  if (value) void onScan(value);
                }}
                onError={(err) => {
                  if (!isActiveCameraSession(camera)) return;
                  setCameraError(err?.message || "Camera unavailable");
                  void stopCamera();
                }}
                formats={["qr_code"]}
                sound
                allowMultiple
                scanDelay={1800}
                paused={Boolean(popup) || busy || settingsOpen}
                constraints={constraints}
                styles={{
                  container: { width: "100%", height: "100%" },
                  video: { objectFit: "cover" },
                }}
                components={{ finder: true, torch: true }}
              />
            ) : (
              <div className="cam-idle">
                <div className="cam-idle-icon" aria-hidden="true">
                  ▣
                </div>
                <h2>{stopping ? "Stopping camera…" : "Camera is off"}</h2>
                {cameraError ? (
                  <div className="cam-error" role="alert">
                    <strong>Camera problem:</strong> {cameraError}
                    <span>
                      Allow camera permission for SIMS Scanner in Android
                      settings, or choose the other camera in Settings, then
                      retry.
                    </span>
                  </div>
                ) : (
                  <p>
                    Using the {cameraLabel.toLowerCase()}. Press Start Scanner
                    to turn it on.
                  </p>
                )}
                <div className="cam-idle-actions">
                  <button
                    type="button"
                    className="btn primary large"
                    disabled={stopping || signingOut}
                    onClick={startCamera}
                  >
                    {cameraError ? "Retry camera" : "Start Scanner"}
                  </button>
                  <button
                    type="button"
                    className="btn large"
                    onClick={() => setSettingsOpen(true)}
                  >
                    Camera settings
                  </button>
                </div>
              </div>
            )}
          </div>
          <p className="cam-hint">
            {camera
              ? "Scanning · hold the QR code inside the frame"
              : "Camera stays off until you press Start Scanner"}
          </p>
        </section>

        {/* RIGHT: school logo / student popup */}
        <section className="logo-pane" aria-live="polite">
          <div className="logo-pane-inner">
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
                  <div className="logo-missing">No school logo uploaded</div>
                )
              ) : (
                <>
                  <div className={`result-kicker ${popup.kind}`}>
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
                        <div className="photo photo-fallback">
                          {popup.student.fullName.slice(0, 1)}
                        </div>
                      )}
                      <h2>{popup.student.fullName}</h2>
                      <div className="meta">{popup.student.studentId}</div>
                      <div className="meta">{gradeLine}</div>
                    </>
                  ) : (
                    <p className="result-message">{popup.message}</p>
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
              <p className="returning">Returning to school logo in 5 seconds…</p>
            )}
          </div>
        </section>
      </div>

      {settingsOpen && (
        <div
          className="settings"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
        >
          <header className="settings-bar">
            <button
              type="button"
              className="btn back-btn"
              onClick={() => setSettingsOpen(false)}
            >
              <span aria-hidden="true">←</span> Back to scanner
            </button>
            <h1 id="settings-title">Settings</h1>
          </header>

          <div className="settings-body">
            <section className="settings-section">
              <h2>Camera</h2>
              <p className="settings-note">
                Selected: <strong>{cameraLabel}</strong> ·{" "}
                {stopping
                  ? "Camera is stopping"
                  : camera
                    ? "Scanner paused while Settings is open"
                    : "Camera is off"}
              </p>
              <div className="camera-options">
                <button
                  type="button"
                  className={`camera-option ${
                    !deviceId && facing === "environment" ? "selected" : ""
                  }`}
                  aria-pressed={!deviceId && facing === "environment"}
                  disabled={stopping || signingOut}
                  onClick={() =>
                    selectCamera({ facing: "environment", deviceId: "" })
                  }
                >
                  <span className="camera-option-name">Rear camera</span>
                  <span className="camera-option-hint">
                    {!deviceId && facing === "environment"
                      ? "Selected"
                      : "Faces away from the screen"}
                  </span>
                </button>
                <button
                  type="button"
                  className={`camera-option ${
                    !deviceId && facing === "user" ? "selected" : ""
                  }`}
                  aria-pressed={!deviceId && facing === "user"}
                  disabled={stopping || signingOut}
                  onClick={() => selectCamera({ facing: "user", deviceId: "" })}
                >
                  <span className="camera-option-name">Front camera</span>
                  <span className="camera-option-hint">
                    {!deviceId && facing === "user"
                      ? "Selected"
                      : "Faces the operator"}
                  </span>
                </button>
              </div>
              {devices.length > 1 && (
                <label className="field device-field">
                  <span>Specific camera (optional)</span>
                  <select
                    value={deviceId}
                    disabled={stopping || signingOut}
                    onChange={(e) =>
                      selectCamera({ facing, deviceId: e.target.value })
                    }
                  >
                    <option value="">Use the rear/front choice above</option>
                    {devices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <p className="settings-note">
                Changing the camera turns the current camera off first. If the
                scanner was running, it starts again with the new camera when
                you return.
              </p>
            </section>

            <section className="settings-section">
              <h2>Station</h2>
              <dl className="settings-facts">
                <div>
                  <dt>School</dt>
                  <dd>{school.name}</dd>
                </div>
                <div>
                  <dt>Station</dt>
                  <dd>{stationName || "—"}</dd>
                </div>
                <div>
                  <dt>Signed in as</dt>
                  <dd>{login || "—"}</dd>
                </div>
                <div>
                  <dt>Connection</dt>
                  <dd>
                    {online ? "Online" : "Offline"} · {pending} scan
                    {pending === 1 ? "" : "s"} waiting to sync
                  </dd>
                </div>
              </dl>
            </section>

            <section className="settings-section">
              <h2>Account</h2>
              <p className="settings-note">
                Signing out returns to the login screen. Scans saved offline
                stay on this tablet.
              </p>
              <button
                type="button"
                className="btn danger large"
                disabled={signingOut}
                onClick={() => {
                  setSignOutError(null);
                  setConfirmSignOut(true);
                }}
              >
                Sign out
              </button>
            </section>
          </div>
        </div>
      )}

      {confirmSignOut && (
        <div className="dialog-backdrop">
          <div
            className="dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="signout-title"
            aria-describedby="signout-desc"
          >
            <h2 id="signout-title">Sign out of this scanner?</h2>
            <p id="signout-desc">
              The camera will turn off and the login screen will open.
              {pending > 0
                ? ` ${pending} scan${pending === 1 ? "" : "s"} waiting to sync will stay saved on this tablet and sync after a scanner account signs in again.`
                : " No scans are waiting to sync."}
            </p>
            {signOutError && (
              <div className="error" role="alert">
                {signOutError}
              </div>
            )}
            <div className="dialog-actions">
              <button
                type="button"
                className="btn large"
                disabled={signingOut}
                onClick={() => setConfirmSignOut(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn danger large"
                disabled={signingOut}
                onClick={() => void handleSignOut()}
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
