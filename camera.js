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
  // Only the preview is mirrored. Model labels refer to the player's own eyes.
  const leftGap = (distance(386,374)+distance(385,380)) / Math.max(1,2*distance(362,263));
  const rightGap = (distance(159,145)+distance(158,153)) / Math.max(1,2*distance(33,133));
  function isWink(blink, otherBlink, eye, otherEye) {
    const asymmetricLids = eye < .16 && otherEye > .17 && eye < .63*otherEye;
    return asymmetricLids || (blink > .42 && otherBlink < .30 && blink-otherBlink > .30);
  }
  let wink = 0;
  const bothClosed = (left > .40 && right > .40) || (leftGap < .145 && rightGap < .145);
  if (!bothClosed) {
    if (isWink(left,right,leftGap,rightGap)) wink = -1;
    else if (isWink(right,left,rightGap,leftGap)) wink = 1;
  }
  return { open: gap > .30 || jaw > .36, closed: gap < .18 && jaw < .22, wink };
}
