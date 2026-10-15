export type PhotoBackgroundMode =
  | "original"
  | "white"
  | "remove-light"
  | "auto-remove";

export const AUTO_REMOVE_PHOTO_BG_PREF_KEY = "school-id-auto-remove-photo-bg";

export function readAutoRemovePhotoBgPreference(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTO_REMOVE_PHOTO_BG_PREF_KEY) === "1";
}

export function writeAutoRemovePhotoBgPreference(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTO_REMOVE_PHOTO_BG_PREF_KEY, enabled ? "1" : "0");
}

/** Replace plain light backgrounds with white (works on uniform light backdrops). */
export function applyLightBackgroundRemoval(imageData: ImageData): void {
  const pixels = imageData.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const red = pixels[i];
    const green = pixels[i + 1];
    const blue = pixels[i + 2];
    const brightness = (red + green + blue) / 3;
    const colorSpread =
      Math.max(red, green, blue) - Math.min(red, green, blue);

    if (brightness > 205 && colorSpread < 45) {
      pixels[i] = 255;
      pixels[i + 1] = 255;
      pixels[i + 2] = 255;
      pixels[i + 3] = 255;
    }
  }
}

export async function removePhotoBackgroundWithAi(
  source: string | Blob | HTMLImageElement
): Promise<Blob> {
  const { removeBackground } = await import("@imgly/background-removal");
  const result = await removeBackground(source, {
    output: { format: "image/png", quality: 0.92 },
  });
  if (result instanceof Blob) return result;
  return new Blob([result], { type: "image/png" });
}

export function loadImageElement(src: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = typeof src === "string" ? src : URL.createObjectURL(src);
    const image = new Image();
    image.onload = () => {
      if (typeof src !== "string") URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      if (typeof src !== "string") URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    image.src = url;
  });
}

export function drawPreparedStudentPhoto(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  options: {
    backgroundMode: PhotoBackgroundMode;
    zoom: number;
    offsetX: number;
    offsetY: number;
  }
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (options.backgroundMode !== "original") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const baseScale = Math.max(
    canvas.width / image.naturalWidth,
    canvas.height / image.naturalHeight
  );
  const scale = baseScale * options.zoom;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const x = (canvas.width - width) / 2 + options.offsetX;
  const y = (canvas.height - height) / 2 + options.offsetY;

  ctx.drawImage(image, x, y, width, height);

  if (options.backgroundMode === "remove-light") {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    applyLightBackgroundRemoval(imageData);
    ctx.putImageData(imageData, 0, 0);
  }
}
