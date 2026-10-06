// ---------------------------------------------------------------------------
// Framework-free core of the sign reader: turn MediaPipe hand landmarks into a
// pose feature vector, classify it with k-nearest-neighbours, and debounce the
// frame-by-frame predictions into committed letters. Kept pure so it can be
// unit-tested in Node (see reader.test.mjs).
// ---------------------------------------------------------------------------

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
// Control gestures the user can teach alongside the alphabet.
export const SPACE = "SPACE";
export const DELETE = "DEL";
export const LABELS = [...LETTERS, SPACE, DELETE];

const WRIST = 0;
const MIDDLE_MCP = 9;

/**
 * Normalize 21 hand landmarks into a 60-number vector that ignores where the
 * hand is in frame, how far it is from the camera, and which hand it is.
 *
 * - translate so the wrist is the origin (the wrist itself is then dropped)
 * - scale by the wrist → middle-knuckle distance (palm size)
 * - mirror x for left hands so both hands share one set of training samples
 *
 * Orientation is deliberately kept: ASL distinguishes e.g. H from U and
 * P from K mainly by which way the hand points.
 */
export function landmarksToFeatures(landmarks, handedness = "Right") {
  if (!landmarks || landmarks.length !== 21) return null;
  const o = landmarks[WRIST];
  const m = landmarks[MIDDLE_MCP];
  const scale = Math.hypot(m.x - o.x, m.y - o.y, (m.z ?? 0) - (o.z ?? 0));
  if (!scale) return null;
  const flip = handedness === "Left" ? -1 : 1;
  const out = new Array(60);
  for (let i = 1; i < 21; i++) {
    const p = landmarks[i];
    const j = (i - 1) * 3;
    out[j] = (flip * (p.x - o.x)) / scale;
    out[j + 1] = (p.y - o.y) / scale;
    out[j + 2] = ((p.z ?? 0) - (o.z ?? 0)) / scale;
  }
  return out;
}

function distance(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

/**
 * k-NN over user-recorded samples, stored as { [label]: number[][] }.
 * Returns { label, confidence, distance } or null when there's nothing to
 * compare against. `confidence` is the inverse-distance-weighted vote share of
 * the winning label among the k neighbours.
 */
export function classify(samples, features, k = 5) {
  if (!features) return null;
  const neighbours = [];
  for (const [label, vectors] of Object.entries(samples)) {
    for (const v of vectors) neighbours.push({ label, d: distance(v, features) });
  }
  if (!neighbours.length) return null;
  neighbours.sort((a, b) => a.d - b.d);
  const top = neighbours.slice(0, k);
  const votes = {};
  let total = 0;
  for (const { label, d } of top) {
    const w = 1 / (d + 1e-6);
    votes[label] = (votes[label] ?? 0) + w;
    total += w;
  }
  let best = null;
  for (const [label, w] of Object.entries(votes)) {
    if (!best || w > best.w) best = { label, w };
  }
  return {
    label: best.label,
    confidence: best.w / total,
    distance: top.find((n) => n.label === best.label).d,
  };
}

/**
 * Debounces noisy per-frame predictions into discrete events.
 *
 * A label is emitted once it has been held steadily for `holdMs`. The same
 * label won't fire again until the pose changes or the hand leaves the frame
 * (drop your hand briefly to sign a double letter like the "LL" in HELLO).
 * After `idleSpaceMs` with no hand visible, a SPACE is emitted once so words
 * separate naturally.
 */
export class Stabilizer {
  constructor({ holdMs = 600, minConfidence = 0.6, idleSpaceMs = 1500 } = {}) {
    Object.assign(this, { holdMs, minConfidence, idleSpaceMs });
    this.reset();
  }

  reset() {
    this.candidate = null; // label currently being held
    this.since = 0; // when the candidate started
    this.fired = null; // label already emitted for this hold
    this.lastSeen = null; // last time a hand was visible
    this.spaced = true; // whether the idle space was already emitted
  }

  /**
   * Treat `label` as already emitted, e.g. right after recording samples for
   * it, so the pose still being held doesn't immediately get typed.
   */
  suppress(label) {
    this.reset();
    this.fired = label;
  }

  /** Feed one frame. `prediction` is classify()'s result or null for no hand. */
  update(prediction, now) {
    if (!prediction) {
      this.candidate = null;
      this.fired = null;
      if (
        !this.spaced &&
        this.lastSeen !== null &&
        now - this.lastSeen >= this.idleSpaceMs
      ) {
        this.spaced = true;
        return SPACE;
      }
      return null;
    }

    this.lastSeen = now;
    const label =
      prediction.confidence >= this.minConfidence ? prediction.label : null;
    if (label !== this.candidate) {
      this.candidate = label;
      this.since = now;
      // `fired` is only cleared once a different label actually fires or the
      // hand leaves, so a one-frame flicker (A → B → A) can't re-emit A.
      return null;
    }
    if (label && label !== this.fired && now - this.since >= this.holdMs) {
      this.fired = label;
      if (label !== SPACE) this.spaced = false;
      return label;
    }
    return null;
  }

  /** 0..1 progress of the current hold, for a UI progress ring. */
  progress(now) {
    if (!this.candidate || this.candidate === this.fired) return 0;
    return Math.min(1, (now - this.since) / this.holdMs);
  }
}

/** Apply a stabilizer event to the transcript text. */
export function applyEvent(text, event) {
  if (event === DELETE) return text.slice(0, -1);
  if (event === SPACE) return text && !text.endsWith(" ") ? text + " " : text;
  return text + event;
}

/** Round sample vectors so the saved model stays small in localStorage. */
export function compactSamples(samples) {
  const out = {};
  for (const [label, vectors] of Object.entries(samples)) {
    if (vectors.length) {
      out[label] = vectors.map((v) => v.map((n) => Math.round(n * 1000) / 1000));
    }
  }
  return out;
}

/** Validate an imported/loaded model, dropping anything malformed. */
export function parseSamples(json) {
  const data = typeof json === "string" ? JSON.parse(json) : json;
  const out = {};
  if (!data || typeof data !== "object") return out;
  for (const label of LABELS) {
    const vectors = data[label];
    if (!Array.isArray(vectors)) continue;
    const valid = vectors.filter(
      (v) =>
        Array.isArray(v) &&
        v.length === 60 &&
        v.every((n) => typeof n === "number" && Number.isFinite(n)),
    );
    if (valid.length) out[label] = valid;
  }
  return out;
}
