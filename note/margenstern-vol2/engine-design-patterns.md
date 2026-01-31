# Engine Design Patterns from Margenstern

Practical, implementation-oriented insights synthesized from both
volumes.

## 1. Replace Geometry with Combinatorics, Then Reattach Geometry

Margenstern's recurring pattern:

1. Work in the dual graph of the tiling (cells as nodes, shared sides as
   edges)
2. Build a spanning tree from splitting a fundamental region
3. Use small finite structure to recover true adjacency
4. Only after addressing and neighbor algorithms, embed into
   disk/half-plane

**Practical takeaway**: For rendering and CA, do not start from
hyperbolic trig. Start from a combinatorial coordinate system that
supports:

- parent/children
- same-level links
- deterministic neighbor numbering

## 2. Splitting is Your Compilation Step

For general {p,q}, splitting extracts rewriting rules that generate a
tree whose nodes correspond to tiles. Example from 3D: region
decomposition becomes rewrite rules like `3 -> 3,3,3,3,3,1,1,1,0`.

**Practical takeaway**: Treat a tiling specification as a small "grammar
package":

```typescript
interface GrammarPackage {
  nodeTypes: string[] // finite set
  expand: Record<string, string[]> // child types per node type
  sideNumbering: Record<string, number[]> // side conventions per type
  preferredSonIndex?: Record<string, number> // optional
}
```

Runtime coordinate is just a word over child indices.

## 3. Coordinates Are Words You Can Rewrite

The "language of the splitting" is literal. Coordinates are words with:

| Power             | Description                            |
| ----------------- | -------------------------------------- |
| Validity checking | Is this address a legal tile?          |
| Enumeration       | BFS by levels = increasing word length |
| Normal forms      | Canonical spellings for same location  |

**Goal**: Choose a coordinate language with good normal form and local
rewrite rules.

## 4. Preferred-Son Property is a Performance Hack

This property radically simplifies:

- Algorithms from node to root
- Neighbor computations
- Coordinate transforms

Key facts:

- Equivalent to "00-assignment" characterization
- Infinitely many (continuum) generalized Fibonacci trees have this
  property
- Perturbations propagate linearly (don't explode across tree)

**Why it matters in code**:

- Choose among equivalent trees for the same tiling
- Pick the one that makes:
  - Parent path computation linear and branch-light
  - Neighbor computation a small set of rewrite cases
  - Coordinate conversion stable

This is "choose your basis to make the compiler fast."

## 5. Use Directed Edge Labels When Side Numbers Are Ambiguous

Margenstern uses ordered pairs `(a,b)` for traversing edges:

- `a` = side number on source
- `b` = side number on target
- Reversal = `(b,a)`

**Practical engine insight**:

- `moveAcrossSide(k)` API will hit ambiguity in general tilings
- Robust core representation: `moveAcrossDirectedArc(a,b)` plus
  canonicalization
- Public API can still expose `moveAcrossSide(k)` for convenience

Small change, huge payoff for generic {p,q} systems.

## 6. "Recover the Dual Graph from the Spanning Tree"

The spanning tree is NOT the adjacency graph, but close enough that
finite additional rules reconstruct adjacency.

**Design consequence**:

- Core data structure = spanning tree (addressing)
- Core problem = given address, compute adjacency set
- Store as little as possible, compute as much as possible

"Neighbor location" is framed as THE key issue for implementing CA.

## 7. Weak vs Strong Universality

Small-state universality results often assume infinite initial
configurations.

**Practical decision**:

| Goal           | Accept                                 |
| -------------- | -------------------------------------- |
| Minimal states | Infinite initial scaffolding           |
| Practical sim  | More states but finite initializations |

Make this explicit: are you building a theoretical CA laboratory or a
practical "finite world" simulator?

## 8. Railway Circuit Model as Universal Construction Kit

The engineering trick: standardize universality proofs using:

- Tracks
- Crossings
- Switches
- Locomotive (updates switch states as it passes)

Implementable in hyperbolic plane with small number of states. Even
fewer in 3D because hyperbolic space has "room" to route without
interference.

**Even if not proving universality**:

- Treat complex CA behavior like hardware: wires, gates, signals
- Hyperbolic geometry makes wiring easier (exponential area growth =
  separation)

This is why hyperbolic CA feel like a "natural hardware substrate."

## 9. Local Constraints as Invariants

When implementing railway CA, enforce strict local invariants:

- Track cell has at most 2 track neighbors
- Special contexts at crossings and switches
- Neighbor numbering anchored at "father = 1"

**Practical takeaway**:

- When implementing track-like structures, enforce local graph
  invariants
- Many bugs vanish if "wires are always degree ≤ 2 except in switch
  motifs"

Design patterns robust under local updates, prove CA stays inside
pattern class.

## 10. Rotation Invariance Trade-offs

Rotation invariant rules can reduce state counts but require more from
geometry.

**Major design axis**:

| Mode               | Description                            |
| ------------------ | -------------------------------------- |
| Oriented CA        | Neighbors numbered, indices meaningful |
| Rotation-invariant | Rule matches any rotated context       |

Oriented neighborhoods are natural with coordinate engine (already have
numbering). Rotation invariance is conceptually elegant but stricter.

**Strategy**: Implement both modes.

## 11. Hyperbolic "Space Advantage"

Not just bigger. It changes complexity and possibility:

- Tasks awkward in Euclidean become natural (growth and routing)
- Global property checks become harder (boundary grows fast as interior)

**Feature priorities for hyperbolic engine**:

- Fast frontier growth handling (BFS/expansion)
- Memory-efficient storage (sparse infinite graph)
- Region-of-interest rendering (never render "all tiles")
- Local pattern matching tools (global reasoning is expensive)

## 12. You Can Pick the Tree That Makes Your Life Easiest

Margenstern makes clear: continuously many trees correspond to the same
tiling. You can perturb them while preserving preferred-son property.

**This means**:

- "The coordinate system" is not unique
- What matters is that it yields:
  - Unique addressing
  - Efficient local algorithms
  - Stable neighbor numbering
  - Simple rewrite rules

**Most practical trick**: Treat coordinate design as optimization
problem, not religious choice.

## 13. Architecture Blueprint

### A) Compile Step for Tiling {p,q}

Build or load a `SplittingSpec`:

- Node types and rewrite rules
- Coordinate language constraints
- Preferred-son choice and assignment constraints

Produce a `NeighborSpec`:

- Neighbor numbering scheme anchored at father=1
- Directed-arc mapping rules `(a,b)` for full generality

### B) Runtime

```typescript
// Coordinates
interface TileCoord {
  sector: number
  path: number[]
}

// Operations
function parent(coord: TileCoord): TileCoord | null
function children(coord: TileCoord): TileCoord[]
function lca(a: TileCoord, b: TileCoord): TileCoord
function distance(a: TileCoord, b: TileCoord): number
function neighborsAllSides(coord: TileCoord): DirectedArcResult[]
function rewritePathToNormalForm(path: number[]): number[]
```

### C) CA Tooling

**Rule engines**:

- Oriented and rotation-invariant variants

**Structure libraries**:

- Tracks/wires, crossings, switches, signal types (railway motifs)

**Debug**:

- Invariant checkers (degree constraints)
- Local-context inspectors
- Pattern matchers for motifs

## 14. Highest ROI Next Steps

For maximum leverage in a {p,q} engine:

1. **Directed-arc moves** `(a,b)` as first-class type
2. **Normal-form rewriting** for paths based on preferred-son property
3. **neighborsAllSides()** using small rewrite rules (not ad-hoc sibling
   hacks)
4. **Motif DSL** for CA structures (tracks, switches) because that's how
   all universality constructions get built

Aligns with Margenstern's emphasis: neighbor location is "a key issue"
for implementation.

## 15. The Single Most "Cheaty" Insight

There are continuously many trees corresponding to the same tiling. You
can perturb them in controlled ways while preserving preferred-son
property.

**What matters**:

- Unique addressing
- Efficient local algorithms
- Stable neighbor numbering
- Simple rewrite rules

**Coordinate design is an optimization problem, not a fixed choice.**

## Summary Table

| Pattern                     | Implementation Impact                   |
| --------------------------- | --------------------------------------- |
| Combinatorics first         | No hyperbolic trig until rendering      |
| Splitting = grammar         | TilingSpec as small rewrite system      |
| Coordinates as words        | Validity, enumeration, normal forms     |
| Preferred-son property      | O(n) parent path, simple rewrites       |
| Directed edge labels        | Robust generic {p,q} navigation         |
| Tree + recovery rules       | Sparse storage, computed adjacency      |
| Weak vs strong universality | Explicit infinite vs finite config mode |
| Railway circuit model       | CA as hardware: wires, gates, signals   |
| Local invariants            | Degree constraints prevent bugs         |
| Rotation invariance modes   | Support both oriented and invariant CA  |
| Space advantage             | BFS, sparse storage, local patterns     |
| Tree choice freedom         | Optimize for your algorithms            |
