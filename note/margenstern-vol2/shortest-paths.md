# Shortest Path Algorithms in Hyperbolic Tilings

## Overview

Finding shortest paths between tiles in hyperbolic tilings requires
special algorithms that exploit the tree structure of the coordinate
system.

## Path Representation

### Path Words

A path between tiles is encoded as a sequence of "exits":
- For pentagrid: exits are numbered 2-5 (edge 1 is toward father)
- For heptagrid: exits are numbered 2-7

### Example

```
Path word: 3.4.2.5
Meaning: Go through edge 3, then edge 4, then edge 2, then edge 5
```

## Direct vs Non-Direct Paths

### Direct Path

A path that never backtracks unnecessarily. From any tile, a direct path
either:
1. Goes toward the center (up the tree)
2. Goes away from the center (down the tree)
3. Traverses laterally at minimum necessary level

### Non-Direct Path

Contains redundant backtracking. Can always be shortened.

## Algorithm: Shortest Path Computation

### Same Sector

```typescript
function shortestPathSameSector(a: Path, b: Path): number[] {
  // Find lowest common ancestor
  const lca = findLCA(a, b)

  // Path is: up from a to LCA, then down from LCA to b
  const upPath = reversePathToAncestor(a, lca)
  const downPath = pathFromAncestor(lca, b)

  return [...upPath, ...downPath]
}
```

### Different Sectors

```typescript
function shortestPathDifferentSectors(a: TileCoord, b: TileCoord): number[] {
  // Go up to roots, cross center, go down
  const pathToCenter = reversePathToRoot(a.path)
  const sectorCross = crossSector(a.sector, b.sector)
  const pathFromCenter = b.path

  return [...pathToCenter, ...sectorCross, ...pathFromCenter]
}
```

## Hook and Set-Square Configurations

### Hook Configuration

When two tiles share a common ancestor but are on different branches,
the path forms a "hook" shape:
```
    ancestor
   /        \
  up         down
 /             \
A               B
```

### Set-Square Configuration

A special case where the path forms a right-angle-like shape in the
tree structure.

## Linear Time Complexity

All shortest path computations are O(d) where d is the depth/level of
the tiles involved. This is because:

1. LCA computation is O(d)
2. Path reversal is O(d)
3. Sector crossing is O(1)

## Communication Algorithms

### All-to-All Communication

When all tiles need to communicate with all others:

1. Aggregate messages up the tree
2. Cross at center if needed
3. Distribute messages down the tree

Time complexity: O(d) where d is maximum depth involved.

### Point-to-Point Communication

Direct path computation as described above.

## Implementation Notes

### Edge Numbering Convention

```
Edge 1: toward father (always)
Edges 2-p: toward children/siblings (counter-clockwise)
```

### Path Inversion

To reverse a path:
1. Reverse the sequence
2. Transform each exit number to its "opposite" direction

### Neighbor Table

Precompute which exits lead to which neighbors:
```typescript
interface NeighborTable {
  // Given current tile's status and exit number,
  // return destination's status and which exit we entered from
  [status: string]: {
    [exit: number]: {
      destinationStatus: string
      entryEdge: number
    }
  }
}
```

## Distance Metric

### Tree Distance

```
d(a, b) = depth(a) + depth(b) - 2*depth(LCA(a,b))
```

If different sectors, add crossing cost through center.

### Hyperbolic Distance

The tree distance approximates true hyperbolic distance. For exact
hyperbolic distance, use the algebraic formulas from the localization
chapter.

## Path Existence

Unlike Euclidean grids where arbitrary paths exist, in hyperbolic tilings:

1. Every pair of tiles has a unique shortest path
2. Shortest paths follow the tree structure
3. No cycles in the fundamental tree

This simplifies pathfinding significantly compared to Euclidean grids.
