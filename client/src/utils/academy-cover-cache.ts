const COVER_CACHE_TTL_MS = 60_000;
const COVER_CACHE_LIMIT = 128;

interface CoverCacheEntry {
  promise: Promise<string>;
  expiresAt: number;
}

/** 仅当前账号的内存缓存；刷新页面即清空，不持久化附件签名。 */
export class AcademyCoverCache {
  private scope = '';
  private readonly entries = new Map<string, CoverCacheEntry>();

  clear(): void {
    this.entries.clear();
    this.scope = '';
  }

  invalidate(src: string, scope: string): void {
    if (scope === this.scope) this.entries.delete(src);
  }

  resolve(
    src: string,
    scope: string,
    load: () => Promise<string>,
  ): Promise<string> {
    if (scope !== this.scope) {
      this.clear();
      this.scope = scope;
    }
    // 身份未就绪时不共享结果，也不将匿名结果带入后续登录账号。
    if (!scope) return load();
    const now = Date.now();
    const cached = this.entries.get(src);
    if (cached && cached.expiresAt > now) return cached.promise;
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
    if (this.entries.size >= COVER_CACHE_LIMIT) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    const entry: CoverCacheEntry = {
      // 从请求开始计时，慢请求不会延长签名复用窗口。
      expiresAt: now + COVER_CACHE_TTL_MS,
      promise: Promise.resolve().then(load),
    };
    entry.promise = entry.promise.catch((error: unknown) => {
      // 旧请求失败不能删除已经刷新取得的新结果。
      if (this.entries.get(src) === entry) this.entries.delete(src);
      throw error;
    });
    this.entries.set(src, entry);
    return entry.promise;
  }
}

export const academyCoverCache = new AcademyCoverCache();
