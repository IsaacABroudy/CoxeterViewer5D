export type PickingVec3 = readonly [number, number, number];

/**
 * An axis-aligned broad-phase bound in scene coordinates.
 *
 * The box must contain every pickable part of the record. A query may discard
 * the record after testing this box, so an undersized box can cause missed
 * selections rather than merely imprecise ordering.
 */
export interface PickingAabb {
  readonly min: PickingVec3;
  readonly max: PickingVec3;
}

/**
 * An optional second broad-phase bound. When supplied, it must also contain
 * the pickable geometry; the index intersects both bounds to reduce the set
 * passed to exact triangle tests.
 */
export interface PickingSphere {
  readonly center: PickingVec3;
  readonly radius: number;
}

export interface PickingTriangle {
  readonly a: PickingVec3;
  readonly b: PickingVec3;
  readonly c: PickingVec3;
}

export interface PickingSpatialItem<T = unknown> {
  /** Stable semantic id used for updates and deterministic tie-breaking. */
  readonly id: string;
  readonly aabb: PickingAabb;
  readonly sphere?: PickingSphere;
  readonly triangles?: readonly PickingTriangle[];
  /** Payloads are retained by reference; spatial bounds are copied. */
  readonly data?: T;
}

export interface PickingRay {
  readonly origin: PickingVec3;
  /** Need not be normalized. Query distances are reported in scene units. */
  readonly direction: PickingVec3;
}

export interface PickingSpatialIndexOptions {
  /** Maximum records in a leaf. Smaller leaves prune more but deepen the tree. */
  readonly leafSize?: number;
  /** Rebuild after this many refits so moving records cannot degrade the tree indefinitely. */
  readonly maxRefitsBeforeRebuild?: number;
}

export interface PickingSpatialIndexUpdate<T = unknown> {
  /** Complete replacements for existing ids, or new records to insert. */
  readonly upsert?: readonly PickingSpatialItem<T>[];
  readonly removeIds?: readonly string[];
}

export type PickingSpatialIndexUpdateKind =
  | "empty"
  | "build"
  | "refit"
  | "rebuild"
  | "clear";

export interface PickingSpatialIndexStats {
  readonly revision: number;
  readonly itemCount: number;
  readonly nodeCount: number;
  readonly leafCount: number;
  readonly maxDepth: number;
  readonly leafSize: number;
  readonly refitsSinceRebuild: number;
  readonly lastUpdateKind: PickingSpatialIndexUpdateKind;
  /** Deterministic estimate for bounds, nodes, ids, and optional triangles; payload data is excluded. */
  readonly estimatedBytes: number;
}

export interface PickingRayQueryOptions {
  readonly near?: number;
  readonly far?: number;
  readonly padding?: number;
  readonly useSpheres?: boolean;
  readonly maxCandidates?: number;
}

export interface PickingRayQueryStats {
  readonly revision: number;
  readonly totalItems: number;
  readonly treeAabbTests: number;
  readonly itemAabbTests: number;
  readonly sphereTests: number;
  readonly nodesVisited: number;
  readonly leafNodesVisited: number;
  readonly itemsVisited: number;
  readonly candidateCount: number;
  readonly returnedCount: number;
  readonly truncated: boolean;
}

export interface PickingRayCandidate<T = unknown> {
  readonly id: string;
  /** Entry distance into the tightest tested broad-phase bound, in scene units. */
  readonly distance: number;
  readonly item: Readonly<PickingSpatialItem<T>>;
}

export interface PickingRayQueryResult<T = unknown> {
  readonly candidates: PickingRayCandidate<T>[];
  readonly stats: PickingRayQueryStats;
}

export interface PickingTriangleQueryOptions {
  readonly near?: number;
  readonly far?: number;
  readonly epsilon?: number;
  readonly cullBackfaces?: boolean;
}

export interface PickingTriangleHit {
  readonly triangleIndex: number;
  readonly distance: number;
  readonly point: [number, number, number];
  /** Barycentric weights for triangle vertices a, b, and c. */
  readonly barycentric: [number, number, number];
  readonly backFacing: boolean;
}

export interface PickingCandidateTriangleHit extends PickingTriangleHit {
  readonly id: string;
}

interface InternalAabb {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

interface InternalSphere {
  x: number;
  y: number;
  z: number;
  radius: number;
}

interface StoredItem<T> {
  id: string;
  aabb: InternalAabb;
  sphere?: InternalSphere;
  triangles?: readonly PickingTriangle[];
  publicItem: Readonly<PickingSpatialItem<T>>;
}

interface BvhNode {
  aabb: InternalAabb;
  left: number;
  right: number;
  start: number;
  count: number;
  depth: number;
}

interface NormalizedRay {
  ox: number;
  oy: number;
  oz: number;
  dx: number;
  dy: number;
  dz: number;
}

const DEFAULT_LEAF_SIZE = 8;
const DEFAULT_REFIT_LIMIT = 32;
const DEFAULT_EPSILON = 1e-9;

/**
 * Retained broad-phase index for scene picking.
 *
 * Construction uses median splits along the widest centroid axis. Inputs are
 * first sorted by stable id, and every later tie is also broken by id, so the
 * same records produce the same tree and query order on every run. Existing-id
 * updates refit bounds without reallocating the tree; structural changes rebuild
 * it. The index never changes semantic ids or performs scene-specific picking.
 */
export class PickingSpatialIndex<T = unknown> {
  private readonly leafSize: number;
  private readonly maxRefitsBeforeRebuild: number;
  private items: StoredItem<T>[] = [];
  private readonly itemIndexById = new Map<string, number>();
  private order: number[] = [];
  private nodes: BvhNode[] = [];
  private revision = 0;
  private refitsSinceRebuild = 0;
  private lastUpdateKind: PickingSpatialIndexUpdateKind = "empty";
  private leafCount = 0;
  private maxDepth = 0;

  constructor(options: PickingSpatialIndexOptions = {}) {
    this.leafSize = positiveInteger(
      options.leafSize ?? DEFAULT_LEAF_SIZE,
      "leafSize",
    );
    this.maxRefitsBeforeRebuild = nonnegativeInteger(
      options.maxRefitsBeforeRebuild ?? DEFAULT_REFIT_LIMIT,
      "maxRefitsBeforeRebuild",
    );
  }

  /** Replace every retained record and build a deterministic BVH. */
  build(items: readonly PickingSpatialItem<T>[]): PickingSpatialIndexStats {
    this.items = prepareUniqueItems(items);
    this.rebuild("build");
    this.revision += 1;
    return this.getStats();
  }

  /**
   * Apply complete record replacements. Geometry-only changes refit the current
   * topology; insertions, removals, or the refit quality limit trigger a rebuild.
   */
  update(update: PickingSpatialIndexUpdate<T>): PickingSpatialIndexStats {
    const upserts = update.upsert ?? [];
    const removeIds = update.removeIds ?? [];
    validateUniqueIds(upserts, "update");
    validateUniqueStrings(removeIds, "removeIds");

    const removed = new Set(removeIds);
    for (const id of removed) {
      if (!this.itemIndexById.has(id)) {
        throw new Error(`Cannot remove unknown picking id "${id}".`);
      }
    }
    for (const item of upserts) {
      if (removed.has(item.id)) {
        throw new Error(
          `Picking id "${item.id}" cannot be removed and upserted together.`,
        );
      }
    }
    if (upserts.length === 0 && removeIds.length === 0) {
      return this.getStats();
    }

    const preparedUpserts = upserts.map(prepareItem);
    const hasInsertion = preparedUpserts.some(
      (item) => !this.itemIndexById.has(item.id),
    );
    const structuralChange = hasInsertion || removeIds.length > 0;

    if (structuralChange) {
      const byId = new Map(this.items.map((item) => [item.id, item]));
      for (const id of removeIds) {
        byId.delete(id);
      }
      for (const item of preparedUpserts) {
        byId.set(item.id, item);
      }
      this.items = [...byId.values()].sort(compareStoredIds);
      this.rebuild("rebuild");
    } else {
      for (const item of preparedUpserts) {
        const index = this.itemIndexById.get(item.id);
        if (index === undefined) {
          throw new Error(`Missing retained picking id "${item.id}".`);
        }
        this.items[index] = item;
      }
      this.refitsSinceRebuild += 1;
      if (this.refitsSinceRebuild > this.maxRefitsBeforeRebuild) {
        this.rebuild("rebuild");
      } else {
        this.refitBounds();
        this.lastUpdateKind = "refit";
      }
    }

    this.revision += 1;
    return this.getStats();
  }

  clear(): PickingSpatialIndexStats {
    this.items = [];
    this.order = [];
    this.nodes = [];
    this.itemIndexById.clear();
    this.leafCount = 0;
    this.maxDepth = 0;
    this.refitsSinceRebuild = 0;
    this.lastUpdateKind = "clear";
    this.revision += 1;
    return this.getStats();
  }

  has(id: string): boolean {
    return this.itemIndexById.has(id);
  }

  get(id: string): Readonly<PickingSpatialItem<T>> | undefined {
    const index = this.itemIndexById.get(id);
    return index === undefined ? undefined : this.items[index].publicItem;
  }

  getStats(): PickingSpatialIndexStats {
    return {
      revision: this.revision,
      itemCount: this.items.length,
      nodeCount: this.nodes.length,
      leafCount: this.leafCount,
      maxDepth: this.maxDepth,
      leafSize: this.leafSize,
      refitsSinceRebuild: this.refitsSinceRebuild,
      lastUpdateKind: this.lastUpdateKind,
      estimatedBytes: estimateRetainedBytes(this.items, this.nodes.length),
    };
  }

  /**
   * Return broad-phase candidates intersected by a ray. Candidate order is
   * deterministic: nearest broad-phase entry first, then stable id.
   */
  queryRay(
    ray: PickingRay,
    options: PickingRayQueryOptions = {},
  ): PickingRayQueryResult<T> {
    const normalizedRay = normalizeRay(ray);
    const near = finiteNonnegative(options.near ?? 0, "near");
    const far = options.far ?? Number.POSITIVE_INFINITY;
    if (!(far >= near)) {
      throw new Error("far must be greater than or equal to near.");
    }
    const padding = finiteNonnegative(options.padding ?? 0, "padding");
    const useSpheres = options.useSpheres ?? true;
    const maxCandidates =
      options.maxCandidates === undefined
        ? Number.POSITIVE_INFINITY
        : nonnegativeInteger(options.maxCandidates, "maxCandidates");

    let treeAabbTests = 0;
    let itemAabbTests = 0;
    let sphereTests = 0;
    let nodesVisited = 0;
    let leafNodesVisited = 0;
    let itemsVisited = 0;
    const candidates: PickingRayCandidate<T>[] = [];

    if (this.nodes.length > 0) {
      treeAabbTests += 1;
      const rootDistance = rayAabbDistance(
        normalizedRay,
        this.nodes[0].aabb,
        near,
        far,
        padding,
      );
      const nodeStack: number[] = [];
      if (rootDistance !== null) {
        nodeStack.push(0);
      }

      while (nodeStack.length > 0) {
        const nodeIndex = nodeStack.pop();
        if (nodeIndex === undefined) {
          break;
        }
        const node = this.nodes[nodeIndex];
        nodesVisited += 1;

        if (node.count > 0) {
          leafNodesVisited += 1;
          for (let offset = 0; offset < node.count; offset += 1) {
            const item = this.items[this.order[node.start + offset]];
            itemsVisited += 1;
            itemAabbTests += 1;
            let distance = rayAabbDistance(
              normalizedRay,
              item.aabb,
              near,
              far,
              padding,
            );
            if (distance === null) {
              continue;
            }
            if (useSpheres && item.sphere) {
              sphereTests += 1;
              distance = raySphereDistance(
                normalizedRay,
                item.sphere,
                near,
                far,
                padding,
              );
              if (distance === null) {
                continue;
              }
            }
            candidates.push({
              id: item.id,
              distance,
              item: item.publicItem,
            });
          }
          continue;
        }

        const left = this.nodes[node.left];
        const right = this.nodes[node.right];
        treeAabbTests += 2;
        const leftDistance = rayAabbDistance(
          normalizedRay,
          left.aabb,
          near,
          far,
          padding,
        );
        const rightDistance = rayAabbDistance(
          normalizedRay,
          right.aabb,
          near,
          far,
          padding,
        );

        // Push the farther node first so the nearer one is visited next. Query
        // results are sorted later, so this only improves cache locality.
        if (leftDistance !== null && rightDistance !== null) {
          if (
            leftDistance < rightDistance ||
            (leftDistance === rightDistance && node.left < node.right)
          ) {
            nodeStack.push(node.right, node.left);
          } else {
            nodeStack.push(node.left, node.right);
          }
        } else if (leftDistance !== null) {
          nodeStack.push(node.left);
        } else if (rightDistance !== null) {
          nodeStack.push(node.right);
        }
      }
    }

    candidates.sort(
      (a, b) => a.distance - b.distance || compareIds(a.id, b.id),
    );
    const candidateCount = candidates.length;
    if (candidates.length > maxCandidates) {
      candidates.length = maxCandidates;
    }

    return {
      candidates,
      stats: {
        revision: this.revision,
        totalItems: this.items.length,
        treeAabbTests,
        itemAabbTests,
        sphereTests,
        nodesVisited,
        leafNodesVisited,
        itemsVisited,
        candidateCount,
        returnedCount: candidates.length,
        truncated: candidates.length < candidateCount,
      },
    };
  }

  private rebuild(kind: "build" | "rebuild"): void {
    this.items.sort(compareStoredIds);
    this.itemIndexById.clear();
    this.items.forEach((item, index) => this.itemIndexById.set(item.id, index));
    this.order = this.items.map((_, index) => index);
    this.nodes = [];
    this.leafCount = 0;
    this.maxDepth = 0;
    if (this.items.length > 0) {
      this.buildNode(0, this.items.length, 0);
    }
    this.refitsSinceRebuild = 0;
    this.lastUpdateKind = kind;
  }

  private buildNode(start: number, end: number, depth: number): number {
    const nodeIndex = this.nodes.length;
    const aabb = boundsForOrderRange(this.items, this.order, start, end);
    const count = end - start;
    this.nodes.push({
      aabb,
      left: -1,
      right: -1,
      start,
      count,
      depth,
    });
    this.maxDepth = Math.max(this.maxDepth, depth);

    if (count <= this.leafSize) {
      this.leafCount += 1;
      return nodeIndex;
    }

    const axis = widestCentroidAxis(this.items, this.order, start, end);
    const sorted = this.order.slice(start, end).sort((aIndex, bIndex) => {
      const delta =
        aabbCentroidAxis(this.items[aIndex].aabb, axis) -
        aabbCentroidAxis(this.items[bIndex].aabb, axis);
      return delta || compareIds(this.items[aIndex].id, this.items[bIndex].id);
    });
    for (let index = 0; index < sorted.length; index += 1) {
      this.order[start + index] = sorted[index];
    }

    const middle = start + Math.floor(count / 2);
    const left = this.buildNode(start, middle, depth + 1);
    const right = this.buildNode(middle, end, depth + 1);
    this.nodes[nodeIndex] = {
      aabb: unionAabbs(this.nodes[left].aabb, this.nodes[right].aabb),
      left,
      right,
      start: 0,
      count: 0,
      depth,
    };
    return nodeIndex;
  }

  private refitBounds(): void {
    for (let index = this.nodes.length - 1; index >= 0; index -= 1) {
      const node = this.nodes[index];
      node.aabb =
        node.count > 0
          ? boundsForOrderRange(
              this.items,
              this.order,
              node.start,
              node.start + node.count,
            )
          : unionAabbs(this.nodes[node.left].aabb, this.nodes[node.right].aabb);
    }
  }
}

/** Intersect one triangle with a ray using the Moller-Trumbore test. */
export function intersectPickingTriangle(
  ray: PickingRay,
  triangle: PickingTriangle,
  options: PickingTriangleQueryOptions = {},
): PickingTriangleHit | null {
  return intersectNormalizedTriangle(
    normalizeRay(ray),
    triangle,
    0,
    normalizedTriangleOptions(options),
  );
}

/** Return the nearest triangle hit, using source order to break equal-distance ties. */
export function intersectPickingTriangles(
  ray: PickingRay,
  triangles: readonly PickingTriangle[],
  options: PickingTriangleQueryOptions = {},
): PickingTriangleHit | null {
  const normalizedRay = normalizeRay(ray);
  const normalizedOptions = normalizedTriangleOptions(options);
  let nearest: PickingTriangleHit | null = null;
  for (let index = 0; index < triangles.length; index += 1) {
    const hit = intersectNormalizedTriangle(
      normalizedRay,
      triangles[index],
      index,
      normalizedOptions,
    );
    if (
      hit &&
      (!nearest ||
        hit.distance < nearest.distance ||
        (hit.distance === nearest.distance &&
          hit.triangleIndex < nearest.triangleIndex))
    ) {
      nearest = hit;
    }
  }
  return nearest;
}

/** Refine one broad-phase candidate against its retained triangles. */
export function intersectPickingCandidateTriangles<T>(
  ray: PickingRay,
  candidate: PickingRayCandidate<T>,
  options: PickingTriangleQueryOptions = {},
): PickingCandidateTriangleHit | null {
  const hit = intersectPickingTriangles(
    ray,
    candidate.item.triangles ?? [],
    options,
  );
  return hit ? { ...hit, id: candidate.id } : null;
}

function prepareUniqueItems<T>(
  items: readonly PickingSpatialItem<T>[],
): StoredItem<T>[] {
  validateUniqueIds(items, "build");
  return items.map(prepareItem).sort(compareStoredIds);
}

function prepareItem<T>(item: PickingSpatialItem<T>): StoredItem<T> {
  if (typeof item.id !== "string" || item.id.length === 0) {
    throw new Error("Picking item ids must be nonempty strings.");
  }
  const aabb = toInternalAabb(item.aabb);
  const sphere = item.sphere ? toInternalSphere(item.sphere) : undefined;
  const triangles = item.triangles?.map((triangle, index) => {
    validateVec3(triangle.a, `triangles[${index}].a`);
    validateVec3(triangle.b, `triangles[${index}].b`);
    validateVec3(triangle.c, `triangles[${index}].c`);
    for (const vertex of [triangle.a, triangle.b, triangle.c]) {
      if (!aabbContainsPoint(aabb, vertex, DEFAULT_EPSILON)) {
        throw new Error(
          `Triangle ${index} for picking id "${item.id}" lies outside its AABB.`,
        );
      }
      if (sphere && !sphereContainsPoint(sphere, vertex, DEFAULT_EPSILON)) {
        throw new Error(
          `Triangle ${index} for picking id "${item.id}" lies outside its sphere.`,
        );
      }
    }
    return cloneTriangle(triangle);
  });
  const publicItem: PickingSpatialItem<T> = {
    id: item.id,
    aabb: fromInternalAabb(aabb),
    ...(sphere ? { sphere: fromInternalSphere(sphere) } : {}),
    ...(triangles ? { triangles } : {}),
    ...(item.data !== undefined ? { data: item.data } : {}),
  };
  return { id: item.id, aabb, sphere, triangles, publicItem };
}

function validateUniqueIds<T>(
  items: readonly PickingSpatialItem<T>[],
  context: string,
): void {
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) {
      throw new Error(`Duplicate picking id "${item.id}" in ${context}.`);
    }
    ids.add(item.id);
  }
}

function validateUniqueStrings(values: readonly string[], label: string): void {
  const unique = new Set<string>();
  for (const value of values) {
    if (unique.has(value)) {
      throw new Error(`Duplicate value "${value}" in ${label}.`);
    }
    unique.add(value);
  }
}

function toInternalAabb(aabb: PickingAabb): InternalAabb {
  validateVec3(aabb.min, "aabb.min");
  validateVec3(aabb.max, "aabb.max");
  if (
    aabb.min[0] > aabb.max[0] ||
    aabb.min[1] > aabb.max[1] ||
    aabb.min[2] > aabb.max[2]
  ) {
    throw new Error("AABB minima must not exceed maxima.");
  }
  return {
    minX: aabb.min[0],
    minY: aabb.min[1],
    minZ: aabb.min[2],
    maxX: aabb.max[0],
    maxY: aabb.max[1],
    maxZ: aabb.max[2],
  };
}

function fromInternalAabb(aabb: InternalAabb): PickingAabb {
  return {
    min: [aabb.minX, aabb.minY, aabb.minZ],
    max: [aabb.maxX, aabb.maxY, aabb.maxZ],
  };
}

function toInternalSphere(sphere: PickingSphere): InternalSphere {
  validateVec3(sphere.center, "sphere.center");
  finiteNonnegative(sphere.radius, "sphere.radius");
  return {
    x: sphere.center[0],
    y: sphere.center[1],
    z: sphere.center[2],
    radius: sphere.radius,
  };
}

function fromInternalSphere(sphere: InternalSphere): PickingSphere {
  return {
    center: [sphere.x, sphere.y, sphere.z],
    radius: sphere.radius,
  };
}

function cloneTriangle(triangle: PickingTriangle): PickingTriangle {
  return {
    a: [...triangle.a],
    b: [...triangle.b],
    c: [...triangle.c],
  };
}

function compareStoredIds<T>(a: StoredItem<T>, b: StoredItem<T>): number {
  return compareIds(a.id, b.id);
}

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function boundsForOrderRange<T>(
  items: readonly StoredItem<T>[],
  order: readonly number[],
  start: number,
  end: number,
): InternalAabb {
  const first = items[order[start]].aabb;
  const bounds = { ...first };
  for (let index = start + 1; index < end; index += 1) {
    expandAabb(bounds, items[order[index]].aabb);
  }
  return bounds;
}

function expandAabb(target: InternalAabb, source: InternalAabb): void {
  target.minX = Math.min(target.minX, source.minX);
  target.minY = Math.min(target.minY, source.minY);
  target.minZ = Math.min(target.minZ, source.minZ);
  target.maxX = Math.max(target.maxX, source.maxX);
  target.maxY = Math.max(target.maxY, source.maxY);
  target.maxZ = Math.max(target.maxZ, source.maxZ);
}

function unionAabbs(a: InternalAabb, b: InternalAabb): InternalAabb {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    minZ: Math.min(a.minZ, b.minZ),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
    maxZ: Math.max(a.maxZ, b.maxZ),
  };
}

function widestCentroidAxis<T>(
  items: readonly StoredItem<T>[],
  order: readonly number[],
  start: number,
  end: number,
): 0 | 1 | 2 {
  const first = items[order[start]].aabb;
  let minX = aabbCentroidAxis(first, 0);
  let maxX = minX;
  let minY = aabbCentroidAxis(first, 1);
  let maxY = minY;
  let minZ = aabbCentroidAxis(first, 2);
  let maxZ = minZ;
  for (let index = start + 1; index < end; index += 1) {
    const aabb = items[order[index]].aabb;
    const x = aabbCentroidAxis(aabb, 0);
    const y = aabbCentroidAxis(aabb, 1);
    const z = aabbCentroidAxis(aabb, 2);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  const xSpan = maxX - minX;
  const ySpan = maxY - minY;
  const zSpan = maxZ - minZ;
  if (ySpan > xSpan && ySpan >= zSpan) {
    return 1;
  }
  return zSpan > xSpan && zSpan > ySpan ? 2 : 0;
}

function aabbCentroidAxis(aabb: InternalAabb, axis: 0 | 1 | 2): number {
  if (axis === 0) {
    return (aabb.minX + aabb.maxX) * 0.5;
  }
  if (axis === 1) {
    return (aabb.minY + aabb.maxY) * 0.5;
  }
  return (aabb.minZ + aabb.maxZ) * 0.5;
}

function normalizeRay(ray: PickingRay): NormalizedRay {
  validateVec3(ray.origin, "ray.origin");
  validateVec3(ray.direction, "ray.direction");
  const [dx, dy, dz] = ray.direction;
  const length = Math.hypot(dx, dy, dz);
  if (!(length > 0)) {
    throw new Error("Ray direction must be nonzero.");
  }
  return {
    ox: ray.origin[0],
    oy: ray.origin[1],
    oz: ray.origin[2],
    dx: dx / length,
    dy: dy / length,
    dz: dz / length,
  };
}

function rayAabbDistance(
  ray: NormalizedRay,
  aabb: InternalAabb,
  near: number,
  far: number,
  padding: number,
): number | null {
  let entry = near;
  let exit = far;

  if (Math.abs(ray.dx) <= Number.EPSILON) {
    if (ray.ox < aabb.minX - padding || ray.ox > aabb.maxX + padding) {
      return null;
    }
  } else {
    const inverse = 1 / ray.dx;
    let first = (aabb.minX - padding - ray.ox) * inverse;
    let second = (aabb.maxX + padding - ray.ox) * inverse;
    if (first > second) {
      const swap = first;
      first = second;
      second = swap;
    }
    entry = Math.max(entry, first);
    exit = Math.min(exit, second);
    if (exit < entry) {
      return null;
    }
  }

  if (Math.abs(ray.dy) <= Number.EPSILON) {
    if (ray.oy < aabb.minY - padding || ray.oy > aabb.maxY + padding) {
      return null;
    }
  } else {
    const inverse = 1 / ray.dy;
    let first = (aabb.minY - padding - ray.oy) * inverse;
    let second = (aabb.maxY + padding - ray.oy) * inverse;
    if (first > second) {
      const swap = first;
      first = second;
      second = swap;
    }
    entry = Math.max(entry, first);
    exit = Math.min(exit, second);
    if (exit < entry) {
      return null;
    }
  }

  if (Math.abs(ray.dz) <= Number.EPSILON) {
    if (ray.oz < aabb.minZ - padding || ray.oz > aabb.maxZ + padding) {
      return null;
    }
  } else {
    const inverse = 1 / ray.dz;
    let first = (aabb.minZ - padding - ray.oz) * inverse;
    let second = (aabb.maxZ + padding - ray.oz) * inverse;
    if (first > second) {
      const swap = first;
      first = second;
      second = swap;
    }
    entry = Math.max(entry, first);
    exit = Math.min(exit, second);
    if (exit < entry) {
      return null;
    }
  }
  return entry;
}

function raySphereDistance(
  ray: NormalizedRay,
  sphere: InternalSphere,
  near: number,
  far: number,
  padding: number,
): number | null {
  const radius = sphere.radius + padding;
  const x = ray.ox - sphere.x;
  const y = ray.oy - sphere.y;
  const z = ray.oz - sphere.z;
  const projected = x * ray.dx + y * ray.dy + z * ray.dz;
  const squaredDistance = x * x + y * y + z * z - radius * radius;
  const discriminant = projected * projected - squaredDistance;
  if (discriminant < 0) {
    return null;
  }
  const root = Math.sqrt(Math.max(0, discriminant));
  const entry = -projected - root;
  const exit = -projected + root;
  if (exit < near || entry > far) {
    return null;
  }
  return Math.max(near, entry);
}

function normalizedTriangleOptions(
  options: PickingTriangleQueryOptions,
): Required<PickingTriangleQueryOptions> {
  const near = finiteNonnegative(options.near ?? 0, "near");
  const far = options.far ?? Number.POSITIVE_INFINITY;
  if (!(far >= near)) {
    throw new Error("far must be greater than or equal to near.");
  }
  const epsilon = finiteNonnegative(
    options.epsilon ?? DEFAULT_EPSILON,
    "epsilon",
  );
  return {
    near,
    far,
    epsilon,
    cullBackfaces: options.cullBackfaces ?? false,
  };
}

function intersectNormalizedTriangle(
  ray: NormalizedRay,
  triangle: PickingTriangle,
  triangleIndex: number,
  options: Required<PickingTriangleQueryOptions>,
): PickingTriangleHit | null {
  const edge1X = triangle.b[0] - triangle.a[0];
  const edge1Y = triangle.b[1] - triangle.a[1];
  const edge1Z = triangle.b[2] - triangle.a[2];
  const edge2X = triangle.c[0] - triangle.a[0];
  const edge2Y = triangle.c[1] - triangle.a[1];
  const edge2Z = triangle.c[2] - triangle.a[2];
  const pX = ray.dy * edge2Z - ray.dz * edge2Y;
  const pY = ray.dz * edge2X - ray.dx * edge2Z;
  const pZ = ray.dx * edge2Y - ray.dy * edge2X;
  const determinant = edge1X * pX + edge1Y * pY + edge1Z * pZ;

  if (
    (options.cullBackfaces && determinant <= options.epsilon) ||
    (!options.cullBackfaces && Math.abs(determinant) <= options.epsilon)
  ) {
    return null;
  }

  const inverseDeterminant = 1 / determinant;
  const translatedX = ray.ox - triangle.a[0];
  const translatedY = ray.oy - triangle.a[1];
  const translatedZ = ray.oz - triangle.a[2];
  const bWeight =
    (translatedX * pX + translatedY * pY + translatedZ * pZ) *
    inverseDeterminant;
  if (bWeight < -options.epsilon || bWeight > 1 + options.epsilon) {
    return null;
  }

  const qX = translatedY * edge1Z - translatedZ * edge1Y;
  const qY = translatedZ * edge1X - translatedX * edge1Z;
  const qZ = translatedX * edge1Y - translatedY * edge1X;
  const cWeight =
    (ray.dx * qX + ray.dy * qY + ray.dz * qZ) * inverseDeterminant;
  if (cWeight < -options.epsilon || bWeight + cWeight > 1 + options.epsilon) {
    return null;
  }

  const distance =
    (edge2X * qX + edge2Y * qY + edge2Z * qZ) * inverseDeterminant;
  if (distance < options.near || distance > options.far) {
    return null;
  }
  const aWeight = 1 - bWeight - cWeight;
  return {
    triangleIndex,
    distance,
    point: [
      ray.ox + ray.dx * distance,
      ray.oy + ray.dy * distance,
      ray.oz + ray.dz * distance,
    ],
    barycentric: [aWeight, bWeight, cWeight],
    backFacing: determinant < 0,
  };
}

function aabbContainsPoint(
  aabb: InternalAabb,
  point: PickingVec3,
  epsilon: number,
): boolean {
  return (
    point[0] >= aabb.minX - epsilon &&
    point[0] <= aabb.maxX + epsilon &&
    point[1] >= aabb.minY - epsilon &&
    point[1] <= aabb.maxY + epsilon &&
    point[2] >= aabb.minZ - epsilon &&
    point[2] <= aabb.maxZ + epsilon
  );
}

function sphereContainsPoint(
  sphere: InternalSphere,
  point: PickingVec3,
  epsilon: number,
): boolean {
  const x = point[0] - sphere.x;
  const y = point[1] - sphere.y;
  const z = point[2] - sphere.z;
  const radius = sphere.radius + epsilon;
  return x * x + y * y + z * z <= radius * radius;
}

function validateVec3(value: PickingVec3, label: string): void {
  if (
    value.length !== 3 ||
    !Number.isFinite(value[0]) ||
    !Number.isFinite(value[1]) ||
    !Number.isFinite(value[2])
  ) {
    throw new Error(`${label} must contain three finite coordinates.`);
  }
}

function finiteNonnegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be finite and nonnegative.`);
  }
  return value;
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return value;
}

function nonnegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a nonnegative integer.`);
  }
  return value;
}

function estimateRetainedBytes<T>(
  items: readonly StoredItem<T>[],
  nodeCount: number,
): number {
  let bytes = nodeCount * 72 + items.length * 56;
  for (const item of items) {
    bytes += item.id.length * 2;
    if (item.sphere) {
      bytes += 32;
    }
    bytes += (item.triangles?.length ?? 0) * 72;
  }
  return bytes;
}
