# Generalized Tessellation Coordinate System Specification

## Executive Summary

This document specifies a unified coordinate system framework for
tessellations across spherical, Euclidean, and hyperbolic geometries.
While the geometries differ fundamentally, a common abstraction layer
enables consistent APIs with geometry-specific implementations.

## The Three Geometries Compared

| Property             | Spherical         | Euclidean        | Hyperbolic         |
| -------------------- | ----------------- | ---------------- | ------------------ |
| Curvature            | Positive (K > 0)  | Zero (K = 0)     | Negative (K < 0)   |
| Tile count           | Finite            | Infinite         | Infinite           |
| Growth rate          | Bounded           | Polynomial O(r²) | Exponential O(φʳ)  |
| Translation symmetry | No                | Yes              | No                 |
| Natural coordinates  | Vertices/faces    | Integer grid     | Tree paths         |
| Neighbor complexity  | O(1) table lookup | O(1) arithmetic  | O(log n) or O(1)\* |

\*O(1) with Fibonacci/Zeckendorf encoding for specific tilings.

## Can They Be Unified?

**Yes, at the interface level. No, at the implementation level.**

All tessellations share:

1. Discrete tiles with unique identities
2. Adjacency relationships (neighbors)
3. Combinatorial distance metrics
4. Navigation operations

The differences lie in:

1. How identities are represented
2. How neighbors are computed
3. Storage requirements (finite vs. infinite)
4. Special structure (translations, tree paths)

## Unified Interface Design

### Core Types

```typescript
/**
 * Geometry type enumeration.
 */
type GeometryType = 'spherical' | 'euclidean' | 'hyperbolic'

/**
 * A tile identifier. Opaque type - implementation-specific.
 * Must be hashable and equality-comparable.
 */
type TileId = string | number | bigint | symbol

/**
 * Direction index for neighbor navigation.
 * For {p,q} tilings: 0 to p-1 for the p edges of each tile.
 */
type Direction = number

/**
 * A point in the native coordinate space.
 * - Spherical: [x, y, z] on unit sphere
 * - Euclidean: [x, y]
 * - Hyperbolic: [x, y, t] on hyperboloid (t² - x² - y² = 1)
 */
type Point = [number, number] | [number, number, number]
```

### Core Interface

```typescript
/**
 * Abstract tessellation coordinate system.
 * Provides tile addressing and navigation for any geometry.
 */
interface TessellationCoordinates<Id extends TileId = TileId> {
  // ═══════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════

  /** Geometry type */
  readonly geometry: GeometryType

  /** Number of polygon sides (p in {p,q}) */
  readonly p: number

  /** Vertex degree (q in {p,q}) */
  readonly q: number

  /** Total tile count (finite for spherical, Infinity otherwise) */
  readonly tileCount: number

  // ═══════════════════════════════════════════════════════════
  // CORE NAVIGATION
  // ═══════════════════════════════════════════════════════════

  /** Get the origin tile (canonical starting point) */
  origin(): Id

  /**
   * Get neighbor in given direction.
   * Direction is 0 to p-1, clockwise from "north" edge.
   */
  neighbor(tile: Id, direction: Direction): Id

  /**
   * Get all neighbors of a tile.
   * Returns array of length p in clockwise order.
   */
  neighbors(tile: Id): Id[]

  /**
   * Find which direction leads from tile to neighbor.
   * Returns -1 if not adjacent.
   */
  directionTo(from: Id, to: Id): Direction

  // ═══════════════════════════════════════════════════════════
  // DISTANCE AND PATHS
  // ═══════════════════════════════════════════════════════════

  /**
   * Combinatorial distance (minimum edge traversals).
   * This is discrete graph distance, not metric distance.
   */
  distance(a: Id, b: Id): number

  /**
   * Find shortest path between tiles.
   * Returns array of tile IDs including start and end.
   */
  path(from: Id, to: Id): Id[]

  // ═══════════════════════════════════════════════════════════
  // COORDINATE CONVERSION
  // ═══════════════════════════════════════════════════════════

  /**
   * Get geometric center of tile.
   * Returns point in native coordinate space.
   */
  center(tile: Id): Point

  /**
   * Get vertices of tile polygon.
   * Returns p points in clockwise order.
   */
  vertices(tile: Id): Point[]

  /**
   * Find tile containing a point.
   * Returns null if point is outside tessellation (spherical only).
   */
  tileAt(point: Point): Id | null

  // ═══════════════════════════════════════════════════════════
  // ITERATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Iterate tiles in order of distance from origin.
   * For infinite tessellations, yields indefinitely.
   */
  [Symbol.iterator](): Iterator<Id>

  /**
   * Get tiles within combinatorial distance r from origin.
   * For hyperbolic, count grows exponentially with r.
   */
  tilesWithinDistance(center: Id, radius: number): Id[]

  // ═══════════════════════════════════════════════════════════
  // SERIALIZATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Convert tile ID to canonical string representation.
   * Must be reversible via fromString().
   */
  toString(tile: Id): string

  /**
   * Parse tile ID from string.
   */
  fromString(s: string): Id

  /**
   * Convert to compact integer (if supported).
   * Not all coordinate systems support this.
   */
  toInteger?(tile: Id): bigint

  /**
   * Parse from integer.
   */
  fromInteger?(n: bigint): Id
}
```

## Spherical Implementation

### Characteristics

- Finite tessellations only (Platonic/Archimedean solids)
- Full adjacency can be precomputed
- Simple table lookups for all operations

### Supported Tilings

| Name         | {p,q} | Tiles | Notes              |
| ------------ | ----- | ----- | ------------------ |
| Tetrahedron  | {3,3} | 4     | Self-dual          |
| Cube         | {4,3} | 6     | Dual: octahedron   |
| Octahedron   | {3,4} | 8     | Dual: cube         |
| Dodecahedron | {5,3} | 12    | Dual: icosahedron  |
| Icosahedron  | {3,5} | 20    | Dual: dodecahedron |

### Implementation

```typescript
class SphericalCoordinates implements TessellationCoordinates<number> {
  readonly geometry = 'spherical' as const
  readonly tileCount: number

  // Precomputed adjacency table
  private adjacency: number[][]

  // Precomputed centers and vertices
  private centers: Point[]
  private allVertices: Point[][]

  constructor(p: number, q: number) {
    // Validate (p-2)(q-2) < 4 for spherical
    // Build adjacency from known polyhedra
    // Precompute all geometry
  }

  neighbor(tile: number, dir: Direction): number {
    return this.adjacency[tile][dir]
  }

  // All operations are O(1) table lookups
}
```

## Euclidean Implementation

### Characteristics

- Infinite but with translation symmetry
- Integer coordinates natural
- Arithmetic operations for navigation

### Supported Tilings

| Name       | {p,q} | Coordinate System    |
| ---------- | ----- | -------------------- |
| Square     | {4,4} | (x, y) integers      |
| Triangular | {3,6} | Axial or offset      |
| Hexagonal  | {6,3} | Axial (q, r) or cube |

### Implementation

```typescript
type EuclideanId = { x: number; y: number }

class EuclideanCoordinates
  implements TessellationCoordinates<EuclideanId>
{
  readonly geometry = 'euclidean' as const
  readonly tileCount = Infinity

  // Direction vectors depend on tiling type
  private directions: EuclideanId[]

  constructor(p: number, q: number) {
    // Validate (p-2)(q-2) = 4 for Euclidean
    // Set up direction vectors
  }

  neighbor(tile: EuclideanId, dir: Direction): EuclideanId {
    const d = this.directions[dir]
    return { x: tile.x + d.x, y: tile.y + d.y }
  }

  distance(a: EuclideanId, b: EuclideanId): number {
    // Manhattan-like distance depending on tiling
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
  }
}
```

## Hyperbolic Implementation

### Characteristics

- Infinite with exponential growth
- No translation symmetry
- Tree-based decomposition essential
- Multiple encoding strategies available

### Strategy Options

| Strategy             | Best For           | Complexity         |
| -------------------- | ------------------ | ------------------ |
| Von Dyck Groups      | Any {p,q}          | O(log n) normalize |
| Fibonacci/Zeckendorf | {7,3}, {5,4}       | O(1) with formulas |
| Path Encoding        | Small explorations | O(depth)           |
| Hybrid               | Production use     | Varies             |

### Von Dyck Group Implementation (Generic)

```typescript
/**
 * Group word: sequence of generator applications.
 * Generators: a (rotation around cell), b (rotation around vertex)
 * Relations: a^p = b^q = (ab)^2 = e
 */
type GroupWord = string // e.g., "a.b.a.a.b"

class VonDyckCoordinates implements TessellationCoordinates<GroupWord> {
  readonly geometry = 'hyperbolic' as const
  readonly tileCount = Infinity

  constructor(readonly p: number, readonly q: number) {
    // Validate (p-2)(q-2) > 4 for hyperbolic
  }

  origin(): GroupWord {
    return '' // Identity element
  }

  neighbor(tile: GroupWord, dir: Direction): GroupWord {
    // Append generator and normalize
    const extended = tile + this.generator(dir)
    return this.normalize(extended)
  }

  private generator(dir: Direction): string {
    // Map direction to generator sequence
    // Direction 0 = 'b' (rotate around vertex)
    // Direction 1 = 'a.b' (rotate around cell, then vertex)
    // etc.
  }

  private normalize(word: GroupWord): GroupWord {
    // Apply group relations to get canonical form:
    // 1. a^p → e
    // 2. b^q → e
    // 3. (ab)^2 → e  (so abab → e, ab → b⁻¹a⁻¹)
    // 4. Use shortlex ordering for uniqueness
  }

  distance(a: GroupWord, b: GroupWord): number {
    // Find a⁻¹·b and count generator applications
    const diff = this.multiply(this.invert(a), b)
    return this.wordLength(diff)
  }
}
```

### Fibonacci/Zeckendorf Implementation ({7,3} Specific)

```typescript
class FibonacciCoordinates implements TessellationCoordinates<bigint> {
  readonly geometry = 'hyperbolic' as const
  readonly p = 7
  readonly q = 3
  readonly tileCount = Infinity

  // Precomputed Fibonacci numbers
  private fib: bigint[]

  constructor(maxDepth: number = 100) {
    this.fib = this.computeFibonacci(maxDepth)
  }

  origin(): bigint {
    return 1n
  }

  neighbor(tile: bigint, dir: Direction): bigint {
    const status = this.nodeStatus(tile)
    const father = this.father(tile)
    const son = this.preferredSon(tile)

    // Apply neighbor formulas from Margenstern
    if (status === 'white') {
      // [f, n-1, s-1, s, s+1, s+2, n+1]
      const neighbors = [
        father,
        tile - 1n,
        son - 1n,
        son,
        son + 1n,
        son + 2n,
        tile + 1n,
      ]
      return neighbors[dir]
    } else {
      // [f, f-1, n-1, s, s+1, s+2, n+1]
      const neighbors = [
        father,
        father - 1n,
        tile - 1n,
        son,
        son + 1n,
        son + 2n,
        tile + 1n,
      ]
      return neighbors[dir]
    }
  }

  /**
   * Determine if node is white (3 children) or black (2 children).
   * Based on Zeckendorf representation pattern.
   */
  private nodeStatus(n: bigint): 'white' | 'black' {
    const zeck = this.toZeckendorf(n)
    // Check trailing pattern
    // ...10 or ...100 → black (2-node)
    // ...01 or ...010 → white (3-node)
  }

  /**
   * Compute preferred son using golden ratio.
   */
  private preferredSon(n: bigint): bigint {
    // m ≈ n × φ² where φ = (1 + √5)/2
    // Use Fibonacci identity for exact computation
  }

  /**
   * Compute father.
   */
  private father(n: bigint): bigint {
    // f ≈ n / φ²
    // Remove trailing zeros from Zeckendorf representation
  }

  /**
   * Convert to Zeckendorf representation.
   * Returns array of Fibonacci indices (non-consecutive).
   */
  private toZeckendorf(n: bigint): number[] {
    const result: number[] = []
    let remaining = n
    for (let i = this.fib.length - 1; i >= 1 && remaining > 0n; i--) {
      if (this.fib[i] <= remaining) {
        result.push(i)
        remaining -= this.fib[i]
      }
    }
    return result.reverse()
  }
}
```

### Hybrid Implementation (Recommended for Production)

```typescript
class HybridHyperbolicCoordinates
  implements TessellationCoordinates<TileId>
{
  private vonDyck: VonDyckCoordinates
  private fibonacci?: FibonacciCoordinates
  private cache: Map<string, TileId>

  constructor(p: number, q: number) {
    this.vonDyck = new VonDyckCoordinates(p, q)

    // Use optimized Fibonacci encoding for known tilings
    if (p === 7 && q === 3) {
      this.fibonacci = new FibonacciCoordinates()
    }
    // Could add {5,4} etc.

    this.cache = new Map()
  }

  neighbor(tile: TileId, dir: Direction): TileId {
    if (this.fibonacci) {
      // Use O(1) Fibonacci formulas
      return this.fibonacci.neighbor(tile as bigint, dir)
    } else {
      // Fall back to Von Dyck groups
      return this.vonDyck.neighbor(tile as string, dir)
    }
  }
}
```

## Coordinate System Factory

```typescript
/**
 * Create appropriate coordinate system for any {p,q} tiling.
 */
function createCoordinates(
  p: number,
  q: number,
): TessellationCoordinates {
  const curvature = (p - 2) * (q - 2)

  if (curvature < 4) {
    // Spherical
    return new SphericalCoordinates(p, q)
  } else if (curvature === 4) {
    // Euclidean
    return new EuclideanCoordinates(p, q)
  } else {
    // Hyperbolic
    return new HybridHyperbolicCoordinates(p, q)
  }
}
```

## Hyperbolic-Specific Extensions

### Tree Structure Access

```typescript
interface HyperbolicCoordinates<Id>
  extends TessellationCoordinates<Id> {
  /**
   * Get parent in spanning tree (toward origin).
   * Returns null for origin tile.
   */
  parent(tile: Id): Id | null

  /**
   * Get children in spanning tree (away from origin).
   */
  children(tile: Id): Id[]

  /**
   * Get depth in spanning tree (distance from origin).
   */
  depth(tile: Id): number

  /**
   * Get the number of spanning trees covering the tiling.
   * e.g., 3 for {7,3}, 4 for {5,4}
   */
  treeCount(): number

  /**
   * Which tree does this tile belong to?
   */
  treeIndex(tile: Id): number
}
```

### Growth Queries

```typescript
interface HyperbolicGrowth {
  /**
   * Number of tiles at exact distance r from origin.
   * Grows exponentially with r.
   */
  tilesAtDistance(r: number): number

  /**
   * Total tiles within distance r.
   * Sum from 0 to r of tilesAtDistance.
   */
  tilesWithinDistance(r: number): number

  /**
   * Growth rate (base of exponential).
   * For {7,3}: approximately φ = 1.618
   */
  growthRate(): number
}
```

### Sparse Storage

```typescript
/**
 * Efficient storage for sparse infinite tilings.
 * Only stores tiles that have been "activated" or modified.
 */
interface SparseTileStorage<Id, Value> {
  get(tile: Id): Value | undefined
  set(tile: Id, value: Value): void
  has(tile: Id): boolean
  delete(tile: Id): boolean

  /** Number of stored tiles */
  size: number

  /** Iterate stored tiles */
  entries(): Iterator<[Id, Value]>

  /**
   * Garbage collect tiles far from active region.
   * Essential for long-running simulations.
   */
  collectGarbage(center: Id, keepRadius: number): void
}
```

## Implementation Plan

### Phase 1: Core Interface (Week 1)

1. Define `TessellationCoordinates` interface
2. Implement `SphericalCoordinates` for all 5 Platonic solids
3. Implement `EuclideanCoordinates` for {4,4}, {3,6}, {6,3}
4. Basic tests for each

### Phase 2: Hyperbolic Foundation (Week 2)

1. Implement `VonDyckCoordinates` as generic fallback
2. Group word normalization with all relations
3. Distance and path computation via BFS
4. Tests with {7,3} and {5,4}

### Phase 3: Optimized Encodings (Week 3)

1. Implement `FibonacciCoordinates` for {7,3}
2. Port Margenstern's formulas exactly
3. Implement for {5,4} pentagrid
4. Benchmark against Von Dyck

### Phase 4: Hybrid System (Week 4)

1. Create `HybridHyperbolicCoordinates`
2. Automatic strategy selection
3. Caching layer for repeated queries
4. Factory function `createCoordinates()`

### Phase 5: Integration (Week 5)

1. Connect to existing tessellation rendering
2. Update `DynamicTessellationManager` to use coordinate system
3. Replace current ID scheme with proper coordinates
4. Performance testing at scale

## Performance Targets

| Operation   | Spherical | Euclidean | Hyperbolic (Fib) | Hyperbolic (VD) |
| ----------- | --------- | --------- | ---------------- | --------------- |
| neighbor()  | O(1)      | O(1)      | O(1)             | O(log n)        |
| distance()  | O(1)      | O(1)      | O(log n)         | O(n)            |
| path()      | O(n)      | O(d)      | O(d)             | O(d log d)      |
| tileAt()    | O(n)      | O(1)      | O(log r)         | O(log r)        |
| toInteger() | O(1)      | O(1)      | O(1)             | O(log n)        |

Where n = tile count, d = distance, r = radius.

## Files to Create

```
code/coordinates/
  index.ts              # Public exports
  types.ts              # Core types and interfaces
  factory.ts            # createCoordinates() factory
  spherical/
    index.ts
    platonic.ts         # Platonic solid data
  euclidean/
    index.ts
    square.ts           # {4,4} grid
    hexagonal.ts        # {6,3} and {3,6}
  hyperbolic/
    index.ts
    von-dyck.ts         # Generic group-based
    fibonacci.ts        # {7,3} optimized
    pentagrid.ts        # {5,4} optimized
    hybrid.ts           # Strategy selector
    sparse-storage.ts   # Infinite storage
```

## Testing Strategy

1. **Property-based tests**

   - `neighbor(neighbor(t, d), opposite(d)) === t`
   - `distance(a, b) === distance(b, a)`
   - `distance(a, b) === path(a, b).length - 1`

2. **Known values**

   - Specific tiles in {7,3} have known Zeckendorf representations
   - Platonic solid adjacencies are fixed

3. **Consistency**

   - Von Dyck and Fibonacci give same results for {7,3}
   - All geometry types produce valid polygons

4. **Performance**
   - Benchmark at 10^6, 10^9 tile IDs
   - Memory usage for sparse storage

## References

- Margenstern, M. (2002). New tools for cellular automata in the
  hyperbolic plane.
- Margenstern, M. (2007). Cellular Automata in Hyperbolic Spaces.
- note/hyperbolic/margenstern-pentagrid-coordinates.md
- base/hyperbolic-ca-simulator-master/src/core/vondyck.coffee
