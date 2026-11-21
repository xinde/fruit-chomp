import {feastHoldMs} from "./input-controls.js";
export {headAim, HeadCalibration, followAim, BiteGesture, feastHoldMs, requestFrontCamera} from "./input-controls.js";

const root = new URL("./vendor/mediapipe/", import.meta.url);
let modelPromise;

export function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const { FilesetResolver, FaceLandmarker } = await import(new URL("vision_bundle.mjs", root));
      const files = await FilesetResolver.forVisionTasks(new URL("wasm", root).href);
      const options = {
        baseOptions: { modelAssetPath: new URL("face_landmarker.task", root).href, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true
      };
      try {
        return await FaceLandmarker.createFromOptions(files, options);
      } catch {
        options.baseOptions.delegate = "CPU";
        return await FaceLandmarker.createFromOptions(files, options);
      }
    })().catch(error => { modelPromise = undefined; throw error; });
  }
  return modelPromise;
}

// Two thresholds keep small lip movements from registering multiple bites.
// Measure distances in image pixels so a wide camera frame does not bias the ratio.
export function readExpression(result, width, height) {
  const points = result.faceLandmarks[0];
  if (!points) return null;
  const distance = (a, b) => Math.hypot((points[a].x - points[b].x) * width, (points[a].y - points[b].y) * height);
  const gap = distance(13, 14) / Math.max(1, distance(61, 291));
  const categories = result.faceBlendshapes?.[0]?.categories ?? [];
  const score = name => categories.find(value => value.categoryName === name)?.score ?? 0;
  const jaw = score("jawOpen");
  const left = score("eyeBlinkLeft");
  const right = score("eyeBlinkRight");
  const leftGap = (distance(386,374)+distance(385,380)) / Math.max(1,2*distance(362,263));
  const rightGap = (distance(159,145)+distance(158,153)) / Math.max(1,2*distance(33,133));
  const eyeClosed = (blink, aperture) => blink > .54 || aperture < .145;
  return {
    open: gap > .30 || jaw > .36,
    closed: gap < .18 && jaw < .22,
    eyesShut: eyeClosed(left,leftGap) && eyeClosed(right,rightGap),
    eyesOpen: left < .42 && right < .42 && leftGap > .15 && rightGap > .15,
    // Mirror the raw cheek midpoint so the reticle follows the player's reflection.
    headX: 1 - (points[234].x + points[454].x) / 2,
    faceWidth: Math.abs(points[234].x - points[454].x)
  };
}

// Require a fresh open-to-closed gesture after charging or recovering tracking.
export class FeastGesture {
  reset() {
    this.armed = false;
    this.since = null;
    this.lastSample = null;
  }

  sample(face, full, now) {
    if (!full || !face) {
      this.reset();
      return false;
    }
    // A rendering stall interrupts the timer. Keep the preceding open-eye observation.
    if (this.lastSample != null && now - this.lastSample > 350) this.since = null;
    this.lastSample = now;
    if (face.eyesOpen) this.armed = true;
    if (!this.armed || !face.eyesShut) {
      this.since = null;
      return false;
    }
    this.since ??= now;
    if (now - this.since < feastHoldMs) return false;
    this.reset();
    return true;
  }
}
