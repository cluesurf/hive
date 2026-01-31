# Geometric Visualization Architecture

## Mathematical Foundations

### Geometry Types

The library handles three fundamental geometries determined by the
Gaussian curvature K:

| Geometry   | Curvature | Angle Sum | Parallel Lines  |
| ---------- | --------- | --------- | --------------- |
| Spherical  | K > 0     | > 180     | None (all meet) |
| Euclidean  | K = 0     | = 180     | Exactly one     |
| Hyperbolic | K < 0     | < 180     | Infinitely many |

For a regular tiling {p,q}, geometry is determined by:

- `(p-2)(q-2) < 4`: Spherical
- `(p-2)(q-2) = 4`: Euclidean
- `(p-2)(q-2) > 4`: Hyperbolic

### Hyperbolic Models

#### Hyperboloid Model (Internal Representation)

Points on the upper sheet of a hyperboloid in Minkowski space:

```
x² + y² - t² = -1, t > 0
```

Minkowski inner product:

```
<a,b> = a.x*b.x + a.y*b.y - a.t*b.t
```

Distance between points:

```
d(a,b) = acosh(-<a,b>)
```

**Advantages:**

- Isometries are linear (3x3 matrices)
- Clean mathematical formulation
- Generalizes to higher dimensions
- No boundary issues

#### Poincare Disk Model (Primary Display)

Open unit disk in the complex plane. Conversion from hyperboloid:

```
(x, y, t) -> (x/(1+t), y/(1+t))
```

Inverse:

```
(u, v) -> (2u, 2v, 1+u²+v²) / (1-u²-v²)
```

**Advantages:**

- Conformal (angles preserved)
- Bounded (fits on screen)
- Geodesics are circular arcs

#### Klein Model

Same unit disk, but geodesics are straight lines:

```
Poincare (u,v) -> Klein: (2u, 2v) / (1+u²+v²)
```

**Advantages:**

- Geodesics are straight
- Easier clipping calculations
- Not conformal

#### Upper Half-Plane Model

Upper half of complex plane:

```
Poincare (u,v) -> UHP: i(1+z)/(1-z) where z = u+iv
```

**Advantages:**

- Unbounded
- Good for certain calculations
- Natural for modular forms

### Transformations

#### Mobius Transformations (2D)

Complex function: `f(z) = (Az + B) / (Cz + D)`

Matrix representation:

```
| A  B |
| C  D |
```

Composition is matrix multiplication. Determinant AD - BC = 1 for
normalized form.

**Types of Mobius transformations:**

- Elliptic: one fixed point inside disk (rotation)
- Parabolic: one fixed point on boundary
- Hyperbolic: two fixed points on boundary (translation along geodesic)
- Loxodromic: complex eigenvalues (rotation + translation)

#### Hyperboloid Isometries (Matrix Form)

3x3 matrices preserving the Minkowski form:

Rotation around origin:

```
| cos(θ)  -sin(θ)  0 |
| sin(θ)   cos(θ)  0 |
|   0        0     1 |
```

Translation along x-axis (hyperbolic rotation/boost):

```
| cosh(d)  0  sinh(d) |
|    0     1     0    |
| sinh(d)  0  cosh(d) |
```

Translation along y-axis:

```
| 1     0        0     |
| 0  cosh(d)  sinh(d)  |
| 0  sinh(d)  cosh(d)  |
```

## Data Structures

### Core Primitives

```typescript
// Complex number
interface Complex {
  re: number
  im: number
}

// 3D vector (used for hyperboloid and 3D space)
interface Vector3 {
  x: number
  y: number
  z: number
}

// 4D vector (for 3D hyperbolic / 4D projections)
interface Vector4 {
  x: number
  y: number
  z: number
  w: number
}
```

### Geometric Objects

```typescript
// Point in space (model-agnostic)
interface Point {
  hyperboloid: Vector3 // Internal representation
  poincare?: Complex // Cached display coordinates
  geometry: 'spherical' | 'euclidean' | 'hyperbolic'
}

// Generalized circle (includes lines as infinite radius)
interface Circle {
  center: Point
  radius: number // Infinity for lines
  // For lines:
  normal?: Vector3 // Normal vector
}

// Geodesic segment
interface Segment {
  start: Point
  end: Point
  // Derived:
  geodesic: Circle // The full geodesic
  arcStart: number // Parameter for start
  arcEnd: number // Parameter for end
}

// Polygon
interface Polygon {
  vertices: Point[]
  edges: Segment[]
  center: Point
}
```

### Tiling Structures

```typescript
// Tiling configuration
interface TilingConfig {
  p: number // Polygon sides
  q: number // Polygons per vertex
  geometry: 'spherical' | 'euclidean' | 'hyperbolic'
  maxTiles?: number // Limit for explicit tilings
  shrink?: number // Visual shrink factor (0-1)
}

// Individual tile
interface Tile {
  id: string // Unique identifier
  polygon: Polygon // Boundary
  center: Point // Center point
  transform: Matrix3 // Transform from base tile

  // Adjacency
  edgeNeighbors: Tile[] // Tiles sharing edges
  vertexNeighbors: Tile[] // Tiles sharing vertices
}

// Complete tiling
interface Tiling {
  config: TilingConfig
  baseTile: Tile // Fundamental domain
  tiles: Map<string, Tile>

  // For infinite tilings
  expand(): void // Generate more tiles
  getTileAt(point: Point): Tile | null
}
```

### Group-Based Representation (For Infinite Tilings)

```typescript
// Group element chain (von Dyck group)
interface GroupElement {
  generator: 'a' | 'b' // Which generator
  power: number // Exponent
  parent: GroupElement | null
}

// Cell in infinite tiling
interface Cell {
  element: GroupElement // Group element identifying cell
  matrix: Matrix3 // Cached transformation matrix
}

// Sparse field for cellular automata
interface Field<T> {
  get(cell: Cell): T | undefined
  set(cell: Cell, value: T): void
  neighbors(cell: Cell): Cell[]
}
```

### Transformation Matrices

```typescript
// 3x3 matrix (2D hyperbolic / hyperboloid)
type Matrix3 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

// 4x4 matrix (3D hyperbolic / Mobius in homogeneous coords)
type Matrix4 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

// Mobius transformation
interface Mobius {
  a: Complex
  b: Complex
  c: Complex
  d: Complex
}
```

## Tessellation Generation

### Algorithm 1: Reflection-Based (Finite)

```
1. Create base polygon P centered at origin
2. Initialize queue Q = [P]
3. Initialize visited set V = {}
4. While Q not empty and |V| < maxTiles:
   a. Pop tile T from Q
   b. For each edge E of T:
      i. Reflect T across E to get T'
      ii. If T'.center not in V:
          - Add T' to V
          - Add T' to Q
          - Link T and T' as neighbors
```

**Advantages:** Simple, builds explicit adjacency graph.
**Disadvantages:** Memory limited, finite.

### Algorithm 2: Group-Based (Infinite)

```
1. Define von Dyck group D(p,q) with generators a, b
   - a^p = e (rotation around polygon center)
   - b^q = e (rotation around vertex)
   - (ab)^2 = e (half-turn around edge midpoint)

2. Base cell = identity element e
3. For cell C with element g:
   - Edge neighbors: g*a^i for i = 1..p-1
   - Vertex neighbors: g*b^i for i = 1..q-1

4. Store cells in sparse map keyed by normalized element
```

**Advantages:** Infinite world, memory efficient. **Disadvantages:**
Complex, no explicit coordinates.

### Algorithm 3: Shader-Based (Visual Only)

```glsl
// For each pixel (x, y):
1. Convert to Poincare coordinates
2. Determine fundamental triangle region
3. Apply reflections until in canonical position
4. Color based on region
```

**Advantages:** Infinite resolution, fast. **Disadvantages:** No
topology, purely visual.

## Rendering Pipeline

### Option 1: CPU Tessellation + GPU Drawing

```
Generate tiles (CPU)
    -> Convert to display model
    -> Generate vertex buffers
    -> Upload to GPU
    -> Draw with simple shaders
```

Best for: Interactive tile manipulation, finite tilings.

### Option 2: Pure GPU Computation

```
Upload parameters (p, q, camera)
    -> Fragment shader computes everything
    -> Each pixel independently determines tile
```

Best for: Smooth navigation, infinite zoom, no interaction.

### Option 3: Hybrid

```
Visible tiles computed on CPU
    -> Boundaries sent to GPU
    -> Fill/effects computed in shader
    -> Interaction on CPU-side data
```

Best for: Balance of interactivity and performance.

## 3D Extension

### 3D Hyperbolic Space (H³)

Hyperboloid model in 4D Minkowski space:

```
x² + y² + z² - w² = -1, w > 0
```

Isometries are 4x4 matrices preserving this form.

### 3D Honeycombs {p,q,r}

- {p,q} faces (2D tilings)
- r faces around each edge
- Cells are polyhedra

Generation similar to 2D but with:

- Face reflections (across planes)
- Edge rotations
- Vertex figure {q,r}

### Display Models for 3D

**Ball model** (3D Poincare):

```
(x,y,z,w) -> (x,y,z)/(1+w)
```

**Half-space model**: Upper half of 3D space, geodesics are hemispheres.

## Camera and Navigation

### 2D Navigation

```typescript
interface Camera2D {
  center: Point // Where camera points
  zoom: number // Scale factor
  rotation: number // Angle

  // Transform screen coords to world coords
  screenToWorld(x: number, y: number): Point
  worldToScreen(p: Point): [number, number]

  // Navigation
  pan(dx: number, dy: number): void
  zoomAt(factor: number, x: number, y: number): void
  rotate(angle: number): void
}
```

### 3D Navigation

```typescript
interface Camera3D {
  position: Point // Camera location
  target: Point // Look-at point
  up: Vector3 // Up direction
  fov: number // Field of view

  // Orbital controls
  orbit(azimuth: number, elevation: number): void
  dolly(distance: number): void
  pan(dx: number, dy: number): void
}
```

## Animation System

```typescript
interface Animation {
  duration: number
  easing: (t: number) => number
  update: (t: number) => void
}

interface Animator {
  add(animation: Animation): void
  tick(deltaTime: number): void
}

// Hyperbolic interpolation
function hlerp(a: Point, b: Point, t: number): Point {
  // Linear interpolation on hyperboloid, then normalize
}
```

## Scene Graph

```typescript
interface SceneNode {
  transform: Matrix3 | Matrix4
  children: SceneNode[]
  visible: boolean

  // Override in subclasses
  render(ctx: RenderContext): void
}

interface TilingNode extends SceneNode {
  tiling: Tiling
  style: TileStyle
}

interface ShapeNode extends SceneNode {
  shape: Polygon | Circle | ...
  style: ShapeStyle
}

interface Scene {
  root: SceneNode
  camera: Camera2D | Camera3D

  add(node: SceneNode): void
  render(): void
  pick(x: number, y: number): SceneNode | null
}
```
