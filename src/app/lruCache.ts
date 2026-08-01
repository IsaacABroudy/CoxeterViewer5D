export interface LruCacheOptions<K = unknown, V = unknown> {
  maxEntries: number;
  maxBytes?: number;
  sizeOf?: (value: V, key: K) => number;
}

export class LruCache<K, V> {
  private readonly values = new Map<K, { value: V; byteSize: number }>();
  private readonly maxEntries: number;
  private readonly maxBytes: number | undefined;
  private readonly sizeOf: ((value: V, key: K) => number) | undefined;
  private currentByteSize = 0;

  constructor(options: LruCacheOptions<K, V>) {
    this.maxEntries = Math.max(1, Math.trunc(options.maxEntries));
    if (
      options.maxBytes !== undefined &&
      (!Number.isFinite(options.maxBytes) || options.maxBytes < 0)
    ) {
      throw new RangeError("maxBytes must be a finite non-negative number");
    }
    if (options.maxBytes !== undefined && !options.sizeOf) {
      throw new TypeError("sizeOf is required when maxBytes is set");
    }
    this.maxBytes =
      options.maxBytes === undefined ? undefined : Math.trunc(options.maxBytes);
    this.sizeOf = options.sizeOf;
  }

  get size() {
    return this.values.size;
  }

  get byteSize() {
    return this.currentByteSize;
  }

  get(key: K): V | undefined {
    const entry = this.values.get(key);
    if (!entry) {
      return undefined;
    }
    this.values.delete(key);
    this.values.set(key, entry);
    return entry.value;
  }

  has(key: K): boolean {
    return this.values.has(key);
  }

  set(key: K, value: V): void {
    const byteSize = this.estimateByteSize(value, key);
    const previous = this.values.get(key);
    if (previous) {
      this.currentByteSize -= previous.byteSize;
      this.values.delete(key);
    }
    this.values.set(key, { value, byteSize });
    this.currentByteSize += byteSize;
    this.trim();
  }

  delete(key: K): boolean {
    const entry = this.values.get(key);
    if (!entry) {
      return false;
    }
    this.currentByteSize -= entry.byteSize;
    return this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
    this.currentByteSize = 0;
  }

  keys(): K[] {
    return [...this.values.keys()];
  }

  entries(): Array<[K, V]> {
    return [...this.values.entries()].map(([key, entry]) => [key, entry.value]);
  }

  private trim(): void {
    // Entry and byte limits are independent. A single oversized value is
    // evicted rather than allowing one cache hit to defeat the memory budget.
    while (
      this.values.size > this.maxEntries ||
      (this.maxBytes !== undefined && this.currentByteSize > this.maxBytes)
    ) {
      const oldest = this.values.keys().next();
      if (oldest.done) {
        return;
      }
      this.delete(oldest.value);
    }
  }

  private estimateByteSize(value: V, key: K): number {
    if (!this.sizeOf) {
      return 0;
    }
    const byteSize = this.sizeOf(value, key);
    if (!Number.isFinite(byteSize) || byteSize < 0) {
      throw new RangeError("sizeOf must return a finite non-negative number");
    }
    return Math.ceil(byteSize);
  }
}
