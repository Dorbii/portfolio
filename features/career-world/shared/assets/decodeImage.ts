const decodedImages = new Map<string, Promise<HTMLImageElement>>();
const queuedImagePreloads = new Map<string, Promise<HTMLImageElement>>();
const imagePreloadQueue: Array<{
  path: string;
  reject: (error: unknown) => void;
  resolve: (image: HTMLImageElement) => void;
}> = [];
const IMAGE_PRELOAD_CONCURRENCY = 2;
let activeImagePreloads = 0;

export function decodeImage(path: string): Promise<HTMLImageElement> {
  const cached = decodedImages.get(path);
  if (cached) return cached;

  const image = new Image();
  image.decoding = "async";
  const decoded = new Promise<HTMLImageElement>((resolve, reject) => {
    const publishReady = () => {
      void image.decode().then(
        () => resolve(image),
        () => {
          if (image.complete && image.naturalWidth > 0) resolve(image);
          else reject(new Error(`Unable to decode image ${path}.`));
        },
      );
    };
    image.addEventListener("load", publishReady, { once: true });
    image.addEventListener("error", () => {
      reject(new Error(`Unable to load image ${path}.`));
    }, { once: true });
    image.src = path;
    if (image.complete && image.naturalWidth > 0) publishReady();
  }).catch((error) => {
    decodedImages.delete(path);
    throw error;
  });
  decodedImages.set(path, decoded);
  return decoded;
}

function pumpImagePreloadQueue(): void {
  while (
    activeImagePreloads < IMAGE_PRELOAD_CONCURRENCY
    && imagePreloadQueue.length > 0
  ) {
    const request = imagePreloadQueue.shift();
    if (!request) return;
    activeImagePreloads += 1;
    void decodeImage(request.path).then(request.resolve, request.reject).finally(() => {
      activeImagePreloads -= 1;
      queuedImagePreloads.delete(request.path);
      pumpImagePreloadQueue();
    });
  }
}

export function preloadImage(path: string): Promise<HTMLImageElement> {
  const queued = queuedImagePreloads.get(path);
  if (queued) return queued;

  const preload = new Promise<HTMLImageElement>((resolve, reject) => {
    imagePreloadQueue.push({ path, reject, resolve });
    pumpImagePreloadQueue();
  });
  queuedImagePreloads.set(path, preload);
  return preload;
}
