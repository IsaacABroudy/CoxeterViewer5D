import { LruCache } from "./lruCache";

export type PersistentCacheScope =
  | "generation"
  | "topology"
  | "quotient"
  | "comparison"
  | "benchmark";

export type PersistentCacheNamespace =
  | "generated-ball"
  | "ygamma-scene"
  | "topology"
  | "quotient"
  | "comparison"
  | "benchmark"
  | (string & {});

export interface PersistentCacheMetadata {
  namespace: PersistentCacheNamespace;
  scope: PersistentCacheScope;
  schemaVersion: number;
  valueKind: string;
  description: string;
}

export type PersistentCacheRegistry = typeof persistentCacheRegistry;
export type PersistentCacheRegistryKey = keyof PersistentCacheRegistry;

export const persistentCacheRegistry = {
  generatedBall: {
    namespace: "generated-ball",
    scope: "generation",
    schemaVersion: 2,
    valueKind: "generated-cayley-ball",
    description:
      "Finite-radius Cayley balls and their spherical-subset index produced by the generation client.",
  },
  yGammaScene: {
    namespace: "ygamma-scene",
    scope: "topology",
    schemaVersion: 1,
    valueKind: "ygamma-scene",
    description: "Derived Y_Gamma 2-skeleton scene payloads.",
  },
  topology: {
    namespace: "topology",
    scope: "topology",
    schemaVersion: 1,
    valueKind: "topology-lens",
    description:
      "Local topology lens summaries, stars, links, and cell-neighborhood views.",
  },
  quotient: {
    namespace: "quotient",
    scope: "quotient",
    schemaVersion: 1,
    valueKind: "quotient-artifact",
    description:
      "Validated quotient complexes and progressive quotient loading chunks.",
  },
  comparison: {
    namespace: "comparison",
    scope: "comparison",
    schemaVersion: 1,
    valueKind: "comparison-summary",
    description:
      "Backend, notebook, and experiment comparison summaries keyed by inputs.",
  },
  benchmark: {
    namespace: "benchmark",
    scope: "benchmark",
    schemaVersion: 1,
    valueKind: "timed-benchmark",
    description:
      "Timed benchmark case and interaction summaries for performance budgets.",
  },
} as const satisfies Record<string, PersistentCacheMetadata>;

export interface PersistentCacheKeyInput {
  metadata: PersistentCacheMetadata;
  appVersion: string;
  inputHash: string;
  variant: string;
}

export interface TopologyCacheEntryMetadata {
  kind: "topology";
  lensId: string;
  structureVersion: string;
  selectedNodeId?: string;
  selectedCellId?: string;
}

export interface QuotientCacheEntryMetadata {
  kind: "quotient";
  quotientHash: string;
  sourceSystemHash?: string;
  chunkId?: string;
  repairedImport?: boolean;
}

export interface ComparisonCacheEntryMetadata {
  kind: "comparison";
  comparisonId: string;
  leftHash: string;
  rightHash: string;
}

export interface BenchmarkCacheEntryMetadata {
  kind: "benchmark";
  benchmarkId: string;
  caseId: string;
  scriptVersion: string;
}

export interface PersistentCacheKey {
  namespace: PersistentCacheNamespace;
  schemaVersion: number;
  appVersion: string;
  inputHash: string;
  variant: string;
}

export interface PersistentCacheRecord<T> {
  key: string;
  namespace: string;
  schemaVersion: number;
  appVersion: string;
  inputHash: string;
  variant: string;
  writtenAt: string;
  estimatedBytes?: number;
  value: T;
}

export interface PersistentCacheOptions {
  databaseName?: string;
  storeName?: string;
  memoryEntries?: number;
  memoryBytes?: number;
  persistentBytes?: number;
}

export interface PersistentCacheEvictionCandidate {
  key: string;
  writtenAt: string;
  estimatedBytes: number;
}

export interface PersistentCache<T> {
  get(key: PersistentCacheKey): Promise<T | undefined>;
  set(key: PersistentCacheKey, value: T): Promise<void>;
  delete(key: PersistentCacheKey): Promise<void>;
  clearNamespace(namespace: string): Promise<void>;
}

const defaultDatabaseName = "coxeter-viewer-performance-cache";
const defaultStoreName = "records";
export const DEFAULT_PERSISTENT_CACHE_MEMORY_BYTES = 64 * 1024 * 1024;
export const DEFAULT_PERSISTENT_CACHE_STORAGE_BYTES = 256 * 1024 * 1024;

const objectOverheadBytes = 32;
const collectionOverheadBytes = 24;
const referenceBytes = 8;
const stringCharacterBytes = 2;

/**
 * Estimates retained memory without serializing the value. The result is a
 * cache budget, not a browser heap measurement; shared objects are counted
 * once and typed-array payloads use their exact byte length.
 */
export function estimatePersistentCacheValueBytes(value: unknown): number {
  const pending: unknown[] = [value];
  const seen = new WeakSet<object>();
  let bytes = 0;

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === null || current === undefined) {
      continue;
    }

    switch (typeof current) {
      case "boolean":
        bytes += 4;
        continue;
      case "number":
        bytes += 8;
        continue;
      case "bigint":
        bytes += Math.max(8, Math.ceil(current.toString(2).length / 8));
        continue;
      case "string":
        bytes += current.length * stringCharacterBytes;
        continue;
      case "symbol":
        bytes += String(current).length * stringCharacterBytes;
        continue;
      case "function":
        bytes += objectOverheadBytes;
        continue;
      case "object":
        break;
    }

    if (seen.has(current)) {
      continue;
    }
    seen.add(current);

    if (ArrayBuffer.isView(current)) {
      bytes += collectionOverheadBytes + current.byteLength;
      continue;
    }
    if (current instanceof ArrayBuffer) {
      bytes += collectionOverheadBytes + current.byteLength;
      continue;
    }
    if (current instanceof Date) {
      bytes += objectOverheadBytes;
      continue;
    }
    if (Array.isArray(current)) {
      bytes += collectionOverheadBytes + current.length * referenceBytes;
      for (const entry of current) {
        pending.push(entry);
      }
      continue;
    }
    if (current instanceof Map) {
      bytes += collectionOverheadBytes + current.size * referenceBytes * 2;
      for (const [key, entry] of current) {
        pending.push(key, entry);
      }
      continue;
    }
    if (current instanceof Set) {
      bytes += collectionOverheadBytes + current.size * referenceBytes;
      for (const entry of current) {
        pending.push(entry);
      }
      continue;
    }

    bytes += objectOverheadBytes;
    for (const [key, entry] of Object.entries(current)) {
      bytes += key.length * stringCharacterBytes + referenceBytes;
      pending.push(entry);
    }
  }

  return Math.ceil(bytes);
}

export function estimatePersistentCacheRecordBytes<T>(
  record: PersistentCacheRecord<T>,
): number {
  return estimatePersistentCacheValueBytes(record);
}

/**
 * Chooses the oldest records needed to bring an IndexedDB store under budget.
 * The key tie-break makes eviction reproducible when writes share a timestamp.
 */
export function planPersistentCacheEvictions(
  candidates: readonly PersistentCacheEvictionCandidate[],
  maxBytes: number,
): string[] {
  assertByteBudget(maxBytes, "persistentBytes");
  let retainedBytes = candidates.reduce(
    (total, candidate) =>
      total + normalizeEstimatedBytes(candidate.estimatedBytes),
    0,
  );
  if (retainedBytes <= maxBytes) {
    return [];
  }

  const oldestFirst = [...candidates].sort(
    (left, right) =>
      left.writtenAt.localeCompare(right.writtenAt) ||
      left.key.localeCompare(right.key),
  );
  const evicted: string[] = [];
  for (const candidate of oldestFirst) {
    if (retainedBytes <= maxBytes) {
      break;
    }
    retainedBytes -= normalizeEstimatedBytes(candidate.estimatedBytes);
    evicted.push(candidate.key);
  }
  return evicted;
}

/**
 * Builds the IndexedDB key. Namespace, schema, app version, input hash, and
 * variant all participate so stale mathematical data is missed rather than
 * silently reused after a migration or source edit.
 */
export function persistentKeyString(key: PersistentCacheKey): string {
  return [
    key.namespace,
    `v${key.schemaVersion}`,
    key.appVersion,
    key.inputHash,
    key.variant,
  ].join("|");
}

export function persistentCacheKeyFromMetadata(
  input: PersistentCacheKeyInput,
): PersistentCacheKey {
  return {
    namespace: input.metadata.namespace,
    schemaVersion: input.metadata.schemaVersion,
    appVersion: input.appVersion,
    inputHash: input.inputHash,
    variant: input.variant,
  };
}

export function persistentCacheMetadataForNamespace(
  namespace: PersistentCacheNamespace,
): PersistentCacheMetadata | undefined {
  return Object.values(persistentCacheRegistry).find(
    (metadata) => metadata.namespace === namespace,
  );
}

/**
 * IndexedDB-backed cache with an in-memory LRU fallback.
 *
 * Cache hits are performance hints only. Generated JSON, certificates, and
 * experiment bundles still carry their own hashes and validation status.
 */
export function createPersistentCache<T>(
  options: PersistentCacheOptions = {},
): PersistentCache<T> {
  return new IndexedDbBackedCache<T>(options);
}

class IndexedDbBackedCache<T> implements PersistentCache<T> {
  private readonly memory: LruCache<string, PersistentCacheRecord<T>>;
  private readonly databaseName: string;
  private readonly storeName: string;
  private readonly persistentBytes: number;
  private openPromise: Promise<IDBDatabase | undefined> | undefined;

  constructor(options: PersistentCacheOptions) {
    this.memory = new LruCache({
      maxEntries: options.memoryEntries ?? 64,
      maxBytes: options.memoryBytes ?? DEFAULT_PERSISTENT_CACHE_MEMORY_BYTES,
      sizeOf: cacheRecordByteSize,
    });
    this.databaseName = options.databaseName ?? defaultDatabaseName;
    this.storeName = options.storeName ?? defaultStoreName;
    this.persistentBytes =
      options.persistentBytes ?? DEFAULT_PERSISTENT_CACHE_STORAGE_BYTES;
    assertByteBudget(this.persistentBytes, "persistentBytes");
  }

  async get(key: PersistentCacheKey): Promise<T | undefined> {
    const keyString = persistentKeyString(key);
    const memoryRecord = this.memory.get(keyString);
    if (memoryRecord && recordMatches(memoryRecord, key)) {
      return memoryRecord.value;
    }

    const database = await this.openDatabase();
    if (!database) {
      return undefined;
    }

    const storedRecord = await readRecord<T>(
      database,
      this.storeName,
      keyString,
    );
    const record = storedRecord && withEstimatedBytes(storedRecord);
    if (!record || !recordMatches(record, key)) {
      return undefined;
    }
    this.memory.set(keyString, record);
    return record.value;
  }

  async set(key: PersistentCacheKey, value: T): Promise<void> {
    const keyString = persistentKeyString(key);
    const record: PersistentCacheRecord<T> = {
      key: keyString,
      namespace: key.namespace,
      schemaVersion: key.schemaVersion,
      appVersion: key.appVersion,
      inputHash: key.inputHash,
      variant: key.variant,
      writtenAt: new Date().toISOString(),
      estimatedBytes: 0,
      value,
    };
    record.estimatedBytes = estimatePersistentCacheRecordBytes(record);
    this.memory.set(keyString, record);

    const database = await this.openDatabase();
    if (!database) {
      return;
    }
    await writeRecord(database, this.storeName, record);
    await enforcePersistentByteBudget(
      database,
      this.storeName,
      this.persistentBytes,
    );
  }

  async delete(key: PersistentCacheKey): Promise<void> {
    const keyString = persistentKeyString(key);
    this.memory.delete(keyString);

    const database = await this.openDatabase();
    if (!database) {
      return;
    }
    await deleteRecord(database, this.storeName, keyString);
  }

  async clearNamespace(namespace: string): Promise<void> {
    for (const [key, record] of this.memory.entries()) {
      if (record.namespace === namespace) {
        this.memory.delete(key);
      }
    }

    const database = await this.openDatabase();
    if (!database) {
      return;
    }
    await clearNamespaceRecords(database, this.storeName, namespace);
  }

  private openDatabase(): Promise<IDBDatabase | undefined> {
    if (this.openPromise) {
      return this.openPromise;
    }
    this.openPromise = openIndexedDb(this.databaseName, this.storeName);
    return this.openPromise;
  }
}

function assertByteBudget(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite non-negative number`);
  }
}

function normalizeEstimatedBytes(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError("estimatedBytes must be a finite non-negative number");
  }
  return Math.ceil(value);
}

function cacheRecordByteSize<T>(record: PersistentCacheRecord<T>): number {
  return record.estimatedBytes === undefined
    ? estimatePersistentCacheRecordBytes(record)
    : normalizeEstimatedBytes(record.estimatedBytes);
}

function withEstimatedBytes<T>(
  record: PersistentCacheRecord<T>,
): PersistentCacheRecord<T> {
  if (record.estimatedBytes !== undefined) {
    normalizeEstimatedBytes(record.estimatedBytes);
    return record;
  }
  const estimatedRecord = { ...record, estimatedBytes: 0 };
  estimatedRecord.estimatedBytes =
    estimatePersistentCacheRecordBytes(estimatedRecord);
  return estimatedRecord;
}

function recordMatches<T>(
  record: PersistentCacheRecord<T>,
  key: PersistentCacheKey,
): boolean {
  return (
    record.namespace === key.namespace &&
    record.schemaVersion === key.schemaVersion &&
    record.appVersion === key.appVersion &&
    record.inputHash === key.inputHash &&
    record.variant === key.variant
  );
}

function openIndexedDb(
  databaseName: string,
  storeName: string,
): Promise<IDBDatabase | undefined> {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(undefined);
  }

  return new Promise((resolve) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: "key" });
      }
    };
    request.onerror = () => resolve(undefined);
    request.onsuccess = () => resolve(request.result);
  });
}

function readRecord<T>(
  database: IDBDatabase,
  storeName: string,
  key: string,
): Promise<PersistentCacheRecord<T> | undefined> {
  return new Promise((resolve) => {
    const transaction = database.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(key);
    request.onerror = () => resolve(undefined);
    request.onsuccess = () =>
      resolve(request.result as PersistentCacheRecord<T> | undefined);
  });
}

function writeRecord<T>(
  database: IDBDatabase,
  storeName: string,
  record: PersistentCacheRecord<T>,
): Promise<void> {
  return new Promise((resolve) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.objectStore(storeName).put(record);
  });
}

function enforcePersistentByteBudget(
  database: IDBDatabase,
  storeName: string,
  maxBytes: number,
): Promise<void> {
  return new Promise((resolve) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const candidates: PersistentCacheEvictionCandidate[] = [];
    const request = store.openCursor();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
    request.onerror = () => undefined;
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const record = withEstimatedBytes(
          cursor.value as PersistentCacheRecord<unknown>,
        );
        candidates.push({
          key: record.key,
          writtenAt: record.writtenAt,
          estimatedBytes: record.estimatedBytes as number,
        });
        cursor.continue();
        return;
      }

      for (const key of planPersistentCacheEvictions(candidates, maxBytes)) {
        store.delete(key);
      }
    };
  });
}

function deleteRecord(
  database: IDBDatabase,
  storeName: string,
  key: string,
): Promise<void> {
  return new Promise((resolve) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.objectStore(storeName).delete(key);
  });
}

function clearNamespaceRecords(
  database: IDBDatabase,
  storeName: string,
  namespace: string,
): Promise<void> {
  return new Promise((resolve) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.openCursor();
    request.onerror = () => resolve();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        return;
      }
      const record = cursor.value as PersistentCacheRecord<unknown>;
      if (record.namespace === namespace) {
        cursor.delete();
      }
      cursor.continue();
    };
    transaction.oncomplete = () => resolve();
  });
}
