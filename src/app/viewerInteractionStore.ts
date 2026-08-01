import { useCallback, useMemo, useSyncExternalStore } from "react";

export type ViewerVector2 = readonly [number, number];
export type ViewerVector3 = readonly [number, number, number];

export interface ViewerSelectionState {
  readonly selectedNodeId: string | undefined;
  readonly selectedEdgeId: string | undefined;
  readonly selectedCellId: string | undefined;
  readonly selectedGeneratorPairKey: string | undefined;
}

export interface ViewerHoverState {
  readonly hoveredNodeId: string | undefined;
  readonly hoveredEdgeId: string | undefined;
  readonly hoveredCellId: string | undefined;
  readonly pointerNdc: ViewerVector2 | undefined;
}

export interface ViewerCameraState {
  readonly position: ViewerVector3;
  readonly target: ViewerVector3;
  readonly up: ViewerVector3;
  readonly zoom: number;
}

export interface ViewerRenderStatsState {
  readonly runtimeId: string | undefined;
  readonly renderCount: number;
  readonly renderReason: string;
  readonly frame: number;
  readonly lastFrameMs: number;
  readonly lastGraphUpdateMs: number;
  readonly drawCalls: number;
  readonly triangles: number;
  readonly renderedNodes: number;
  readonly renderedEdges: number;
  readonly renderedCells: number;
  readonly renderedLabels: number;
}

export interface ViewerInteractionState {
  readonly selection: ViewerSelectionState;
  readonly hover: ViewerHoverState;
  readonly camera: ViewerCameraState;
  readonly renderStats: ViewerRenderStatsState;
}

export type ViewerInteractionSliceKey = keyof ViewerInteractionState;
export type ViewerInteractionSlice =
  ViewerInteractionState[ViewerInteractionSliceKey];

type SliceUpdate<K extends ViewerInteractionSliceKey> =
  | Partial<ViewerInteractionState[K]>
  | ((
      current: ViewerInteractionState[K],
    ) => Partial<ViewerInteractionState[K]> | ViewerInteractionState[K]);

export type ViewerInteractionInitialState = {
  readonly [K in ViewerInteractionSliceKey]?: Partial<
    ViewerInteractionState[K]
  >;
};

export type ViewerStoreListener = () => void;
export type ViewerSelector<TSlice, TSelected> = (slice: TSlice) => TSelected;
export type ViewerEquality<T> = (left: T, right: T) => boolean;
export type ViewerSelectorListener<T> = (selected: T, previous: T) => void;

export interface ViewerInteractionStore {
  getSnapshot(): ViewerInteractionState;
  getSliceSnapshot<K extends ViewerInteractionSliceKey>(
    slice: K,
  ): ViewerInteractionState[K];
  subscribe(listener: ViewerStoreListener): () => void;
  subscribeSlice<K extends ViewerInteractionSliceKey>(
    slice: K,
    listener: ViewerSelectorListener<ViewerInteractionState[K]>,
  ): () => void;
  subscribeSelector<K extends ViewerInteractionSliceKey, TSelected>(
    slice: K,
    selector: ViewerSelector<ViewerInteractionState[K], TSelected>,
    listener: ViewerSelectorListener<TSelected>,
    isEqual?: ViewerEquality<TSelected>,
  ): () => void;
  updateSlice<K extends ViewerInteractionSliceKey>(
    slice: K,
    update: SliceUpdate<K>,
  ): void;
  setSelection(update: SliceUpdate<"selection">): void;
  setHover(update: SliceUpdate<"hover">): void;
  setCamera(update: SliceUpdate<"camera">): void;
  setRenderStats(update: SliceUpdate<"renderStats">): void;
  batch<T>(operation: () => T): T;
}

interface SelectorSubscription {
  readonly selector: (slice: unknown) => unknown;
  readonly listener: ViewerSelectorListener<unknown>;
  readonly isEqual: ViewerEquality<unknown>;
  selected: unknown;
}

const defaultSelection: ViewerSelectionState = Object.freeze({
  selectedNodeId: undefined,
  selectedEdgeId: undefined,
  selectedCellId: undefined,
  selectedGeneratorPairKey: undefined,
});

const defaultHover: ViewerHoverState = Object.freeze({
  hoveredNodeId: undefined,
  hoveredEdgeId: undefined,
  hoveredCellId: undefined,
  pointerNdc: undefined,
});

const defaultCamera: ViewerCameraState = Object.freeze({
  position: freezeVector3([0, 0, 10]),
  target: freezeVector3([0, 0, 0]),
  up: freezeVector3([0, 1, 0]),
  zoom: 1,
});

const defaultRenderStats: ViewerRenderStatsState = Object.freeze({
  runtimeId: undefined,
  renderCount: 0,
  renderReason: "init",
  frame: 0,
  lastFrameMs: 0,
  lastGraphUpdateMs: 0,
  drawCalls: 0,
  triangles: 0,
  renderedNodes: 0,
  renderedEdges: 0,
  renderedCells: 0,
  renderedLabels: 0,
});

/**
 * Creates the small external store used for interaction state that can change
 * much faster than the surrounding application. Each slice has its own
 * subscription set, so a camera frame cannot wake selection-only consumers.
 */
export function createViewerInteractionStore(
  initial: ViewerInteractionInitialState = {},
): ViewerInteractionStore {
  let snapshot = createInitialSnapshot(initial);
  const listeners = new Set<ViewerStoreListener>();
  const selectors = createSelectorSets();
  const dirtySlices = new Set<ViewerInteractionSliceKey>();
  let batchDepth = 0;
  let globalDirty = false;
  let flushing = false;

  function getSnapshot(): ViewerInteractionState {
    return snapshot;
  }

  function getSliceSnapshot<K extends ViewerInteractionSliceKey>(
    slice: K,
  ): ViewerInteractionState[K] {
    return snapshot[slice];
  }

  function subscribe(listener: ViewerStoreListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function subscribeSelector<K extends ViewerInteractionSliceKey, TSelected>(
    slice: K,
    selector: ViewerSelector<ViewerInteractionState[K], TSelected>,
    listener: ViewerSelectorListener<TSelected>,
    isEqual: ViewerEquality<TSelected> = Object.is,
  ): () => void {
    const subscription: SelectorSubscription = {
      selector: selector as (value: unknown) => unknown,
      listener: listener as ViewerSelectorListener<unknown>,
      isEqual: isEqual as ViewerEquality<unknown>,
      selected: selector(snapshot[slice]),
    };
    selectors[slice].add(subscription);
    return () => selectors[slice].delete(subscription);
  }

  function subscribeSlice<K extends ViewerInteractionSliceKey>(
    slice: K,
    listener: ViewerSelectorListener<ViewerInteractionState[K]>,
  ): () => void {
    return subscribeSelector(slice, identity, listener);
  }

  function updateSlice<K extends ViewerInteractionSliceKey>(
    slice: K,
    update: SliceUpdate<K>,
  ): void {
    const previous = snapshot[slice];
    const patch = typeof update === "function" ? update(previous) : update;
    const candidate = { ...previous, ...patch } as ViewerInteractionState[K];
    const next = freezeSlice(slice, candidate, previous);

    if (shallowRecordEqual(previous, next)) {
      return;
    }

    snapshot = Object.freeze({ ...snapshot, [slice]: next });
    dirtySlices.add(slice);
    globalDirty = true;
    flush();
  }

  function batch<T>(operation: () => T): T {
    batchDepth += 1;
    try {
      return operation();
    } finally {
      batchDepth -= 1;
      flush();
    }
  }

  // A listener may update another slice. The loop drains that second update
  // after the current notification set instead of recursively entering flush.
  function flush(): void {
    if (batchDepth > 0 || flushing || dirtySlices.size === 0) {
      return;
    }

    flushing = true;
    try {
      while (dirtySlices.size > 0) {
        const changedSlices = [...dirtySlices];
        const notifyGlobal = globalDirty;
        dirtySlices.clear();
        globalDirty = false;

        for (const slice of changedSlices) {
          const sliceSnapshot = snapshot[slice];
          for (const subscription of [...selectors[slice]]) {
            const selected = subscription.selector(sliceSnapshot);
            if (subscription.isEqual(subscription.selected, selected)) {
              continue;
            }
            const previous = subscription.selected;
            subscription.selected = selected;
            subscription.listener(selected, previous);
          }
        }

        if (notifyGlobal) {
          for (const listener of [...listeners]) {
            listener();
          }
        }
      }
    } finally {
      flushing = false;
    }
  }

  return {
    getSnapshot,
    getSliceSnapshot,
    subscribe,
    subscribeSlice,
    subscribeSelector,
    updateSlice,
    setSelection: (update) => updateSlice("selection", update),
    setHover: (update) => updateSlice("hover", update),
    setCamera: (update) => updateSlice("camera", update),
    setRenderStats: (update) => updateSlice("renderStats", update),
    batch,
  };
}

/** Subscribes a React component to one complete immutable store slice. */
export function useViewerInteractionSlice<K extends ViewerInteractionSliceKey>(
  store: ViewerInteractionStore,
  slice: K,
): ViewerInteractionState[K] {
  const subscribe = useCallback(
    (listener: ViewerStoreListener) =>
      store.subscribeSlice(slice, () => listener()),
    [store, slice],
  );
  const getSnapshot = useCallback(
    () => store.getSliceSnapshot(slice),
    [store, slice],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Subscribes to a derived value within one slice. The memoized snapshot keeps
 * selectors that return equivalent objects safe for useSyncExternalStore.
 */
export function useViewerInteractionSelector<
  K extends ViewerInteractionSliceKey,
  TSelected,
>(
  store: ViewerInteractionStore,
  slice: K,
  selector: ViewerSelector<ViewerInteractionState[K], TSelected>,
  isEqual: ViewerEquality<TSelected> = Object.is,
): TSelected {
  const observer = useMemo(
    () => createSelectorObserver(store, slice, selector, isEqual),
    [store, slice, selector, isEqual],
  );

  return useSyncExternalStore(
    observer.subscribe,
    observer.getSnapshot,
    observer.getSnapshot,
  );
}

function createSelectorObserver<K extends ViewerInteractionSliceKey, TSelected>(
  store: ViewerInteractionStore,
  slice: K,
  selector: ViewerSelector<ViewerInteractionState[K], TSelected>,
  isEqual: ViewerEquality<TSelected>,
): {
  getSnapshot: () => TSelected;
  subscribe: (listener: ViewerStoreListener) => () => void;
} {
  let selected = selector(store.getSliceSnapshot(slice));

  const getSnapshot = () => selected;
  const subscribe = (listener: ViewerStoreListener) => {
    const current = selector(store.getSliceSnapshot(slice));
    const changedBeforeSubscribe = !isEqual(selected, current);
    if (changedBeforeSubscribe) {
      selected = current;
    }

    const unsubscribe = store.subscribeSelector(
      slice,
      selector,
      (next) => {
        selected = next;
        listener();
      },
      isEqual,
    );

    // Close the small render-to-subscribe race required by
    // useSyncExternalStore's consistency contract.
    if (changedBeforeSubscribe) {
      listener();
    }
    return unsubscribe;
  };

  return { getSnapshot, subscribe };
}

function createInitialSnapshot(
  initial: ViewerInteractionInitialState,
): ViewerInteractionState {
  return Object.freeze({
    selection: freezeSelection({ ...defaultSelection, ...initial.selection }),
    hover: freezeHover({ ...defaultHover, ...initial.hover }),
    camera: freezeCamera({ ...defaultCamera, ...initial.camera }),
    renderStats: freezeRenderStats({
      ...defaultRenderStats,
      ...initial.renderStats,
    }),
  });
}

function createSelectorSets(): Record<
  ViewerInteractionSliceKey,
  Set<SelectorSubscription>
> {
  return {
    selection: new Set(),
    hover: new Set(),
    camera: new Set(),
    renderStats: new Set(),
  };
}

function freezeSlice<K extends ViewerInteractionSliceKey>(
  slice: K,
  candidate: ViewerInteractionState[K],
  previous: ViewerInteractionState[K],
): ViewerInteractionState[K] {
  switch (slice) {
    case "selection":
      return freezeSelection(
        candidate as ViewerSelectionState,
      ) as ViewerInteractionState[K];
    case "hover":
      return freezeHover(
        candidate as ViewerHoverState,
        previous as ViewerHoverState,
      ) as ViewerInteractionState[K];
    case "camera":
      return freezeCamera(
        candidate as ViewerCameraState,
        previous as ViewerCameraState,
      ) as ViewerInteractionState[K];
    case "renderStats":
      return freezeRenderStats(
        candidate as ViewerRenderStatsState,
      ) as ViewerInteractionState[K];
  }
}

function freezeSelection(value: ViewerSelectionState): ViewerSelectionState {
  return Object.freeze({ ...value });
}

function freezeHover(
  value: ViewerHoverState,
  previous?: ViewerHoverState,
): ViewerHoverState {
  return Object.freeze({
    ...value,
    pointerNdc: value.pointerNdc
      ? freezeVector2(value.pointerNdc, previous?.pointerNdc)
      : undefined,
  });
}

function freezeCamera(
  value: ViewerCameraState,
  previous?: ViewerCameraState,
): ViewerCameraState {
  return Object.freeze({
    ...value,
    position: freezeVector3(value.position, previous?.position),
    target: freezeVector3(value.target, previous?.target),
    up: freezeVector3(value.up, previous?.up),
  });
}

function freezeRenderStats(
  value: ViewerRenderStatsState,
): ViewerRenderStatsState {
  return Object.freeze({ ...value });
}

function freezeVector2(
  value: ViewerVector2,
  previous?: ViewerVector2,
): ViewerVector2 {
  if (previous && value[0] === previous[0] && value[1] === previous[1]) {
    return previous;
  }
  return Object.freeze([value[0], value[1]]);
}

function freezeVector3(
  value: ViewerVector3,
  previous?: ViewerVector3,
): ViewerVector3 {
  if (
    previous &&
    value[0] === previous[0] &&
    value[1] === previous[1] &&
    value[2] === previous[2]
  ) {
    return previous;
  }
  return Object.freeze([value[0], value[1], value[2]]);
}

function shallowRecordEqual(left: object, right: object): boolean {
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const keys = Object.keys(leftRecord);
  if (keys.length !== Object.keys(rightRecord).length) {
    return false;
  }
  return keys.every((key) => Object.is(leftRecord[key], rightRecord[key]));
}

function identity<T>(value: T): T {
  return value;
}
