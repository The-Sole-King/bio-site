"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LABELS,
  SPACE,
  DELETE,
  landmarksToFeatures,
  classify,
  Stabilizer,
  applyEvent,
  compactSamples,
  parseSamples,
} from "./lib/reader.mjs";

// Self-hosted copy of the WASM runtime (see scripts/copy-mediapipe-wasm.mjs),
// so it always matches the installed @mediapipe/tasks-vision JS bundle.
const WASM_URL = "/mediapipe/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const STORAGE_KEY = "sign-reader-samples-v1";
const SAMPLES_PER_RECORDING = 30;
const SAMPLE_INTERVAL_MS = 80;
const COUNTDOWN_MS = 3000;

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseSamples(raw) : {};
  } catch {
    return {};
  }
}

function save(samples) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compactSamples(samples)));
  } catch {
    // Storage full or blocked (private mode) — the model still works this session.
  }
}

function countsOf(samples) {
  return Object.fromEntries(LABELS.map((l) => [l, samples[l]?.length ?? 0]));
}

function labelText(label) {
  if (label === SPACE) return "␣";
  if (label === DELETE) return "⌫";
  return label;
}

export default function SignReader() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const connectionsRef = useRef([]);
  const samplesRef = useRef({});
  const stabilizerRef = useRef(new Stabilizer());
  const recordingRef = useRef(null); // { label, startAt, lastAt }
  const rafRef = useRef(0);

  const [status, setStatus] = useState("idle"); // idle | loading | running | error
  const [error, setError] = useState("");
  const [counts, setCounts] = useState(() => countsOf({}));
  const [selected, setSelected] = useState("A");
  const [recording, setRecording] = useState(null); // { label, phase, captured }
  const [prediction, setPrediction] = useState(null);
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState("");

  useEffect(() => {
    samplesRef.current = loadSaved();
    setCounts(countsOf(samplesRef.current));
  }, []);

  const updateSamples = useCallback((next) => {
    samplesRef.current = next;
    setCounts(countsOf(next));
    save(next);
  }, []);

  const draw = useCallback((result) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
    if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const hand of result?.landmarks ?? []) {
      const pt = (p) => [p.x * canvas.width, p.y * canvas.height];
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#7c7cff";
      for (const { start, end } of connectionsRef.current) {
        const [x1, y1] = pt(hand[start]);
        const [x2, y2] = pt(hand[end]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.fillStyle = "#22d3ee";
      for (const p of hand) {
        const [x, y] = pt(p);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker) return;
    rafRef.current = requestAnimationFrame(tick);
    if (video.readyState < 2) return;

    const now = performance.now();
    const result = landmarker.detectForVideo(video, now);
    draw(result);

    const hand = result.worldLandmarks?.[0] ?? result.landmarks?.[0];
    const handedness = result.handedness?.[0]?.[0]?.categoryName;
    const features = hand ? landmarksToFeatures(hand, handedness) : null;

    // Training: capture samples for the selected label after a countdown.
    const rec = recordingRef.current;
    if (rec) {
      if (now < rec.startAt) {
        setRecording({
          label: rec.label,
          phase: Math.ceil((rec.startAt - now) / 1000),
          captured: 0,
        });
      } else if (features && now - rec.lastAt >= SAMPLE_INTERVAL_MS) {
        rec.lastAt = now;
        rec.captured.push(features);
        setRecording({
          label: rec.label,
          phase: "rec",
          captured: rec.captured.length,
        });
        if (rec.captured.length >= SAMPLES_PER_RECORDING) {
          const cur = samplesRef.current;
          updateSamples({
            ...cur,
            [rec.label]: [...(cur[rec.label] ?? []), ...rec.captured],
          });
          stabilizerRef.current.suppress(rec.label);
          recordingRef.current = null;
          setRecording(null);
        }
      }
      setPrediction(null);
      setProgress(0);
      return;
    }

    // Reading: classify and debounce into letters.
    const pred = features ? classify(samplesRef.current, features) : null;
    const stab = stabilizerRef.current;
    const event = stab.update(pred, now);
    if (event) setText((t) => applyEvent(t, event));
    setPrediction(pred);
    setProgress(stab.progress(now));
  }, [draw, updateSamples]);

  const start = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();

      if (!landmarkerRef.current) {
        const { FilesetResolver, HandLandmarker } = await import(
          "@mediapipe/tasks-vision"
        );
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        const create = (delegate) =>
          HandLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate },
            runningMode: "VIDEO",
            numHands: 1,
          });
        // WebGL isn't available everywhere (some older/locked-down devices).
        landmarkerRef.current = await create("GPU").catch(() => create("CPU"));
        connectionsRef.current = HandLandmarker.HAND_CONNECTIONS;
      }
      stabilizerRef.current.reset();
      setStatus("running");
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setStatus("error");
      setError(
        e?.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access and try again."
          : `Couldn't start: ${e?.message ?? e}`,
      );
    }
  }, [tick]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const video = videoRef.current;
    video?.srcObject?.getTracks().forEach((t) => t.stop());
    if (video) video.srcObject = null;
    recordingRef.current = null;
    setRecording(null);
    setPrediction(null);
    setProgress(0);
    draw(null);
    setStatus("idle");
  }, [draw]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    videoRef.current?.srcObject?.getTracks().forEach((t) => t.stop());
    landmarkerRef.current?.close();
  }, []);

  const record = () => {
    if (status !== "running") return;
    const now = performance.now();
    recordingRef.current = {
      label: selected,
      startAt: now + COUNTDOWN_MS,
      lastAt: 0,
      captured: [],
    };
    setRecording({ label: selected, phase: 3, captured: 0 });
  };

  const cancelRecording = () => {
    recordingRef.current = null;
    setRecording(null);
  };

  const clearLabel = () => {
    const next = { ...samplesRef.current };
    delete next[selected];
    updateSamples(next);
  };

  const clearAll = () => {
    if (confirm("Delete every recorded sample?")) updateSamples({});
  };

  const exportModel = () => {
    const blob = new Blob([JSON.stringify(compactSamples(samplesRef.current))], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sign-reader-model.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importModel = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      updateSamples(parseSamples(await file.text()));
    } catch {
      alert("That file isn't a valid sign-reader model.");
    }
  };

  const speak = () => {
    if (!text.trim() || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };

  const trainedLabels = LABELS.filter((l) => counts[l] > 0).length;
  const totalSamples = LABELS.reduce((n, l) => n + counts[l], 0);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Camera */}
      <div className="lg:col-span-3">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-surface">
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
          />
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100 object-cover"
          />

          {status !== "running" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <p className="max-w-sm text-muted">
                Video is processed entirely in your browser — nothing is
                uploaded.
              </p>
              <button
                onClick={start}
                disabled={status === "loading"}
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {status === "loading" ? "Loading hand model…" : "Start camera"}
              </button>
              {error && <p className="max-w-sm text-sm text-red-400">{error}</p>}
            </div>
          )}

          {status === "running" && !recording && (
            <div className="absolute left-4 top-4 flex items-center gap-3 rounded-lg bg-bg/80 px-3 py-2 backdrop-blur">
              <span className="w-10 text-center text-3xl font-bold">
                {prediction ? labelText(prediction.label) : "–"}
              </span>
              <div className="text-xs text-muted">
                <div>
                  {prediction
                    ? `${Math.round(prediction.confidence * 100)}% sure`
                    : totalSamples
                      ? "No hand"
                      : "Train some letters first"}
                </div>
                <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full bg-accent-2"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {recording && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg/40">
              <div className="text-7xl font-bold">{labelText(recording.label)}</div>
              <div className="mt-2 text-lg">
                {recording.phase === "rec"
                  ? `Recording ${recording.captured}/${SAMPLES_PER_RECORDING} — move your hand slightly`
                  : `Get ready… ${recording.phase}`}
              </div>
              <button
                onClick={cancelRecording}
                className="mt-4 rounded-lg border border-border bg-surface px-4 py-1.5 text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {status === "running" && (
          <button
            onClick={stop}
            className="mt-3 text-sm text-muted transition-colors hover:text-text"
          >
            Stop camera
          </button>
        )}

        {/* Transcript */}
        <div className="mt-6 rounded-xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted">
              Transcript
            </h2>
            <div className="flex gap-2 text-sm">
              <button
                onClick={() => setText((t) => applyEvent(t, SPACE))}
                className="rounded-md bg-surface-2 px-2.5 py-1 hover:text-accent"
              >
                Space
              </button>
              <button
                onClick={() => setText((t) => applyEvent(t, DELETE))}
                className="rounded-md bg-surface-2 px-2.5 py-1 hover:text-accent"
              >
                ⌫
              </button>
              <button
                onClick={speak}
                className="rounded-md bg-surface-2 px-2.5 py-1 hover:text-accent"
              >
                Speak
              </button>
              <button
                onClick={() => setText("")}
                className="rounded-md bg-surface-2 px-2.5 py-1 hover:text-accent"
              >
                Clear
              </button>
            </div>
          </div>
          <p className="min-h-[3rem] break-words font-mono text-2xl tracking-wide">
            {text || <span className="text-muted">Signed letters appear here…</span>}
            <span className="animate-pulse text-accent">▍</span>
          </p>
        </div>
      </div>

      {/* Training */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted">
            Train
          </h2>
          <p className="mt-2 text-sm text-muted">
            {trainedLabels}/{LABELS.length} signs trained · {totalSamples}{" "}
            samples. Pick a sign, press record, and hold the handshape for a
            few seconds.
          </p>

          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {LABELS.map((label) => (
              <button
                key={label}
                onClick={() => setSelected(label)}
                title={label}
                className={`relative rounded-md border py-2 text-sm font-semibold transition-colors ${
                  selected === label
                    ? "border-accent bg-accent/20 text-text"
                    : counts[label]
                      ? "border-border bg-surface-2 text-text"
                      : "border-border text-muted hover:text-text"
                }`}
              >
                {labelText(label)}
                {counts[label] > 0 && (
                  <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-accent-2" />
                )}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={record}
              disabled={status !== "running" || !!recording}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Record “{labelText(selected)}”
            </button>
            <button
              onClick={clearLabel}
              disabled={!counts[selected]}
              className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-text disabled:opacity-40"
            >
              Clear “{labelText(selected)}” ({counts[selected]})
            </button>
          </div>
          {status !== "running" && (
            <p className="mt-2 text-xs text-muted">Start the camera to record.</p>
          )}

          <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4 text-sm">
            <button
              onClick={exportModel}
              disabled={!totalSamples}
              className="rounded-md bg-surface-2 px-3 py-1.5 hover:text-accent disabled:opacity-40"
            >
              Export model
            </button>
            <label className="cursor-pointer rounded-md bg-surface-2 px-3 py-1.5 hover:text-accent">
              Import model
              <input
                type="file"
                accept="application/json,.json"
                onChange={importModel}
                className="hidden"
              />
            </label>
            <button
              onClick={clearAll}
              disabled={!totalSamples}
              className="rounded-md px-3 py-1.5 text-muted hover:text-red-400 disabled:opacity-40"
            >
              Reset all
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-surface p-5 text-sm leading-relaxed text-muted">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wider">
            Tips
          </h2>
          <ul className="list-disc space-y-1.5 pl-4">
            <li>Hold a letter steady until the bar fills to type it.</li>
            <li>
              Drop your hand out of frame to type a double letter, or leave it
              out for a moment to add a space.
            </li>
            <li>
              Train ␣ and ⌫ with any handshape you like to type spaces and
              delete by signing.
            </li>
            <li>
              J and Z are moving signs — record their final handshape.
            </li>
            <li>
              Similar letters (M/N, A/S/T) need extra samples. Record each one
              2–3 times with small changes in angle.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
