# HyperRogue Book: Comprehensive Notes

These notes are extracted from the HyperRogue book
(roguetemple.com/z/book/book.pdf) for use in the `@cluesurf/hive`
tessellation/hyperbolic geometry visualization library.

## Table of Contents

1. [Core Concepts](#1-core-concepts)
2. [Modeling Geometry](#2-modeling-geometry)
3. [Creating Visualizations](#3-creating-visualizations)
4. [Curvature](#4-curvature)
5. [Models and Projections](#5-models-and-projections)
6. [Topology](#6-topology)
7. [Tilings](#7-tilings)
8. [Representations of Geometry](#8-representations-of-geometry)
9. [Games and Interactive Visualizations](#9-games-and-interactive-visualizations)
10. [Product and Twisted Geometries](#10-product-and-twisted-geometries)
11. [Implementation Checklist](#11-implementation-checklist)
12. [Key Formulas](#12-key-formulas)
13. [Numeric Gotchas](#13-numeric-gotchas)

---

## 1. Core Concepts

### 1.1 What is Non-Euclidean Geometry?

Non-Euclidean geometry violates Euclid's parallel postulate while
satisfying his other assumptions. The two main types are:

- **Spherical geometry**: No parallel lines exist (lines always
  intersect)
- **Hyperbolic geometry**: Infinitely many parallel lines through a
  point

### 1.2 Key Properties Comparison

| Property                     | Euclidean (K=0) | Spherical (K>0)       | Hyperbolic (K<0)         |
| ---------------------------- | --------------- | --------------------- | ------------------------ |
| Parallel lines through point | Exactly 1       | 0                     | Infinitely many          |
| Triangle angle sum           | 180°            | > 180°                | < 180°                   |
| Pythagorean theorem          | a² + b² = c²    | cos(a)cos(b) = cos(c) | cosh(a)cosh(b) = cosh(c) |
| Circle circumference         | 2πr             | 2π sin(r)             | 2π sinh(r)               |
| Scale invariance             | Yes             | No                    | No                       |
| Rectangles exist             | Yes             | No                    | No                       |

### 1.3 Curvature Parameter K

The Gaussian curvature K determines the geometry:

- **K > 0**: Spherical (positive curvature)
- **K = 0**: Euclidean (flat)
- **K < 0**: Hyperbolic (negative curvature)

Curvature measures how much geometry differs from Euclidean. Smaller
scales approach Euclidean behavior in all geometries.

### 1.4 Geometry vs Topology

- **Geometry**: Local properties. Changes when stretched but not when
  cut/glued.
- **Topology**: Global properties. Changes when cut/glued but not when
  stretched.

---

## 2. Modeling Geometry

### 2.1 Linear Algebra Foundation

Points are represented as tuples in R^(d+1) using homogeneous
coordinates. Linear transformations represent isometries
(distance-preserving functions).

**Key operations:**

- Rotation: R^α\_{i,j}(v) = v with coordinates rotated in (i,j) plane
- Translation: In Euclidean, v → v + w. Represented as linear
  transformation using homogeneous coordinates.

### 2.2 Homogeneous Coordinates

Represent d-dimensional space using d+1 coordinates, with the last
coordinate = 1 for all points.

**Why?** Allows translations to be represented as linear
transformations.

### 2.3 Inner Products

**Euclidean inner product:**

```
g_E(v, w) = Σ v_i * w_i
```

**Minkowski inner product (for hyperbolic):**

```
g_H(v, w) = v₁w₁ + ... + v_d*w_d - v_{d+1}*w_{d+1}
```

### 2.4 The Three Models

#### Euclidean E^d

- Space: S = {x ∈ R^(d+1) : x\_{d+1} = 1}
- Origin: C₀ = (0, 0, ..., 1)
- Translation: T^x_i(v) = v with v_i += x

#### Spherical S^d

- Space: S = {x ∈ E^(d+1) : g_S(x,x) = 1} (unit sphere)
- Origin: C₀ = (0, 0, ..., 1)
- Translation: T^x*i = R^x*{i,d+1} (rotation!)
- Distance: cos(δ(x,y)) = g(x,y)

#### Hyperbolic H^d (Minkowski Hyperboloid)

- Space: S = {x ∈ E^(d,1) : g*H(x,x) = -1, x*{d+1} > 0}
- Origin: C₀ = (0, 0, ..., 1)
- Translation: T^x*i = L^x*{i,d+1} (Lorentz boost!)
- Distance: cosh(δ(x,y)) = -g_H(x,y)

### 2.5 Universal Homogeneous Model (U^K_d)

Unifies all three geometries with curvature parameter K:

```typescript
// Generalized trig functions
function sinK(α: number, K: number): number {
  if (K > 0) return Math.sqrt(1 / K) * Math.sin(α * Math.sqrt(K))
  if (K === 0) return α
  return Math.sqrt(1 / -K) * Math.sinh(α * Math.sqrt(-K))
}

function cosK(α: number, K: number): number {
  if (K > 0) return Math.cos(α * Math.sqrt(K))
  if (K === 0) return 1
  return Math.cosh(α * Math.sqrt(-K))
}
```

**Translation formula:**

```
T^x_i(v) = v with:
  v_i = v_i * cosK(x) + v_{d+1} * sinK(x)
  v_{d+1} = v_{d+1} * cosK(x) - K * v_i * sinK(x)
```

**Inner product:**

```
g(v, w) = Σ v_i*w_i + v_{d+1}*w_{d+1}/K
```

**Space constraint:**

```
x²_{d+1} + K*(x²₁ + x²₂ + ... + x²_d) = 1
```

---

## 3. Creating Visualizations

### 3.1 Key Projections

**Beltrami-Klein Model (d=0 perspective):**

- Maps hyperboloid to unit disk
- Straight lines → straight lines
- NOT conformal

**Poincaré Disk Model (d=1 perspective):**

- Maps hyperboloid to unit disk
- Straight lines → circular arcs orthogonal to boundary
- Conformal (preserves angles)
- Most common for visualization

**Projection formula:**

```
{x, y, z} on hyperboloid → {x/(z+d), y/(z+d)} on plane
```

### 3.2 Tessellation Data Structure

Use a **lazily generated combinatorial map** instead of coordinate
arrays.

```typescript
interface Tile {
  type: number // Shape type (e.g., triangle, square, pentagon)
  neighbors: Tile[] // Adjacent tiles (indexed by direction)
  matrices: Matrix[] // Transform from this tile to each neighbor
}
```

**Key insight:** Store transformation matrices between adjacent tiles,
not absolute coordinates. This avoids numerical precision issues.

### 3.3 Building Regular Tilings {p, q}

**Schläfli symbol {p, q}:**

- p = sides of each tile
- q = tiles meeting at each vertex

**Determining geometry:**

```
If 1/p + 1/q > 1/2: Spherical
If 1/p + 1/q = 1/2: Euclidean
If 1/p + 1/q < 1/2: Hyperbolic
```

**Regular Euclidean tilings:** {3,6}, {4,4}, {6,3} **Regular spherical
tilings:** {3,3}, {3,4}, {3,5}, {4,3}, {5,3} **Regular hyperbolic
tilings:** All other valid {p,q}

### 3.4 Tile Generation Algorithm

```typescript
function generateTiles(origin: Tile, maxTiles: number): Tile[] {
  const queue: Tile[] = [origin]
  const visited = new Set<Tile>()

  while (queue.length > 0 && visited.size < maxTiles) {
    const tile = queue.shift()!
    if (visited.has(tile)) continue
    visited.add(tile)

    for (const neighbor of tile.neighbors) {
      if (neighbor && !visited.has(neighbor)) {
        queue.push(neighbor)
      }
    }
  }

  return Array.from(visited)
}
```

### 3.5 Computing Neighbor Matrices

For a regular {p, q} tiling:

1. Compute edge length using law of cosines
2. Build reflection matrix for each edge
3. Compose reflections to get neighbor transforms

**Internal angle of regular p-gon in geometry K:**

```
cosK(edge/2) = cos(π/p) / sin(π/q)
```

### 3.6 Three-Dimensional Rendering

Two approaches:

**Polygon-based:**

- Transform all face vertices to camera space
- Use standard 3D rendering pipeline
- Challenge: Hyperbolic edges are curves, need subdivision

**Raycasting:**

- For each pixel, trace ray until it hits wall
- Ray equation: p' = p _ cosK(x) + v _ sinK(x)
- Simpler for anisotropic geometries

---

## 4. Curvature

### 4.1 Extrinsic vs Intrinsic Curvature

- **Extrinsic**: How far curve/surface deviates from straight in ambient
  space
- **Intrinsic**: How far geometry differs from Euclidean

### 4.2 Curve Curvature

Curvature k = a₂/v², where a₂ is acceleration orthogonal to movement.

**Euclidean circle of radius r:** k = 1/r

### 4.3 Curves in Hyperbolic Geometry

Four types of constant-curvature curves:

| Type                     | Curvature | In Poincaré Disk              |
| ------------------------ | --------- | ----------------------------- |
| Geodesic (straight line) | k = 0     | Circle orthogonal to boundary |
| Equidistant curve        | 0 < k < 1 | Circle crossing boundary      |
| Horocycle                | k = 1     | Circle tangent to boundary    |
| Circle                   | k > 1     | Circle inside disk            |

**Equidistant curves:** Path of constant distance from a geodesic. Arise
because parallel geodesics diverge in hyperbolic space.

**Horocycles:** Limit case between equidistant curves and circles.
Tangent to the boundary at an "ideal point" (point at infinity).

### 4.4 Surface Curvature

**Principal curvatures k₁, k₂:** Curvature in two perpendicular
directions.

**Gaussian curvature:** K = k₁ \* k₂

**Theorema Egregium:** Gaussian curvature is intrinsic (preserved by
bending).

### 4.5 Surfaces in Hyperbolic 3-Space

| Surface Type             | Intrinsic Geometry      |
| ------------------------ | ----------------------- |
| Horosphere               | Euclidean (K = 0)       |
| Sphere                   | Spherical (K > 0)       |
| Equidistant surface      | Hyperbolic (-1 < K < 0) |
| Plane (geodesic surface) | Hyperbolic (K = -1)     |

### 4.6 Gauss-Bonnet Theorem

For curve c of curvature k, length l, enclosing area A on surface of
curvature K:

```
k*l + K*A = 2π
```

For polygon: Sum of exterior angles + K\*A = 2π

---

## 5. Models and Projections

### 5.1 Projection Properties

- **Conformal**: Preserves angles
- **Equal-area**: Preserves areas
- **Equidistant**: Preserves distances from a point/line

These properties are mutually exclusive for non-trivial projections.

### 5.2 Azimuthal Projections

Project from center outward. All straight lines through origin map to
straight lines.

**Gnomonic (K-B model):** d = 0 perspective. Geodesics → straight lines.

**Stereographic (Poincaré):** d = 1 perspective. Conformal.

**Orthographic:** Project perpendicular to plane. For spheres, shows
hemisphere.

**Azimuthal equidistant:** Distances from origin preserved.

**Lambert azimuthal equal-area:** Areas preserved.

### 5.3 Cylindrical Projections

Wrap around cylinder. Good for band-like visualizations.

**Mercator:** Conformal. ln(tan(π/4 + lat/2)) for latitude.

**Cylindrical equal-area:** Areas preserved.

### 5.4 The Half-Plane Model

For hyperbolic geometry:

- Upper half of plane {(x, y) : y > 0}
- Metric: ds² = (dx² + dy²)/y²
- Geodesics: Vertical lines or semicircles with center on x-axis

**Relation to Poincaré disk:** Möbius transformation maps between them.

### 5.5 Band Model

Apply complex logarithm to half-plane. Creates infinite strip.

Good for visualizing "walking in one direction forever."

### 5.6 BFS Rendering

For non-azimuthal projections, use breadth-first search from central
tile:

```typescript
function renderTiles(center: Tile, screen: Screen): void {
  const queue: Tile[] = [center]
  const visited = new Set<Tile>()

  while (queue.length > 0) {
    const tile = queue.shift()!
    if (visited.has(tile)) continue

    const projected = projectTile(tile)
    if (!fitsOnScreen(projected, screen)) continue
    if (projectedSizeTooSmall(projected)) continue

    visited.add(tile)
    renderTile(projected)

    for (const neighbor of tile.neighbors) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor)
      }
    }
  }
}
```

### 5.7 Shift-Points and Shift-Matrices

**Problem:** In band projections, coordinates grow unbounded → precision
loss.

**Solution:** Store position as (h, x) where:

- h: Point in hyperboloid model (kept small)
- x: Scalar shift (stores large displacement)

```typescript
interface ShiftPoint {
  h: Point // Hyperboloid coordinates (local)
  x: number // Shift amount (can be large)
}

interface ShiftMatrix {
  M: Matrix // Isometry matrix
  x: number // Shift amount
}
```

This is analogous to "floating origin" in large Euclidean worlds.

---

## 6. Topology

### 6.1 Surgery Operations

- **Gluing:** Identifying boundary points
- **Cutting:** Inverse of gluing
- **Surgery:** Both operations

### 6.2 Quotient Spaces

Identify points by equivalence relation. Example: Torus from rectangle
by gluing opposite edges.

```typescript
// Torus identification
function identify(p: Point): Point {
  return {
    x: p.x % width,
    y: p.y % height,
  }
}
```

### 6.3 Orbifolds

Quotient spaces with symmetry. Allow cone points and mirror boundaries.

**Cone point:** Angle around point < 360°. Example: Identify (x,y) with
rotations → origin has less than full rotation.

**Mirror boundary:** Points on boundary "see" 180° in front only.

### 6.4 Euler Characteristic

χ = V - E + F (vertices - edges + faces)

**Determines possible geometry:**

- χ > 0 → Spherical
- χ = 0 → Euclidean
- χ < 0 → Hyperbolic

**For surfaces:** χ = 2 - 2g (where g = genus = "number of holes")

### 6.5 Hyperbolic Surfaces

Finite hyperbolic surfaces exist by gluing hyperbolic polygons.

**Example {7,3} construction:**

- Use F heptagons (7-sided)
- E = 7F/2 edges
- V = 7F/3 vertices
- χ = F - 7F/2 + 7F/3 = -F/6
- Need F divisible by 6

Smallest: F = 6 (non-orientable), F = 12 "zebra quotient" (orientable, χ
= -2)

### 6.6 Implementing Quotient Spaces

```typescript
interface QuotientSpace {
  fundamentalDomain: Tile[]
  sidePairings: Map<Edge, { targetEdge: Edge; transform: Matrix }>

  normalize(point: Point): { localPoint: Point; tileId: number }
  applyWrap(tile: Tile, direction: number): Tile
}
```

---

## 7. Tilings

### 7.1 Regular Tilings

Schläfli symbol {p, q}: p-gons, q meeting at each vertex.

**Dual tiling:** Swap p and q → {q, p}

### 7.2 Archimedean (Uniform) Tilings

Different polygon types, but all vertices identical.

**Notation:** (p₁.p₂.p₃...) = polygon types around each vertex, in
order.

Examples:

- (4.8.8) = Truncated square tiling
- (3.6.3.6) = Trihexagonal tiling

### 7.3 Construction Operations

From regular tiling {p, q}:

| Operation      | Result vertex config | Face types               |
| -------------- | -------------------- | ------------------------ |
| Truncation     | (q.2p.2p)            | q-gons, 2p-gons          |
| Rectification  | (p.q.p.q)            | p-gons, q-gons           |
| Bitruncation   | (2p.2q.2q)           | 2p-gons, 2q-gons         |
| Cantellation   | (3.p.3.q)            | 3-gons, p-gons, q-gons   |
| Omnitruncation | (4.2p.2q)            | 4-gons, 2p-gons, 2q-gons |

### 7.4 Catalan Tilings (Duals of Archimedean)

**Isohedral:** All tiles identical → "fair dice" shapes.

Catalan solids are duals of Archimedean solids.

### 7.5 Goldberg-Coxeter Construction

Subdivides 3-valent tilings to increase face count.

**Parameters:** Integers (a, b) determining subdivision.

**Process:**

1. Take dual (triangulate)
2. Replace each triangle with subdivided version based on (a, b)
3. Take dual back

**Application:** Soccer ball pattern, geodesic domes, higher-resolution
hyperbolic tilings.

### 7.6 Binary Tiling

Non-regular tiling based on horocycles:

- Infinite strips bounded by horocycles
- Each strip contains tiles
- Strips "branch" exponentially

Useful for tree-like structures in hyperbolic space.

---

## 8. Representations of Geometry

### 8.1 Representation Tradeoffs

| Representation   | Pros                     | Cons                        |
| ---------------- | ------------------------ | --------------------------- |
| Matrix           | General, composable      | Many components, drift      |
| Quaternion       | Compact for 3D rotations | Limited to rotations        |
| Clifford algebra | Unified, stable          | Complex implementation      |
| Disk model       | Bounded coordinates      | Bad precision near boundary |
| Half-plane       | Good near origin         | Unbounded coordinates       |

### 8.2 Clifford Algebras

Represent isometries using algebra with basis elements that square to
±1.

**For H²:** Use split-quaternions (related to SL(2,R)).

**Point representation:** Represent point as isometry that takes origin
to that point.

### 8.3 Normalization

**Critical requirement:** All representations drift from valid states.

After composition, normalize:

- Points: Ensure g(x, x) = ±1 (depending on geometry)
- Isometries: Ensure determinant = ±1, orthogonality

```typescript
function normalizePoint(p: Point, K: number): Point {
  const norm = innerProduct(p, p, K)
  const target = K >= 0 ? 1 : -1
  const scale = Math.sqrt(Math.abs(target / norm))
  return scalePoint(p, scale)
}
```

### 8.4 Interpolation

**For rotations:** Can interpolate quaternions linearly + renormalize
(SLERP).

**For hyperbolic translations:** Use exponential map on tangent vectors.

---

## 9. Games and Interactive Visualizations

### 9.1 Level Design Types

1. **Closed world:** Bounded area, boundary effects
2. **Closed manifold:** Finite but wrapped (like Asteroids)
3. **Open world:** Infinite exploration

Hyperbolic space naturally supports infinite worlds with finite
"effective size."

### 9.2 Holonomy

Walking in a loop may not return you to original orientation!

**In hyperbolic plane:** Rotation = -K × (enclosed area)

### 9.3 Exponential Growth

Distance d from origin contains ~e^d tiles (in H²).

**Implications:**

- Cannot store/render everything
- Need procedural generation
- Need efficient culling

### 9.4 Great Walls

Use geodesics as natural barriers that extend infinitely.

In {7,3}: Certain geodesics never self-intersect and divide space.

### 9.5 Periodic Patterns

Track tiles modulo some group to create repeating patterns.

Useful for:

- Ensuring consistent biome boundaries
- Creating "land" regions with guaranteed properties
- Efficient storage (only store pattern once)

### 9.6 Hyperbolic Landscapes

**Euclidean approach (diamond-square):** Doesn't work well in hyperbolic
space.

**Hyperbolic approach:**

1. Assign random δ to each geodesic line
2. Altitude l(t) = sum of δ for lines between t and origin
3. Update incrementally: l(neighbor) = l(t) ± δ for crossed lines

---

## 10. Product and Twisted Geometries

### 10.1 Product Geometries

Combine two geometries:

- H² × R: Hyperbolic plane with Euclidean height
- S² × R: Sphere with Euclidean height

**Rendering:** Render base tiling, use height for coloring/displacement.

### 10.2 Nil Geometry (Twisted E² × R)

"Impossible staircase" geometry.

Moving in a horizontal loop returns you at different height. Height
change proportional to enclosed area.

### 10.3 Sol Geometry

More complex twisted product. Different expansion rates in different
directions.

---

## 11. Implementation Checklist

### Phase 1: Core Mathematics

- [ ] Implement sinK, cosK for all curvatures
- [ ] Implement inner product g(v, w, K)
- [ ] Implement point normalization
- [ ] Implement translation T^x_i
- [ ] Implement rotation R^α\_{i,j}
- [ ] Implement Lorentz boost L^α\_{i,j}
- [ ] Implement distance calculation

### Phase 2: Projections

- [ ] Poincaré disk projection
- [ ] Beltrami-Klein projection
- [ ] Half-plane model
- [ ] Perspective projection parameters (d)
- [ ] Band model
- [ ] Shift-point arithmetic

### Phase 3: Tessellations

- [ ] Tile data structure
- [ ] Neighbor matrix computation
- [ ] Regular tiling generator {p, q}
- [ ] BFS tile traversal
- [ ] Screen-fit culling
- [ ] Size-based culling

### Phase 4: Advanced Tilings

- [ ] Archimedean tilings
- [ ] Truncation operations
- [ ] Dual tilings
- [ ] Goldberg-Coxeter subdivision

### Phase 5: Topology

- [ ] Quotient space wrapper
- [ ] Orbifold support
- [ ] Euler characteristic calculator

### Phase 6: 3D Extension

- [ ] H³ hyperboloid model
- [ ] Raycasting renderer
- [ ] Horosphere surfaces
- [ ] 3D honeycombs

---

## 12. Key Formulas

### Distance Formulas

**Spherical:** cos(δ(x,y)) = g_S(x,y)

**Hyperbolic:** cosh(δ(x,y)) = -g_H(x,y)

**Alternative:** sinh(δ/2) = sqrt(g_H(x-y, x-y)) / 2

### Pythagorean Theorems

| Geometry   | Formula                  |
| ---------- | ------------------------ |
| Euclidean  | a² + b² = c²             |
| Spherical  | cos(a)cos(b) = cos(c)    |
| Hyperbolic | cosh(a)cosh(b) = cosh(c) |

### Circle Properties

| Property      | Euclidean | Spherical    | Hyperbolic    |
| ------------- | --------- | ------------ | ------------- |
| Circumference | 2πr       | 2π sin(r)    | 2π sinh(r)    |
| Area          | πr²       | 2π(1-cos(r)) | 2π(cosh(r)-1) |

### Curvature Relations

**Gauss-Bonnet:** k*l + K*A = 2π

**Euler characteristic:** χ = V - E + F = 2 - 2g

### Lorentz Boost

```
L^α_{i,j}(v) = v with:
  v_i = v_i * cosh(α) + v_j * sinh(α)
  v_j = v_j * cosh(α) + v_i * sinh(α)
```

### Projection Formulas

**General perspective:** (x, y, z) → (x/(z+d), y/(z+d))

**Poincaré (d=1):** (x, y, z) → (x/(z+1), y/(z+1))

**Beltrami-Klein (d=0):** (x, y, z) → (x/z, y/z)

---

## 13. Numeric Gotchas

### 13.1 Precision Loss

**Problem:** Repeated matrix multiplication accumulates errors.

**Solution:** Normalize after every few operations:

- Points: Re-project onto hyperboloid
- Matrices: Re-orthonormalize

### 13.2 Near-Boundary Issues

**In Poincaré disk:** Points near boundary have coordinates
approaching 1. Floating-point precision is worst here.

**Solution:** Use half-plane model for better precision near "infinity."

### 13.3 Large Coordinates

**In band model:** Coordinates grow without bound.

**Solution:** Use shift-points: store (local_point, shift) separately.

### 13.4 Curvature Near Zero

**Problem:** Formulas involve division by K, undefined at K = 0.

**Solution:**

- Use Taylor expansion for small K
- Or special-case Euclidean
- Or use limit: lim(K→0) sinK(x)/K = x

### 13.5 Tile Identity

**Problem:** Same tile reachable via different paths. Numeric
coordinates may differ.

**Solution:** Use combinatorial tile identity (path-based or ID-based),
not coordinates.

### 13.6 Matrix Drift

**Problem:** Isometry matrices drift from SO(n) or SO(n,1).

**Symptoms:**

- Determinant ≠ ±1
- M^T _ G _ M ≠ G (where G is metric matrix)

**Solution:** Periodic re-orthonormalization using Gram-Schmidt or polar
decomposition.

---

## References

- HyperRogue game: https://roguetemple.com/z/hyper/
- RogueViz engine: https://github.com/zenorogue/hyperrogue
- Book PDF: https://roguetemple.com/z/book/book.pdf
