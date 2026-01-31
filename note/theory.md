# Mathematical Theory and Representation

This document explains the mathematical foundations and how we represent
geometric concepts in code.

## The Three Geometries

All regular tilings {p,q} fall into one of three geometries based on:

```
χ = (p-2)(q-2) - 4
```

| χ value | Geometry   | Examples                            |
| ------- | ---------- | ----------------------------------- |
| χ < 0   | Spherical  | {3,3}, {4,3}, {5,3}, {3,4}, {3,5}   |
| χ = 0   | Euclidean  | {4,4}, {3,6}, {6,3}                 |
| χ > 0   | Hyperbolic | {7,3}, {5,4}, {4,5}, ... (infinite) |

Our library handles all three with unified code, using geometry-aware
functions that switch behavior based on the current space.

## Minkowski Space and the Hyperboloid Model

### The Core Insight

Just as the sphere S² lives in Euclidean R³:

```
x² + y² + z² = 1
```

The hyperbolic plane H² lives in Minkowski space R^{2,1}:

```
x² + y² - t² = -1, t > 0
```

This is the **upper sheet of a two-sheeted hyperboloid**.

### Minkowski Inner Product

The key difference from Euclidean space is the metric signature:

```typescript
// Euclidean inner product
function euclideanDot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

// Minkowski inner product (signature +,+,-)
function minkowskiDot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y - a.t * b.t
}
```

For a point on the hyperboloid: `minkowskiDot(p, p) = -1`

### Classification of Vectors

Vectors in Minkowski space have three types:

| Minkowski norm | Type             | Represents                 |
| -------------- | ---------------- | -------------------------- |
| < 0 (negative) | Timelike         | Points in H²               |
| = 0            | Lightlike (null) | Ideal points (at infinity) |
| > 0 (positive) | Spacelike        | Geodesics (lines)          |

```typescript
type VectorType = 'point' | 'ideal' | 'geodesic'

function classifyVector(v: Vec3): VectorType {
  const norm = minkowskiDot(v, v)
  if (norm < -EPSILON) return 'point'
  if (norm > EPSILON) return 'geodesic'
  return 'ideal'
}
```

## Points

### Internal Representation

Points are stored as 3-vectors (x, y, t) satisfying the hyperboloid
constraint:

```typescript
interface HyperPoint {
  x: number // Spatial coordinate
  y: number // Spatial coordinate
  t: number // "Time" coordinate (always positive)
}

// Invariant: x² + y² - t² = -1
```

The origin of hyperbolic space is (0, 0, 1).

### Normalization

When computation drifts off the hyperboloid, renormalize:

```typescript
function normalize(p: HyperPoint): HyperPoint {
  const norm = Math.sqrt(Math.abs(minkowskiDot(p, p)))
  return {
    x: p.x / norm,
    y: p.y / norm,
    t: p.t / norm,
  }
}
```

### Distance

Hyperbolic distance between two points:

```typescript
function distance(a: HyperPoint, b: HyperPoint): number {
  // For points on the hyperboloid, the dot product is <= -1
  const dot = minkowskiDot(a, b)
  return Math.acosh(Math.abs(dot))
}
```

This is analogous to spherical distance using arccos.

## Geodesics (Lines)

### Representation

Geodesics in H² are intersections of planes through the origin with the
hyperboloid. A plane through the origin is defined by its normal vector.

```typescript
interface Geodesic {
  // Normal vector to the plane (spacelike: norm > 0)
  normal: Vec3
}
```

### Geodesic Through Two Points

The geodesic through points a and b is found via cross product (with
sign adjustment for Minkowski metric):

```typescript
function geodesicThrough(a: HyperPoint, b: HyperPoint): Geodesic {
  // Minkowski cross product
  const normal = {
    x: a.y * b.t - a.t * b.y,
    y: a.t * b.x - a.x * b.t,
    t: -(a.x * b.y - a.y * b.x), // Note the sign flip
  }
  return { normal: normalize(normal) }
}
```

### Distance from Point to Geodesic

```typescript
function distanceToGeodesic(p: HyperPoint, g: Geodesic): number {
  const dot = minkowskiDot(p, g.normal)
  return Math.asinh(Math.abs(dot))
}
```

## Isometries (Transformations)

### Matrix Representation

All isometries of hyperbolic space are represented by 3x3 matrices that
preserve the Minkowski inner product (Lorentz transformations):

```typescript
type Matrix3 = [
  number,
  number,
  number, // Row 0
  number,
  number,
  number, // Row 1
  number,
  number,
  number, // Row 2
]
```

### Rotation Around Origin

Rotation by angle θ around the origin (0, 0, 1):

```typescript
function rotation(theta: number): Matrix3 {
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  return [c, -s, 0, s, c, 0, 0, 0, 1]
}
```

This is identical to Euclidean rotation in the xy-plane.

### Translation Along X-Axis

Translation by hyperbolic distance d along the positive x-axis:

```typescript
function translateX(d: number): Matrix3 {
  const c = Math.cosh(d)
  const s = Math.sinh(d)
  return [c, 0, s, 0, 1, 0, s, 0, c]
}
```

This is a "boost" in Minkowski space terminology.

### Translation Along Y-Axis

```typescript
function translateY(d: number): Matrix3 {
  const c = Math.cosh(d)
  const s = Math.sinh(d)
  return [1, 0, 0, 0, c, s, 0, s, c]
}
```

### General Translation

To translate by distance d in direction θ:

```typescript
function translate(d: number, theta: number): Matrix3 {
  // Rotate so direction aligns with x-axis
  // Translate along x
  // Rotate back
  return multiply(
    rotation(theta),
    multiply(translateX(d), rotation(-theta)),
  )
}
```

### Reflection Across Geodesic

Reflection across a geodesic with normal n:

```typescript
function reflection(n: Vec3): Matrix3 {
  // Minkowski Householder-like reflection
  // R = I - 2 * (n ⊗ n) / <n,n>
  const nn = minkowskiDot(n, n)
  return [
    1 - (2 * n.x * n.x) / nn,
    (-2 * n.x * n.y) / nn,
    (2 * n.x * n.t) / nn,
    (-2 * n.y * n.x) / nn,
    1 - (2 * n.y * n.y) / nn,
    (2 * n.y * n.t) / nn,
    (-2 * n.t * n.x) / nn,
    (-2 * n.t * n.y) / nn,
    1 + (2 * n.t * n.t) / nn,
  ]
}
```

Note the sign changes in the last row/column due to the Minkowski
metric.

### Composition

Matrix multiplication composes transformations:

```typescript
function compose(a: Matrix3, b: Matrix3): Matrix3 {
  // Standard 3x3 matrix multiplication
  // a * b means "first apply b, then apply a"
}
```

## Model Conversions

### Hyperboloid to Poincare Disk

Project from point (0, 0, -1) onto the plane t = 0:

```typescript
function toPoincare(p: HyperPoint): [number, number] {
  return [p.x / (1 + p.t), p.y / (1 + p.t)]
}
```

### Poincare Disk to Hyperboloid

```typescript
function fromPoincare(x: number, y: number): HyperPoint {
  const sq = x * x + y * y
  if (sq >= 1) throw new Error('Point outside disk')
  return {
    x: (2 * x) / (1 - sq),
    y: (2 * y) / (1 - sq),
    t: (1 + sq) / (1 - sq),
  }
}
```

### Hyperboloid to Klein Model

Project from origin onto plane t = 1:

```typescript
function toKlein(p: HyperPoint): [number, number] {
  return [p.x / p.t, p.y / p.t]
}
```

### Poincare to Klein (direct)

```typescript
function poincareToKlein(x: number, y: number): [number, number] {
  const sq = x * x + y * y
  const scale = 2 / (1 + sq)
  return [x * scale, y * scale]
}
```

## Polygons and Tilings

### Regular Polygon {p,q}

A regular p-gon in a {p,q} tiling has:

```typescript
interface TilingParams {
  p: number // Sides of each polygon
  q: number // Polygons meeting at each vertex
}

function circumradius(p: number, q: number): number {
  // Hyperbolic distance from center to vertex
  const num = Math.cos(Math.PI / q)
  const den = Math.sin(Math.PI / p)
  return Math.acosh(num / den)
}

function inradius(p: number, q: number): number {
  // Hyperbolic distance from center to edge midpoint
  const num = Math.cos(Math.PI / p)
  const den = Math.sin(Math.PI / q)
  return Math.acosh(num / den)
}
```

### Generating a Base Polygon

```typescript
function basePolygon(p: number, q: number): HyperPoint[] {
  const r = circumradius(p, q)
  const vertices: HyperPoint[] = []

  for (let i = 0; i < p; i++) {
    const theta = (2 * Math.PI * i) / p
    // Start at distance r along x-axis, then rotate
    const M = multiply(rotation(theta), translateX(r))
    vertices.push(applyMatrix(M, ORIGIN))
  }

  return vertices
}
```

### Tile Structure

```typescript
interface Tile {
  id: string
  center: HyperPoint
  vertices: HyperPoint[]
  transform: Matrix3 // Maps base tile to this tile

  // Adjacency (filled during generation)
  neighbors: (Tile | null)[]
}
```

## Tiling Generation

### Reflection-Based Algorithm

Generate tiles by reflecting across edges:

```typescript
function generateTiling(
  p: number,
  q: number,
  maxTiles: number,
): Tile[] {
  const tiles: Map<string, Tile> = new Map()
  const baseTile = createBaseTile(p, q)
  tiles.set(hash(baseTile.center), baseTile)

  const queue: Tile[] = [baseTile]

  while (queue.length > 0 && tiles.size < maxTiles) {
    const tile = queue.shift()!

    for (let i = 0; i < p; i++) {
      if (tile.neighbors[i]) continue

      // Reflect across edge i
      const edgeGeodesic = geodesicThrough(
        tile.vertices[i],
        tile.vertices[(i + 1) % p],
      )
      const reflectMatrix = reflection(edgeGeodesic.normal)
      const newTransform = multiply(reflectMatrix, tile.transform)
      const newCenter = applyMatrix(newTransform, ORIGIN)

      const key = hash(newCenter)
      let neighbor = tiles.get(key)

      if (!neighbor) {
        neighbor = createTile(newTransform, p, q)
        tiles.set(key, neighbor)
        queue.push(neighbor)
      }

      tile.neighbors[i] = neighbor
      // Link back (find which edge of neighbor faces us)
      linkNeighbor(neighbor, tile, i)
    }
  }

  return Array.from(tiles.values())
}
```

### Position Hashing

Hash points to identify already-generated tiles:

```typescript
function hash(p: HyperPoint, precision: number = 6): string {
  const [px, py] = toPoincare(p)
  const x = Math.round(px * 10 ** precision)
  const y = Math.round(py * 10 ** precision)
  return `${x},${y}`
}
```

## Hyperbolic Interpolation

### Linear Interpolation on Hyperboloid

Interpolate between two points along the geodesic:

```typescript
function hlerp(a: HyperPoint, b: HyperPoint, t: number): HyperPoint {
  const d = distance(a, b)
  if (d < EPSILON) return a

  const sinhD = Math.sinh(d)
  const wa = Math.sinh((1 - t) * d) / sinhD
  const wb = Math.sinh(t * d) / sinhD

  return normalize({
    x: wa * a.x + wb * b.x,
    y: wa * a.y + wb * b.y,
    t: wa * a.t + wb * b.t,
  })
}
```

This is the hyperbolic analog of spherical slerp.

## 3D Hyperbolic Space (H³)

### Representation

Extend to 4D Minkowski space R^{3,1}:

```typescript
interface HyperPoint3D {
  x: number
  y: number
  z: number
  w: number // "Time" coordinate
}

// Constraint: x² + y² + z² - w² = -1, w > 0
```

### 4x4 Isometry Matrices

Same principles apply with 4x4 matrices. Rotations are SO(3) in the xyz
subspace. Translations are boosts involving the w coordinate.

### Projection to Ball Model

```typescript
function toBall(p: HyperPoint3D): [number, number, number] {
  return [p.x / (1 + p.w), p.y / (1 + p.w), p.z / (1 + p.w)]
}
```

## Euclidean and Spherical Cases

### Unified Interface

For Euclidean geometry, use t = 1 (projective coordinates):

```typescript
// Euclidean point: [x, y, 1]
// Isometries: standard 3x3 affine matrices
```

For spherical geometry, use the standard sphere:

```typescript
// Spherical point: x² + y² + z² = 1
// Isometries: SO(3) rotation matrices
```

### Geometry-Aware Functions

```typescript
type Geometry = 'hyperbolic' | 'euclidean' | 'spherical'

function distance(g: Geometry, a: Vec3, b: Vec3): number {
  switch (g) {
    case 'hyperbolic':
      return Math.acosh(-minkowskiDot(a, b))
    case 'spherical':
      return Math.acos(euclideanDot(a, b))
    case 'euclidean':
      return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
  }
}
```

## Numerical Stability

### Gram-Schmidt for Hyperboloid

Isometry matrices can drift from preserving the Minkowski form.
Periodically reorthonormalize:

```typescript
function gramSchmidtMinkowski(M: Matrix3): Matrix3 {
  // Similar to standard Gram-Schmidt but using Minkowski inner product
  // Ensures M preserves the hyperboloid constraint
}
```

### Precision Near Boundary

When working in Poincare coordinates, points near the boundary (|z| → 1)
lose precision. The hyperboloid representation handles these better
since the coordinates grow smoothly with distance.

## Sources

- [HyperRogue Developer Guide](https://roguetemple.com/z/hyper/dev.php)
- [HyperRogue Models](https://roguetemple.com/z/hyper/models.php)
- [Numerical Aspects of Hyperbolic Geometry](https://arxiv.org/html/2404.09039v1)
- [Wikipedia: Hyperboloid Model](https://en.wikipedia.org/wiki/Hyperboloid_model)
- [Hyperbolic Geometry and Poincaré Embeddings](https://bjlkeng.github.io/posts/hyperbolic-geometry-and-poincare-embeddings/)
