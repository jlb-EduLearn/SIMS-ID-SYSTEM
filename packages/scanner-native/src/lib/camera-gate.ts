// The scanner library keeps its camera queue private, and an unmounted Scanner
// can still request a stream from a restart it began earlier. Each Start gets
// its own token, carried to getUserMedia inside the video constraints, so only
// the current Scanner can acquire the camera. This relies on
// @yudiel/react-qr-scanner passing the constraints object through by spread,
// which keeps symbol keys. Requests without a token are rejected, so a library
// change that drops the token fails closed instead of leaking a camera.
const CAMERA_SESSION = Symbol("sims-camera-session");

export type CameraSession = { token: symbol; id: number };

type SessionVideoConstraints = MediaTrackConstraints & {
  [CAMERA_SESSION]?: symbol;
};

const gate = {
  installed: false,
  nextId: 1,
  active: null as symbol | null,
  pending: new Map<symbol, number>(),
  settled: new Set<() => void>(),
  streams: new Set<MediaStream>(),
};

function cameraStopped() {
  return new DOMException("Camera is stopped.", "AbortError");
}

function stopMediaStream(stream: MediaStream) {
  for (const track of stream.getTracks()) {
    if (track.readyState !== "ended") track.stop();
  }
}

export function stopAllCameraStreams() {
  for (const stream of gate.streams) stopMediaStream(stream);
  gate.streams.clear();
}

function trackStream(stream: MediaStream) {
  for (const tracked of gate.streams) {
    if (tracked.getTracks().every((track) => track.readyState === "ended")) {
      gate.streams.delete(tracked);
    }
  }
  gate.streams.add(stream);
}

function pendingRequests(token?: symbol) {
  if (token) return gate.pending.get(token) ?? 0;
  let total = 0;
  for (const count of gate.pending.values()) total += count;
  return total;
}

export async function waitForCameraRequests(token?: symbol) {
  while (pendingRequests(token) > 0) {
    await new Promise<void>((resolve) => gate.settled.add(resolve));
  }
}

function installGate() {
  if (
    gate.installed ||
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    return;
  }
  const original = navigator.mediaDevices.getUserMedia.bind(
    navigator.mediaDevices
  );
  navigator.mediaDevices.getUserMedia = async (constraints) => {
    const video = constraints?.video;
    const token =
      video && typeof video === "object"
        ? (video as SessionVideoConstraints)[CAMERA_SESSION]
        : undefined;
    if (!token || token !== gate.active) throw cameraStopped();

    const browserVideo: SessionVideoConstraints = {
      ...(video as SessionVideoConstraints),
    };
    delete browserVideo[CAMERA_SESSION];
    gate.pending.set(token, pendingRequests(token) + 1);
    try {
      const stream = await original({ ...constraints, video: browserVideo });
      if (token !== gate.active) {
        stopMediaStream(stream);
        throw cameraStopped();
      }
      trackStream(stream);
      return stream;
    } finally {
      const left = pendingRequests(token) - 1;
      if (left > 0) gate.pending.set(token, left);
      else gate.pending.delete(token);
      const waiters = [...gate.settled];
      gate.settled.clear();
      for (const resolve of waiters) resolve();
    }
  };
  gate.installed = true;
}

export function beginCameraSession(): CameraSession {
  installGate();
  const session = { token: Symbol("camera-session"), id: gate.nextId++ };
  gate.active = session.token;
  return session;
}

export function isActiveCameraSession(session: CameraSession | null) {
  return Boolean(session) && session!.token === gate.active;
}

/**
 * Blocks new camera requests for the current session, stops its tracks and
 * waits for its in-flight requests. No timeout: a hung getUserMedia keeps
 * this waiting rather than reporting the camera as released.
 */
export async function endCameraSession() {
  const token = gate.active;
  gate.active = null;
  stopAllCameraStreams();
  if (token) await waitForCameraRequests(token);
  stopAllCameraStreams();
}

export function withCameraSession(
  constraints: MediaTrackConstraints,
  session: CameraSession | null
): MediaTrackConstraints {
  if (!session) return constraints;
  const tagged: SessionVideoConstraints = {
    ...constraints,
    [CAMERA_SESSION]: session.token,
  };
  return tagged;
}
