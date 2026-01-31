# Margenstern Fibonacci Addressing for Hyperbolic Tilings

Notes from: "Cellular automata in the hyperbolic plane: proposal for a
new environment" by Chelghoum, Margenstern, Martin, and Pecci (2004)

## Core Insight

The paper solves the fundamental problem of hyperbolic tilings: **how to
identify and navigate tiles without coordinate explosion**. The solution
uses a spanning tree with Fibonacci-based numbering that makes
`cell_id -> neighbor_ids` purely computable without embedding
coordinates.

## Two Tilings with Shared Structure

| Tiling                | Schlafli | Interior Angle | Regions |
| --------------------- | -------- | -------------- | ------- |
| Rectangular Pentagrid | {5,4}    | π/2 (90°)      | 5       |
| Ternary Heptagrid     | {7,3}    | 2π/3 (120°)    | 7       |

**Remarkable fact**: Both tilings share the SAME spanning tree
structure. The tree has two node types with identical branching rules.

## The Spanning Tree

### Node Types

```
3-node (white): Has 3 children
  - Left child:   2-node
  - Middle child: 3-node
  - Right child:  3-node

2-node (black): Has 2 children
  - Left child:  2-node
  - Right child: 3-node
```

### Visual Structure

```
        [3]           <- root (central polygon)
       / | \
     [2][3][3]        <- first level (leading polygons of regions)
     /\  /|\  /|\
   [2][3] ...         <- recursive expansion
```

## Maximal Fibonacci Representation

### The Numbering System

Any positive integer n can be written as sum of Fibonacci numbers:

```
n = Σ(αi * fi) where αi ∈ {0,1}
f0 = f1 = 1, fn = fn-2 + fn-1
```

**Maximal representation**: If αi = 1 then αi+1 = 0 (no consecutive 1s).
This ensures uniqueness.

Example: 7 = (1001) in maximal Fibonacci = f4 + f1 = 5 + 2

### Node Type from Representation

Given w = u1(0)^p where p ≥ 0 (trailing zeros count):

- p odd → 2-node
- p even → 3-node

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

### TypeScript Implementation Sketch

```typescript
interface FibAddress {
  region: number // 1..nbSides (0 for central)
  bits: number[] // maximal Fibonacci representation
}

function getChildren(addr: FibAddress): FibAddress[] {
  const w = addr.bits
  const is3 = is3Node(w)

  if (is3) {
    return [
      { region: addr.region, bits: fibSubtract([...w, 0, 0], 1) }, // 2-node
      { region: addr.region, bits: [...w, 0, 0] }, // 3-node
      { region: addr.region, bits: [...w, 0, 1] }, // 3-node
    ]
  } else {
    return [
      { region: addr.region, bits: [...w, 0, 0] }, // 2-node
      { region: addr.region, bits: [...w, 0, 1] }, // 3-node
    ]
  }
}
```

## Coordinate System

### Full Cell Address

```typescript
type CellAddress = {
  region: number // 0 = central, 1..nbSides = basic regions
  fib: number[] // maximal Fibonacci representation (empty for central)
}
```

- Central polygon: (0, [])
- Region i leading polygon: (i, [1])
- Deeper cells: (r, w) where w is the Fibonacci path

### Side Numbering

```
Side nbSides = parent side (edge shared with parent in tree)
Sides 1..nbSides-1 = other sides, numbered counter-clockwise from parent
```

For heptagrid: sides 1-6 are children/siblings, side 7 is parent. For
pentagrid: sides 1-4 are children/siblings, side 5 is parent.

## Neighbor Computation

### The Key Functions

```typescript
// Son_i(c): Get the neighbor through side i
function getSon(cell: CellAddress, side: number): CellAddress

// Side_i(c): Which side of Son_i(c) leads back to c?
function getSide(cell: CellAddress, side: number): number
```

### Cyclic Navigation

```typescript
function inc(i: number, nbSides: number): number {
  return i === nbSides ? 1 : i + 1
}

function pred(i: number, nbSides: number): number {
  return i === 1 ? nbSides : i - 1
}

// inc^n: Apply inc n times
function incN(i: number, n: number, nbSides: number): number {
  let result = i
  for (let j = 0; j < n; j++) {
    result = inc(result, nbSides)
  }
  return result
}
```

### Pattern Matching for Neighbors (Heptagrid)

The paper's Figure 3 gives complete lookup tables. Key patterns:

```
w = 1(01)^n, n>0:
  Side 1: parent = (r, 1(01)^(n-1)) if n>0, else (0,0)
  Side 2: (inc(r), 10(00)^(n-1)) if n>0, else (inc(r), 1)
  Side 3: (inc(r), 10(00)^n)
  Side 4: (r, w01)
  Side 5: (r, w00)
  Side 6: n=0:(r, 10), n>0:(r, 1(01)^(n-1)0010)
  Side 7: parent

w = 10(00)^n, n>0:
  Side 1: (r, w10)
  Side 2: n=0:(r, 1), n>0:(r, 10(00)^(n-1))
  ... (see Figure 3 for complete table)
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
  level: number, // depth to render
  receiver: TreeNode, // display position
  giver: CellAddress, // cell to display here
  sideU: number, // side of giver leading to parent's giver
): void {
  display(receiver, getCellData(giver))

  if (level <= 1) return

  const firstSon = is3Node(receiver) ? 2 : 3 // heptagrid

  for (let i = firstSon; i <= 4; i++) {
    walk(
      level - 1,
      getSon(receiver, i), // next receiver
      getSon(giver, incN(sideU, i)), // next giver
      getSide(giver, incN(sideU, i)), // new sideU
    )
  }
}
```

### Refresh (Initialize Display)

```typescript
function refresh(
  level: number,
  mainCell: CellAddress, // cell to show at center
  side1: number, // which side of mainCell points to region 1
): void {
  display(centralPolygon, getCellData(mainCell))

  if (level <= 1) return

  for (let i = 1; i <= 7; i++) {
    // heptagrid
    walk(
      level - 1,
      getRegionLeader(i),
      getSon(mainCell, incN(side1, i - 1)),
      getSide(mainCell, incN(side1, i - 1)),
    )
  }
}
```

## Navigation via Zooming

### Discrete Navigation

Mouse/device vector → {src::dest} command:

- Bring region `src` leader to center
- Move current center to region `dest` leader

```typescript
function interpretVector(
  angle: number,
  nbSides: number,
): [number, number] {
  const sector = Math.floor((angle * nbSides) / (2 * Math.PI)) + 1
  const src = sector
  const dest = incN(src, Math.floor(nbSides / 2), nbSides)
  return [src, dest]
}
```

### Compass Metaphor

When a reference cell is not visible, show a marker on the disk boundary
indicating its direction. Prevents getting lost in infinite space.

## Implementation Strategy for @cluesurf/hive

### Phase 1: Fibonacci Arithmetic

```typescript
// code/tiling/fibonacci.ts
function toMaximalFib(n: number): number[]
function fromMaximalFib(bits: number[]): number
function fibAdd(a: number[], b: number[]): number[]
function fibSubtract(a: number[], n: number): number[]
function normalizeToMaximal(bits: number[]): number[]
```

### Phase 2: Address-Based Tessellation

```typescript
// code/tiling/address.ts
interface TileAddress {
  region: number
  fib: number[]
}

function getParent(addr: TileAddress): TileAddress | null
function getChildren(addr: TileAddress): TileAddress[]
function getNeighbor(addr: TileAddress, side: number): TileAddress
function addressToString(addr: TileAddress): string
function stringToAddress(s: string): TileAddress
```

### Phase 3: Sparse Cell Storage

```typescript
// code/tiling/sparse-grid.ts
class SparseHyperbolicGrid<T> {
  private cells: Map<string, T> // key = addressToString

  get(addr: TileAddress): T | undefined
  set(addr: TileAddress, value: T): void
  getNeighborhood(addr: TileAddress): T[]

  // For CA: get all cells within depth d of addr
  getRegion(center: TileAddress, depth: number): Map<string, T>
}
```

### Phase 4: Navigation Integration

```typescript
// code/interaction/hyperbolic-navigation.ts
class HyperbolicNavigation {
  private viewCenter: TileAddress
  private viewSide1: number

  // Navigate to make `target` the new center
  navigateTo(target: TileAddress): void

  // Get the visible tiles for current view
  getVisibleTiles(depth: number): TileAddress[]

  // Convert screen click to tile address
  hitTest(screenX: number, screenY: number): TileAddress | null
}
```

## Key Benefits

1. **No coordinate explosion**: Addresses are finite sequences of bits
2. **O(1) neighbor lookup**: Pattern matching on bit sequences
3. **Sparse storage**: Only store cells that have data
4. **Efficient navigation**: Receiver/giver paradigm avoids
   recomputation
5. **Works for both {5,4} and {7,3}**: Same tree, different side counts

---

## Part 2: Triangular Tilings (n-Trigrids)

Notes from: "Coordinates for a new triangular tiling of the hyperbolic
plane" by Maurice Margenstern (arXiv:1101.0530v1, 2011)

This paper extends the coordinate system to triangular tilings derived
from {p,q} tilings. This is relevant for:

- Finer subdivision of tiles
- Point location within tiles
- Smooth level-of-detail rendering
- Triangular cellular automata

### The Trigrid Construction

**Step 1: 1-triangles**

Split each p-gon P into p triangles:

- Each triangle has one edge of P as its base
- All triangles share the center of P as their apex
- Numbered 1 to p (which edge of P is the base)

**Step 2: Recursive subdivision (n-triangles → n+1-triangles)**

Each n-triangle T produces four (n+1)-triangles:

- **Triangle 0**: vertex 0 of T + midpoints of edges meeting at vertex 0
- **Triangle 1**: vertex 1 of T + midpoints of edges meeting at vertex 1
- **Triangle 2**: vertex 2 of T + midpoints of edges meeting at vertex 2
- **Triangle 3**: three midpoints of T's edges (the central triangle)

### Vertex and Edge Numbering

Vertices are numbered 0, 1, 2 such that counter-clockwise traversal
gives either 0→1→2 or 0→2→1 (alternates with subdivision depth).

**Convention**: Edge i is opposite vertex i.

**Orientation inheritance**:

- Sub-triangles 0, 1, 2 have **opposite** orientation to parent
- Sub-triangle 3 has **same** orientation as parent

### Trigrid Coordinate Format

For an n+1-triangle T:

```
coordinate = (σ, ν, [α₁], [α₂], ..., [αₙ₊₁])
```

Where:

- `(σ, ν)` = coordinate of the containing polygon (sector, tree index)
- `[α₁] ∈ [1..p]` = which 1-triangle (which edge of polygon)
- `[αᵢ] ∈ [0..3]` for i ≥ 2 = subdivision path

### Neighbor Computation for Trigrids

The key insight: if we know the neighbors of an n-triangle S, we can
compute the neighbors of any n+1-triangle T inside S.

**Table 3: Neighbor Computation Rules**

Let S be the n-triangle containing T. Let U, V, W be the neighbors 1, 2,
3 of S (sharing sides 0, 1, 2 respectively).

| T's number | Neighbor 0 | Neighbor 1 | Neighbor 2 |
| ---------- | ---------- | ---------- | ---------- |
| 0          | T.[3]      | W.[1]      | V.[1]      |
| 1          | W.[0]      | T.[3]      | U.[0]      |
| 2          | V.[2]      | U.[2]      | T.[3]      |
| 3          | T.[0]      | T.[1]      | T.[2]      |

Where `T.[i]` means concatenating digit i to T's coordinate.

### TypeScript Implementation

```typescript
/**
 * Coordinate for a triangle in an n-trigrid.
 */
interface TriangleCoord {
  /** Sector number (0 = central polygon) */
  sector: number

  /** Tree index (Fibonacci-based coordinate) */
  treeIndex: number[]

  /** Subdivision path: [α₁, α₂, ..., αₙ] */
  path: number[]  // α₁ ∈ [1..p], rest ∈ [0..3]
}

/**
 * Get the three neighbors of a triangle.
 * Returns [neighbor0, neighbor1, neighbor2].
 */
function getTriangleNeighbors(
  t: TriangleCoord,
  p: number,  // sides per polygon
): [TriangleCoord, TriangleCoord, TriangleCoord] {
  const n = t.path.length

  if (n === 0) {
    // This is a polygon, not a triangle
    throw new Error('Cannot get triangle neighbors of a polygon')
  }

  if (n === 1) {
    // 1-triangle: neighbors depend on polygon neighbors
    return get1TriangleNeighbors(t, p)
  }

  // n+1-triangle: use recursive rule
  const parentPath = t.path.slice(0, -1)
  const myIndex = t.path[n - 1]

  // Get parent triangle's coordinate
  const parent: TriangleCoord = {
    sector: t.sector,
    treeIndex: t.treeIndex,
    path: parentPath,
  }

  // Get parent's neighbors (recursive call)
  const [U, V, W] = getTriangleNeighbors(parent, p)

  // Apply Table 3 rules
  switch (myIndex) {
    case 0:
      return [
        appendDigit(t, 3),      // neighbor 0 = T.[3]
        appendDigit(W, 1),      // neighbor 1 = W.[1]
        appendDigit(V, 1),      // neighbor 2 = V.[1]
      ]
    case 1:
      return [
        appendDigit(W, 0),      // neighbor 0 = W.[0]
        appendDigit(t, 3),      // neighbor 1 = T.[3]
        appendDigit(U, 0),      // neighbor 2 = U.[0]
      ]
    case 2:
      return [
        appendDigit(V, 2),      // neighbor 0 = V.[2]
        appendDigit(U, 2),      // neighbor 1 = U.[2]
        appendDigit(t, 3),      // neighbor 2 = T.[3]
      ]
    case 3:
      return [
        appendDigit(t, 0),      // neighbor 0 = T.[0]
        appendDigit(t, 1),      // neighbor 1 = T.[1]
        appendDigit(t, 2),      // neighbor 2 = T.[2]
      ]
    default:
      throw new Error(`Invalid triangle index: ${myIndex}`)
  }
}

function appendDigit(t: TriangleCoord, digit: number): TriangleCoord {
  return {
    sector: t.sector,
    treeIndex: t.treeIndex,
    path: [...t.path, digit],
  }
}

/**
 * Get neighbors of a 1-triangle (base case).
 */
function get1TriangleNeighbors(
  t: TriangleCoord,
  p: number,
): [TriangleCoord, TriangleCoord, TriangleCoord] {
  const α₁ = t.path[0]  // which edge of polygon (1..p)

  // Neighbor through side 0 (base): in neighboring polygon
  // Neighbor through side 1: adjacent 1-triangle (τ ⊖ 1)
  // Neighbor through side 2: adjacent 1-triangle (τ ⊕ 1)

  const τPlus = α₁ === p ? 1 : α₁ + 1
  const τMinus = α₁ === 1 ? p : α₁ - 1

  // The neighbor polygon through edge α₁
  const neighborPolygon = getPolygonNeighbor(
    { sector: t.sector, treeIndex: t.treeIndex },
    α₁,
    p
  )

  // Which edge of neighbor polygon corresponds to shared edge?
  const neighborEdge = getSharedEdgeInNeighbor(
    { sector: t.sector, treeIndex: t.treeIndex },
    α₁,
    p
  )

  return [
    // Neighbor 0: in neighboring polygon
    {
      sector: neighborPolygon.sector,
      treeIndex: neighborPolygon.treeIndex,
      path: [neighborEdge],
    },
    // Neighbor 1: same polygon, previous edge
    {
      sector: t.sector,
      treeIndex: t.treeIndex,
      path: [τMinus],
    },
    // Neighbor 2: same polygon, next edge
    {
      sector: t.sector,
      treeIndex: t.treeIndex,
      path: [τPlus],
    },
  ]
}
```

### Complexity Analysis

**Theorem 1** (from paper): Neighbor coordinates for n-triangles are
computable in O(coordinate size) time.

The algorithm:

1. Compute polygon neighbors once: O(polygon coordinate size)
2. Apply Table 3 rules n times: O(n) = O(subdivision depth)
3. Total: O(|polygon coord| + n) = O(|full coordinate|)

### Applications

**Cellular automata on triangular grids**:

- Each triangle has exactly 3 neighbors
- Uniform local structure (unlike polygonal tilings)
- Still inherits hyperbolic exponential growth

**Point location**:

- Given a point in hyperbolic space, find the containing n-triangle
- Recursive subdivision to arbitrary precision

**Level-of-detail rendering**:

- Render polygons near viewer
- Subdivide distant polygons into triangles
- Smooth transitions between detail levels

**Mesh generation**:

- Start with {p,q} tiling
- Subdivide to desired resolution
- All triangles have consistent neighbor relations

### Key Insight: Triangles vs Polygons

| Aspect            | {p,q} Polygons       | n-Trigrids               |
| ----------------- | -------------------- | ------------------------ |
| Neighbors/tile    | p (varies by tiling) | Always 3                 |
| Vertex degree     | q (varies by tiling) | Usually 6, sometimes p   |
| Coordinate growth | Tree + sector        | Tree + sector + path     |
| Neighbor lookup   | Table based on p,q   | Recursive + simple table |

The trigrid provides a **uniform triangular structure** on top of any
{p,q} base tiling. This is useful when you need consistent triangle
meshes.

## References

- [1] Margenstern & Morita (2001). NP problems tractable in hyperbolic
  CA
- [2] Margenstern (2000). New Tools for Cellular Automata of Hyperbolic
  Plane
- [3] Margenstern (2007). Cellular Automata in Hyperbolic Spaces, vol. 1
- [4] Margenstern (2008). Cellular Automata in Hyperbolic Spaces, vol. 2
- [5] Margenstern (2009). arXiv:0911.4040v2 - splitting for odd q
  tilings
- [6] Margenstern (2010). arXiv:1012.2771v1 - heptatrigrid
  implementation
