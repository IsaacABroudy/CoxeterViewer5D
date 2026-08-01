# JNW Covers And The Move-Kernel Reader

This note fixes the convention used by the JNW cube workflow. It distinguishes
the base fundamental domain, the finite covers built from it, and the state
labels used to orient edges.

## The Four Spaces

Let `W = W_Gamma` be the right-angled Coxeter group and let `Sigma_Gamma` be
its Davis complex. In this project, `Y_Gamma` denotes the base
fundamental-domain orbicomplex. Two finite covers appear in this discussion:

```text
Sigma_Gamma  ->  X_ab  ->  X_mu  ->  Y_Gamma,
```

where

```text
Y_Gamma = W \ Sigma_Gamma,
X_ab = W' \ Sigma_Gamma,
X_mu = H_mu \ Sigma_Gamma.
```

Thus `Y_Gamma` is not a state orbit. A finite cover `X_mu` is assembled from
lifted copies of this same fundamental domain, one for each coset of `H_mu` in
`W`. The intermediate arrow `X_ab -> X_mu` records the inclusion
`W' <= H_mu`; it is not a claim that the two finite covers are the same.

For a JNW move system, write

```text
alpha: W -> A = (Z/2)^V
mu: A -> M,              e_v |-> m_v
H_mu = ker(mu o alpha).
```

The deck group of `X_mu -> Y_Gamma` is the move group `M`. In the cube example
`M` has four elements, so `X_mu` contains four lifted `Y_Gamma` fundamental
domains. Their labels `S_1`, ..., `S_4` record the four states in one legal
orbit.

## Relation To The Cover In JNW

Jankiewicz, Norin, and Wise use the commutator cover

```text
X_ab = W' \ Sigma_Gamma,
W' = ker(alpha).
```

For the cube graph, `|V| = 8`, so `X_ab` has `2^8 = 256` vertices. The four
legal states are orientation patterns on those vertices; each pattern occurs
many times.

The four-state space used by the reader is the smaller, derived move-kernel
cover `X_mu`. For the cube move system it has:

- 4 state vertices;
- 16 generator-labeled edges, including distinct parallel edges;
- 12 square relation cells, one for each commuting pair in `Gamma`.

It should therefore be called the **four-state move-kernel cover**, not the JNW
commutator cover. The move and legality checks come from JNW; the passage to
`H_mu` is the additional quotient used by this project.

## Four Lifted Fundamental Domains

The intended reader shows one connected quotient built from four lifted copies
of `Y_Gamma`, not four detached models. For a state `S` and generator `v`, the
lifted generator edge joins

```text
S  ->  S xor m_v.
```

Every such rail is a genuine edge of `X_mu` and keeps its generator label, even
when several generators have the same move and therefore share endpoints.

For the right-angled cube example, the readable subdivision should use shared
objects rather than endpoint-local drawing handles:

- each lifted generator rail has one midpoint shared by its two neighboring
  `Y_Gamma` charts;
- each commuting-relation square has one center shared by its four chart
  sectors;
- the rail midpoints and relation center divide that square into four pieces,
  one belonging to each incident lifted fundamental domain.

The four chart colors expose the four lifts of the base fundamental domain.
They are not four detached subcomplexes: neighboring lifts meet at shared rail
midpoints and relation centers in this subdivision. Those points are precisely
where the copies are glued, not four independent copies of the same data.
Separation, glass sheets, and small visual offsets remain drawing conventions
and must not change the quotient incidence.

## States And Links

A state `S` is a subset of the vertices of `Gamma`. A move `m_v` contains `v`
and no neighbor of `v`; applying it changes the state by symmetric difference.
The `v`-edge is directed according to whether `v` lies in the state at its
initial endpoint.

Let `L = Flag(Gamma)` be the link of a vertex in the Davis complex and its
covers. At a quotient vertex carrying state `S`, the actual JNW links are the
full induced subcomplexes

```text
ascending link  = L[S],
descending link = L[V - S].
```

They are complexes of generator directions, not merely the outgoing and
incoming edges in the quotient graph. For the cube graph, `Gamma` is
triangle-free, so these links happen to be graphs. The original JNW diagonal
map has no level directions; a level link belongs only to a generalized
cochain workflow.

Highlighting `S` inside the defining graph is a linked explanatory view. The
ascending or descending link itself is based at the selected vertex of
`X_mu` (or at a chosen lift in `Sigma_Gamma`).

## Drawing Policy

The exact data consists of the covering map, state vertices, labeled generator
edges, relation cells, and their attaching maps. State colors, chart spreading,
glass fills, and camera placement are drawing aids. The reader should identify
which layer is exact and should never replace a shared quotient object with
unrecorded duplicate geometry.
