// Temporary in-memory store for image data between screens.
// Avoids passing large base64 strings through route params.

type PendingImage = {
  base64: string;
  uri: string;
} | null;

let pendingImage: PendingImage = null;

export const imageStore = {
  set(base64: string, uri: string) {
    pendingImage = { base64, uri };
  },
  get(): PendingImage {
    return pendingImage;
  },
  clear() {
    pendingImage = null;
  },
};
