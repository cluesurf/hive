# HyperRogue Book: Advanced Implementation Notes

Supplementary notes covering advanced topics from the HyperRogue book.

## Table of Contents

1. [Procedural Generation in Hyperbolic Space](#1-procedural-generation)
2. [Wave Function Collapse & Constraints](#2-constraint-satisfaction)
3. [Physics Simulation](#3-physics-simulation)
4. [Product & Twisted Geometries](#4-product-twisted-geometries)
5. [Clifford Algebra Details](#5-clifford-algebras)
6. [Conformal Projections & Complex Analysis](#6-conformal-projections)
7. [Voronoi Diagrams](#7-voronoi-diagrams)
8. [Tree-Based Data Structures](#8-tree-based-structures)
9. [Rendering Optimizations](#9-rendering-optimizations)

---

## 1. Procedural Generation

### 1.1 Great Walls (Barrier Lines)

In hyperbolic space, geodesics can serve as natural infinite barriers.

**Key insight:** In {7,3} tiling, certain "zigzag" geodesics never
self-intersect and divide the plane into two parts.

```typescript
interface GreatWall {
  // Geodesic defined by sequence of tiles it crosses
  tiles: Tile[]
  // Direction: which side is "left" vs "right"
  direction: 1 | -1
  // Distance function from any tile to wall
  distance(tile: Tile): number
}
```

**Use cases:**

- Biome boundaries that extend infinitely
- Navigation barriers
- Region separation

### 1.2 Equidistant Curve Generation

For curved boundaries (not straight lines):

```typescript
// Distance from equidistant curve based on barrier B
function distanceFromBarrier(tile: Tile, barrier: Tile[]): number {
  // For tiles on barrier
  if (barrier.includes(tile)) return 0

  // For other tiles: min distance to any barrier neighbor + 1
  let minDist = Infinity
  for (const neighbor of tile.neighbors) {
    const d = distanceFromBarrier(neighbor, barrier)
    minDist = Math.min(minDist, d + 1)
  }
  return minDist
}
```

### 1.3 Horocycle-Based Regions

Horocycles create concentric regions centered at ideal points.

**Binary tiling insight:** Horocycles naturally create exponentially
branching strips, useful for tree-like procedural generation.

### 1.4 Hyperbolic Landscapes (Terrain Generation)

**Euclidean diamond-square doesn't work well.** Use this instead:

```typescript
interface LandscapeGenerator {
  // Random delta for each geodesic line
  deltas: Map<GeodesicId, number>

  // Get altitude at tile
  getAltitude(tile: Tile): number {
    // Sum of deltas for all geodesics between tile and origin
    let altitude = 0
    for (const geodesic of geodesicsBetween(origin, tile)) {
      const delta = this.deltas.get(geodesic.id) ?? this.newDelta(geodesic)
      altitude += delta * geodesic.crossingDirection
    }
    return altitude
  }

  // Incremental update for adjacent tiles
  updateAltitude(from: Tile, to: Tile, fromAltitude: number): number {
    let altitude = fromAltitude
    for (const geodesic of geodesicsCrossed(from, to)) {
      const delta = this.deltas.get(geodesic.id) ?? this.newDelta(geodesic)
      altitude += delta * geodesic.crossingDirection
    }
    return altitude
  }
}
```

**Properties of this approach:**

- For any tiles t1, t2: altitude difference has Gaussian distribution
- Variance proportional to distance
- Completely symmetric (isometry-invariant)
- Local and incremental

### 1.5 Periodic Patterns

Track tiles modulo a hyperbolic manifold quotient.

```typescript
interface PeriodicPattern {
  // Fundamental domain
  manifold: Tile[]
  // Mapping from H² tile to manifold tile
  project(tile: Tile): Tile

  // Uses for patterns:
  // - Consistent biome assignment
  // - Guaranteeing certain configurations never appear
  // - Memory-efficient procedural generation
}
```

**Examples in HyperRogue:**

- Zebra pattern (12 heptagons)
- Emerald pattern
- Palace pattern
- Land of Storms (charge wall separation)

---

## 2. Constraint Satisfaction

### 2.1 Minesweeper in Hyperbolic Space

**Surprising result:** Minesweeper is NP-complete in Euclidean plane,
but solvable in polynomial time on hyperbolic tilings!

**Reason:** Hyperbolic tilings have bounded treewidth.

### 2.2 Local Constraint Satisfaction

```typescript
interface LocalConstraintProblem {
  graph: Tile[] // Finite tessellation fragment
  colors: Set<Color>
  constraints: Map<[Tile, Tile], Set<[Color, Color]>>

  // Solution: assign color to each tile satisfying constraints
  solve(): Map<Tile, Color> | null
}
```

### 2.3 Treewidth and Cops-and-Robber

**Key insight:** Periodic hyperbolic tilings have small treewidth.

**Cops-and-robber game:**

- Graph has treewidth w if w+1 cops can always catch robber
- Hyperbolic graphs: treewidth ≈ O(log n)
- Euclidean graphs: treewidth ≈ O(√n)

**Implication:** Dynamic programming is efficient on hyperbolic tilings.

### 2.4 Wave Function Collapse

```typescript
interface WFCGenerator {
  // Allowed local patterns (e.g., 3×3 tile configurations)
  templates: Template[]

  // Generate tile that matches all adjacent templates
  generateTile(adjacentTiles: Map<Direction, Tile>): Tile {
    const validColors = new Set(allColors)
    for (const [dir, neighbor] of adjacentTiles) {
      const compatible = this.compatibleColors(neighbor, dir)
      // Intersect with valid colors
      for (const c of validColors) {
        if (!compatible.has(c)) validColors.delete(c)
      }
    }
    return randomFrom(validColors)
  }
}
```

**Hyperbolic advantage:** Polynomial-time solvable vs NP-complete in
Euclidean case.

---

## 3. Physics Simulation

### 3.1 Newtonian Physics in Non-Euclidean Space

```typescript
interface PhysicsState {
  position: Point // x_t ∈ X (the geometry)
  velocity: TangentVector // v_t ∈ T_x(X) (tangent space at position)
}

function updateState(
  state: PhysicsState,
  forces: Force[],
  dt: number,
  geometry: Geometry,
): PhysicsState {
  // Apply forces to velocity (in tangent space)
  let newVelocity = state.velocity
  for (const force of forces) {
    newVelocity = addTangent(newVelocity, scaleTangent(force, dt))
  }

  // Move along geodesic in direction of velocity
  const newPosition = geometry.exp(
    state.position,
    scaleTangent(newVelocity, dt),
  )

  // Parallel transport velocity to new tangent space
  const transportedVelocity = geometry.parallelTransport(
    state.velocity,
    state.position,
    newPosition,
  )

  return { position: newPosition, velocity: transportedVelocity }
}
```

### 3.2 Key Formulas

**Position update along geodesic:**

```
x_{t+Δ} = x_t * cosK(|v|*Δ) + v/|v| * sinK(|v|*Δ)
```

**Velocity parallel transport:**

```
v_{t+Δ} = v_t * cosK(|v|*Δ) - K * x_t * sinK(|v|*Δ) * (v·v)
```

### 3.3 Non-Euclidean Gravity

**Problem:** No consistent "down" direction in hyperbolic space.

**Solutions:**

1. **Ideal point gravity:** Gravity always points toward an ideal point
   I. Objects can "miss" the ground and swing back up.

2. **Variable magnitude:** Gravity gets stronger near I (Gauss's law).
   Game world restricted to horospherical shell.

3. **Twisted geometry gravity:** In Nil, gravity points "down" in the
   twisted product sense. Creates impossible staircase physics.

### 3.4 Galilean Invariance Problem

**In Euclidean space:** Moving train feels stationary (relative motion).

**In hyperbolic space:** Moving object experiences "centrifugal" force!
Wings of airplane don't follow geodesics, so experience side force.

**Implication:** Objects in hyperbolic space can detect absolute motion.

**Solution:** Use de Sitter/anti-de Sitter spacetime for relativistic
games.

---

## 4. Product & Twisted Geometries

### 4.1 Product Geometries (H² × R, S² × R)

Simply combine 2D geometry with 1D Euclidean axis.

```typescript
interface ProductPoint {
  base: Point2D // Point in H² or S²
  height: number // Height in R
}

function distance(a: ProductPoint, b: ProductPoint, K: number): number {
  const baseDist = distanceInBase(a.base, b.base, K)
  const heightDist = Math.abs(a.height - b.height)
  return Math.sqrt(baseDist * baseDist + heightDist * heightDist)
}
```

### 4.2 Nil Geometry (Twisted E² × R)

**Intuition:** Impossible staircase geometry.

Moving in horizontal loop returns you at different height. Height change
= enclosed area.

**Coordinates:**

```typescript
// In Nil, moving from origin to (x, y, z) is:
function nilPoint(x: number, y: number, z: number): NilPoint {
  return { x, y, z }
}

// Composition in Nil:
function nilCompose(a: NilPoint, b: NilPoint): NilPoint {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z + (a.x * b.y - a.y * b.x) / 2,
  }
}
```

**Note:** The term `(a.x * b.y - a.y * b.x) / 2` is the area of the
triangle formed by origin, a, and a+b.

### 4.3 Geodesics in Nil

Geodesics are lifts of:

- Vertical lines (pure z movement)
- Horizontal geodesics (pure xy movement)
- Helices (combined, optimal for reaching z ≠ 0)

**Optimal path to (0, 0, z):**

- Not straight up (length z)
- Not square loop (length 4√z)
- Helix around circle of optimal radius r
- Length = √((2πr)² + (z - πr²)²)

### 4.4 Other Twisted Products

| Base × Fiber       | Result                 |
| ------------------ | ---------------------- |
| E² × R             | E³ (untwisted)         |
| E² × R (twisted)   | Nil                    |
| H² × R             | H² × R (product)       |
| H² × R (twisted)   | SL(2,R) cover          |
| H² × S¹ (twisted)  | Unit split-quaternions |
| S² × S¹ (twisted)  | S³ (unit quaternions!) |
| S² × 2S¹ (twisted) | 2S³                    |

### 4.5 Spaces of Motion

The space of orientation-preserving isometries of X forms a 3D geometry.

- Motion of E²: E² × S¹ (untwisted)
- Motion of S²: S³ (quaternions)
- Motion of H²: twisted H² × S¹ (split-quaternions)

---

## 5. Clifford Algebras

### 5.1 Definition

For vector space V with inner product g:

```
Cl(V) = T(V) / (uv + vu = 2g(u,v))
```

**Basis:** For p space + q time dimensions, Cl(V) has 2^(p+q)
dimensions.

**Key relations:**

- e_i \* e_i = σ_i (±1 depending on space/time)
- e*i * e*j = -e_j * e_i (anticommute)

### 5.2 For Hyperbolic Geometry

Use **split-quaternions** (Clifford algebra with signature (2,1)):

```typescript
interface SplitQuaternion {
  w: number // scalar
  x: number // e1
  y: number // e2
  z: number // e1*e2
}

// Product of split-quaternions
function multiply(
  a: SplitQuaternion,
  b: SplitQuaternion,
): SplitQuaternion {
  return {
    w: a.w * b.w + a.x * b.x + a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w - a.y * b.z + a.z * b.y,
    y: a.w * b.y + a.x * b.z + a.y * b.w - a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  }
}
```

### 5.3 Point Representation via Clifford

Represent point as isometry taking origin to that point.

**Caveat:** When applying isometry T to point-as-isometry a:

- Naive: b = T \* a (wrong! includes unwanted rotation)
- Correct: Extract translational component, normalize

---

## 6. Conformal Projections

### 6.1 Complex Analysis Connection

Conformal 2D mappings = complex-differentiable functions.

**Möbius transformations:** f(z) = (c + dz)/(a + bz) where ad - bc ≠ 0

Properties:

- Bijections on Ĉ (complex plane + ∞)
- Map circles to circles
- All conformal mappings in higher dimensions (Liouville theorem)

### 6.2 Model Relationships

**Poincaré disk (|p| < 1) → Upper half-plane (Im(h) > 0):**

```
h = (p + i)/(1 - i*p̄)
```

**Scale at point h = a + bi in half-plane:** scale = b

### 6.3 Band Model

Apply complex logarithm to half-plane:

```typescript
function halfPlaneToband(h: Complex): Complex {
  return complexLog(h)
}

// Result: infinite horizontal strip
// Real part: "horizontal" position (unbounded)
// Imaginary part: "vertical" position (bounded by π)
```

### 6.4 Joukowsky and Dual-Focus Projections

Complex function projections:

```typescript
// Joukowsky: z → z + 1/z
function joukowsky(z: Complex): Complex {
  return add(z, divide(one, z))
}
```

---

## 7. Voronoi Diagrams

### 7.1 Stereographic Trick

**Problem:** Compute Voronoi diagram in H² or S².

**Solution:**

1. Project points to Euclidean plane via stereographic projection
2. Compute Euclidean Voronoi diagram
3. Voronoi edges map to circles in original geometry
4. Replace Euclidean circle centers with native circle centers

**Why this works:** Stereographic projection maps circles to circles.

---

## 8. Tree-Based Structures

### 8.1 GRTS (General Rooted Tree Structure)

Lazy representation of tilings using tree structure.

```typescript
interface GRTSNode {
  tileType: number
  parent: GRTSNode | null
  parentEdge: number
  children: Map<number, GRTSNode> // edge → child

  // Get neighbor via edge
  getNeighbor(edge: number): GRTSNode {
    // Check if child exists
    if (this.children.has(edge)) {
      return this.children.get(edge)!
    }
    // Check if going to parent
    if (edge === this.parentEdge) {
      return this.parent!
    }
    // Otherwise, traverse via parent and down
    return this.computeNeighborViaTree(edge)
  }
}
```

### 8.2 Aperiodic Tilings as Trees

Euclidean aperiodic tilings (Penrose, hat) have hierarchical structure:

- Tiles → clusters → superclusters → ...
- Each level has finite number of types
- Forms tree structure

**Connection to hyperbolic:** Cluster hierarchy = horospherical slices
of 3D hyperbolic tree-based tiling.

---

## 9. Rendering Optimizations

### 9.1 Cellular Automata for Procedural Generation

```typescript
interface CellularAutomaton {
  colors: Color[]
  rule: (tile: Tile, neighbors: Color[]) => Color

  iterate(tiles: Map<Tile, Color>): Map<Tile, Color> {
    const next = new Map<Tile, Color>()
    for (const [tile, color] of tiles) {
      const neighborColors = tile.neighbors.map(n => tiles.get(n)!)
      next.set(tile, this.rule(tile, neighborColors))
    }
    return next
  }
}
```

**Use case:** Living Cave in HyperRogue uses majority-vote rule.

### 9.2 Periodic Patterns for Finite Computation

For infinite procedural effects (flow patterns, etc.):

1. Generate on finite hyperbolic manifold
2. Use as periodic pattern in game
3. Large manifold makes periodicity non-obvious

### 9.3 Distance-Based Culling

```typescript
function shouldRender(tile: Tile, camera: Camera): boolean {
  // Project tile to screen
  const projected = project(tile, camera)

  // Cull if too small
  if (projectedSize(projected) < MIN_SIZE) return false

  // Cull if off-screen
  if (!onScreen(projected)) return false

  return true
}
```

### 9.4 BFS Traversal Order

**Key insight:** BFS from center naturally prioritizes:

- Tiles closer to camera
- Tiles taking more screen space
- Automatically stops when tiles get too small

---

## Summary: Engine Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (Games, Visualizations, Data Viz)                          │
├─────────────────────────────────────────────────────────────┤
│                    Scene Management                          │
│  (Tile generation, Camera, Physics)                         │
├─────────────────────────────────────────────────────────────┤
│                    Geometry Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Isometries  │  │ Projections  │  │  Tessellations│       │
│  │  (Matrices,  │  │  (Poincaré,  │  │  ({p,q}, GRTS,│       │
│  │   Clifford)  │  │   Band, etc) │  │   operations) │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
├─────────────────────────────────────────────────────────────┤
│                    Math Primitives                           │
│  (sinK, cosK, inner products, normalization)                │
└─────────────────────────────────────────────────────────────┘
```

**Critical paths:**

1. sinK/cosK → Translation/Rotation → Isometry composition
2. Tile generation → Neighbor matrices → BFS traversal
3. Projection → Culling → Rendering

**Numeric stability chain:**

1. Use combinatorial tile identity (not coordinates)
2. Store neighbor transforms (not absolute positions)
3. Normalize after operations
4. Use shift-points for band-like projections
