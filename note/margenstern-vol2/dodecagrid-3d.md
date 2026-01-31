# Dodecagrid {5,3,4}: 3D Hyperbolic Tessellation

The dodecagrid is the 3D hyperbolic analog of the pentagrid. This is the
primary 3D tiling covered in Margenstern Volume 2.

## Schlafli Symbol

- **{5,3,4}**: Dodecahedra (12 pentagonal faces), 3 meeting at each
  edge, 4 meeting at each vertex
- Each cell is a regular dodecahedron with 12 neighbors

## Coordinate Structure

### Octants

The 3D hyperbolic space is divided into **8 octants** around a vertex.

- Analogous to 5 sectors in pentagrid (or 7 in heptagrid)
- Each octant is spanned by a tree A

### Dual Tree Structure

Two trees are used:

| Tree | Description                               |
| ---- | ----------------------------------------- |
| T    | Planar tree (abstract representation)     |
| A    | Spatial tree in IH3 (3D hyperbolic space) |

A bijection between T and A is established through "local maps".

### Node Types

Four node types based on the splitting matrix M:

| Type | Description    |
| ---- | -------------- |
| 0    | Least children |
| 1    | Intermediate   |
| 2    | Intermediate   |
| 3    | Most children  |

The number of children depends on node type, determined by matrix M.

### Face Classifications

Faces are classified for the Schlafli diagram representation:

| Color | Meaning                         |
| ----- | ------------------------------- |
| White | Can be subdivided, visible      |
| Grey  | Shadowed, adjacent to neighbors |
| Dark  | Shadowed, deeper relations      |
| Black | Fully shadowed                  |

## Coordinate Representation

A coordinate in the dodecagrid is:

```typescript
interface DodecagridCoord {
  octant: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 // 8 octants
  path: number[] // tree address within octant
}
```

The path uses the "language of the splitting" with digits determined by
node types and the matrix M.

## Neighbor Structure

Each dodecahedron has **12 neighbors** (one per face):

### Neighbor Categories

| Category | Source                                        |
| -------- | --------------------------------------------- |
| Father   | 1 neighbor (tree parent)                      |
| Sons     | 6-9 neighbors (white faces, tree children)    |
| Nephews  | 2-5 neighbors (grey/dark faces, uncle/nephew) |

The split depends on node type:

| Type | Sons | Nephews | Total |
| ---- | ---- | ------- | ----- |
| 3    | 9    | 2       | 12    |
| 2    | 8    | 3       | 12    |
| 1    | 7    | 4       | 12    |
| 0    | 6    | 5       | 12    |

### Uncle/Nephew Relations

For faces not covered by father/son relationships:

- **Uncle**: Brother of father that shares a side with the cell
- **Nephew**: Sub-face of uncle adjacent to the cell

These relations enable computation of all 12 neighbors from tree
position.

## Algorithms

### Algorithm 1: Path from Node to Root

**Input**: Node number n in the octant tree **Output**: Path from n to
root

Key operations:

1. Determine level k from length of n
2. For each level h from 1 to k:
   - Find which subtree contains n using width function w(k,s)
   - Update border and detected subtree
3. Return the path traversed

**Complexity**: Quadratic space, cubic time (Theorem 8)

### Algorithm 2: Find Face Line (Neighbors)

**Input**: Face F and index word **Output**: List of faces forming the
"face line"

Uses auxiliary functions:

- `outer_brother(F)`: Grey or black brother that is outer
- `index(F, G)`: Index of F with respect to G
- `colour(F)`: White, grey, dark, or black
- `uncle(F)`: Brother of father sharing side with F
- `nephew(F, i)`: Sub-face with F as uncle at index i
- `brother(F, i)`: Sub-face of father sharing side at index i

**Complexity**: Quadratic space, cubic time (Theorem 9)

## Local Maps

Local maps define the ordering of sub-faces within a face:

- **Direct order**: Counter-clockwise enumeration
- **Reverse order**: Clockwise enumeration

The order alternates based on node type and position. Yellow-marked
faces in diagrams indicate reverse order should be used for next
generation.

## Key Differences from 2D

| Aspect              | Pentagrid {5,4}      | Dodecagrid {5,3,4}    |
| ------------------- | -------------------- | --------------------- |
| Space               | 2D hyperbolic        | 3D hyperbolic         |
| Tiles               | Pentagons            | Dodecahedra           |
| Neighbors           | 5                    | 12                    |
| Sectors/Octants     | 5                    | 8                     |
| Node types          | 2 (B, W)             | 4 (0, 1, 2, 3)        |
| Face classification | Simple               | White/Grey/Dark/Black |
| Neighbor relations  | Parent/Child/Sibling | Father/Son/Nephew     |

## Implementation Notes

### Crossing Elimination

In 3D, crossings can be replaced by **bridges**:

- Tracks pass over/under each other
- Eliminates need for special crossing states
- Reduces state count from 9 to 5 for universal CA

### Rule Format

Rules have the format:

```
father son1...sonK nephew1...nephewM -> new_state
```

Where K + M + 1 = 12 (father) = 13 total neighbor positions.

### Coordinate Change

The same linear-time coordinate change algorithm from 2D extends:

- Compute shortest path from new origin to target
- Convert path to coordinate in new reference frame

## Splitting Matrix M

The matrix M encodes the branching structure:

- Row s: node type of parent
- Column t: number of children of type t
- M^k: widths at level k

Used to compute:

- w(k, s): Number of nodes of type s at level k
- Cumulative widths for path algorithms

## TypeScript Sketch

```typescript
type Octant = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
type NodeType = 0 | 1 | 2 | 3

interface DodecagridCoord {
  octant: Octant
  path: number[]
}

// Splitting matrix (example structure)
const M: number[][] = [
  // Row = parent type, Col = child type count
  // [type3, type2, type1, type0]
  [
    /* ... */
  ],
  [
    /* ... */
  ],
  [
    /* ... */
  ],
  [
    /* ... */
  ],
]

function nodeType(coord: DodecagridCoord): NodeType {
  // Compute type by traversing path with matrix
  // ...
}

function father(coord: DodecagridCoord): DodecagridCoord | null {
  if (coord.path.length === 0) return null
  return { octant: coord.octant, path: coord.path.slice(0, -1) }
}

function sons(coord: DodecagridCoord): DodecagridCoord[] {
  // Return white sub-faces (tree children)
  // Number depends on node type
  // ...
}

function nephews(coord: DodecagridCoord): DodecagridCoord[] {
  // Return neighbors via uncle/nephew relations
  // Number depends on node type
  // ...
}

function neighbors12(coord: DodecagridCoord): DodecagridCoord[] {
  const f = father(coord)
  const s = sons(coord)
  const n = nephews(coord)
  return f ? [f, ...s, ...n] : [...s, ...n]
}
```

## References

- Volume 1, Chapter 5: Dodecagrid introduction and splitting
- Volume 2, Section 4.4: Implementation details
- Volume 2, Section 4.4.1: Coordinate algorithms
- Volume 2, Section 4.4.2: Rule format
