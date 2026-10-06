import { test } from "node:test";
import assert from "node:assert/strict";
import {
  landmarksToFeatures,
  classify,
  Stabilizer,
  applyEvent,
  parseSamples,
  compactSamples,
  SPACE,
  DELETE,
} from "./reader.mjs";

function hand(seed = 0, { dx = 0, dy = 0, s = 1 } = {}) {
  return Array.from({ length: 21 }, (_, i) => ({
    x: dx + s * Math.sin(i + seed),
    y: dy + s * Math.cos(i * 1.3 + seed),
    z: s * 0.1 * i,
  }));
}

test("features ignore position and scale", () => {
  const a = landmarksToFeatures(hand(1));
  const b = landmarksToFeatures(hand(1, { dx: 5, dy: -3, s: 2.5 }));
  assert.equal(a.length, 60);
  a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-9));
});

test("left hand is mirrored onto right", () => {
  const right = hand(2);
  const left = right.map((p) => ({ ...p, x: -p.x }));
  const a = landmarksToFeatures(right, "Right");
  const b = landmarksToFeatures(left, "Left");
  a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-9));
});

test("features reject bad input", () => {
  assert.equal(landmarksToFeatures(null), null);
  assert.equal(landmarksToFeatures(hand().slice(0, 5)), null);
  const flat = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  assert.equal(landmarksToFeatures(flat), null);
});

test("classify picks the nearest class", () => {
  const samples = {
    A: [landmarksToFeatures(hand(0)), landmarksToFeatures(hand(0.05))],
    B: [landmarksToFeatures(hand(3)), landmarksToFeatures(hand(3.05))],
  };
  const r = classify(samples, landmarksToFeatures(hand(0.02)), 3);
  assert.equal(r.label, "A");
  assert.ok(r.confidence > 0.5);
  assert.equal(classify({}, landmarksToFeatures(hand())), null);
});

const p = (label, confidence = 0.9) => ({ label, confidence });

test("stabilizer fires once per hold", () => {
  const s = new Stabilizer({ holdMs: 100 });
  assert.equal(s.update(p("A"), 0), null);
  assert.equal(s.update(p("A"), 50), null);
  assert.equal(s.update(p("A"), 100), "A");
  assert.equal(s.update(p("A"), 500), null);
  // flicker to another label and back doesn't re-fire
  s.update(p("B"), 510);
  assert.equal(s.update(p("A"), 520), null);
  assert.equal(s.update(p("A"), 700), null);
  // a real change does
  s.update(p("B"), 800);
  assert.equal(s.update(p("B"), 900), "B");
});

test("stabilizer ignores low confidence and re-arms after hand leaves", () => {
  const s = new Stabilizer({ holdMs: 100, idleSpaceMs: 1000 });
  s.update(p("A", 0.3), 0);
  assert.equal(s.update(p("A", 0.3), 500), null);
  s.update(p("L"), 600);
  assert.equal(s.update(p("L"), 700), "L");
  assert.equal(s.update(null, 750), null);
  s.update(p("L"), 800);
  assert.equal(s.update(p("L"), 900), "L");
  // idle long enough → one space
  assert.equal(s.update(null, 1950), SPACE);
  assert.equal(s.update(null, 5000), null);
});

test("suppress stops a just-trained pose from typing", () => {
  const s = new Stabilizer({ holdMs: 100 });
  s.suppress("V");
  s.update(p("V"), 0);
  assert.equal(s.update(p("V"), 500), null);
  s.update(null, 600);
  s.update(p("V"), 700);
  assert.equal(s.update(p("V"), 800), "V");
});

test("applyEvent edits the transcript", () => {
  assert.equal(applyEvent("HI", "A"), "HIA");
  assert.equal(applyEvent("HI", DELETE), "H");
  assert.equal(applyEvent("HI", SPACE), "HI ");
  assert.equal(applyEvent("HI ", SPACE), "HI ");
  assert.equal(applyEvent("", SPACE), "");
});

test("model round-trips and drops junk", () => {
  const v = landmarksToFeatures(hand(1));
  const saved = JSON.stringify(compactSamples({ A: [v], B: [] }));
  const loaded = parseSamples(saved);
  assert.deepEqual(Object.keys(loaded), ["A"]);
  assert.ok(Math.abs(loaded.A[0][0] - v[0]) < 1e-3);
  assert.deepEqual(parseSamples({ A: [[1, 2]], ZZ: [v], C: "x" }), {});
});
