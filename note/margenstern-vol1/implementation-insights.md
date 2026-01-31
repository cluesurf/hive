# Key Implementation Insights from Margenstern Volume 1

Insights that directly inform the {p,q} coordinate and navigation engine
design. Focused on parts that translate into code architecture.

## 1. The Central Trick: Spanning Tree + Side Linking

Volume 1 Chapter 4 is the playbook for turning a hyperbolic tiling into
an indexable, traversable data structure: a rooted spanning tree whose
nodes correspond to tiles, plus rules that recover "true adjacency"
(dual graph edges) from that tree.

### Implementation Takeaways

- A tile coordinate is **not** `(x, y)` but **the path from root in a
  specific tree**
- Neighbors split into:
  - **Tree edges**: parent and children
  - **Non-tree edges**: same-level and cross-branch adjacencies computed
    by local rules using tree coordinates

This gives: cheap addressing, cheap move operations, and deterministic
neighbor computation.

## 2. Language of the Splitting: Coordinates as Regular Language Words

Volume 1 frames the spanning tree via a "splitting" of regions and talks
about "the spanning tree and the language of the splitting".

### Implementation Model

- Define an alphabet of child-types (or sector + child-index symbols)
- Valid coordinates are strings in a constrained language (often
  regular, implementable with a DFA)
- Operations become string operations:
  - **Validate** coordinates
  - **Enumerate** tiles level-by-level
  - **Compute parent/children** by simple string ops
  - **Compute neighbors** by rewriting rules on strings

### Coordinate Type

```typescript
interface TileCoord {
  sector: number         // "root wedge" id
  path: Digit[]          // "which child kind did we take?"
  orientation?: number   // how edges/sides are numbered at that tile
}
```

## 3. The Preferred Son Property

Volume 1 calls out "the preferred son property" as its own subsection.
This is a design constraint on tree encoding that makes operations fast
and non-branchy.

### Practical Value

- Compute certain neighbor moves with small local transformations on
  path string
- Reduces edge cases when walking up/down and across levels

### Code Impact

Without preferred son:
```
neighbor() needs case analysis on many tile types
```

With preferred son:
```
neighbor() is mostly a few small rewrite patterns plus fallback to parent-level
```

## 4. General {p,q} Support is Explicit

Volume 1 has a dedicated section: "The regular grids {p,q}" with:

- "Splitting a tiling {p,q}"
- "Matrices and polynomials"
- "Rules for the tree generation"

### Generic Construction Pipeline

1. Define the splitting for {p,q}
2. Derive finite set of node types and child-expansion rules
3. Derive coordinate language and generation rules (level enumeration)

The "matrices and polynomials" portion is algebraic machinery to reason
about tree growth and structure. Useful for:

- Confirming branching factors
- Counts per level
- Building rank/unrank for coordinates

**This section is the anchor for a unified engine.**

## 5. Special Case Families

Volume 1 highlights:

- Ternary heptagrid: tiling {7,3}
- The tilings {p,4} and {p+2,3}
- "New look on the pentagrid and on the heptagrid"

### Why These Matter

- Particularly clean tree models and neighbor rules
- Ideal first targets for implementing and testing generic {p,q}
- Expose the right abstractions: tile types, child ordering, sectoring,
  edge numbering

**{7,3} and {5,4} are great because they live in these highlighted families.**

## 6. Beyond Standard Tilings

Volume 1 includes material on:

- Infinigons and infinigrids
- Fibonacci tilings and patchworks
- Fibonacci carpets
- "Flowers in the ternary heptagrid"

### Relevance

1. Teach how to build coordinate systems for non-compact, limit-like
   structures with algorithmic navigation (useful for nested, recursive,
   or "self-similar" worlds)
2. Fibonacci constructions give very implementable trees (finite
   branching, strong regularity) - excellent for stress-testing neighbor
   logic and CA experiments

## 7. Recovering Dual Graph from Spanning Tree

Even the dodecagrid (3D) discussion demonstrates the general pattern:

> "Sons give one part of the neighbours, other connections come from
> structured non-tree link families"

The "Rules of the neighbours" is an algorithmic template: neighbors
composed from parent/children plus additional structured relations
following from the splitting model.

### Clean Mental Model for 2D {p,q}

1. Build a tree coordinate
2. Add a small, well-defined set of extra neighbor edges derived from
   local combinatorics

## 8. Moore Neighborhood Warning

A Volume 1 Chapter 4 remark points out that "neighbor" may need
Moore-style interpretation when many tiles share a vertex, inducing more
complex computation.

### Engine API Decision

Decide early what "neighbor" means:

| Mode            | Definition                   |
|-----------------|------------------------------|
| Side-neighbors  | Share an edge (standard)     |
| Vertex-neighbors| Share a vertex (Moore-style) |

If including vertex-neighbors, need extra adjacency rules beyond
side-walking.

**Most implementations start with side-neighbors only, then optionally
add vertex-neighborhood as separate mode.**

## 9. Concrete Engine Architecture

The practical model Volume 1 steers toward:

### A) Compile-Time Model (per {p,q})

```typescript
interface TilingSpec {
  // Finite set of tile types
  tileTypes: TileType[]

  // Tree generation rules
  expand(type: TileType): TileType[]

  // Preferred son property hooks
  preferredChildIndex(type: TileType): number

  // How you number the p sides locally
  sideNumbering(type: TileType): SideMapping
}
```

### B) Runtime Coordinate

```typescript
interface TileCoord {
  sector: number      // which root wedge
  path: number[]      // digits in "language of splitting"
  orientation?: number // optional but usually worth it
}
```

The `orientation` field ensures "move across side k" is stable regardless
of how you arrived at the tile.

### C) Core Operations

```typescript
interface Engine {
  parent(coord: TileCoord): TileCoord | null
  children(coord: TileCoord): TileCoord[]

  // The key operation
  moveAcrossSide(coord: TileCoord, sideIndex: number): TileCoord
}
```

### D) moveAcrossSide Algorithm

The "tree plus small amount of side linking" philosophy:

```typescript
function moveAcrossSide(coord: TileCoord, side: number): TileCoord {
  // 1. Check if side leads to parent
  if (side === fatherSide) {
    return parent(coord)
  }

  // 2. Check if side leads to a child
  const childIndex = sideToChild(nodeType(coord), side)
  if (childIndex !== null) {
    return children(coord)[childIndex]
  }

  // 3. Check same-level neighbor (preferred son rewrites)
  const sameLevelResult = trySameLevelRewrite(coord, side)
  if (sameLevelResult) {
    return sameLevelResult
  }

  // 4. Climb to ancestor where rewrite applies, then descend
  return climbAndDescend(coord, side)
}
```

This pattern handles all cases with minimal branching.

## Summary: What Volume 1 Provides

| Concept                  | Implementation Value                    |
|--------------------------|-----------------------------------------|
| Spanning tree + linking  | Core data structure design              |
| Language of splitting    | Coordinate validation, enumeration      |
| Preferred son property   | Fast, uniform neighbor operations       |
| General {p,q} section    | Generic construction pipeline           |
| {p,3}, {p,4} families    | First targets, clean test cases         |
| Fibonacci structures     | Regular trees for stress testing        |
| Dual graph recovery      | Neighbor algorithm template             |
| Moore neighborhood note  | API design decision point               |
