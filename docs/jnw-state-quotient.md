# JNW State Quotient

This note fixes the convention used by the JNW cube workflow in the viewer.
It is deliberately narrow: it explains the browser diagnostic built from a
state/move system, not a certified subgroup quotient.

## Source Model

For a right-angled Coxeter group with defining graph `Gamma`, Jankiewicz,
Norin, and Wise use states and moves:

- A **state** is a subset of the vertices of `Gamma`.
- A **move** `m_v` is a subset of vertices containing `v` and no neighbor of
  `v`.
- Applying generator `v` sends a state `S` to the symmetric difference
  `S xor m_v`.
- A directed edge labeled `v` is oriented according to whether `v` lies in the
  endpoint state.

The app uses this finite state orbit as an exploratory quotient-style complex.
The JNW theorem-level language is shown only for right-angled systems whose
move-property and legal-orbit checks pass.

## What The Viewer Draws

For a move system and initial state, the JNW state quotient has:

- one vertex for each orbit state `S_i`;
- one generator-labeled edge `S -> S xor m_v` for each state and generator;
- one square relation cell for each commuting pair, with boundary
  `S, S xor m_v, S xor m_v xor m_w, S xor m_w`.

For the bundled 3-cube graph preset this gives:

- 4 state vertices;
- 16 generator-labeled edges;
- 12 square relation cells.

The exact quotient vertices are the state vertices. The 3D reader also draws
small generator beads around each state. These beads are drawing handles: they
separate the generator rails so the four local `Y_Gamma` charts can be read
without adding new quotient vertices or changing the move data. The charts are
opened in different tilted local frames, so the picture is intentionally more
expansive than the state-only quotient graph.

The reader has two modes:

- **Exact state skeleton** shows only state vertices and exact generator
  transition rails. This is the truth-checking view.
- **Readable quotient drawing** adds drawing handles, separated rails, relation
  boundaries, and glass relation sheets. This is the teaching/inspection view.

The generator rails are primary in both modes. Each exact rail carries one
generator label. Relation sheets are secondary and should be read through their
boundary rails.

When the interface says that `Y_Gamma` is a local chart at a state, it means
the visible generator star and relation faces incident to that state inside
this one glued quotient. It does not mean a detached copy of the quotient.
For the cube example this distinction matters: all generators in one
bipartition share one move and all generators in the other bipartition share
the other move, so a state-only drawing collapses many rails and square faces
onto the same cycle.

## Layer Stack

The workflow should be read in this order:

1. `Gamma`: the source defining graph.
2. `Y_Gamma`: the one-vertex fundamental-domain model for the source Coxeter
   presentation.
3. JNW state quotient: the finite orbit of states under the move system.
4. Link at selected state: ascending, descending, or level directions in that
   state quotient.

The Davis complex remains the universal source object in the background, but
the JNW ascending/descending link diagnostics shown in this workflow are not
ambient Davis-complex links.

## Drawing Policy

The 3D placement is a drawing convention. The exact browser diagnostic is the
state orbit, the move-labeled edges, and the rank-two square boundaries. Any
chart-handle drawing keeps those handles separate from the quotient vertex set
and labels them as drawing-only.
