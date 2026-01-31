# Margenstern: Fibonacci Coordinate System for Hyperbolic Tilings

This is the core implementable model extracted from Maurice
Margenstern's "Cellular Automata in Hyperbolic Spaces" Volumes 1 and 2.

## Overview

The Margenstern coordinate system provides a **universal addressing
scheme** for any regular hyperbolic tiling {p,q}. It replaces Euclidean
integer coordinates with a tree-based addressing system that respects
hyperbolic geometry.

## The Core Insight

Hyperbolic cellular automata become practical only when you stop
thinking "continuous hyperbolic geometry" and start thinking "discrete
coordinate systems that let me index neighbors fast."

**The winning approach**: Use trees, not geometry.

In Euclidean grids you use (x, y, z). In hyperbolic tilings:

1. Represent the tiling as one or more spanning trees
2. Give each cell a tree-based address (a digit string)
3. Compute neighbors using local rewrite rules on that string

This avoids floating point hyperbolic math entirely.

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

## The Fibonacci Tree Structure

### Basic Fibonacci Numbers

```
F_0 = 1
F_1 = 1
F_n = F_{n-1} + F_{n-2}

Sequence: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ...
```

### Connection to Hyperbolic Tilings

For pentagrid {5,4} and ternary heptagrid {7,3}:

- Level k has F\_{2k+1} nodes

The number of tiles grows as the golden ratio phi^n where:

```
phi = (1 + sqrt(5)) / 2 ≈ 1.618
```

This matches hyperbolic space's exponential growth.

### Node Types

Two node colors for both {5,4} and {7,3}:

**White (W)**: Has 3 children

- Left child: 2-node (black)
- Middle child: 3-node (white)
- Right child: 3-node (white)

**Black (B)**: Has 2 children

- Left child: 2-node (black)
- Right child: 3-node (white)

### Extended Status Labels

More precise node classification:

| Label | Meaning                                  |
| ----- | ---------------------------------------- |
| Bb    | Black node with black father             |
| Bw    | Black node with white father             |
| Wwm   | White node, white father, middle son     |
| Wwr   | White node, white father, right-hand son |
| Wb    | White node with black father             |

## Fibonacci Representation of Paths

### Maximal Representation (Zeckendorf)

Any positive integer n can be written as sum of Fibonacci numbers:

```
n = Σ(αi * fi) where αi ∈ {0,1}
```

**Maximal representation**: If αi = 1 then αi+1 = 0 (no consecutive 1s).
This ensures uniqueness.

Example: 7 = (1001) in maximal Fibonacci = f4 + f1 = 5 + 2

### Node Type from Representation

Given w = u1(0)^p where p ≥ 0 (trailing zeros count):

- p odd -> 2-node (black)
- p even -> 3-node (white)

```typescript
function is3Node(fibRep: number[]): boolean {
  let trailingZeros = 0
  for (let i = 0; i < fibRep.length; i++) {
    if (fibRep[i] === 0) trailingZeros++
    else break
  }
  return trailingZeros % 2 === 0
}
```

## Child Generation Rules

### For 3-nodes (w = αk..α1)

| Child     | Type   | Representation   |
| --------- | ------ | ---------------- |
| Leftmost  | 2-node | (αk..α1 0 0) - 1 |
| Middle    | 3-node | (αk..α1 0 0)     |
| Rightmost | 3-node | (αk..α1 0 1)     |

### For 2-nodes (w = α'p..α'1)

| Child | Type   | Representation |
| ----- | ------ | -------------- |
| Left  | 2-node | (α'p..α'1 0 0) |
| Right | 3-node | (α'p..α'1 0 1) |

## Preferred Son Property (Theorem 3)

For each node ν, its continuator (node with coordinate αk...α0 extended
to αk...α0 0) occurs among its sons as the single son whose coordinate
ends in 0.

To recover the parent from a preferred son, remove the trailing `00`.

## Neighbor Computation

### Parent

```typescript
function parent(tile: Tile): Tile | null {
  if (tile.path.length === 0) return null
  return { sector: tile.sector, path: tile.path.slice(0, -1) }
}
```

### Children

```typescript
function children(tile: Tile): Tile[] {
  const type = nodeType(tile.path)
  const count = childTypeTable[type].length
  const result: Tile[] = []
  for (let i = 0; i < count; i++) {
    result.push({ sector: tile.sector, path: [...tile.path, i] })
  }
  return result
}
```

### Lateral Neighbors (Same Level)

These are the tricky hyperbolic neighbors. Algorithm:

1. Move up toward common ancestor
2. Switch branch (adjust child index)
3. Move down using canonical branch

```typescript
function lateralNeighbor(path, direction) {
  // climb until branch exists
  // adjust child index
  // descend using canonical branch
}
```

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

## Receiver/Giver Paradigm for Display

### The Key Insight

Separate the **display tree T** (receivers) from the **cell graph G**
(givers):

- **Receiver**: A polygon position on screen (fixed by tree structure)
- **Giver**: The actual cell data to display there (moves with
  navigation)

This allows any cell to become the center without recomputing geometry.

### Walk Algorithm

```typescript
function walk(
  level: number,
  receiver: TreeNode,
  giver: CellAddress,
  sideU: number,
): void {
  display(receiver, getCellData(giver))

  if (level <= 1) return

  const firstSon = is3Node(receiver) ? 2 : 3

  for (let i = firstSon; i <= 4; i++) {
    walk(
      level - 1,
      getSon(receiver, i),
      getSon(giver, incN(sideU, i)),
      getSide(giver, incN(sideU, i)),
    )
  }
}
```

## Shortest Path Algorithms

### Path Words

A path between tiles is encoded as a sequence of "exits":

- For pentagrid: exits are numbered 2-5 (edge 1 is toward father)
- For heptagrid: exits are numbered 2-7

### Same Sector

```typescript
function shortestPathSameSector(a: Path, b: Path): number[] {
  const lca = findLCA(a, b)
  const upPath = reversePathToAncestor(a, lca)
  const downPath = pathFromAncestor(lca, b)
  return [...upPath, ...downPath]
}
```

### Different Sectors

```typescript
function shortestPathDifferentSectors(
  a: TileCoord,
  b: TileCoord,
): number[] {
  const pathToCenter = reversePathToRoot(a.path)
  const sectorCross = crossSector(a.sector, b.sector)
  const pathFromCenter = b.path
  return [...pathToCenter, ...sectorCross, ...pathFromCenter]
}
```

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

## Key Benefits

1. **No coordinate explosion**: Addresses are finite sequences of bits
2. **O(1) neighbor lookup**: Pattern matching on bit sequences
3. **Sparse storage**: Only store cells that have data
4. **Efficient navigation**: Receiver/giver paradigm avoids
   recomputation
5. **Works for both {5,4} and {7,3}**: Same tree, different side counts

## References

- Margenstern, M. (2002). New tools for cellular automata in the
  hyperbolic plane.
- Margenstern, M. (2007). Cellular Automata in Hyperbolic Spaces.
- Chelghoum, Margenstern, Martin, Pecci (2004). Cellular automata in the
  hyperbolic plane: proposal for a new environment.
