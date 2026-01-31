# 3D Hyperbolic Tessellation Implementation Plan

A detailed plan for implementing 3D hyperbolic tessellation (honeycombs)
using the hyperboloid model, following the patterns established in
`code/tessellation/hyperbolic2d.ts`.

## Overview

The 2D implementation uses:

1. **Hyperboloid model** via SU(1,1) transforms (Möbius transformations)
2. **Margenstern coordinates** for algebraic tile addressing
3. **HyperRogue-style navigation** with lazy neighbor creation
4. **Fibonacci/Zeckendorf representation** for tree indexing

The 3D implementation needs equivalent structures in one higher
dimension.

## Key Differences: 2D vs 3D

| Aspect     | 2D                      | 3D                         |
| ---------- | ----------------------- | -------------------------- |
| Space      | H² (hyperbolic plane)   | H³ (hyperbolic 3-space)    |
| Model      | Hyperboloid in R^(2,1)  | Hyperboloid in R^(3,1)     |
| Transforms | SU(1,1) / PSL(2,R)      | SO(3,1) / PSL(2,C)         |
| Cells      | p-gons (polygons)       | Polyhedra with {p,q} faces |
| Notation   | {p,q} (Schläfli)        | {p,q,r} (Schläfli)         |
| Neighbors  | p neighbors per cell    | Variable (face count)      |
| Boundary   | S¹ (circle at infinity) | S² (sphere at infinity)    |
| Projection | Poincaré disk           | Poincaré ball              |
| Complexity | Exponential growth      | Faster exponential growth  |

## Target Honeycombs

Regular compact hyperbolic honeycombs (finite cells, finite vertex
figures):

| Symbol  | Cell                            | Vertex Figure | Cells/Edge |
| ------- | ------------------------------- | ------------- | ---------- |
| {3,5,3} | Icosahedron (face tiling {3,5}) | Dodecahedron  | 3          |
| {4,3,5} | Cube ({4,3} faces)              | Icosahedron   | 5          |
| {5,3,4} | Dodecahedron ({5,3} faces)      | Octahedron    | 4          |
| {5,3,5} | Dodecahedron ({5,3} faces)      | Icosahedron   | 5          |

Paracompact (ideal vertices, still useful):

| Symbol  | Description             |
| ------- | ----------------------- |
| {6,3,3} | Hexagonal tiling cells  |
| {7,3,3} | Heptagonal tiling cells |

Start with **{4,3,5}** (cubes, 5 per edge) as it's the simplest regular
compact honeycomb.

## Data Model

### 1. Point Types

```typescript
// Point on hyperboloid: x² + y² + z² - w² = -1, w > 0
type HyperboloidPoint3D = [number, number, number, number] // [x, y, z, w]

// Point in Poincaré ball: x² + y² + z² < 1
type BallPoint3D = [number, number, number]

// Point on ideal boundary S²
type BoundaryPoint = [number, number, number] // unit sphere
```

### 2. Transform Type

```typescript
// SO(3,1) matrix: preserves Minkowski metric
// |a| = 4x4 matrix with det = 1
type LorentzMatrix = [
  number,
  number,
  number,
  number, // row 0
  number,
  number,
  number,
  number, // row 1
  number,
  number,
  number,
  number, // row 2
  number,
  number,
  number,
  number, // row 3
]

// Alternative: quaternionic representation
// PSL(2,C) acts on H³ via quaternionic linear fractional transformations
interface QuaternionPair {
  a: Quaternion // [w, x, y, z]
  b: Quaternion
}
```

### 3. Cell Address (3D Margenstern Equivalent)

The 2D system uses sector + tree index. For 3D, we need a hierarchical
addressing scheme based on the honeycomb's combinatorial structure.

```typescript
// Option A: Generalized Margenstern for 3D
interface HoneycombAddress {
  // Initial cell determines a "cone" toward boundary
  sector: number // Index of initial direction (0 = origin)

  // Path through spanning tree
  // Each step is a face direction (0 to numFaces-1)
  path: number[]

  // Alternative: encode as bigint using mixed-radix
  // For {4,3,5}: base-6 encoding (6 faces per cube)
  pathIndex: bigint
}

// Option B: Coxeter word representation
interface CoxeterAddress {
  // Word in Coxeter generators
  // For {4,3,5}: generators are reflections across cell faces
  word: number[] // Sequence of generator indices
}
```

### 4. Cell Structure

```typescript
interface Cell3D {
  id: number
  address: HoneycombAddress

  // Geometry
  vertices: HyperboloidPoint3D[] // Polyhedron vertices
  edges: [number, number][] // Vertex index pairs
  faces: number[][] // Vertex indices per face

  // Navigation (lazy, like 2D)
  neighbors: (Cell3D | null)[] // One per face
  neighborSpins: number[] // Which face of neighbor connects back

  // Metadata
  distance: number // From origin cell
  transform: LorentzMatrix | null // Cached transform from origin

  // Visibility
  lastSeenFrame: number
}
```

### 5. Visible Cell (for Rendering)

```typescript
interface VisibleCell3D {
  id: string
  address: string

  // Projected to Poincaré ball
  vertices: BallPoint3D[]
  edges: [number, number][]
  faces: number[][]

  // For shading
  faceNormals: BallPoint3D[]
  faceCenters: BallPoint3D[]

  depth: number
}
```

### 6. Configuration

```typescript
interface Honeycomb3DConfig {
  p: number // Face polygon sides
  q: number // Faces meeting at each cell vertex
  r: number // Cells meeting at each edge

  maxCells: number
  maxDepth: number

  // Rendering
  renderMode: 'wireframe' | 'solid' | 'faces'
  cullBackFaces: boolean
}
```

## Core Algorithms

### 1. Geometry Computation

#### Base Cell Vertices

For {4,3,5} (cube cells), compute vertices in hyperboloid model:

```typescript
function computeCubeVertices(
  config: Honeycomb3DConfig,
): HyperboloidPoint3D[] {
  const { p, q, r } = config

  // Edge length from hyperbolic trigonometry
  // For {p,q,r}: use Schläfli function or numerical solve
  const edgeLength = computeHoneycombEdgeLength(p, q, r)

  // Distance from cell center to vertex
  const vertexDist = computeVertexDistance(p, q, edgeLength)

  // Cube has 8 vertices at (±a, ±a, ±a) in tangent space
  // Map to hyperboloid
  const a = vertexDist / Math.sqrt(3)
  const vertices: HyperboloidPoint3D[] = []

  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        vertices.push(tangentToHyperboloid([sx * a, sy * a, sz * a]))
      }
    }
  }

  return vertices
}
```

#### Face-Crossing Transforms

```typescript
function computeFaceTransforms(
  baseVertices: HyperboloidPoint3D[],
  faces: number[][],
  config: Honeycomb3DConfig,
): LorentzMatrix[] {
  const transforms: LorentzMatrix[] = []

  for (let faceIdx = 0; faceIdx < faces.length; faceIdx++) {
    // Compute face center and normal
    const faceVerts = faces[faceIdx].map(i => baseVertices[i])
    const center = averagePoint(faceVerts)
    const normal = computeFaceNormal(faceVerts)

    // Distance to neighbor cell center
    // = 2 * (distance from cell center to face center)
    const neighborDist = 2 * hyperbolicDistance(ORIGIN, center)

    // Translation along normal to neighbor
    const translation = createHyperbolicTranslation(
      normal,
      neighborDist,
    )

    // Rotation to align faces (π rotation about face normal)
    const rotation = createRotationAboutAxis(normal, Math.PI)

    transforms.push(composeLorentz(translation, rotation))
  }

  return transforms
}
```

### 2. Coordinate Conversion

```typescript
// Hyperboloid to Poincaré ball
function hyperboloidToBall(p: HyperboloidPoint3D): BallPoint3D {
  const [x, y, z, w] = p
  // Stereographic projection from (0,0,0,-1)
  const denom = w + 1
  return [x / denom, y / denom, z / denom]
}

// Poincaré ball to hyperboloid
function ballToHyperboloid(p: BallPoint3D): HyperboloidPoint3D {
  const [x, y, z] = p
  const r2 = x * x + y * y + z * z
  const denom = 1 - r2
  return [
    (2 * x) / denom,
    (2 * y) / denom,
    (2 * z) / denom,
    (1 + r2) / denom,
  ]
}
```

### 3. Lorentz Group Operations

```typescript
// SO(3,1) matrix multiplication
function composeLorentz(
  a: LorentzMatrix,
  b: LorentzMatrix,
): LorentzMatrix {
  // Standard 4x4 matrix multiplication
  // but with Minkowski metric preservation
  const result: LorentzMatrix = new Array(16).fill(0) as LorentzMatrix

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let sum = 0
      for (let k = 0; k < 4; k++) {
        sum += a[i * 4 + k] * b[k * 4 + j]
      }
      result[i * 4 + j] = sum
    }
  }

  return result
}

// Apply transform to point
function applyLorentz(
  m: LorentzMatrix,
  p: HyperboloidPoint3D,
): HyperboloidPoint3D {
  const [x, y, z, w] = p
  return [
    m[0] * x + m[1] * y + m[2] * z + m[3] * w,
    m[4] * x + m[5] * y + m[6] * z + m[7] * w,
    m[8] * x + m[9] * y + m[10] * z + m[11] * w,
    m[12] * x + m[13] * y + m[14] * z + m[15] * w,
  ]
}

// Inverse of Lorentz transform
function invertLorentz(m: LorentzMatrix): LorentzMatrix {
  // For SO(3,1), inverse is η * M^T * η where η = diag(1,1,1,-1)
  // Equivalently: transpose with sign flips in last row/column
  return [
    m[0],
    m[4],
    m[8],
    -m[12],
    m[1],
    m[5],
    m[9],
    -m[13],
    m[2],
    m[6],
    m[10],
    -m[14],
    -m[3],
    -m[7],
    -m[11],
    m[15],
  ]
}

// Create translation along direction by hyperbolic distance
function createHyperbolicTranslation(
  direction: BallPoint3D,
  distance: number,
): LorentzMatrix {
  // Boost matrix in direction (x,y,z) by rapidity = distance
  const [dx, dy, dz] = normalize(direction)
  const c = Math.cosh(distance)
  const s = Math.sinh(distance)

  // Lorentz boost matrix
  return [
    1 + (c - 1) * dx * dx,
    (c - 1) * dx * dy,
    (c - 1) * dx * dz,
    s * dx,
    (c - 1) * dy * dx,
    1 + (c - 1) * dy * dy,
    (c - 1) * dy * dz,
    s * dy,
    (c - 1) * dz * dx,
    (c - 1) * dz * dy,
    1 + (c - 1) * dz * dz,
    s * dz,
    s * dx,
    s * dy,
    s * dz,
    c,
  ]
}

// Create rotation about axis
function createRotationAboutAxis(
  axis: BallPoint3D,
  angle: number,
): LorentzMatrix {
  const [x, y, z] = normalize(axis)
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const t = 1 - c

  // 3D rotation embedded in 4x4 Lorentz matrix
  return [
    t * x * x + c,
    t * x * y - s * z,
    t * x * z + s * y,
    0,
    t * x * y + s * z,
    t * y * y + c,
    t * y * z - s * x,
    0,
    t * x * z - s * y,
    t * y * z + s * x,
    t * z * z + c,
    0,
    0,
    0,
    0,
    1,
  ]
}
```

### 4. Cell Addressing (3D Margenstern System)

The Margenstern 3D system (for dodecagrid {5,3,4}) provides the
template. Key differences from 2D:

| Aspect         | 2D {7,3}             | 3D {5,3,4}            |
| -------------- | -------------------- | --------------------- |
| Sectors        | 7 sectors            | 8 octants             |
| Node types     | 2 (Black, White)     | 4 (Type 0,1,2,3)      |
| Neighbors      | 7                    | 12                    |
| Neighbor types | Parent/Child/Sibling | Father/Son/Nephew     |
| Face classes   | None                 | White/Grey/Dark/Black |

#### Octant-Based Addressing

```typescript
type Octant = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
type NodeType3D = 0 | 1 | 2 | 3

interface DodecagridAddress {
  octant: Octant // Which octant (like sector in 2D)
  path: number[] // Tree address within octant
}

// Face classification for neighbor computation
type FaceColor = 'white' | 'grey' | 'dark' | 'black'
```

#### Node Types and Branching

Four node types with different child counts:

| Type | Sons (white faces) | Nephews (grey/dark) | Total |
| ---- | ------------------ | ------------------- | ----- |
| 3    | 9                  | 2                   | 12    |
| 2    | 8                  | 3                   | 12    |
| 1    | 7                  | 4                   | 12    |
| 0    | 6                  | 5                   | 12    |

The splitting matrix M encodes the branching structure:

```typescript
// M[parentType][childType] = count of children of that type
const SPLITTING_MATRIX_534: number[][] = [
  // Type 3, 2, 1, 0 children counts
  [
    /* type 3 parent */
  ],
  [
    /* type 2 parent */
  ],
  [
    /* type 1 parent */
  ],
  [
    /* type 0 parent */
  ],
]

function getNodeType(path: number[]): NodeType3D {
  // Traverse path applying splitting rules
  let type: NodeType3D = 3 // Root is type 3
  for (const step of path) {
    type = childType(type, step)
  }
  return type
}
```

#### Father/Son/Nephew Neighbor Relations

```typescript
interface NeighborInfo {
  relation: 'father' | 'son' | 'nephew'
  faceColor: FaceColor
  address: DodecagridAddress
}

function getNeighbors12(addr: DodecagridAddress): NeighborInfo[] {
  const type = getNodeType(addr.path)
  const neighbors: NeighborInfo[] = []

  // 1 Father (always)
  const father = getFather(addr)
  if (father) {
    neighbors.push({
      relation: 'father',
      faceColor: 'white',
      address: father,
    })
  }

  // Sons: 6-9 depending on type (white faces = tree children)
  const sons = getSons(addr, type)
  for (const son of sons) {
    neighbors.push({
      relation: 'son',
      faceColor: 'white',
      address: son,
    })
  }

  // Nephews: 2-5 depending on type (grey/dark faces)
  const nephews = getNephews(addr, type)
  for (const nephew of nephews) {
    neighbors.push({
      relation: 'nephew',
      faceColor: 'grey',
      address: nephew,
    })
  }

  return neighbors
}

function getFather(addr: DodecagridAddress): DodecagridAddress | null {
  if (addr.path.length === 0) return null // Root has no father
  return { octant: addr.octant, path: addr.path.slice(0, -1) }
}

function getSons(
  addr: DodecagridAddress,
  type: NodeType3D,
): DodecagridAddress[] {
  const sonCounts = [6, 7, 8, 9] // Type 0,1,2,3 have this many sons
  const count = sonCounts[type]
  const sons: DodecagridAddress[] = []

  for (let i = 0; i < count; i++) {
    sons.push({ octant: addr.octant, path: [...addr.path, i] })
  }
  return sons
}

function getNephews(
  addr: DodecagridAddress,
  type: NodeType3D,
): DodecagridAddress[] {
  // Nephews are sub-faces of uncle (brother of father)
  // Use local maps and face line algorithms from Margenstern
  const uncle = getUncle(addr)
  if (!uncle) return []

  const nephewCounts = [5, 4, 3, 2] // Type 0,1,2,3 have this many nephews
  const count = nephewCounts[type]
  const nephews: DodecagridAddress[] = []

  for (let i = 0; i < count; i++) {
    nephews.push(getNephewAtIndex(uncle, addr, i))
  }
  return nephews
}
```

#### Adapting for {4,3,5} (Cube Cells)

For {4,3,5} (6 faces per cube), we need similar structure:

```typescript
interface CubeHoneycombAddress {
  octant: number // Number of octants depends on vertex figure
  path: number[]
}

// {4,3,5}: 5 cubes meet at each edge
// Each cube has 6 neighbors (one per face)
// Node types and splitting determined by honeycomb geometry

function computeCubeSplitting(): number[][] {
  // Derive from {4,3,5} combinatorics
  // This requires analyzing the Coxeter group
}
```

### 5. Visibility Culling

```typescript
interface FrustumCuller3D {
  // Camera position in ball model
  position: BallPoint3D

  // View direction
  direction: BallPoint3D

  // Field of view
  fov: number

  // Test if cell is potentially visible
  isVisible(cell: Cell3D): boolean
}

function createCuller(camera: Camera3D): FrustumCuller3D {
  return {
    position: camera.position,
    direction: camera.direction,
    fov: camera.fov,

    isVisible(cell: Cell3D): boolean {
      // Transform cell to view space
      const viewTransform = camera.getViewMatrix()
      const projectedVerts = cell.vertices.map(v => {
        const ball = hyperboloidToBall(applyLorentz(viewTransform, v))
        return projectToScreen(ball, camera)
      })

      // Check if any vertex is in front of camera and within ball
      const inBall = projectedVerts.some(
        ([x, y, z]) => x * x + y * y + z * z < 0.98,
      )

      // Check frustum (simplified)
      const inFrustum = projectedVerts.some(([x, y, z]) => {
        const projected = projectToBall([x, y, z])
        return (
          Math.abs(projected[0]) < 1.5 && Math.abs(projected[1]) < 1.5
        )
      })

      return inBall && inFrustum
    },
  }
}
```

### 6. BFS Expansion (like 2D getVisibleTiles)

```typescript
function getVisibleCells(
  tessellation: Hyperbolic3DTessellation,
  camera: Camera3D,
): VisibleCell3D[] {
  const visible: VisibleCell3D[] = []
  const visited = new Set<Cell3D>()
  const culler = createCuller(camera)

  const queue: Cell3D[] = [tessellation.centerCell]
  let visibleCells: Cell3D[] = []

  // Phase 1: Find visible cells
  while (queue.length > 0 && visibleCells.length === 0) {
    const cell = queue.shift()!
    if (visited.has(cell)) continue
    visited.add(cell)

    if (culler.isVisible(cell)) {
      visibleCells.push(cell)
    }

    // Expand neighbors
    for (let f = 0; f < cell.neighbors.length; f++) {
      const neighbor = tessellation.move(cell, f)
      if (!visited.has(neighbor)) {
        queue.push(neighbor)
      }
    }
  }

  // Phase 2: Expand from visible cells
  let visibleIdx = 0
  while (
    visibleIdx < visibleCells.length &&
    visible.length < config.maxCells
  ) {
    const cell = visibleCells[visibleIdx++]

    for (let f = 0; f < cell.neighbors.length; f++) {
      const neighbor = tessellation.move(cell, f)
      if (visited.has(neighbor)) continue
      visited.add(neighbor)

      if (culler.isVisible(neighbor)) {
        visibleCells.push(neighbor)
      }
    }
  }

  // Convert to renderable format
  for (const cell of visibleCells) {
    visible.push(cellToVisible(cell, camera))
  }

  return visible
}
```

## Implementation Phases

### Phase 1: Core Math (Week 1)

1. **Hyperboloid arithmetic**

   - Point representation [x, y, z, w]
   - Minkowski inner product
   - Hyperbolic distance

2. **Lorentz transforms**

   - SO(3,1) matrix operations
   - Composition, inverse
   - Translation, rotation creation

3. **Coordinate conversion**

   - Hyperboloid ↔ Poincaré ball
   - Hyperboloid ↔ Klein ball
   - Screen projection

4. **Unit tests**
   - Transform composition
   - Point transformations
   - Distance preservation

### Phase 2: Base Cell Geometry (Week 2)

1. **Honeycomb parameters**

   - Edge length computation for {p,q,r}
   - Schläfli function implementation
   - Numerical solver for non-analytic cases

2. **Cell vertex computation**

   - Cube vertices for {4,3,5}
   - Dodecahedron vertices for {5,3,4}, {5,3,5}
   - Icosahedron vertices for {3,5,3}

3. **Face and edge structure**

   - Face vertex lists
   - Edge pairs
   - Face normals

4. **Face-crossing transforms**
   - Translation to neighbor
   - Rotation alignment
   - Precompute for all faces

### Phase 3: Addressing System (Week 3)

1. **Design 3D address scheme**

   - Analyze honeycomb symmetry
   - Define spanning tree structure
   - Document branching rules

2. **Implement address computation**

   - Origin cell case
   - Sector leader cases
   - General cell neighbor formulas

3. **Address ↔ string conversion**

   - Serialization for Map keys
   - Parsing for navigation

4. **Caching**
   - Address lookup cache
   - Transform hash cache

### Phase 4: Tessellation Class (Week 4)

1. **Core class structure**

   ```typescript
   class Hyperbolic3DTessellation {
     private config: Honeycomb3DConfig
     private origin: Cell3D
     private centerCell: Cell3D
     private viewTransform: LorentzMatrix
     private cellByAddress: Map<string, Cell3D>
     private cellByHash: Map<string, Cell3D>
   }
   ```

2. **Lazy neighbor creation (move)**

   - Compute neighbor address
   - Check existing cells
   - Create if needed
   - Bidirectional linking

3. **View transform handling**

   - Set view transform
   - Update center cell
   - Walk toward view center

4. **Visible cell generation**
   - BFS from center
   - Visibility testing
   - Result formatting

### Phase 5: Rendering Integration (Week 5)

1. **Three.js integration**

   - BufferGeometry for cells
   - Instanced rendering for many cells
   - Material setup (wireframe, solid)

2. **Camera controls**

   - Hyperbolic camera model
   - Navigation (translate, rotate)
   - Center-on-cell animation

3. **Visual polish**

   - Depth-based coloring
   - Transparency for depth cues
   - Edge highlighting

4. **Performance optimization**
   - Frustum culling
   - LOD (simpler geometry for distant cells)
   - Cell pooling/recycling

### Phase 6: Advanced Features (Week 6+)

1. **Additional honeycombs**

   - {5,3,4} dodecahedra
   - {5,3,5} dodecahedra
   - {3,5,3} icosahedra

2. **Navigation API**

   - Click-to-navigate
   - Path finding
   - Animation interpolation

3. **Fractal overlays**

   - Sierpinski in faces
   - Nested honeycombs
   - Limit set visualization

4. **Slice views**
   - 2D slices through honeycomb
   - Animated slice position
   - Compare to 2D tilings

## File Structure

```
code/
├── tessellation/
│   ├── hyperbolic2d.ts        # Existing 2D implementation
│   ├── hyperbolic3d.ts        # New 3D implementation
│   └── index.ts               # Re-exports
├── math/
│   ├── lorentz.ts             # SO(3,1) operations
│   ├── hyperboloid3d.ts       # H³ point operations
│   └── quaternion.ts          # Alternative representation
├── geometry/
│   ├── polyhedra/
│   │   ├── cube.ts            # Cube geometry
│   │   ├── dodecahedron.ts    # Dodecahedron geometry
│   │   └── icosahedron.ts     # Icosahedron geometry
│   └── honeycomb/
│       ├── parameters.ts      # Edge length, angles
│       └── faces.ts           # Face structure
└── rendering/
    └── 3d/
        ├── renderer.ts        # HyperbolicHoneycombRenderer
        ├── instanced.ts       # InstancedHoneycombRenderer
        ├── edges.ts           # HoneycombEdgeRenderer
        ├── camera.ts          # HyperbolicCamera3D
        ├── controls.ts        # HyperbolicOrbitControls
        ├── materials.ts       # Shader materials
        └── index.ts           # Re-exports
```

## Three.js Rendering Architecture

The 3D hyperbolic tessellation needs Three.js integration for WebGL
rendering. This section details how to transform our computation model
to Three.js structures.

### 1. Converting VisibleCell3D to BufferGeometry

Each cell's vertices are in Poincaré ball coordinates, which map
directly to Three.js world coordinates (the ball is centered at origin
with radius < 1).

```typescript
import * as THREE from 'three'

function cellToGeometry(cell: VisibleCell3D): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()

  // Vertices: flatten BallPoint3D[] to Float32Array
  const positions = new Float32Array(cell.vertices.length * 3)
  for (let i = 0; i < cell.vertices.length; i++) {
    positions[i * 3] = cell.vertices[i][0]
    positions[i * 3 + 1] = cell.vertices[i][1]
    positions[i * 3 + 2] = cell.vertices[i][2]
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  // Indices: triangulate each face
  const indices: number[] = []
  for (const face of cell.faces) {
    // Fan triangulation from first vertex
    for (let i = 1; i < face.length - 1; i++) {
      indices.push(face[0], face[i], face[i + 1])
    }
  }
  geometry.setIndex(indices)

  // Normals for lighting
  geometry.computeVertexNormals()

  return geometry
}

function cellToEdgeGeometry(cell: VisibleCell3D): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()

  // For LineSegments, we need pairs of vertices
  const positions = new Float32Array(cell.edges.length * 6)
  for (let i = 0; i < cell.edges.length; i++) {
    const [a, b] = cell.edges[i]
    const va = cell.vertices[a]
    const vb = cell.vertices[b]
    positions[i * 6] = va[0]
    positions[i * 6 + 1] = va[1]
    positions[i * 6 + 2] = va[2]
    positions[i * 6 + 3] = vb[0]
    positions[i * 6 + 4] = vb[1]
    positions[i * 6 + 5] = vb[2]
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  return geometry
}
```

### 2. Instanced Rendering for Performance

With potentially hundreds of cells visible, instanced rendering is
essential. Since all cells of a honeycomb have the same combinatorial
structure, we can use a single template geometry with per-instance
transforms.

```typescript
interface CellInstanceData {
  transform: THREE.Matrix4 // Lorentz transform composed with projection
  color: THREE.Color // Per-cell coloring (depth-based, etc.)
  depth: number
}

class InstancedHoneycombRenderer {
  private baseGeometry: THREE.BufferGeometry
  private instancedMesh: THREE.InstancedMesh
  private maxInstances: number

  constructor(templateCell: Cell3D, maxInstances: number = 2000) {
    this.maxInstances = maxInstances

    // Create base geometry from origin cell
    this.baseGeometry = this.createBaseGeometry(templateCell)

    // Create instanced mesh
    const material = this.createMaterial()
    this.instancedMesh = new THREE.InstancedMesh(
      this.baseGeometry,
      material,
      maxInstances,
    )
    this.instancedMesh.count = 0 // Start with zero visible
  }

  private createBaseGeometry(cell: Cell3D): THREE.BufferGeometry {
    // Convert origin cell vertices to ball coordinates
    const ballVerts = cell.vertices.map(hyperboloidToBall)

    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(ballVerts.length * 3)
    for (let i = 0; i < ballVerts.length; i++) {
      positions[i * 3] = ballVerts[i][0]
      positions[i * 3 + 1] = ballVerts[i][1]
      positions[i * 3 + 2] = ballVerts[i][2]
    }
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3),
    )

    // Triangulate faces
    const indices: number[] = []
    for (const face of cell.faces) {
      for (let i = 1; i < face.length - 1; i++) {
        indices.push(face[0], face[i], face[i + 1])
      }
    }
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    return geometry
  }

  private createMaterial(): THREE.Material {
    // Custom shader material for hyperbolic rendering
    return new THREE.ShaderMaterial({
      uniforms: {
        viewPosition: { value: new THREE.Vector3(0, 0, 0) },
        baseColor: { value: new THREE.Color(0.3, 0.5, 0.8) },
        edgeColor: { value: new THREE.Color(1, 1, 1) },
        fogDensity: { value: 2.0 },
      },
      vertexShader: `
        attribute vec3 instanceColor;
        varying vec3 vColor;
        varying vec3 vPosition;
        varying vec3 vNormal;

        void main() {
          vColor = instanceColor;
          vNormal = normalMatrix * normal;
          vec4 worldPos = instanceMatrix * vec4(position, 1.0);
          vPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 viewPosition;
        uniform float fogDensity;
        varying vec3 vColor;
        varying vec3 vPosition;
        varying vec3 vNormal;

        void main() {
          // Distance-based fog in Poincaré ball
          float r = length(vPosition);
          float fog = 1.0 - exp(-fogDensity * r * r);

          // Simple lighting
          vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
          float diff = max(dot(normalize(vNormal), lightDir), 0.3);

          vec3 color = vColor * diff;
          color = mix(color, vec3(0.1, 0.1, 0.15), fog);

          gl_FragColor = vec4(color, 1.0 - fog * 0.5);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    })
  }

  updateInstances(cells: VisibleCell3D[], viewTransform: LorentzMatrix) {
    const count = Math.min(cells.length, this.maxInstances)
    this.instancedMesh.count = count

    const colorArray = new Float32Array(count * 3)
    const matrix = new THREE.Matrix4()

    for (let i = 0; i < count; i++) {
      const cell = cells[i]

      // Compute instance transform
      // This maps base cell → this cell's position in ball model
      const cellTransform = this.computeCellTransform(cell, viewTransform)
      matrix.fromArray(cellTransform)
      this.instancedMesh.setMatrixAt(i, matrix)

      // Depth-based coloring
      const hue = (cell.depth * 0.1) % 1.0
      const color = new THREE.Color().setHSL(hue, 0.6, 0.5)
      colorArray[i * 3] = color.r
      colorArray[i * 3 + 1] = color.g
      colorArray[i * 3 + 2] = color.b
    }

    // Update instance attributes
    this.instancedMesh.instanceMatrix.needsUpdate = true
    this.baseGeometry.setAttribute(
      'instanceColor',
      new THREE.InstancedBufferAttribute(colorArray, 3),
    )
  }

  private computeCellTransform(
    cell: VisibleCell3D,
    viewTransform: LorentzMatrix,
  ): number[] {
    // The transform that maps base cell to this cell
    // is embedded in the cell's geometry (already projected)
    // For instancing, we need the 4x4 matrix

    // Since vertices are already in ball coords, we compute
    // a best-fit rigid transform from base to cell vertices
    return computeRigidTransform(this.baseVertices, cell.vertices)
  }

  getMesh(): THREE.InstancedMesh {
    return this.instancedMesh
  }
}
```

### 3. Hyperbolic Camera Controls

The camera needs special handling because movement in hyperbolic space
is non-Euclidean. We track the camera as a Lorentz transform.

```typescript
class HyperbolicCamera3D {
  private transform: LorentzMatrix // Camera's position/orientation
  private threeCamera: THREE.PerspectiveCamera

  constructor(fov: number = 75, aspect: number = 1) {
    this.transform = IDENTITY_LORENTZ
    this.threeCamera = new THREE.PerspectiveCamera(fov, aspect, 0.001, 10)
    this.threeCamera.position.set(0, 0, 2) // Outside the ball looking in
    this.threeCamera.lookAt(0, 0, 0)
  }

  // Translate camera in hyperbolic space
  translate(direction: BallPoint3D, distance: number) {
    const boost = createHyperbolicTranslation(direction, distance)
    this.transform = composeLorentz(boost, this.transform)
  }

  // Rotate camera view
  rotate(axis: BallPoint3D, angle: number) {
    const rotation = createRotationAboutAxis(axis, angle)
    this.transform = composeLorentz(rotation, this.transform)
  }

  // Get the Lorentz transform for rendering
  getViewTransform(): LorentzMatrix {
    return invertLorentz(this.transform)
  }

  // Get Three.js camera for scene rendering
  getCamera(): THREE.PerspectiveCamera {
    return this.threeCamera
  }

  // Convert hyperbolic camera state to Three.js camera
  // The Three.js camera looks at the Poincaré ball from outside
  updateThreeCamera(orbitRadius: number = 2.5) {
    // Extract position from transform (where origin maps to)
    const pos = applyLorentz(this.transform, ORIGIN_HYPERBOLOID)
    const ballPos = hyperboloidToBall(pos)

    // Camera orbits outside ball, looking at our hyperbolic position
    const lookAt = new THREE.Vector3(...ballPos)

    // Compute camera position: orbit around ball based on view direction
    const forward = this.getForwardDirection()
    const camPos = new THREE.Vector3(
      -forward[0] * orbitRadius,
      -forward[1] * orbitRadius,
      -forward[2] * orbitRadius + orbitRadius,
    )

    this.threeCamera.position.copy(camPos)
    this.threeCamera.lookAt(lookAt)
  }

  private getForwardDirection(): BallPoint3D {
    // Forward direction in camera's local frame
    const forward: HyperboloidPoint3D = [0, 0, 1, 0] // tangent vector
    const worldForward = applyLorentzToTangent(this.transform, forward)
    return normalize([worldForward[0], worldForward[1], worldForward[2]])
  }
}
```

### 4. Orbit Controls Integration

For easier navigation, we can combine hyperbolic camera with Three.js
OrbitControls.

```typescript
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

class HyperbolicOrbitControls {
  private controls: OrbitControls
  private hyperbolicCamera: HyperbolicCamera3D
  private lastSpherical: { theta: number; phi: number; radius: number }

  constructor(
    camera: HyperbolicCamera3D,
    domElement: HTMLElement,
  ) {
    this.hyperbolicCamera = camera
    this.controls = new OrbitControls(
      camera.getCamera(),
      domElement,
    )

    // Configure for viewing inside a ball
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 1.5
    this.controls.maxDistance = 5
    this.controls.target.set(0, 0, 0)

    // Track last position
    this.lastSpherical = { theta: 0, phi: Math.PI / 2, radius: 2.5 }

    // Listen for changes
    this.controls.addEventListener('change', () => this.onControlsChange())
  }

  private onControlsChange() {
    // Convert orbit motion to hyperbolic transforms
    const pos = this.controls.object.position
    const r = pos.length()
    const theta = Math.atan2(pos.x, pos.z)
    const phi = Math.acos(pos.y / r)

    // Delta from last position
    const dTheta = theta - this.lastSpherical.theta
    const dPhi = phi - this.lastSpherical.phi

    // Apply as hyperbolic rotations
    if (Math.abs(dTheta) > 0.001) {
      this.hyperbolicCamera.rotate([0, 1, 0], dTheta * 0.5)
    }
    if (Math.abs(dPhi) > 0.001) {
      this.hyperbolicCamera.rotate([1, 0, 0], dPhi * 0.5)
    }

    this.lastSpherical = { theta, phi, radius: r }
  }

  update() {
    this.controls.update()
  }
}
```

### 5. Wireframe Edge Rendering

For clear visualization, render edges as lines on top of faces.

```typescript
class HoneycombEdgeRenderer {
  private lineMaterial: THREE.LineBasicMaterial
  private lineSegments: THREE.LineSegments | null = null

  constructor() {
    this.lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 1, // Note: linewidth > 1 only works with Line2
      transparent: true,
      opacity: 0.8,
    })
  }

  updateEdges(cells: VisibleCell3D[]) {
    // Collect all edges
    const positions: number[] = []

    for (const cell of cells) {
      for (const [a, b] of cell.edges) {
        const va = cell.vertices[a]
        const vb = cell.vertices[b]
        positions.push(va[0], va[1], va[2])
        positions.push(vb[0], vb[1], vb[2])
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    )

    if (this.lineSegments) {
      this.lineSegments.geometry.dispose()
      this.lineSegments.geometry = geometry
    } else {
      this.lineSegments = new THREE.LineSegments(geometry, this.lineMaterial)
    }
  }

  getMesh(): THREE.LineSegments | null {
    return this.lineSegments
  }
}
```

### 6. Complete Renderer Class

Putting it all together:

```typescript
class HyperbolicHoneycombRenderer {
  private scene: THREE.Scene
  private renderer: THREE.WebGLRenderer
  private camera: HyperbolicCamera3D
  private controls: HyperbolicOrbitControls

  private instancedRenderer: InstancedHoneycombRenderer
  private edgeRenderer: HoneycombEdgeRenderer

  private tessellation: Hyperbolic3DTessellation
  private boundingSphere: THREE.Mesh

  constructor(
    container: HTMLElement,
    tessellation: Hyperbolic3DTessellation,
  ) {
    this.tessellation = tessellation

    // Three.js setup
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0a0f)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(this.renderer.domElement)

    // Camera
    const aspect = container.clientWidth / container.clientHeight
    this.camera = new HyperbolicCamera3D(75, aspect)
    this.controls = new HyperbolicOrbitControls(
      this.camera,
      this.renderer.domElement,
    )

    // Renderers
    this.instancedRenderer = new InstancedHoneycombRenderer(
      tessellation.getOriginCell(),
    )
    this.edgeRenderer = new HoneycombEdgeRenderer()

    this.scene.add(this.instancedRenderer.getMesh())

    // Visual aid: transparent boundary sphere
    this.boundingSphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x333344,
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide,
      }),
    )
    this.scene.add(this.boundingSphere)

    // Resize handler
    window.addEventListener('resize', () => this.onResize(container))
  }

  private onResize(container: HTMLElement) {
    const width = container.clientWidth
    const height = container.clientHeight
    this.camera.getCamera().aspect = width / height
    this.camera.getCamera().updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  update() {
    // Update controls
    this.controls.update()

    // Get visible cells from tessellation
    const viewTransform = this.camera.getViewTransform()
    this.tessellation.setViewTransform(viewTransform)
    const visibleCells = this.tessellation.getVisibleCells()

    // Update renderers
    this.instancedRenderer.updateInstances(visibleCells, viewTransform)
    this.edgeRenderer.updateEdges(visibleCells)

    const edges = this.edgeRenderer.getMesh()
    if (edges && !edges.parent) {
      this.scene.add(edges)
    }

    // Render
    this.renderer.render(this.scene, this.camera.getCamera())
  }

  animate() {
    const loop = () => {
      requestAnimationFrame(loop)
      this.update()
    }
    loop()
  }
}
```

### 7. Usage in React/Test Route

```typescript
// In test/site/routes/hyperbolic.3d.$p.$q.$r.tsx

import { useEffect, useRef } from 'react'
import { Hyperbolic3DTessellation } from '@/code/tessellation/hyperbolic3d'
import { HyperbolicHoneycombRenderer } from '@/code/rendering/3d/renderer'

export default function Hyperbolic3DRoute() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<HyperbolicHoneycombRenderer | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const params = useParams() // { p: '4', q: '3', r: '5' }
    const p = parseInt(params.p)
    const q = parseInt(params.q)
    const r = parseInt(params.r)

    // Create tessellation
    const tessellation = new Hyperbolic3DTessellation({
      p,
      q,
      r,
      maxCells: 500,
      maxDepth: 8,
    })

    // Create renderer
    const renderer = new HyperbolicHoneycombRenderer(
      containerRef.current,
      tessellation,
    )
    rendererRef.current = renderer

    // Start animation loop
    renderer.animate()

    return () => {
      // Cleanup
      renderer.dispose()
    }
  }, [])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />
  )
}
```

### 8. Performance Considerations

| Technique              | Benefit                             |
| ---------------------- | ----------------------------------- |
| Instanced rendering    | 10-100x fewer draw calls            |
| Frustum culling        | Skip cells behind camera            |
| LOD                    | Simpler geometry for distant cells  |
| Cell pooling           | Reuse geometry buffers              |
| Typed arrays           | Fast attribute updates              |
| Shader-based fog       | Depth cues without transparency     |
| Deferred edge render   | Edges only for close cells          |

### 9. First-Person Immersive View

The reference visualization (e.g., from Roice Nelson's hyperbolic
honeycomb renderings) shows a first-person view from INSIDE the
honeycomb, looking outward into infinite space. This is different from
looking at a Poincaré ball from outside.

Key characteristics of immersive view:

| Aspect              | Outside View (ball)        | Inside View (immersive)        |
| ------------------- | -------------------------- | ------------------------------ |
| Camera position     | Outside ball, looking in   | At origin, looking outward     |
| Boundary            | Visible as a circle/sphere | At infinity, never visible     |
| Perspective         | Orthographic or mild       | Strong first-person FOV        |
| Edge rendering      | Thin lines                 | Thick 3D tubes with shading    |
| Vertex rendering    | Points or none             | Spherical nodes at junctions   |
| Cell appearance     | Shrink toward center       | Surround viewer, recede to ∞   |

#### Camera Setup for Immersive View

```typescript
class ImmersiveHyperbolicCamera {
  // Camera is always at a cell vertex or edge, looking into the honeycomb
  private position: HyperboloidPoint3D // Usually origin or cell vertex
  private orientation: LorentzMatrix // View direction

  constructor() {
    // Start at origin, looking along +Z
    this.position = [0, 0, 0, 1] // Origin in hyperboloid
    this.orientation = IDENTITY_LORENTZ
  }

  // For Three.js, we render the Poincaré ball centered at camera position
  // Everything is transformed so the camera is at the center
  getViewTransform(): LorentzMatrix {
    // Transform that moves camera position to origin
    return createHyperbolicTranslation(
      hyperboloidToBall(this.position),
      -hyperbolicDistance(ORIGIN, this.position),
    )
  }

  // Move along a hyperbolic geodesic
  moveForward(distance: number) {
    const forward = this.getForwardDirection()
    const translation = createHyperbolicTranslation(forward, distance)
    this.position = applyLorentz(translation, this.position)
  }
}
```

#### Edge Rendering as 3D Tubes

For the immersive look, edges need to be rendered as actual 3D geometry:

```typescript
function createTubeGeometry(
  start: BallPoint3D,
  end: BallPoint3D,
  radius: number,
  segments: number = 8,
): THREE.TubeGeometry {
  // Create a curve along the hyperbolic geodesic between points
  const curve = new HyperbolicGeodesicCurve(start, end)

  return new THREE.TubeGeometry(
    curve,
    16, // tubular segments
    radius,
    segments, // radial segments
    false, // closed
  )
}

class HyperbolicGeodesicCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private start: BallPoint3D,
    private end: BallPoint3D,
  ) {
    super()
  }

  getPoint(t: number): THREE.Vector3 {
    // Interpolate along hyperbolic geodesic in Poincaré ball
    // This is NOT a straight line in Euclidean space
    const p = hyperbolicInterpolate(this.start, this.end, t)
    return new THREE.Vector3(p[0], p[1], p[2])
  }
}

// Hyperbolic geodesic interpolation in Poincaré ball
function hyperbolicInterpolate(
  a: BallPoint3D,
  b: BallPoint3D,
  t: number,
): BallPoint3D {
  // Convert to hyperboloid, interpolate, convert back
  const aH = ballToHyperboloid(a)
  const bH = ballToHyperboloid(b)

  // Hyperbolic slerp on hyperboloid
  const dist = hyperbolicDistance(a, b)
  const sinhD = Math.sinh(dist)

  if (sinhD < 1e-10) return a

  const coefA = Math.sinh((1 - t) * dist) / sinhD
  const coefB = Math.sinh(t * dist) / sinhD

  const result: HyperboloidPoint3D = [
    coefA * aH[0] + coefB * bH[0],
    coefA * aH[1] + coefB * bH[1],
    coefA * aH[2] + coefB * bH[2],
    coefA * aH[3] + coefB * bH[3],
  ]

  return hyperboloidToBall(result)
}
```

#### Vertex Nodes

Draw spheres at vertices where edges meet:

```typescript
function createVertexNodeGeometry(radius: number): THREE.SphereGeometry {
  return new THREE.SphereGeometry(radius, 16, 16)
}

// Material with metallic gold appearance
const vertexMaterial = new THREE.MeshStandardMaterial({
  color: 0xccaa33,
  metalness: 0.8,
  roughness: 0.3,
})
```

#### Instanced Tubes for Performance

With thousands of edges, use instanced rendering:

```typescript
class InstancedTubeRenderer {
  private tubeGeometry: THREE.CylinderGeometry
  private instancedMesh: THREE.InstancedMesh

  constructor(maxEdges: number = 10000) {
    // Base tube geometry (unit cylinder)
    this.tubeGeometry = new THREE.CylinderGeometry(1, 1, 1, 8)
    this.tubeGeometry.rotateX(Math.PI / 2) // Orient along Z

    const material = new THREE.MeshStandardMaterial({
      color: 0x888899,
      metalness: 0.6,
      roughness: 0.4,
    })

    this.instancedMesh = new THREE.InstancedMesh(
      this.tubeGeometry,
      material,
      maxEdges,
    )
  }

  updateEdges(edges: Array<{ start: BallPoint3D; end: BallPoint3D }>) {
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3()
    const up = new THREE.Vector3(0, 0, 1)

    for (let i = 0; i < edges.length; i++) {
      const { start, end } = edges[i]

      // Position: midpoint
      position.set(
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2,
        (start[2] + end[2]) / 2,
      )

      // Orientation: point toward end
      const direction = new THREE.Vector3(
        end[0] - start[0],
        end[1] - start[1],
        end[2] - start[2],
      )
      const length = direction.length()
      direction.normalize()
      quaternion.setFromUnitVectors(up, direction)

      // Scale: tube radius and length
      const radius = 0.01 // Adjust based on distance
      scale.set(radius, radius, length)

      matrix.compose(position, quaternion, scale)
      this.instancedMesh.setMatrixAt(i, matrix)
    }

    this.instancedMesh.count = edges.length
    this.instancedMesh.instanceMatrix.needsUpdate = true
  }
}
```

### 10. Material Options

```typescript
// Solid faces with edges
const solidMaterial = new THREE.MeshPhongMaterial({
  color: 0x4488aa,
  shininess: 30,
  side: THREE.DoubleSide,
})

// Transparent faces
const transparentMaterial = new THREE.MeshPhongMaterial({
  color: 0x4488aa,
  transparent: true,
  opacity: 0.3,
  side: THREE.DoubleSide,
})

// Flat shaded (emphasizes facets)
const flatMaterial = new THREE.MeshPhongMaterial({
  color: 0x4488aa,
  flatShading: true,
  side: THREE.DoubleSide,
})

// Depth-based gradient (shader)
const depthMaterial = new THREE.ShaderMaterial({
  uniforms: {
    nearColor: { value: new THREE.Color(0x88ccff) },
    farColor: { value: new THREE.Color(0x220033) },
  },
  vertexShader: `
    varying float vDepth;
    void main() {
      vDepth = length(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 nearColor;
    uniform vec3 farColor;
    varying float vDepth;
    void main() {
      float t = smoothstep(0.0, 0.95, vDepth);
      gl_FragColor = vec4(mix(nearColor, farColor, t), 1.0 - t * 0.5);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
})
```

## Key Challenges

### 1. Address System Complexity

The 2D Margenstern system relies on specific properties of {p,q}
tilings. 3D honeycombs have more complex combinatorics. May need:

- Different addressing per honeycomb type
- Coxeter word representation instead of tree indices
- Numerical validation of address formulas

### 2. Performance

3D has faster exponential growth. At depth d:

| Depth | 2D {7,3} cells | 3D {4,3,5} cells |
| ----- | -------------- | ---------------- |
| 1     | 7              | 6                |
| 2     | 50             | 30               |
| 3     | 350            | 150              |
| 4     | 2,500          | 750              |
| 5     | 17,500         | 3,750            |

Need aggressive culling and LOD.

### 3. Rendering

3D cells have many triangles. For 1000 cubes visible:

- 6 faces × 2 triangles = 12 triangles/cell
- 12,000 triangles minimum
- Plus edges if wireframe

Use instanced rendering where possible.

### 4. Navigation UX

3D navigation is harder than 2D. Users need:

- Intuitive camera controls
- Visual cues for depth/orientation
- Possibly a minimap or breadcrumb trail

## Testing Strategy

1. **Unit tests**: Math functions (transforms, distances)
2. **Property tests**: Transform composition associativity
3. **Visual tests**: Render known configurations, compare to references
4. **Performance tests**: Measure cell generation rate, render FPS

## Key Insight: Trees Beat Geometry

From `note/hyperbolic-coordinate-systems.md`:

> Hyperbolic cellular automata become practical only when you stop
> thinking "continuous hyperbolic geometry" and start thinking "discrete
> coordinate systems that let me index neighbors fast."
>
> **The winning approach**: Use trees, not geometry.

This is the same insight that makes the 2D implementation work:

1. **Don't compute geometry for navigation**: Use tree addresses
2. **Compute geometry only for rendering**: Lazy, cached
3. **Neighbor = string surgery**: Not trigonometry
4. **The tree structure encodes the hyperbolic combinatorics**

## Recommended Start: {5,3,4} Dodecagrid

The dodecagrid {5,3,4} has the most complete Margenstern documentation:

1. **8 octants** (well-defined)
2. **4 node types** (documented splitting matrix)
3. **12 neighbors** (Father/Son/Nephew relations documented)
4. **Face classification** (White/Grey/Dark/Black)

See `note/margenstern-3d.md` for complete details.

## Two Rendering Approaches

### Approach A: Mesh-Based (Three.js)

Traditional approach: generate cell geometry, render as meshes.

**Pros:**
- Familiar WebGL pipeline
- Easy to add interaction (click on cells, etc.)
- Good for navigation/game-like applications

**Cons:**
- Limited by geometry count (thousands of cells max)
- Must generate geometry for each cell
- Edges are approximated (not true geodesics unless heavily subdivided)

### Approach B: Raymarching (GLSL Shader)

Mathematical approach: compute ray intersections with implicit surface.

**Pros:**
- **Infinite detail** - no geometry limit
- True hyperbolic geodesics
- Fractal self-similarity emerges naturally
- This is how the stunning reference images are made

**Cons:**
- Harder to implement
- Limited interaction (raycast needed for picking)
- GPU-intensive

**How it works:**

1. **Wythoff/Kaleidoscopic Construction**: Define fundamental domain by
   reflection planes, fold space repeatedly

2. **Distance Estimator**: Compute distance to nearest edge/face

3. **Ray March**: Step along ray, find surface intersections

```glsl
// Simplified hyperbolic honeycomb raymarcher
float honeycombDE(vec3 p) {
    // Convert to hyperbolic space (Poincaré ball)
    float r2 = dot(p, p);
    if (r2 >= 1.0) return 0.001; // Outside ball

    // Conformal factor
    float k = 2.0 / (1.0 - r2);

    // Apply kaleidoscopic folds (Wythoff construction)
    // Fold across fundamental domain planes
    for (int i = 0; i < 20; i++) {
        // Fold across each mirror plane
        p = foldAcrossPlane(p, mirrorNormal1);
        p = foldAcrossPlane(p, mirrorNormal2);
        p = foldAcrossPlane(p, mirrorNormal3);
        p = foldAcrossPlane(p, mirrorNormal4);
    }

    // Distance to fundamental domain edges
    float d = distanceToEdges(p);

    // Scale by conformal factor
    return d / k;
}

// Fold point across plane
vec3 foldAcrossPlane(vec3 p, vec3 n) {
    float d = dot(p, n);
    if (d < 0.0) p -= 2.0 * d * n;
    return p;
}
```

**Reference implementations:**
- Shadertoy: "Hyperbolic honeycomb" by various authors
- Mandelbulber: Wythoff construction formulas
- Fragmentarium: Hyperbolic tilings collection

### Recommended Approach

For the visual quality shown in reference images:
1. **Start with raymarching** for the "wow factor"
2. Add mesh-based rendering later for interaction

The mesh approach is needed for:
- Clicking on cells
- Path finding through the honeycomb
- Game-like navigation

The raymarching approach gives:
- Stunning visuals immediately
- Infinite fractal detail
- True hyperbolic geometry

## References

### Internal Documentation

- `note/hyperbolic-coordinate-systems.md` - Coordinate system overview
- `note/margenstern-fibonacci-coordinates.md` - 2D Fibonacci addressing
- `note/margenstern-tessellation-implementations.md` - 2D/3D code
- `note/margenstern-3d.md` - Dodecagrid {5,3,4} specifics
- `note/hyperbolic-honeycombs.md` - Honeycomb theory

### External References

- Coxeter, "Regular Polytopes"
- Thurston, "Three-Dimensional Geometry and Topology"
- Weeks, "The Shape of Space"
- HyperRogue source code (C++)
- Margenstern, "Cellular Automata in Hyperbolic Spaces" Vol 1 & 2
  - Volume 1, Chapter 5: Dodecagrid introduction
  - Volume 2, Section 4.4: Implementation details
