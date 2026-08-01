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
6. Read **Relation-order connected components**. For `m = 3`, the compact
   5-cube splits into the components `{g0, ..., g7}` and `{g8, g9}`. Click a
   generator chip to inspect its incident relation classes above.

What to say:

- `Gamma` is the defining Coxeter graph, not `Y_Gamma`.
- This app includes `m = 2` commuting edges that a conventional Coxeter diagram
  would omit.
- It omits `m = inf` pairs because they are non-relations, not hidden finite
  cells.
- The planar view is a drawing aid. If the graph is not planar, the app names a
  standard obstruction such as `K5` or `K3,3` when it detects one.
- Edge labels belong to relation edges; they are not vertex labels.
- The `Gamma_m` component rows use only edges with that one value of `m`;
  isolated generators are shown separately as singleton components.

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
Coxeter group whose defining graph is the 1-skeleton of a 3-cube. The key is
to keep the paper's commutator cover separate from the app's compact cover
reader.

1. Press **Start Here** -> **Study a quotient/game**, or open Research mode
   and press **Load JNW cube game**.
2. Confirm that the source is **JNW cube graph RACG**. In **Gamma**, the eight
   vertices are the binary cube vertices and the twelve drawn `m = 2` edges are
   the cube edges.
3. Open **JNW Legal-System Game**. The preset uses the cube's two color-class
   moves and JNW21's displayed legal state
   `{v000, v010, v110, v111}`.
4. Keep the cover hierarchy in view:

   ```text
   Davis complex Sigma -> commutator cover X_ab
                       -> four-state move-kernel cover X_mu
                       -> Y_Gamma
   ```

   `X_ab` is the finite complex used in the paper. It has `2^8 = 256` vertices.
   The app's compact reader shows `X_mu = ker(mu o alpha) \ Sigma`, a further
   quotient with four state vertices. It does not claim that `X_ab` has only
   four vertices.

5. Press **Show four-state cover**. You should see four state vertices
   `S_1`, ..., `S_4`, sixteen geometric generator rails, and twelve commuting
   relation squares. A rail labeled `g` joins `S` to `S xor m_g`. Parallel
   rails with different generator labels are different cover edges.
6. Under **Drawing options**, compare **Exact cover 1-skeleton** with
   **Four-chart cover drawing**. The first is the exact state/rail graph. The
   second adds one shared midpoint to each rail and one shared center to each
   square, dividing every square into four colored sectors. Follow one color
   through the object to see one lift of the `Y_Gamma` fundamental domain; the
   shared midpoint and center show where neighboring lifts are glued.
7. Use **Drawing details** to build the picture in order:
   `States -> Generator rails -> Relation boundaries -> Glass relation sheets -> Orientations`.
   **Outlines only** or **Glass faces** keeps the 1-skeleton readable.
8. Use **Choose state** to inspect `S_1`, ..., `S_4`. The panel expands the
   short name into its defining-graph subset. **Mirror selected state on
   Gamma** switches to the main defining-graph viewer and colors exactly those
   cube vertices in the selected state.
9. Use **Highlight g-edge gluing** to isolate one generator rail. The reader
   shows its source, target, and move equation `S -> S xor m_g`.
10. Use **Choose relation**, **Next relation**, and **Focus selected relation**
    to read one lifted square. The bold numbered boundary alternates the two
    generator labels; unrelated cover cells become faint context.
11. Use **Show every generator rail** for the exact 1-skeleton. **Bundle equal
    moves** is only an explanatory drawing for generators with the same move;
    its banner says that rails have been bundled.
12. Press **Ascending link at selected state**. For selected state `S`, the
    viewer now draws the induced flag subcomplex `Flag(Gamma)[S]`. Press
    **Descending link at selected state** for
    `Flag(Gamma)[V - S]`. These are simplicial links of generator directions,
    not just lists of incoming and outgoing cover rails. **Level link at
    selected state** is empty for the faithful JNW diagonal map; level
    directions belong to the generalized cochain editor.
13. Use **Compare source chart with state link** to place the base
    `Y_Gamma` model beside the selected link. Save an experiment run when you
    want the state, moves, diagnostics, and view settings recorded together.

What is exact in this reader:

- the cube defining graph and its finite-relation edges;
- the state orbit and move-dependent rail endpoints;
- the four-state move-kernel cover incidence and its projection to `Y_Gamma`;
- the twelve square attaching cycles;
- the induced ascending and descending flag subcomplexes.

What is a drawing convention:

- the 3D coordinates, chart colors, glass fills, and camera angle;
- the distance used to spread sectors apart;
- the shared midpoint/center subdivision used to reveal the four lifts;
- move-class bundling and ghosted context.

The **JNW faithful** badge means the right-angled move property and legal-orbit
checks pass for the supplied data. It is not an external fibering, subgroup, or
manifold certificate.
