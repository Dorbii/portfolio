const decodedImages = new Map<string, Promise<HTMLImageElement>>();

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
