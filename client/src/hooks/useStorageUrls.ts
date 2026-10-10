import { useState, useEffect, useRef } from 'react';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';
import { getDefaultBucketId } from '@lark-apaas/client-toolkit/tools/storage';

let dataloomPromise: Promise<Awaited<ReturnType<typeof getDataloom>>> | null =
  null;

async function getDataloomInstance() {
  if (!dataloomPromise) {
    dataloomPromise = getDataloom();
  }
  return dataloomPromise;
}

export function useStorageUrls(paths: string[]): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>({});
  const resolvedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const validPaths = paths.filter(
      (p) => p && typeof p === 'string' && (p.startsWith('/spark/') || p.startsWith('spark/')),
    );
    if (validPaths.length === 0) return;

    const toResolve = validPaths.filter((p) => !resolvedRef.current.has(p));
    if (toResolve.length === 0) return;
    toResolve.forEach((p) => resolvedRef.current.add(p));

    let cancelled = false;

    const entries: [string, string][] = [];
    const needsResolve: string[] = [];

    for (const path of toResolve) {
      if (path.startsWith('/spark/')) {
        entries.push([path, path]);
      } else {
        needsResolve.push(path);
      }
    }

    if (entries.length > 0) {
      setMap((prev) => {
        const next = { ...prev };
        for (const [key, val] of entries) next[key] = val;
        return next;
      });
    }

    if (needsResolve.length === 0) return;

    (async () => {
      try {
        const dataloom = await getDataloomInstance();
        const bucketId = getDefaultBucketId();
        const resolved = needsResolve.map((path) => {
          try {
            return [
              path,
              dataloom.storage
                .from(bucketId)
                .generateDownloadUrlFromFilePath(path),
            ] as const;
          } catch {
            return null;
          }
        });

        if (cancelled) return;

        setMap((prev) => {
          const next = { ...prev };
          for (const entry of resolved) {
            if (entry) next[entry[0]] = entry[1];
          }
          return next;
        });
      } catch {
        // resolution failed, keep original paths
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paths.join(',')]);

  return map;
}
