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
export function readMouth(result, width, height) {
  const points = result.faceLandmarks[0];
  if (!points) return null;
  const distance = (a, b) => Math.hypot((points[a].x - points[b].x) * width, (points[a].y - points[b].y) * height);
  const gap = distance(13, 14) / Math.max(1, distance(61, 291));
  const jaw = result.faceBlendshapes[0]?.categories.find(item => item.categoryName === "jawOpen")?.score ?? 0;
  return { open: gap > .30 || jaw > .36, closed: gap < .18 && jaw < .22 };
}
