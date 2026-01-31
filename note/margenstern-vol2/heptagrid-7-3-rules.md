# Ternary Heptagrid {7,3} Implementation Rules

Concrete, implementable rule set for the {7,3} ternary heptagrid based
on Margenstern's coordinate approach.

## 1. Coordinate Structure

A tile coordinate is:

```typescript
interface TileCoord {
  sector: number // 1..7
  path: number[] // Fibonacci tree path within sector
}
```

The ternary heptagrid is "spanned by Fibonacci trees" in the same way as
the pentagrid.

## 2. Spanning Tree Grammar

Two node types: `B` (black) and `W` (white).

### Transition Rules

```
B -> B W     (2 children)
W -> B W W   (3 children)
```

This is consistent with Margenstern's "standard Fibonacci tree" usage.
The "preferred son is always a white node".

### Child Indexing Convention

Children indexed left to right:

- For `B`: children `0..1`
- For `W`: children `0..2`

### Child Type Table

```typescript
const childType = {
  B: {
    0: 'B', // child 0 is black
    1: 'W', // child 1 is white
  },
  W: {
    0: 'B', // child 0 is black
    1: 'W', // child 1 is white
    2: 'W', // child 2 is white
  },
}
```

This gives a regular-language address system.

## 3. Local Side Numbering

Each heptagon has 7 sides:

- Side 1: shared with father
- Sides 2-7: counter-clockwise around the tile

### Same-Level Neighbors (Key Difference from {5,4})

Tiles on the same level of the Fibonacci tree can also be neighbors.

**White tile (W)**:

- Sides 2 and 7 connect to same-level neighbors

**Black tile (B)**:

- Sides 3 and 7 connect to same-level neighbors

This is the most important implementation difference to encode.

## 4. Neighbor Operations

### Parent

```typescript
function parent(path: number[]): number[] {
  return path.slice(0, -1) // pop last digit
}
```

Side 1 always leads to parent (for non-root tiles).

### Children

```typescript
function child(path: number[], i: number): number[] {
  return [...path, i] // append digit i
}
```

Where `i` must be valid for the tile type:

- B: i in {0, 1}
- W: i in {0, 1, 2}

### Side-to-Child Mapping

Reserve side 1 for parent. Reserve same-level sides for lateral
neighbors. Map remaining sides to children.

**For White (W)** (lateral sides 2 and 7):

- Available child sides: 3, 4, 5, 6
- Mapping:
  - child 0 -> side 3
  - child 1 -> side 4
  - child 2 -> side 5
  - side 6: "other adjacency" resolved via lateral rules

**For Black (B)** (lateral sides 3 and 7):

- Available child sides: 2, 4, 5, 6
- Mapping:
  - child 0 -> side 4
  - child 1 -> side 5
  - sides 2 and 6: "other adjacency" resolved through same-level
    mechanism

## 5. Arc Label Trick for Ambiguity

In {7,3}, the same physical edge can have different numbers depending on
direction and node statuses.

### Solution: Oriented Edge Labels

A directed crossing is labeled as a pair (a, b):

- Going from tile c to tile d across an edge: (a, b)
- a = side number on c's side
- b = side number on d's side
- Reverse direction: (b, a)

**Implementation**: represent moves as oriented edge labels (a, b), not
just "side k".

## 6. Minimal {7,3} Rule Set

The smallest faithful rule set:

1. **Coordinate** = (sector, path)
2. **Node types and child counts**:
   - B has 2 children
   - W has 3 children
3. **Side numbering**:
   - Side 1 = parent
   - W has same-level neighbors on sides 2 and 7
   - B has same-level neighbors on sides 3 and 7
4. **Ambiguous edges**: encode as (a, b) oriented pairs

## 7. TypeScript Implementation

```typescript
type NodeType = 'B' | 'W'

interface TileCoord {
  sector: number // 1..7
  path: number[]
}

// Compute node type from path
function typeOf(path: number[]): NodeType {
  if (path.length === 0) return 'W' // root is white

  let type: NodeType = 'W' // root type
  for (const childIndex of path) {
    if (type === 'B') {
      type = childIndex === 0 ? 'B' : 'W'
    } else {
      // W
      type = childIndex === 0 ? 'B' : 'W'
    }
  }
  return type
}

// Parent (side 1)
function parent(coord: TileCoord): TileCoord | null {
  if (coord.path.length === 0) return null
  return {
    sector: coord.sector,
    path: coord.path.slice(0, -1),
  }
}

// Children
function children(coord: TileCoord): TileCoord[] {
  const type = typeOf(coord.path)
  const count = type === 'B' ? 2 : 3
  const result: TileCoord[] = []
  for (let i = 0; i < count; i++) {
    result.push({
      sector: coord.sector,
      path: [...coord.path, i],
    })
  }
  return result
}

// Side number to child index
function sideToChild(type: NodeType, side: number): number | null {
  if (type === 'W') {
    // W: children on sides 3, 4, 5
    if (side === 3) return 0
    if (side === 4) return 1
    if (side === 5) return 2
  } else {
    // B: children on sides 4, 5
    if (side === 4) return 0
    if (side === 5) return 1
  }
  return null
}

// Child index to side number
function childToSide(type: NodeType, childIndex: number): number {
  if (type === 'W') {
    return childIndex + 3 // 0->3, 1->4, 2->5
  } else {
    return childIndex + 4 // 0->4, 1->5
  }
}

// Same-level neighbor on left
function neighborSameLevelLeft(coord: TileCoord): TileCoord | null {
  // Implementation requires tree navigation
  // Side 2 for W, side 3 for B
  // ... complex logic involving parent/sibling traversal
  return null // TODO
}

// Same-level neighbor on right
function neighborSameLevelRight(coord: TileCoord): TileCoord | null {
  // Implementation requires tree navigation
  // Side 7 for both W and B
  // ... complex logic involving parent/sibling traversal
  return null // TODO
}
```

## 8. Side Number Summary Tables

### White Node (W)

| Side | Connects To                 |
| ---- | --------------------------- |
| 1    | Parent                      |
| 2    | Same-level neighbor (left)  |
| 3    | Child 0                     |
| 4    | Child 1                     |
| 5    | Child 2                     |
| 6    | Other adjacency             |
| 7    | Same-level neighbor (right) |

### Black Node (B)

| Side | Connects To                 |
| ---- | --------------------------- |
| 1    | Parent                      |
| 2    | Other adjacency             |
| 3    | Same-level neighbor (left)  |
| 4    | Child 0                     |
| 5    | Child 1                     |
| 6    | Other adjacency             |
| 7    | Same-level neighbor (right) |

## 9. Differences from {5,4} Pentagrid

| Aspect           | {5,4}           | {7,3}                |
| ---------------- | --------------- | -------------------- |
| Sides per tile   | 5               | 7                    |
| Sectors          | 5               | 7                    |
| W children       | 2               | 3                    |
| B children       | 1               | 2                    |
| Same-level edges | None (via tree) | Explicit sides 2/7   |
| Arc ambiguity    | Minimal         | Requires (a,b) pairs |

## 10. Extended Status Labels for {7,3}

Beyond simple B/W, Margenstern uses extended status labels:

| Label | Meaning                                  |
| ----- | ---------------------------------------- |
| Bb    | Black node with black father             |
| Bw    | Black node with white father             |
| Wwm   | White node, white father, middle son     |
| Wwr   | White node, white father, right-hand son |
| Wb    | White node with black father             |

These are useful for determining which specific sides connect where,
especially for the "other adjacency" edges.
