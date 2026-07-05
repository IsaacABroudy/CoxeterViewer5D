# Walkthroughs

These are presenter scripts for the research-preview guided demos. They are
meant to teach inspection habits: name the Coxeter object, show the exact
incidence data, then say which parts of the 3D picture are only a drawing.

The demos are not proofs. Treat the warnings panel, selected-object inspector,
and sidecar/export metadata as part of the mathematical readout.

## Before You Start

Use the named example before starting each guide. Some guided buttons preserve
the current dataset, so a clean research-preview run should load the example first
and then press the guide button.

Suggested order:

1. `A2`: find a hexagon for one `m = 3` rank-two relation.
2. `A3`: inspect one rank-three spherical cell.
3. `compact_5_prism_makarov_p2`: inspect `Y_Gamma` for the certified P2 prism.
4. `compact_5_cube_gamma1`: read the finite-relation defining graph `Gamma`.
5. `I2(5)` quotient/game workflow: inspect a generator-uniform cochain on a
   quotient/coset artifact.
6. `jnw_cube_graph`: play the JNW state/move game on the 3-cube defining
   graph.

Keep labels focused, not global. A radius that is too small may clip a cell
boundary; a radius that is too large can make labels and cells visually noisy.
Filled cells should mean the whole boundary is present.

## Reference Captures

These stills are checked into `docs/screenshots/` so a reader can see the
intended research-preview tour without running the app first. They are teaching
captures, not certificates; pair them with the inspector, warnings, and exported
sidecar when the exact data matters.

| Demo                | Capture                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Find a hexagon      | ![Rank-two Davis hexagon for generators s0 and s1 in A2.](screenshots/hexagon-a2-rank-two-m3.png)                                     |
| A3 rank-three cell  | ![A3 rank-three Y_Gamma focus showing square and hexagon face families in one 3D view.](screenshots/a3-rank-three-square-hexagon.png) |
| P2 Y_Gamma          | ![P2 Y_Gamma relation view for an m=5 face attached to the generator spine.](screenshots/y-gamma-p2-m5-relation.png)                  |
| I2(5) quotient/game | ![I2(5) quotient/game workflow with cocycle and decagon diagnostic.](screenshots/i2-5-quotient-game-cocycle.png)                      |
| JNW cube game       | Open **Study a quotient/game** for the source graph, bipartition moves, legal orbit, and ascending/descending-link diagnostics.       |

## Hexagon Relation: Find A Hexagon

Goal: read `(s_i s_j)^3 = 1` as one six-sided rank-two Davis cell.

Public-alpha path:

1. Load `A2`.
2. Set radius to `3` or higher. In `A2`, the full finite group appears quickly.
3. Press **Start Here** -> **Find a relation cell**.
4. In the rank-two/Davis controls, focus the pair `s0-s1` with `m = 3`.
5. Select a filled rank-two cell and use relation-walk labels if they are
   helpful.

What to say:

- A finite Coxeter pair with `m = 3` gives a `2m = 6` boundary.
- The boundary labels alternate between the two generators.
- The same cyclic cell can be read from any boundary vertex.
- If the cell is outlined but not filled, the radius has probably clipped the
  boundary.

Exact in this demo:

- The generator pair `s0-s1`.
- The Coxeter value `m = 3`.
- The six boundary node ids and alternating edge labels.
- The statement that this is one Davis cell for a coset of `<s0, s1>`.

Drawing convention:

- The Euclidean-looking hexagon.
- Camera angle, panel opacity, label placement, and ghost context.
- Any apparent metric angle or length in the scene.

If the guide opens on `I2(5)`, load `A2` first and start the guide again.
`I2(5)` is the decagon example, not the hexagon example.

## Rank-Three Cell: Inspect A3

Goal: see how rank-two faces assemble around one finite rank-three spherical
subset.

Public-alpha path:

1. Load `A3`.
2. Press **Start Here** -> **Understand Y_Gamma**, or use
   **Research Workflow** -> **Read one rank-three cell** in Research mode.
3. Confirm the main scene is `Y_Gamma(A3)`.
4. Use the `Y_Gamma` rank-three reader preset.
5. Orbit until a square face family and a hexagon face family are visible
   together.

What to say:

- `A3` has one spherical triple `{s0, s1, s2}`.
- The boundary of the rank-three cell is organized by rank-two spherical
  faces.
- In the bundled `A3` view, a commuting square face and an `m = 3` hexagon
  face can be inspected as incident pieces of one 3D object.
- The local-link or nerve schematic is useful for checking the subset list, but
  the main teaching view should remain three-dimensional.

Exact in this demo:

- Which three generators form the spherical subset.
- Which rank-two faces are in its boundary.
- The incidence records between the higher cell and those faces.

Drawing convention:

- The 3D proxy hull or separated panels used to make the incidence readable.
- The apparent Euclidean shape of the cell.
- Any small face offset introduced to prevent visual overlap.

The question to answer out loud is not "is this a literal Euclidean polytope?"
It is "which spherical subset and which face incidences am I seeing?"

## The Base Complex `Y_Gamma`: Inspect P2

Goal: inspect the one-vertex fundamental-domain complex for the certified
Makarov P2 compact 5-prism example.

Public-alpha path:

1. Load **Compact 5-prism P2 Makarov** (`compact_5_prism_makarov_p2`).
2. Check that the example status is certified for source transcription and
   Gram/signature diagnostics.
3. Click **Y_Gamma** in the top view switch.
4. Press **Start Here** -> **Understand Y_Gamma**.
5. In the `Y_Gamma Reader`, begin with **Read one relation** or **Show cells
   around one generator**. Use **Show all relation faces** only after the local
   pieces are clear.
6. Use **Focus relation star** when a relation is still hard to isolate. It
   keeps the selected relation family, incident rank-three pieces, and faint
   context without changing the complex.
7. Use **Show only...** to filter by generator family, relation order, rank-three
   faces, selected edge, or selected relation. Treat it like a microscope, not
   a new dataset.
8. Turn on **Compare shared vs separated drawing** when teaching the difference between the
   coherent shared-spine drawing and the expanded readability drawing. Both
   panes use the same cell ids and incidence.
9. Point out that edge labels name generator arrows and relation-boundary
   segments. Leader ticks show which edge a label belongs to; relation-walk
   numbering stays in the inspector.
10. Point out that finite pairs contribute relation faces; the dotted/infinite
    pair does not contribute a finite rank-two Davis face.

What to say:

- `Y_Gamma` has one base vertex.
- Each Coxeter generator is shown as an oriented arrow from that vertex.
- Each finite Coxeter pair contributes a rank-two relation sheet attached along
  an alternating word.
- P2 is a 5-dimensional hyperbolic Coxeter source, but this `Y_Gamma` scene is
  a 3D readability layout for incidence.
- Hidden construction corners complete visible `2m`-gons; they are not extra
  quotient vertices.

Exact in this demo:

- The P2 Coxeter matrix and generator labels.
- Which finite pairs attach relation faces.
- The one-vertex 1-skeleton and the relation attaching words.
- The source/certificate metadata shown for the bundled example.

Drawing convention:

- The placement of generator arrows around the base vertex.
- The singular 3D sheets used to show relation faces.
- Any face peeling, spacing, or camera preset used to keep the dense P2
  two-skeleton legible.
- **Show only...** filters, relation-star extraction, label leader lanes, and
  side-by-side coherent/expanded comparison.

Do not call `Y_Gamma` a torsion-free quotient manifold. It is the base
orbicomplex or fundamental-domain style complex associated to the Coxeter
system being inspected.

## Defining Graph `Gamma`: Read Compact 5-Cube

Goal: read the finite-relation defining graph for the compact 5-cube without
hiding commuting `m = 2` pairs.

Public-alpha path:

1. Load **Compact 5-cube gamma1** (`compact_5_cube_gamma1`).
2. Click **Gamma** in the top view switch.
3. Start with **3D viewer** when you want to orbit the labelled defining graph.
4. Switch to **2D planar** when you want the planar-obstruction diagnostic.
5. Confirm every drawn finite relation edge has a label, including `m = 2`
   commuting pairs. Infinite `m = inf` pairs are intentionally absent.

What to say:

- `Gamma` is the defining Coxeter graph, not `Y_Gamma`.
- This app includes `m = 2` commuting edges that a conventional Coxeter diagram
  would omit.
- It omits `m = inf` pairs because they are non-relations, not hidden finite
  cells.
- The planar view is a drawing aid. If the graph is not planar, the app names a
  standard obstruction such as `K5` or `K3,3` when it detects one.
- Edge labels belong to relation edges; they are not vertex labels.

Exact in this demo:

- Generator vertices.
- Coxeter matrix values on every drawn finite relation edge.
- The detected non-planarity obstruction when present.

Drawing convention:

- The 3D layout.
- Any 2D crossing-minimization placement.
- Label nudging used to avoid crossings and edge-label collisions.

## Quotient And Game Demo: Run I2(5)

Goal: follow a small quotient experiment from group data to a cochain.

Public-alpha path:

1. Open the **Research Workflow** panel.
2. Choose the `I2(5)` identity-subgroup demo.
3. Confirm that the quotient has ten visible cosets and one rank-two decagon
   cell.
4. Open **Generator-Uniform Cochain** and select the named cochain with
   `s0 = +1` and `s1 = -1`.
5. Inspect the boundary-sum diagnostic for the decagon.
6. Switch between ascending, descending, level, and full local-link lenses.
7. Save an experiment notebook run if a reproducible inspection record is
   needed.

What to say:

- The identity subgroup of the finite group `I2(5)` leaves all ten group
  elements visible as quotient vertices.
- Generator actions should be involutions on quotient vertices.
- The finite relation should close around the decagon.
- The named generator-uniform cochain has zero boundary sum on that decagon.
- Ascending and descending views are filters for the active assignment or
  state-dependent direction model.

Exact when supplied by the artifact:

- Quotient vertices and generator actions.
- Edge inverse pairing.
- Rank-two cell boundary references.
- Schreier-style relation checks recorded in the certificate block.

Still not claimed:

- A quotient complex is not automatically a manifold.
- The in-repo visible stabilizer guard is useful evidence, not a published
  torsion-free proof.
- A generator-uniform label assignment should not be called a cocycle until its
  boundary checks pass on the displayed cell structure.
  Use "quotient complex" until a torsion-free certificate is present and its
  scope is clear.

## JNW Legal-System Demo: Play The Cube Graph

Goal: inspect the Jankiewicz-Norin-Wise state/move game on the right-angled
Coxeter group whose defining graph is the 1-skeleton of a 3-cube.

Public-alpha path:

Read this view as: a finite state quotient whose local stars carry the
generator and relation data from `Y_Gamma`.

1. Press **Start Here** -> **Study a quotient/game**, or open Research mode
   and press **Load JNW cube game** in the Research Workflow panel.
2. Confirm the active source is **JNW cube graph RACG**.
3. Open **Gamma** if you want to see the defining graph first: the eight
   generator vertices are binary cube vertices, and `m = 2` edges are exactly
   cube edges.
4. Return to **Quotient + Games** and open **JNW Legal-System Game**.
5. Confirm the preset is the JNW21 bipartition/color-class move system and the
   initial state is `{v000, v001, v010, v101}`.
6. Press **Show JNW state quotient** if it is not already open. The main viewer
   should show the derived state quotient. Its vertices are the four states
   `S_1`, ..., `S_4`. A generator edge labeled `g` runs from a state `S_i` to
   the state obtained by applying the move `m_g`. The small generator beads
   around each state are drawing handles for the four local `Y_Gamma` charts,
   not new quotient vertices. The charts are opened in tilted local frames so
   the glued object is easier to inspect than the collapsed state graph. For
   the cube preset, this state quotient has four state vertices, sixteen
   generator-labeled rails, and twelve square relation cells.
7. Use the six-step JNW workflow rail and the four compact reader groups:
   **Choose state**, **Read one relation**, **Inspect link**, and
   **Drawing options**. The advanced move tables and raw diagnostics are in
   **Advanced JNW diagnostics**.
8. In **Drawing options**, switch between **Exact state skeleton** and
   **Readable quotient drawing**. Exact state skeleton shows only state
   vertices and exact generator transition rails. Readable quotient drawing
   adds drawing handles and relation sheets.
9. Open **Drawing details** when teaching the
   assembly order:
   `States -> Generator rails -> Relation boundaries -> Glass relation sheets -> Orientations`.
10. Use **Choose relation** to pick the exact rank-two diagnostic to read, or
    click **Next relation** to advance through the closed diagnostics. Press
    **Focus selected relation** to return the viewer to that relation. The
    chosen relation boundary is numbered in the panel and bold in the viewer;
    unrelated topology becomes context so the alternating generator walk can be
    read directly.
11. Use **Highlight g-edge gluing** to highlight the two state charts glued by
    generator `g`. The panel spells out the move as `S -> S xor m_g`.
12. Use **Choose state** to switch from `S_1` to another orbit state. Press
    **Mirror selected state on Gamma** when you want that state drawn directly on
    the main `Gamma` viewer. Colored generator vertices use the same state
    color as the selected chart in the quotient; muted gray vertices are
    outside the state.
13. Use **Bundle equal moves** only as an explanatory bundled drawing. Expand
    back to **Show every generator rail** when you need the full generator
    1-skeleton.
14. Read the breadcrumb:
    `Coxeter system Gamma -> Y_Gamma fundamental domain -> JNW state quotient -> link at state S_k`.
    This tells you the link is being inspected at a
    selected state vertex in the derived quotient, not as an ambient Davis
    chamber link. The panel expands that short state name as a subset, for
    example `S_k = {v000, v001, v010, v101}`.
15. Switch between **Ascending link at selected state**, **Descending link at
    selected state**, **Level link at selected state**, and **Full local link at
    selected state**.

- Ascending shows the incident generator arrows classified as upward from
  the selected state.
- Descending shows the incident generator arrows classified as downward.
- Level shows arrows with zero/currently level classification.
- Full local link restores all incident generator arrows at that state.

16. Use **Compare source chart with state link** when you want the
    fundamental-domain source object and the selected state-link diagnostic side
    by side.
17. Save an experiment notebook run when you want a reproducible record of the
    selected state, moves, diagnostics, and view.

What to say:

- A JNW state is a subset of defining-graph vertices.
- The JNW state quotient is drawn as one quotient complex. Its visible
  quotient vertices are the states `S_i`. Generator labels belong to rails
  between state charts, and relation diagnostics are read on alternating state
  cycles drawn on separated rails. A local `Y_Gamma` chart at `S_i` means the
  incident generator star and relation faces around that state inside this one
  glued object; the generator beads are drawing handles that keep those charts
  readable.
- The cube graph is bipartite; the color-class moves toggle one whole color
  class at a time.
- Applying a generator changes the state by symmetric difference with its
  move.
- The direction of an edge depends on the endpoint state, not on one global
  orientation for every occurrence of the generator.
- Because this is a right-angled system and the legal-orbit diagnostics pass,
  the app labels the demo **JNW faithful**. That label is scoped to the
  browser-checked move property and legal orbit, not to an external subgroup
  certificate.

Exact in this demo:

- The defining graph is the 3-cube 1-skeleton.
- `m = 2` exactly for cube-adjacent binary vertices.
- The bipartition color-class moves satisfy the JNW move property.
- The displayed state orbit is legal and strongly legal in the app's finite
  diagnostic.

Drawing convention:

- The 3D placement of the state quotient.
- The small generator beads and separated chart rails used to prevent the four
  local charts from collapsing visually.
- The camera angle and link-lens highlighting.
- The line thickness and colors used to distinguish ascending, descending, and
  level edges.
