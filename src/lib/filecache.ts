import { statSync } from "node:fs";
import path from "node:path";

type Entry = { signature: string; promise: Promise<unknown> };

// In-process memoization for large read-only JSON artifacts. The signature is
// built from file mtime+size, so a recomputed artifact invalidates itself.
// Entries are keyed by directory AND file list, so a loader that reads only
// some files of a directory caches independently of one that reads all of it.
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
  const key = `${dir}|${files.join(",")}`;
  const sig = signature(dir, files);
  const hit = cache.get(key);
  if (hit && hit.signature === sig) return hit.promise as Promise<T>;
  const promise = loader();
  promise.catch(() => {
    if (cache.get(key)?.promise === promise) cache.delete(key);
  });
  cache.set(key, { signature: sig, promise });
  return promise;
}
