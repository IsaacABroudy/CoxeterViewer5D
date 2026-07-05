# UI Controls

This page is a plain-language map of the main controls. It is for users who
want to know what a button changes before clicking it.

## Teaching Mode

Teaching mode keeps the first screen small. The goal is:

1. choose an example;
2. choose a model;
3. choose a focus;
4. read the Focus Inspector.

Visible surfaces:

- **Choose Example**: pick a bundled example or generated fixture.
- **View**: switch among Davis complex, `Y_Gamma`, Gamma, Projection drawing,
  and Quotient + Games.
- **Start Here**: choose a guided entry point such as finding a relation cell
  or studying a quotient/game.
- **Focus**: narrow the scene to the object you want to understand.
- **Labels**: show or hide group-element labels and generator edge labels.
- **Caveats**: see warnings without opening every research diagnostic.
- **Focus Inspector**: read what is selected, why it exists, and whether the
  view is exact data or a drawing.

## Model Switch

- **Davis complex**: finite Cayley ball plus Davis cells.
- **Y_Gamma**: one fundamental-domain model with a base vertex, generator
  arrows, and relation faces.
- **Defining graph Gamma**: generator vertices and finite relation edges. This
  app includes `m = 2` edges and omits `m = inf` pairs.
- **Projection drawing**: chamber barycenters drawn in 3D from reflection data.
- **Quotient + Games**: quotient complexes, generator-uniform cochains, and JNW
  state/move diagnostics.

Switching models changes the object being drawn. It does not rewrite the source
Coxeter data.

## Focus Controls

Focus controls change what is easy to see. They do not change the underlying
cell complex.

- **See all**: restore the broad view for the active model.
- **Look near a chamber**: show a chamber-centered local Davis view.
- **Read one relation**: isolate one finite rank-two relation polygon.
- **Read one rank-three cell**: show the rank-two faces around one spherical
  triple when available.
- **Show cells around one generator**: show relation faces incident to a chosen
  generator.
- **Open local link**: inspect the link at the selected chamber or quotient
  vertex.
- **Show all relation faces**: show the full visible `Y_Gamma` two-skeleton.
  Dense examples may need **Show only...** filters afterward.

## Y_Gamma Reader

Use the `Y_Gamma Reader` when the full fundamental-domain picture is too dense.

- **Show only...** filters relation faces by generator family, relation order,
  rank, selected edge, or selected relation.
- **Separate cells for reading** changes only drawing coordinates. `0` keeps
  the shared spine tight; higher values separate faces so they can be read.
- **Relation atlas** is the Coxeter-pair grid. Click a finite pair to focus its
  relation family.
- **Compare shared vs separated drawing** shows the same incidence data in two
  synchronized drawings.
- **Click behavior** chooses whether clicks inspect cells, inspect edges, select
  a relation family, or orbit around the selected object.

## Defining Graph Gamma

Gamma is the Coxeter defining graph, not the Davis complex and not `Y_Gamma`.

- **3D viewer** is useful for orbiting dense graphs.
- **2D planar** tries to draw Gamma in the plane and explains detected
  obstructions such as `K5` or `K3,3`.
- Every drawn edge is a finite relation edge and should carry one `m` label.
- `m = inf` pairs are omitted because they are not finite relations.

## Quotient + Games

This area has two separate game models.

- **Generator-Uniform Cochain** assigns one integer to each generator and
  checks boundary sums around relation cells.
- **JNW Legal-System Game** uses states and moves. Edge directions depend on
  the selected state, not one global generator sign.

For the JNW cube workflow, read the stack as:

```text
Gamma -> Y_Gamma -> JNW state quotient -> link at selected state
```

Ascending, descending, and level links are diagnostics at the selected state in
the JNW state quotient.

## Research Mode

Research mode keeps expert tools available but groups them by job:

- **Workflow**: guided inspection and quotient/game workflow.
- **Data/files**: examples, imports, sessions, workspaces, generation, and
  quotient builder.
- **Notebook/export**: experiment runs, screenshots, figure bundles, and view
  bookmarks.
- **Status/tools**: certificates, backend/tool status, diagnostics, and full
  caveats.

Use Research mode when you need provenance, exports, external-tool status, or
repeatable experiment records.
