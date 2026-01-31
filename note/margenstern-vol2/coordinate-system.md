# Margenstern Coordinate System for Hyperbolic Tilings

This is the core implementable model extracted from Maurice
Margenstern's "Cellular Automata in Hyperbolic Spaces Volume 2".

## Overview

The Margenstern coordinate system provides a **universal addressing
scheme** for any regular hyperbolic tiling {p,q}. It replaces Euclidean
integer coordinates with a tree-based addressing system that respects
hyperbolic geometry.

## Global Structure: Sector + Tree Address

Every tile gets a coordinate:

```
Coordinate = (sector, path)
```

### Sector

- There are **p sectors** around the central tile
- Each sector corresponds to one of the p edges of the central polygon
- Think of this like "hyperbolic quadrants"

```
sector in {0, 1, ..., p-1}
```

For {5,4} pentagrid: 5 sectors (0-4) For {7,3} heptagrid: 7 sectors
(0-6)

### Path (Tree Address)

Inside each sector, tiles are arranged in a **spanning tree** rooted at
the sector's root tile (the neighbor of the center sharing that edge).

```
path = sequence of child indices from root
```

This is a **tree address**, not Cartesian coordinates.

## The Spanning Tree Structure

For any {p,q}, the spanning tree has these properties:

- Each tile has exactly **1 parent (father)** toward the center
- Each tile has **k children**, where k depends on {p,q} and node type
- Node types determine branching rules
- The grammar is **regular** (finite automaton)

### Node Types for {5,4} Pentagrid

```
W (white node): has 2 children (Fibonacci branching)
B (black node): has 1 child
```

Extended status labels:

- Bb: black node with black father
- Bw: black node with white father
- Wwm: white node with white father, middle son
- Wwr: white node with white father, right-hand son
- Wb: white node with black father

### Node Types for {7,3} Ternary Heptagrid

```
W (white node): has 3 children
B (black node): has 2 children
```

## Path Encoding

Store path as a list of small integers:

```
path = [c1, c2, c3, ..., cn]
```

Where each ci is:

```
ci = which child number we took at that level
```

### Fibonacci Representation

For {5,4} and {7,3}, paths can be encoded as Fibonacci numbers:

- Alphabet: {0, 1}
- Constraint: no two consecutive 1s (forbid "11")
- Alternative: alphabet {0, 1, 2} with golden ratio base (forbid
  "21\*2")

## Neighbor Computation

### Parent

```
parent(path) = path without last step
```

Except for root of sector.

### Children

```
child_i(path) = path + [i]
```

Where i depends on node type (0 to k-1 for k children).

### Lateral Neighbors (Same Level)

These are the tricky hyperbolic neighbors. Algorithm:

1. Move up toward common ancestor
2. Switch branch (adjust child index)
3. Move down using canonical branch

```
function lateralNeighbor(path, direction):
    climb until branch exists
    adjust child index
    descend using canonical branch
```

Similar to navigating a trie with backtracking.

### Neighbors in Different Sectors

For tiles near sector boundaries:

1. Navigate up to sector root
2. Cross through central cell
3. Navigate down in adjacent sector

## Distance Computation

Distance between two tiles:

```typescript
function distance(a: TileCoord, b: TileCoord): number {
  if (a.sector !== b.sector) {
    // Cross through center
    return depth(a) + depth(b) + 2
  } else {
    // Same sector: tree LCA
    const lca = lowestCommonAncestor(a.path, b.path)
    return depth(a) - lca + (depth(b) - lca)
  }
}
```

All linear in path length.

## Coordinate Re-rooting

To express coordinates relative to another tile T:

1. Find path from T to center
2. Invert it
3. Append path from center to target

Uses the same tree navigation primitives.

## TypeScript Data Structures

```typescript
type Sector = number // 0..p-1

type Path = number[] // child indices

interface TileCoord {
  sector: Sector
  path: Path
}

interface NodeRule {
  nodeType: number
  childrenTypes: number[]
}

// Transition table
// transition[nodeType][childIndex] -> childNodeType
type TransitionTable = Record<number, number[]>
```

## Why This Works for Any {p,q}

Margenstern proves:

1. The tiling admits a spanning tree with finite branching types
2. The grammar is regular (finite automaton)
3. Paths uniquely identify tiles
4. All neighbor relations are computable from this structure

## Conceptual Summary

| Geometry   | Coordinate System                         |
| ---------- | ----------------------------------------- |
| Euclidean  | Z^2 lattice (integer pairs)               |
| Hyperbolic | p-sector forest of regular-language trees |

Hyperbolic coordinates become:

> "Which sector?" + "Which path down a finite-type tree?"

## Key Algorithms (All Linear Time)

1. **Path to coordinates**: Direct encoding
2. **Coordinates to path**: Direct decoding
3. **Find neighbor**: Tree navigation with backtracking
4. **Compute distance**: LCA computation
5. **Change root**: Path inversion and concatenation

## Point Coordinates (Sub-Tile Precision)

For points within tiles, extend the address with a fractional part:

1. Tile address gives the containing tile
2. Last digit of tile address gives triangular sector within tile
3. Fractional part: infinite sequence of embedded triangles

This provides arbitrary precision for any point in the hyperbolic plane.

## Algebraic Structure

For computational geometry with exact coordinates:

### Pentagrid {5,4}

Edge equation: omega^4 - 2\*omega^2 - 4 = 0

### Heptagrid {7,3}

Edge equation: omega^6 - 3*omega^4 - 4*omega^2 - 1 = 0

Points with rational Euclidean coordinates in the Poincare disk have
unique tile addresses computable via sign tests on these algebraic
expressions.
