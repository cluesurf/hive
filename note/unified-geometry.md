# Unified Geometry: Spherical, Euclidean, and Hyperbolic

## The Short Answer

Yes, there is a unified approach. All three geometries can be handled
with the same code using:

1. **Homogeneous coordinates** in a space with variable metric signature
2. **Curvature-parameterized functions** that smoothly transition between
   the three cases

HyperRogue uses this exact approach.

## The Three Models

### 2D Case

| Geometry | Space | Constraint | Metric Signature |
|----------|-------|------------|------------------|
| Spherical (S²) | R³ | x² + y² + z² = 1 | (+, +, +) |
| Euclidean (E²) | R³ | z = 1 (projective) | (+, +, 0) |
| Hyperbolic (H²) | R^{2,1} | x² + y² - t² = -1 | (+, +, -) |

### 3D Case

| Geometry | Space | Constraint | Metric Signature |
|----------|-------|------------|------------------|
| Spherical (S³) | R⁴ | x² + y² + z² + w² = 1 | (+, +, +, +) |
| Euclidean (E³) | R⁴ | w = 1 (projective) | (+, +, +, 0) |
| Hyperbolic (H³) | R^{3,1} | x² + y² + z² - w² = -1 | (+, +, +, -) |

### Higher Dimensions

The pattern continues:
- S^n lives in R^{n+1} with all positive signature
- E^n uses projective coordinates with one degenerate dimension
- H^n lives in R^{n,1} with one negative signature

## Unified Inner Product

Define a curvature parameter K:
- K > 0: Spherical (K = 1 for unit sphere)
- K = 0: Euclidean
- K < 0: Hyperbolic (K = -1 for standard hyperbolic)

The inner product becomes:

```typescript
function innerProduct(a: Vec3, b: Vec3, K: number): number {
  if (K > 0) {
    // Spherical: standard Euclidean dot product
    return a.x * b.x + a.y * b.y + a.z * b.z
  } else if (K < 0) {
    // Hyperbolic: Minkowski product
    return a.x * b.x + a.y * b.y - a.z * b.z
  } else {
    // Euclidean: only spatial components matter
    return a.x * b.x + a.y * b.y
  }
}
```

Or more elegantly with a sign:

```typescript
function innerProduct(a: Vec3, b: Vec3, K: number): number {
  const sign = K >= 0 ? 1 : -1
  return a.x * b.x + a.y * b.y + sign * a.z * b.z
}
```

## Unified Distance Formula

```typescript
function distance(a: Vec3, b: Vec3, K: number): number {
  const dot = innerProduct(a, b, K)

  if (K > 0) {
    // Spherical: d = arccos(dot) / sqrt(K)
    return Math.acos(clamp(dot, -1, 1)) / Math.sqrt(K)
  } else if (K < 0) {
    // Hyperbolic: d = acosh(-dot) / sqrt(-K)
    return Math.acosh(Math.max(1, -dot)) / Math.sqrt(-K)
  } else {
    // Euclidean: standard distance
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
  }
}
```

## Unified Trigonometric Functions

HyperRogue defines curvature-aware trig functions:

```typescript
// sin_auto: behaves like sin, sinh, or identity
function sinAuto(x: number, K: number): number {
  if (K > 0) return Math.sin(x * Math.sqrt(K)) / Math.sqrt(K)
  if (K < 0) return Math.sinh(x * Math.sqrt(-K)) / Math.sqrt(-K)
  return x  // Euclidean limit
}

// cos_auto: behaves like cos, cosh, or 1
function cosAuto(x: number, K: number): number {
  if (K > 0) return Math.cos(x * Math.sqrt(K))
  if (K < 0) return Math.cosh(x * Math.sqrt(-K))
  return 1  // Euclidean limit
}

// tan_auto: behaves like tan, tanh, or identity
function tanAuto(x: number, K: number): number {
  return sinAuto(x, K) / cosAuto(x, K)
}

// Inverse functions
function asinAuto(x: number, K: number): number {
  if (K > 0) return Math.asin(x * Math.sqrt(K)) / Math.sqrt(K)
  if (K < 0) return Math.asinh(x * Math.sqrt(-K)) / Math.sqrt(-K)
  return x
}
```

## Unified Translation Matrix

Translation by distance d along x-axis:

```typescript
function translateX(d: number, K: number): Matrix3 {
  const c = cosAuto(d, K)
  const s = sinAuto(d, K)

  if (K >= 0) {
    // Spherical (rotation in xz plane)
    return [
      c, 0, -s * Math.sqrt(Math.abs(K)),
      0, 1, 0,
      s * Math.sqrt(Math.abs(K)), 0, c
    ]
  } else {
    // Hyperbolic (boost in xt plane)
    return [
      c, 0, s * Math.sqrt(-K),
      0, 1, 0,
      s * Math.sqrt(-K), 0, c
    ]
  }
}
```

For K = 1 (sphere) this is a rotation.
For K = -1 (hyperbolic) this is a Lorentz boost.
For K → 0 the limit gives Euclidean translation.

## Unified Point Representation

```typescript
interface Point {
  coords: [number, number, number]  // Or 4 for 3D geometries
  curvature: number                  // K value
}

// Normalize to constraint surface
function normalize(p: Point): Point {
  const K = p.curvature
  const [x, y, z] = p.coords

  if (K > 0) {
    // Project to sphere
    const r = Math.sqrt(x*x + y*y + z*z)
    return { coords: [x/r, y/r, z/r], curvature: K }
  } else if (K < 0) {
    // Project to hyperboloid
    const r = Math.sqrt(Math.abs(x*x + y*y - z*z))
    return { coords: [x/r, y/r, z/r], curvature: K }
  } else {
    // Euclidean: ensure z = 1
    return { coords: [x, y, 1], curvature: 0 }
  }
}
```

## HyperRogue's Approach

From the HyperRogue source, the `hyperpoint` struct handles all cases:

```cpp
// Pseudocode from HyperRogue
struct hyperpoint {
  array<ld, MAXMDIM> coords;
};

// The metric is determined by current geometry setting
ld dot(hyperpoint a, hyperpoint b) {
  if (spherical) return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  if (hyperbolic) return a[0]*b[0] + a[1]*b[1] - a[2]*b[2];
  // etc.
}
```

The key functions `sin_auto()`, `cos_auto()`, etc. adapt based on a
global geometry setting.

## Implementation Strategy

### Option 1: Global Geometry Mode

```typescript
let currentGeometry: 'spherical' | 'euclidean' | 'hyperbolic' = 'hyperbolic'

function setGeometry(g: typeof currentGeometry) {
  currentGeometry = g
}

function getCurvature(): number {
  switch (currentGeometry) {
    case 'spherical': return 1
    case 'euclidean': return 0
    case 'hyperbolic': return -1
  }
}
```

Pros: Simple API, matches HyperRogue.
Cons: Global state, not thread-safe.

### Option 2: Geometry Context Object

```typescript
interface Geometry {
  curvature: number
  dimension: number
}

const H2: Geometry = { curvature: -1, dimension: 2 }
const S2: Geometry = { curvature: 1, dimension: 2 }
const E2: Geometry = { curvature: 0, dimension: 2 }
const H3: Geometry = { curvature: -1, dimension: 3 }
// etc.

function distance(g: Geometry, a: Point, b: Point): number {
  // Use g.curvature
}
```

Pros: Explicit, composable, thread-safe.
Cons: Must pass geometry everywhere.

### Option 3: Geometry-Aware Point Class

```typescript
class GeoPoint {
  constructor(
    public coords: number[],
    public geometry: Geometry
  ) {}

  distanceTo(other: GeoPoint): number {
    if (this.geometry !== other.geometry) {
      throw new Error('Points must be in same geometry')
    }
    return distance(this.geometry, this, other)
  }
}
```

Pros: Points carry their geometry.
Cons: Overhead, mixing geometries is harder.

### Recommendation: Option 2 with Defaults

```typescript
// Default geometry can be set
let defaultGeometry: Geometry = H2

// Functions accept optional geometry, use default if not provided
function distance(a: Point, b: Point, g: Geometry = defaultGeometry): number

// Or use a context/builder pattern
const h2 = createGeometryContext({ curvature: -1, dimension: 2 })
h2.distance(a, b)
h2.translate(p, d, theta)
```

## Tiling in Different Geometries

The {p,q} tiling notation works across all three geometries:

| (p-2)(q-2) | Geometry | Examples |
|------------|----------|----------|
| < 4 | Spherical | {3,3} tetrahedron, {4,3} cube, {5,3} dodecahedron |
| = 4 | Euclidean | {4,4} squares, {3,6} triangles, {6,3} hexagons |
| > 4 | Hyperbolic | {7,3}, {5,4}, {4,5}, ... (infinitely many) |

The tiling generation algorithm is identical. Only the underlying
geometry functions change.

```typescript
function generateTiling(p: number, q: number, maxTiles: number): Tiling {
  const geometry = getGeometry(p, q)  // Determine from p,q
  // Same algorithm, uses geometry-aware functions
}
```

## Summary

| Aspect | Unified Approach |
|--------|-----------------|
| Coordinates | Homogeneous (x, y, z) or (x, y, z, w) |
| Metric | Parameterized by curvature K |
| Inner product | x·x + y·y + sign(K)·z·z |
| Distance | acos (K>0), linear (K=0), acosh (K<0) |
| Isometries | Same matrix structure, different trig functions |
| Tiling | Same algorithm, geometry-aware primitives |

The unified approach lets us write one codebase that handles all three
geometries with minimal branching.
