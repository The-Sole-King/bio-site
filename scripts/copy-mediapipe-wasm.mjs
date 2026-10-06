// Copies the MediaPipe WASM runtime from node_modules into public/ so the sign
// reader serves it from the same origin, always matching the installed
// @mediapipe/tasks-vision version. Runs automatically before dev and build.
import { cpSync, mkdirSync } from "node:fs";

const from = "node_modules/@mediapipe/tasks-vision/wasm";
const to = "public/mediapipe/wasm";
mkdirSync(to, { recursive: true });
for (const name of ["vision_wasm_internal", "vision_wasm_nosimd_internal"]) {
  for (const ext of [".js", ".wasm"]) cpSync(`${from}/${name}${ext}`, `${to}/${name}${ext}`);
}
console.log(`Copied MediaPipe WASM to ${to}`);
