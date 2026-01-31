# Margenstern: Tessellation Implementations

Practical TypeScript implementations for hyperbolic tilings based on
Margenstern's coordinate system.

## Heptagrid {7,3} Implementation

### Coordinate Model

```typescript
type Sector = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 7 sectors

type Path = number[] // child indices

interface Tile {
  sector: Sector
  path: Path
}
```

### Fibonacci Tree Rules

```typescript
type NodeType = 'B' | 'W'

// Branching rules:
// B -> B W     (2 children)
// W -> B W W   (3 children)

const childTypeTable: Record<NodeType, NodeType[]> = {
  B: ['B', 'W'],
  W: ['B', 'W', 'W'],
}
```

### Node Type Computation

```typescript
function nodeType(path: Path): NodeType {
  let type: NodeType = 'W' // root of each sector is white
  for (const step of path) {
    type = childTypeTable[type][step]
  }
  return type
}
```

### Parent Operation

```typescript
function parent(tile: Tile): Tile | null {
  if (tile.path.length === 0) return null
  return { sector: tile.sector, path: tile.path.slice(0, -1) }
}
```

### Children Operation

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

### Same-Level Neighbors

| Node Type | Same-level sides |
| --------- | ---------------- |
| W         | 2 and 7          |
| B         | 3 and 7          |

### Sibling Navigation

```typescript
function prevSibling(tile: Tile): Tile | null {
  const path = tile.path.slice()
  while (path.length > 0) {
    const last = path[path.length - 1]
    if (last > 0) {
      path[path.length - 1] = last - 1
      return { sector: tile.sector, path }
    }
    path.pop()
  }
  return null
}

function nextSibling(tile: Tile): Tile | null {
  const path = tile.path.slice()
  while (path.length > 0) {
    const parentPath = path.slice(0, -1)
    const type = nodeType(parentPath)
    const max = childTypeTable[type].length - 1
    const last = path[path.length - 1]
    if (last < max) {
      path[path.length - 1] = last + 1
      return { sector: tile.sector, path }
    }
    path.pop()
  }
  return null
}
```

### Sector Wrapping

```typescript
function rotateSector(sector: Sector, dir: -1 | 1): Sector {
  return ((sector + dir + 7) % 7) as Sector
}
```

### All 7 Neighbors

```typescript
function neighbors7(tile: Tile): Tile[] {
  const result: Tile[] = []

  // Side 1: parent
  const p = parent(tile)
  if (p) {
    result.push(p)
  } else {
    result.push({ sector: rotateSector(tile.sector, -1), path: [] })
  }

  // Children (downward edges)
  result.push(...children(tile))

  // Same-level neighbors
  const left = prevSibling(tile)
  const right = nextSibling(tile)
  if (left) result.push(left)
  if (right) result.push(right)

  return result.slice(0, 7)
}
```

### Distance via LCA

```typescript
function depth(tile: Tile): number {
  return tile.path.length
}

function distance(a: Tile, b: Tile): number {
  if (a.sector !== b.sector) {
    return depth(a) + depth(b) + 2
  }

  let lcaDepth = 0
  const minLen = Math.min(a.path.length, b.path.length)
  for (let i = 0; i < minLen; i++) {
    if (a.path[i] === b.path[i]) {
      lcaDepth = i + 1
    } else {
      break
    }
  }

  return depth(a) - lcaDepth + (depth(b) - lcaDepth)
}
```

### Side Number Reference (Heptagrid)

**White Node (W)**:

| Side | Connection Type  |
| ---- | ---------------- |
| 1    | Parent           |
| 2    | Same-level left  |
| 3    | Child 0 (B)      |
| 4    | Child 1 (W)      |
| 5    | Child 2 (W)      |
| 6    | Other adjacency  |
| 7    | Same-level right |

**Black Node (B)**:

| Side | Connection Type  |
| ---- | ---------------- |
| 1    | Parent           |
| 2    | Other adjacency  |
| 3    | Same-level left  |
| 4    | Child 0 (B)      |
| 5    | Child 1 (W)      |
| 6    | Other adjacency  |
| 7    | Same-level right |

## Pentagrid {5,4} Implementation

### Coordinate Model

```typescript
type Sector = 0 | 1 | 2 | 3 | 4 // 5 sectors

type Path = number[]

interface Tile {
  sector: Sector
  path: Path
}
```

### Same Fibonacci Tree

Same standard Fibonacci grammar as heptagrid:

```typescript
type NodeType = 'B' | 'W'

const childTypeTable: Record<NodeType, NodeType[]> = {
  B: ['B', 'W'],
  W: ['B', 'W', 'W'],
}

function nodeType(path: Path): NodeType {
  let type: NodeType = 'W'
  for (const step of path) {
    type = childTypeTable[type][step]
  }
  return type
}
```

### Key Geometric Difference

In the pentagrid, **same-level neighbors only exist for white nodes**.
Black nodes have only parent + children neighbors at that level.

| Node Type | Same-level neighbors |
| --------- | -------------------- |
| W         | yes (2)              |
| B         | none                 |

### All 5 Neighbors

```typescript
function rotateSector(sector: Sector, dir: -1 | 1): Sector {
  return ((sector + dir + 5) % 5) as Sector
}

function neighbors5(tile: Tile): Tile[] {
  const result: Tile[] = []

  const p = parent(tile)
  if (p) {
    result.push(p)
  } else {
    result.push({ sector: rotateSector(tile.sector, -1), path: [] })
  }

  result.push(...children(tile))

  if (nodeType(tile.path) === 'W') {
    const left = prevSibling(tile)
    const right = nextSibling(tile)
    if (left) result.push(left)
    if (right) result.push(right)
  }

  return result.slice(0, 5)
}
```

### Hyperbolic Disk Embedding Helper

Rough radial placement for rendering:

```typescript
function hyperbolicPosition(tile: Tile) {
  const d = tile.path.length
  const angle = ((2 * Math.PI) / 5) * tile.sector
  const r = 1 - Math.exp(-d * 0.7)

  return {
    x: r * Math.cos(angle),
    y: r * Math.sin(angle),
  }
}
```

### Side Number Reference (Pentagrid)

**White Node (W)**:

| Side | Connection Type  |
| ---- | ---------------- |
| 1    | Parent           |
| 2    | Same-level left  |
| 3    | Child 0 (B)      |
| 4    | Child 1 (W)      |
| 5    | Same-level right |

**Black Node (B)**:

| Side | Connection Type |
| ---- | --------------- |
| 1    | Parent          |
| 2    | Child 0 (B)     |
| 3    | Child 1 (W)     |
| 4    | Other adjacency |
| 5    | Other adjacency |

### Comparison: {5,4} vs {7,3}

| Aspect           | {5,4}            | {7,3}            |
| ---------------- | ---------------- | ---------------- |
| Sides per tile   | 5                | 7                |
| Sectors          | 5                | 7                |
| Same-level for W | Yes (sides 2, 5) | Yes (sides 2, 7) |
| Same-level for B | **No**           | Yes (sides 3, 7) |
| B children       | 2                | 2                |
| W children       | 3                | 3                |
| Tree grammar     | Same             | Same             |

## Dodecagrid {5,3,4} Implementation (3D)

The dodecagrid is the 3D hyperbolic analog of the pentagrid.

### Schlafli Symbol

- **{5,3,4}**: Dodecahedra (12 pentagonal faces), 3 meeting at each
  edge, 4 meeting at each vertex
- Each cell is a regular dodecahedron with 12 neighbors

### Coordinate Structure

```typescript
type Octant = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
type NodeType = 0 | 1 | 2 | 3

interface DodecagridCoord {
  octant: Octant
  path: number[]
}
```

The 3D hyperbolic space is divided into **8 octants** around a vertex.

### Node Types

Four node types based on the splitting matrix M:

| Type | Description    |
| ---- | -------------- |
| 0    | Least children |
| 1    | Intermediate   |
| 2    | Intermediate   |
| 3    | Most children  |

### Face Classifications

| Color | Meaning                         |
| ----- | ------------------------------- |
| White | Can be subdivided, visible      |
| Grey  | Shadowed, adjacent to neighbors |
| Dark  | Shadowed, deeper relations      |
| Black | Fully shadowed                  |

### Neighbor Structure

Each dodecahedron has **12 neighbors** (one per face):

| Category | Source                                |
| -------- | ------------------------------------- |
| Father   | 1 neighbor (tree parent)              |
| Sons     | 6-9 neighbors (white faces, children) |
| Nephews  | 2-5 neighbors (grey/dark, non-tree)   |

The split depends on node type:

| Type | Sons | Nephews | Total |
| ---- | ---- | ------- | ----- |
| 3    | 9    | 2       | 12    |
| 2    | 8    | 3       | 12    |
| 1    | 7    | 4       | 12    |
| 0    | 6    | 5       | 12    |

### Key Differences from 2D

| Aspect          | Pentagrid {5,4}      | Dodecagrid {5,3,4}    |
| --------------- | -------------------- | --------------------- |
| Space           | 2D hyperbolic        | 3D hyperbolic         |
| Tiles           | Pentagons            | Dodecahedra           |
| Neighbors       | 5                    | 12                    |
| Sectors/Octants | 5                    | 8                     |
| Node types      | 2 (B, W)             | 4 (0, 1, 2, 3)        |
| Face class      | Simple               | White/Grey/Dark/Black |
| Neighbor types  | Parent/Child/Sibling | Father/Son/Nephew     |

## Generalized {p,q} Engine

### Configuration

```typescript
interface TilingConfig {
  p: number // sides per polygon
  q: number // polygons per vertex

  // Derived values
  numSectors: number // = p
  digitAlphabet: number[] // allowed digits
  branchingRules: BranchingRule[]
}

interface BranchingRule {
  suffixPattern: number[] // pattern to match at end
  nodeType: string
  children: { digit: number; type: string }[]
}
```

### Factory Function

```typescript
function createCoordinates(p: number, q: number): TessellationCoordinates {
  const curvature = (p - 2) * (q - 2)

  if (curvature < 4) {
    // Spherical
    return new SphericalCoordinates(p, q)
  } else if (curvature === 4) {
    // Euclidean
    return new EuclideanCoordinates(p, q)
  } else {
    // Hyperbolic
    return new HyperbolicCoordinates(p, q)
  }
}
```

### Supported Tilings

| Key   | Configuration    |
| ----- | ---------------- |
| 5,4   | Pentagrid        |
| 7,3   | Heptagrid        |
| 5,3,4 | Dodecagrid (3D)  |

### Performance Targets

| Operation   | Spherical | Euclidean | Hyperbolic (Fib) |
| ----------- | --------- | --------- | ---------------- |
| neighbor()  | O(1)      | O(1)      | O(1)             |
| distance()  | O(1)      | O(1)      | O(log n)         |
| path()      | O(n)      | O(d)      | O(d)             |
| tileAt()    | O(n)      | O(1)      | O(log r)         |
| toInteger() | O(1)      | O(1)      | O(1)             |

## Sparse Cell Storage

```typescript
class SparseHyperbolicGrid<T> {
  private cells = new Map<string, T>()

  private addressToKey(addr: Tile): string {
    return `${addr.sector}:${addr.path.join('')}`
  }

  get(addr: Tile): T | undefined {
    return this.cells.get(this.addressToKey(addr))
  }

  set(addr: Tile, value: T): void {
    this.cells.set(this.addressToKey(addr), value)
  }

  getNeighbors(addr: Tile, nbSides: number): (T | undefined)[] {
    const neighbors: (T | undefined)[] = []
    for (let side = 1; side <= nbSides; side++) {
      const neighborAddr = getNeighbor(addr, side, nbSides)
      neighbors.push(this.get(neighborAddr))
    }
    return neighbors
  }
}
```

## References

- Margenstern, M. (2007). Cellular Automata in Hyperbolic Spaces, Vol 1.
- Margenstern, M. (2008). Cellular Automata in Hyperbolic Spaces, Vol 2.
- Chelghoum et al. (2004). Cellular automata in the hyperbolic plane.
