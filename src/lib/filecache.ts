import { statSync } from "node:fs";
import path from "node:path";

type Entry = { signature: string; promise: Promise<unknown> };

// In-process memoization for large read-only JSON artifacts. The signature is
// built from file mtime+size, so a recomputed artifact invalidates itself.
const cache = new Map<string, Entry>();

function signature(dir: string, files: string[]): string {
  return files
    .map((file) => {
      try {
        const s = statSync(path.join(dir, file));
        return `${file}:${s.mtimeMs}:${s.size}`;
      } catch {
        return `${file}:missing`;
      }
    })
    .join("|");
}

export function cachedFileLoad<T>(dir: string, files: string[], loader: () => Promise<T>): Promise<T> {
  const sig = signature(dir, files);
  const hit = cache.get(dir);
  if (hit && hit.signature === sig) return hit.promise as Promise<T>;
  const promise = loader();
  promise.catch(() => {
    if (cache.get(dir)?.promise === promise) cache.delete(dir);
  });
  cache.set(dir, { signature: sig, promise });
  return promise;
}
