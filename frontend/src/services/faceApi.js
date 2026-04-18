import * as faceapi from "@vladmandic/face-api";

const MODEL_URL =
  import.meta.env.VITE_FACE_API_MODEL_URL ||
  "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model";

let loadPromise = null;

export function loadModels() {
  if (!loadPromise) {
    loadPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]).catch((err) => {
      loadPromise = null;
      throw err;
    });
  }
  return loadPromise;
}

export function descriptorFromImageUrl(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      try {
        const detection = await faceapi
          .detectSingleFace(
            img,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();
        resolve(detection?.descriptor || null);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error(`Failed to load ${imageUrl}`));
    img.src = imageUrl;
  });
}

export async function detectInVideo(video, matcher) {
  if (!video || video.readyState < 2 || video.videoWidth === 0) return [];
  const detections = await faceapi
    .detectAllFaces(
      video,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 })
    )
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections.map((d) => {
    const match = matcher ? matcher.findBestMatch(d.descriptor) : null;
    return {
      box: d.detection.box,
      descriptor: d.descriptor,
      label: match ? match.label : "unknown",
      distance: match ? match.distance : Infinity
    };
  });
}

export function buildMatcher(items, threshold = 0.5) {
  if (!items.length) return null;
  const labeled = items.map(
    (item) => new faceapi.LabeledFaceDescriptors(item.label, [item.descriptor])
  );
  return new faceapi.FaceMatcher(labeled, threshold);
}

export function captureVideoFrame(video, quality = 0.85) {
  return new Promise((resolve) => {
    if (!video || !video.videoWidth) return resolve(null);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

export { faceapi };
