# Performance audit

This page records where interaction time is spent and why the current renderer
is structured as it is. Performance changes are accepted only when the
benchmark also preserves the expected nodes, relation surfaces, semantic edge
labels, label leaders, warnings, and export behavior.

## July 2026 audit

The production benchmark uses a fresh Chromium context and serves `dist/`
directly. It does not silently attach to a developer's Vite process. The run
records interaction time, graph-update time, render count, long tasks, draw
calls, triangles, estimated scene memory, JavaScript heap use, and semantic
object counts.

Long-task ceilings are machine-classed. Local checks retain the stricter
`local-dev-laptop` budget, while the hard CI command uses a documented
`ci-linux-standard` budget for shared-runner variance. The CI profile does not
relax semantic floors, elapsed-time limits, graph-update limits, or the
zero-idle-render requirement.
Its graph-update multiplier is deliberately separate from elapsed and
long-task budgets so hosted-runner scheduling variance does not weaken the
local interaction target.

On the audit machine, ordinary graph updates took about `0.5-6 ms`. Selecting a
Gamma incidence partition took about `16-17 ms`. Repeated production runs put a
dense `Y_Gamma` cutaway between `14-99 ms` and relation-star focus between
`144-241 ms`, depending on cache and scheduling state. The heaviest retained
workflows were an edge-star change (`270-311 ms`), bookmark restore
(`177-227 ms`), and the coherent/expanded comparison (`287-375 ms`). The
older comparison mounted two complete Three.js scenes. The current path
composes the coherent and expanded drawings into one retained scene and one
WebGL canvas, while keeping source cell ids for shared selection. The control
remains optional because it still draws two copies of the topology.

These are local measurements, not universal guarantees. The checked snapshot
uses generous machine-independent budgets, while the machine-class report
records tighter baselines for comparison over time.

## Changes made in this audit

- The app computes JNW state orbits only while the JNW workflow or a JNW state
  quotient is active. Selecting an unrelated rank-ten example no longer builds
  a 512-state singleton-move orbit in the background.
- Coxeter-system generation returns its spherical-subset enumeration from the
  worker. Davis and `Y_Gamma` consumers reuse that result instead of repeating
  the subset search on the UI thread.
- Repeated spherical-subset calls for the same immutable parsed system and
  option set share a `WeakMap` result.
- Cocycle summaries build their edge lookup once. Formatting every failed
  boundary no longer rebuilds the same full edge map.
- Generator and `Y_Gamma` worker clients keep the same 16-entry LRU residency
  model as their workers. A client can no longer omit source data that its
  worker has already evicted.
- `Y_Gamma` comparison scenes use the persistent scene worker/cache instead of
  synchronous main-thread construction.
- Renderer revision keys are split into topology, layout, cell geometry,
  appearance, labels, picking, and camera layers. Immutable scene-array hashes
  and adjacency lookups are retained by identity.
- Label collision checks use a screen-space grid rather than comparing every
  new label with every previously placed label.
- Renderer statistics update the cheap global reference per frame, but detailed
  DOM attributes and bubbling events are limited to four updates per second.
  Scene changes still force one publication after the corresponding render.
- Demand-driven frame timing starts when a render is requested. Deliberate idle
  time is no longer misreported as a slow frame.
- The timed benchmark now fails when any scenario fails. Previously a failed
  interaction could be written inside a report whose top-level `ok` value was
  still `true`.
- Dense labels now share a single-channel SDF glyph atlas and two batched
  meshes, one for glyphs and one for label panels. Sparse and focused views
  retain the sharper canvas-sprite path. Atlas creation is capability-checked,
  byte-bounded, and falls back without dropping labels.
- Picking is adaptive. Ordinary scenes use a retained, refittable BVH and exact
  candidate triangle tests. Scenes with at least 2,500 pickable nodes/cells use
  a one-pixel GPU id pass; failed or unavailable readback falls back to the BVH.
  Hover readback pauses while the camera is moving.
- Memory caches now enforce entry and estimated-byte limits. The structural
  estimator counts typed-array payloads exactly, handles cycles, and counts
  shared objects once. IndexedDB uses deterministic oldest-first eviction under
  a 256 MiB default budget.
- Large quotient files are transferred to a persistent worker. JSON parsing is
  isolated from the UI thread, and graph/action/cell validation yields in
  bounded chunks with progress and cancellation. A new import supersedes stale
  work instead of allowing two giant parsed quotients to remain resident.
- High-frequency render statistics and quotient-import progress use external
  stores with selector subscriptions. They no longer force the full `App`
  workflow tree to render for every frame sample or validation chunk.
- A pending `Y_Gamma` lens or cutaway build retains the last scene for the same
  cell atlas. Applied and requested scene versions are tracked separately, so
  an option change no longer flashes a Cayley scene or publishes an old scene
  under a new revision key.
- Concurrent requests for the same `Y_Gamma` scene share one worker/cache
  promise. Likely coherent and expanded comparison variants are warmed during
  idle time after the primary view settles.
- The coherent/expanded comparison now uses one renderer, camera, picking
  index, resize observer, and statistics stream. Its two translated copies
  preserve source cell ids and incidence; the translation is drawing-only.
- Resize work is coalesced and dimension-aware. Desktop fallback measurements
  remain for WebView layout quirks, but unchanged dimensions no longer cause
  extra renders.
- Timed interactions record dispatch, first visual feedback, scene-version
  readiness, and semantic-settle phases. A segmented long-task observer makes
  it possible to distinguish event latency from worker or renderer work.

## Current architecture

The renderer is demand-driven: scene changes, picking, camera controls,
screenshots, and short damping windows request frames; an idle scene has no
permanent animation loop. Nodes and arrowheads are instanced. Edges and cell
fills/outlines are batched. Sparse text uses pooled sprites; dense text uses a
shared SDF atlas and batched geometry. Geometries, labels, picking records, and
hot math objects are reused where measured paths benefit from reuse.

Picking keeps semantics independent of scale. Small scenes use instanced-node
ray tests plus the retained cell BVH. Dense scenes switch to 24-bit GPU ids,
with separate node and cell passes so the established node-before-cell
selection rule is unchanged. The renderer reports the active label and picking
strategy to tests and benchmarks.

Workers own finite-ball, `Y_Gamma`, comparison-scene, and quotient-validation
work. IndexedDB holds reproducible derived results across page loads, but cache
hits remain performance hints: hashes and validators still carry the data
claims.

## Residual ceilings

The former high-scale targets are implemented. What remains is narrower and
should be driven by traces from real research data:

- **Streaming application payloads:** parsing and validation no longer block the
  UI, but standard JSON still produces one parsed object and one final worker
  response. Six-figure or million-object quotients may justify an explicit
  chunked file schema that can validate and render complete neighborhoods before
  the full file arrives.
- **True lazy application chunks:** Vite's current manual chunks improve cache
  reuse but are still module-preloaded. Split research panels behind dynamic
  imports only when startup traces show JavaScript evaluation, rather than
  Three.js, dominating first interaction.
- **MSDF typography:** the dense path uses a single-channel SDF. It is efficient
  for the app's short generator/state labels; multi-channel distance fields may
  improve sharp corners at very small sizes, but add atlas-generation and shader
  complexity. The sprite path remains the quality fallback for sparse labels.
- **Application-level state stores:** render stats and import progress are
  isolated, while `App.tsx` intentionally remains the workflow coordinator.
  Extract another state slice only after React profiling finds a concrete
  rerender fan-out; splitting state for its own sake makes model transitions
  harder to audit.
- **Native screenshot bytes:** browser capture still passes encoded PNG data
  through the app boundary. A direct binary/native path is useful for very large
  desktop exports, but not for ordinary figures.
- **WebGPU:** the WebGL2 path now batches text and geometry and has adaptive GPU
  picking. A renderer migration is justified only if measured draw/compute work,
  rather than scene derivation or dual-view construction, becomes the dominant
  cost.

Byte estimates are intentionally conservative budgets, not claims about exact
browser heap retention. GPU picking uses 24-bit ids, leaving id `0` for "no
hit"; a single pick pass therefore supports 16,777,215 semantic objects.

WebGPU is not a standing goal. The current bottlenecks are scene derivation,
labels, and dual-view construction; changing graphics APIs would not remove
those costs. Any future renderer migration must beat the same semantic and
visual-preservation gates before replacing the WebGL2 path.

## Running the checks

```bash
corepack pnpm build
corepack pnpm bench:timed:check
corepack pnpm bench:timed:machine:check
```

Use `bench:timed:write` only after inspecting the current report. Updating a
snapshot is not a fix for a regression.
