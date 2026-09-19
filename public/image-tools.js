export function scaledImageSize(width, height, maxDimension = 2000) {
  if (!width || !height || Math.max(width, height) <= maxDimension)
    return { width, height };
  const scale = maxDimension / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function optimizedImageName(name, mimeType) {
  const base = String(name || "image").replace(/\.[^.]+$/, "");
  return `${base}.${mimeType === "image/webp" ? "webp" : "jpg"}`;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(Error("This image could not be opened for optimization."));
    };
    image.src = url;
  });
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function optimizeImageUpload(file, options = {}) {
  if (!file?.type?.startsWith("image/") || file.type === "image/gif")
    return { file, optimized: false, originalSize: file?.size || 0 };
  const image = await loadImage(file);
  const size = scaledImageSize(
    image.naturalWidth,
    image.naturalHeight,
    options.maxDimension || 2000,
  );
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d", { alpha: false });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = "#fff";
  context.fillRect(0, 0, size.width, size.height);
  context.drawImage(image, 0, 0, size.width, size.height);
  const type = "image/webp";
  const blob = await canvasBlob(canvas, type, options.quality || 0.82);
  if (!blob || blob.size >= file.size)
    return { file, optimized: false, originalSize: file.size };
  return {
    file: new File([blob], optimizedImageName(file.name, type), {
      type,
      lastModified: file.lastModified,
    }),
    optimized: true,
    originalSize: file.size,
    width: size.width,
    height: size.height,
  };
}
