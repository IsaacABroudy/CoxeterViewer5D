#!/usr/bin/env python3
"""
legal_system_game.py

A verifier for the combinatorial "systems of moves and legal states" game
from:

    K. Jankiewicz, S. Norin, D. T. Wise,
    "Virtually fibering right-angled Coxeter groups",
    J. Inst. Math. Jussieu 20(3) (2021), 957-987.  (Section 2)

--------------------------------------------------------------------------
Definitions used (Section 2 of the paper)
--------------------------------------------------------------------------
Let Gamma = (V, E) be a simplicial graph.

  * A STATE is a subset S of V. It is LEGAL if the subgraphs induced by S
    and by the complement V - S are both NONEMPTY and CONNECTED.

  * A MOVE at a vertex v is a subset m_v of V such that
        (1) v in m_v,
        (2) no neighbor of v (w.r.t. E) lies in m_v.

  * A SYSTEM OF MOVES chooses one move m_v for every vertex v (moves need
    not be distinct).

  * Subsets of V are identified with Z_2^V via symmetric difference (the
    "XOR" of vertex sets). The moves generate a subgroup M <= Z_2^V.

  * The system is LEGAL if there is an M-orbit of some state all of whose
    elements are legal states. Such an orbit is called a legal orbit.

This script:
  1. Takes a graph Gamma,
  2. Takes an initial state S0,
  3. Takes a system of moves {m_v : v in V} supplied by the user (the
     caller is responsible for ensuring these satisfy the two defining
     properties of a move -- this script does not check that),
  4. Computes the full M-orbit of S0 (by repeatedly XOR-ing with the moves),
  5. Reports whether every state in that orbit is legal, i.e. whether the
     system of moves (together with S0) constitutes a legal system.

--------------------------------------------------------------------------
Usage
--------------------------------------------------------------------------
Interactively:
    python3 legal_system_game.py

From a JSON description:
    python3 legal_system_game.py --file example.json

Run the built-in worked examples from the paper:
    python3 legal_system_game.py --demo

JSON file format:
{
  "vertices": ["1", "2", "3", "4"],
  "edges": [["1","2"], ["2","3"], ["3","4"], ["4","1"]],
  "state": ["1", "3"],
  "moves": {
    "1": ["1", "3"],
    "2": ["2", "4"],
    "3": ["1", "3"],
    "4": ["2", "4"]
  }
}

("moves" may alternatively be given as "colors": a list of color classes,
i.e. a partition of V into independent sets, in the style of Example 2.1
("colored system") -- each vertex's move is then automatically set to be
the color class containing it.)
"""

import argparse
import json
import sys
from typing import Dict, FrozenSet, Iterable, List, Set, Tuple

Vertex = str
State = FrozenSet[Vertex]


# --------------------------------------------------------------------------
# Graph and legality machinery
# --------------------------------------------------------------------------
class Graph:
    def __init__(self, vertices: Iterable[Vertex], edges: Iterable[Tuple[Vertex, Vertex]]):
        self.V: Set[Vertex] = set(vertices)
        self.adj: Dict[Vertex, Set[Vertex]] = {v: set() for v in self.V}
        for u, v in edges:
            if u not in self.V or v not in self.V:
                raise ValueError(f"Edge ({u}, {v}) references a vertex not in V.")
            if u == v:
                raise ValueError(f"Self-loop at {u} is not allowed in a simplicial graph.")
            self.adj[u].add(v)
            self.adj[v].add(u)

    def neighbors(self, v: Vertex) -> Set[Vertex]:
        return self.adj[v]

    def induced_connected(self, S: Iterable[Vertex]) -> bool:
        """True iff S is nonempty and the induced subgraph Gamma[S] is connected."""
        S = set(S)
        if not S:
            return False
        start = next(iter(S))
        seen = {start}
        stack = [start]
        while stack:
            x = stack.pop()
            for y in self.adj[x]:
                if y in S and y not in seen:
                    seen.add(y)
                    stack.append(y)
        return seen == S

    def is_legal_state(self, S: Iterable[Vertex]) -> bool:
        S = set(S)
        return self.induced_connected(S) and self.induced_connected(self.V - S)

    def is_strongly_legal_state(self, S: Iterable[Vertex]) -> bool:
        """A legal state where in addition every vertex of S has a neighbor
        outside S and vice versa (Section 2, definition of 'strongly legal')."""
        S = set(S)
        if not self.is_legal_state(S):
            return False
        comp = self.V - S
        for v in S:
            if not (self.adj[v] & comp):
                return False
        for v in comp:
            if not (self.adj[v] & S):
                return False
        return True


def sym_diff(a: Iterable[Vertex], b: Iterable[Vertex]) -> State:
    a, b = set(a), set(b)
    return frozenset((a - b) | (b - a))


# --------------------------------------------------------------------------
# Moves
# --------------------------------------------------------------------------
# NOTE: this script does NOT verify that supplied moves satisfy the two
# defining properties from Section 2 (v in m_v; no neighbor of v in m_v).
# The caller is responsible for supplying legitimate moves.


def moves_from_coloring(colors: List[List[Vertex]]) -> Dict[Vertex, FrozenSet[Vertex]]:
    """Build a 'colored system' (Example 2.1): partition V into color classes
    Vi (each an independent set); the move at v is the class Vi containing v."""
    moves: Dict[Vertex, FrozenSet[Vertex]] = {}
    for cls in colors:
        cls_fs = frozenset(cls)
        for v in cls:
            moves[v] = cls_fs
    return moves


# --------------------------------------------------------------------------
# Orbit computation and legality check
# --------------------------------------------------------------------------
def compute_orbit(
    S0: State, moves: Dict[Vertex, FrozenSet[Vertex]]
) -> Dict[State, List[Vertex]]:
    """
    BFS over the subgroup M <= Z_2^V generated by the moves, applied to S0.

    Returns a dict mapping each state S in the orbit to a sequence of move
    labels (vertex keys, in the order applied, starting from S0) that
    reaches S. That is, if path = orbit[S] = [v1, v2, ..., vk], then

        S = S0 XOR m_{v1} XOR m_{v2} XOR ... XOR m_{vk}

    where each move is applied in turn. (The sequence found is a shortest
    one in terms of number of moves applied, but is not necessarily unique.)
    """
    move_items = list(moves.items())  # (vertex_key, move_set) pairs
    orbit: Dict[State, List[Vertex]] = {S0: []}
    frontier = [S0]
    while frontier:
        next_frontier = []
        for S in frontier:
            path = orbit[S]
            for v, m in move_items:
                S2 = sym_diff(S, m)
                if S2 not in orbit:
                    orbit[S2] = path + [v]
                    next_frontier.append(S2)
        frontier = next_frontier
    return orbit


def check_legal_system(
    G: Graph,
    S0: State,
    moves: Dict[Vertex, FrozenSet[Vertex]],
    verbose: bool = True,
) -> Tuple[bool, Dict[State, List[Vertex]]]:
    """
    Returns (is_legal_system, orbit), where orbit maps each state in the
    M-orbit of S0 to the sequence of move labels used to reach it from S0.

    is_legal_system is True iff every state in the M-orbit of S0 is a legal
    state. (Moves are taken as given/trusted -- see note above.)
    """
    # Every vertex needs a move (a "system of moves" assigns one to each v in V).
    missing = G.V - set(moves.keys())
    if missing:
        if verbose:
            print(f"ERROR: no move was specified for vertex/vertices {sorted(missing)}.")
        return False, {}

    if not G.is_legal_state(S0):
        if verbose:
            print(f"Initial state S0 = {sorted(S0)} is not itself a legal state "
                  f"(need S0 and V-S0 both nonempty & connected).")
        return False, {}

    orbit = compute_orbit(S0, moves)
    illegal_states = [S for S in orbit if not G.is_legal_state(S)]

    if verbose:
        print(f"|V| = {len(G.V)}, |E| = {sum(len(a) for a in G.adj.values()) // 2}")
        print(f"Orbit of S0 under the group generated by the moves has size {len(orbit)}.")
        if illegal_states:
            S_bad = illegal_states[0]
            path = orbit[S_bad]
            print(f"NOT a legal system: {len(illegal_states)} of the {len(orbit)} orbit "
                  f"state(s) are illegal. Example illegal state:")
            print("   S =", sorted(S_bad))
            print(f"   reached from S0 = {sorted(S0)} by applying the sequence of "
                  f"{len(path)} move(s) (in order):")
            print("   ", " -> ".join(str(v) for v in path) if path else "(S0 itself)")
            # Also show the intermediate states along this path, for clarity.
            S = S0
            print(f"   S0                                  = {sorted(S)}  "
                  f"(legal: {G.is_legal_state(S)})")
            for v in path:
                S = sym_diff(S, moves[v])
                print(f"   apply move at '{v}'  ->  S = {sorted(S)}  "
                      f"(legal: {G.is_legal_state(S)})")
        else:
            print("LEGAL SYSTEM: every state in the orbit of S0 is legal. "
                  "(This is a legal orbit.)")
    return (len(illegal_states) == 0), orbit


# --------------------------------------------------------------------------
# Built-in demo examples drawn from the paper
# --------------------------------------------------------------------------
def demo_cube():
    """Example 5.a.1: the 1-skeleton of the 3-cube with the bipartition
    system of moves. This is a legal system (kappa(Gamma) = 0)."""
    print("=" * 70)
    print("DEMO: 1-skeleton of the 3-cube (Example 5.a.1)")
    print("=" * 70)
    verts = [format(i, "03b") for i in range(8)]
    edges = []
    for i in range(8):
        for bit in range(3):
            j = i ^ (1 << bit)
            if i < j:
                edges.append((verts[i], verts[j]))
    G = Graph(verts, edges)

    # Bipartition by parity of number of 1-bits (a proper 2-coloring of the cube).
    even = [v for v in verts if v.count("1") % 2 == 0]
    odd = [v for v in verts if v.count("1") % 2 == 1]
    moves = moves_from_coloring([even, odd])

    # NOTE: for the cube, a whole bipartition class induces NO edges at all
    # (it's an independent set), so it is *not* itself a legal state unless
    # it has one vertex. The paper instead exhibits a specific legal state
    # (Figure 2, right / Example 5.a.1's picture) whose orbit under the
    # bipartition moves stays legal. The following state works:
    seed = frozenset(["000", "001", "010", "101"])
    ok = G.is_legal_state(seed)
    print(f"Trying seed state S0 = {sorted(seed)} ; legal? {ok}")
    check_legal_system(G, seed, moves)
    print()


def demo_example_2_2():
    """A small illustrative example in the spirit of Example 2.2 of the
    paper: a 4-vertex graph ("diamond": vertices 1-2-3-4 with every pair
    adjacent except 2,4) together with a system of 3 moves given by the
    partition {1}, {3}, {2,4}. As in the paper's Example 2.2, some seed
    states give a legal orbit while others (e.g. starting from S0 = {1})
    land on an illegal state -- illustrating that legality of the *orbit*
    can depend on the choice of starting state."""
    print("=" * 70)
    print("DEMO: small 4-vertex example (cf. Example 2.2)")
    print("=" * 70)
    verts = ["1", "2", "3", "4"]
    edges = [("1", "2"), ("1", "3"), ("1", "4"), ("2", "3"), ("3", "4")]  # 2,4 not adjacent
    G = Graph(verts, edges)
    moves = moves_from_coloring([["1"], ["3"], ["2", "4"]])

    print("Seed S0 = {2} (this yields a legal orbit -- a legal system):")
    check_legal_system(G, frozenset(["2"]), moves)
    print()

    print("Seed S0 = {1} (this orbit contains an illegal state, e.g. {1,3}):")
    check_legal_system(G, frozenset(["1"]), moves)
    print()


def run_demos():
    demo_example_2_2()
    demo_cube()


# --------------------------------------------------------------------------
# Interactive / file-driven front end
# --------------------------------------------------------------------------
def prompt_list(msg: str) -> List[str]:
    raw = input(msg).strip()
    if not raw:
        return []
    return [x.strip() for x in raw.split(",") if x.strip() != ""]


def build_from_dict(data: dict) -> Tuple[Graph, State, Dict[Vertex, FrozenSet[Vertex]]]:
    vertices = [str(v) for v in data["vertices"]]
    edges = [(str(u), str(v)) for u, v in data["edges"]]
    G = Graph(vertices, edges)

    state = frozenset(str(v) for v in data["state"])

    if "moves" in data:
        moves = {str(v): frozenset(str(x) for x in m) for v, m in data["moves"].items()}
    elif "colors" in data:
        colors = [[str(v) for v in cls] for cls in data["colors"]]
        moves = moves_from_coloring(colors)
    else:
        raise ValueError("Input must specify either 'moves' or 'colors'.")

    return G, state, moves


def run_from_file(path: str):
    with open(path) as f:
        data = json.load(f)
    G, S0, moves = build_from_dict(data)
    check_legal_system(G, S0, moves)


def run_interactive():
    print("=== Legal System Verifier ===")
    print("(See Section 2 of Jankiewicz-Norin-Wise, 'Virtually fibering")
    print(" right-angled Coxeter groups', for the definitions used here.)\n")

    vertices = prompt_list("Vertices (comma-separated, e.g. 1,2,3,4): ")
    if not vertices:
        print("No vertices given, aborting.")
        return

    print("Enter edges one per line as 'u,v'. Blank line to finish.")
    edges = []
    while True:
        line = input("edge> ").strip()
        if not line:
            break
        try:
            u, v = [x.strip() for x in line.split(",")]
        except ValueError:
            print("  Could not parse; use format 'u,v'. Try again.")
            continue
        edges.append((u, v))

    try:
        G = Graph(vertices, edges)
    except ValueError as e:
        print(f"Graph error: {e}")
        return

    state = set(prompt_list("Initial state S0 (comma-separated subset of V): "))
    if not G.is_legal_state(state):
        print(f"Warning: S0 = {sorted(state)} is not itself a legal state "
              f"(S0 and V-S0 must both be nonempty & connected). Continuing anyway "
              f"so you can see how the orbit behaves.")

    print("\nNow specify a system of moves: one move per vertex.")
    print("(Moves are taken as given -- make sure v is in the move at v, and")
    print(" that no neighbor of v is in the move at v, since this is not checked.)")
    moves: Dict[Vertex, FrozenSet[Vertex]] = {}
    use_coloring = input("Enter moves via a coloring/partition instead of one-by-one? [y/N]: ").strip().lower()
    if use_coloring == "y":
        colors = []
        print("Enter each color class as a comma-separated list of vertices. Blank line to finish.")
        while True:
            line = input("color class> ").strip()
            if not line:
                break
            colors.append([x.strip() for x in line.split(",") if x.strip()])
        moves = moves_from_coloring(colors)
    else:
        for v in vertices:
            m = set(prompt_list(f"  move at '{v}' (comma-separated, must include '{v}'): "))
            moves[v] = frozenset(m)

    print()
    check_legal_system(G, frozenset(state), moves)


def main():
    parser = argparse.ArgumentParser(
        description="Verify legal systems of moves for the Jankiewicz-Norin-Wise "
                     "combinatorial game (Section 2)."
    )
    parser.add_argument("--file", help="Path to a JSON file describing the graph, "
                                        "initial state, and moves.")
    parser.add_argument("--demo", action="store_true",
                         help="Run built-in worked examples from the paper.")
    args = parser.parse_args()

    if args.demo:
        run_demos()
    elif args.file:
        run_from_file(args.file)
    else:
        run_interactive()


if __name__ == "__main__":
    main()
