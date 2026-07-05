# Known Limits

CoxeterViewer5D is a research-preview viewer. It is useful because it is
explicit about what it can and cannot claim.

## Dense Complexes

Dense `Y_Gamma` and compact-example views cannot be perfectly readable as one
static all-relations 3D picture. Many cells genuinely share the same generator
spine. Use focus tools, **Show only...** filters, relation-star extraction, and
side-by-side coherent/expanded drawings to inspect topology one piece at a time.

## Projection Caveats

Geometric mode draws chamber barycenters in 3D. For high-dimensional
hyperbolic examples, the rendered scene is a projection or PCA readability
drawing unless a certificate explicitly says otherwise. Do not read Euclidean
distances, angles, or intersections in the 3D projection as exact hyperbolic
facts.

## Non-Planar Gamma

The defining graph `Gamma` can be non-planar. The 2D planar view is a drawing
and may show crossings when the graph contains a detected obstruction such as
`K5` or `K3,3`. Gamma draws generator vertices and finite rank-two relation
edges, including `m = 2`; `m = inf` pairs are omitted because they are not
finite relation edges.

## External Tool Constraints

Sage, GAP/KBMAG, CoxIter, and related tools are optional external checkers. The
browser and desktop viewer run without them, but regenerating or independently
checking some research artifacts requires those tools to be installed. Missing
tools should produce skipped or blocked artifacts, not weaker mathematical
claims.

## Quotient And Game Claims

The quotient/game workflow is an inspection tool. A quotient complex is not a
manifold unless torsion-free verification metadata is present. The JNW
Legal-System Game is theorem-level JNW data only for right-angled systems with
passing move and legal-orbit checks; non-right-angled uses are explicitly
experimental diagnostics.
