# Design Principles

Collected design principles for @cluesurf/hive.

## Architecture

### Use Classes Over Factory Functions

Prefer class-based implementations over factory functions for cleaner,
more structured code.

```typescript
// Good: Class-based
export class Hyperbolic2D extends Geometry {
  readonly dimension = 2
  // ...
}
const geom = new Hyperbolic2D()

// Avoid: Factory function
export function hyperbolic2D(): Geometry {
  return { dimension: 2 /* ... */ }
}
```

### Pluggable Implementations Over Branching

Use interface/abstract class with separate implementations rather than
branching on curvature K everywhere.

```typescript
// Good: Pluggable
abstract class Geometry {
  abstract distance(a: Point, b: Point): number
}
class Hyperbolic2D extends Geometry {
  /* specific math */
}
class Euclidean2D extends Geometry {
  /* specific math */
}

// Avoid: Branching
function distance(a: Point, b: Point, K: number): number {
  if (K < 0) return hyperbolicDistance(a, b)
  if (K > 0) return sphericalDistance(a, b)
  return euclideanDistance(a, b)
}
```

### Flat Directory Structure

Keep geometry implementations in flat structure, not deeply nested.

```
// Good: Flat
code/math/geometry/hyperbolic2d.ts
code/math/geometry/spherical3d.ts

// Avoid: Deep nesting
code/math/model/hyperboloid/2d.ts
code/math/model/spherical/3d.ts
```

## Data Types

### Points as Number Arrays

Use `number[]` for points rather than named objects. The dimension
varies by geometry.

```typescript
type Point = number[]

// H²: [x, y, t] in ℝ²'¹
// E²: [x, y] in ℝ²
// S²: [x, y, z] on unit sphere
```

### Matrices as Flat Arrays

Use flat `number[]` for matrices (row-major order).

```typescript
type Matrix = number[]

// 3x3: [m00, m01, m02, m10, m11, m12, m20, m21, m22]
// 4x4: 16 elements
```

## Separation of Concerns

### Computation vs Rendering

Core geometry runs anywhere (Node.js, Workers). Rendering is optional
layer.

### Geometry vs Projection

Internal coordinates (hyperboloid, sphere) separate from display
projection (Poincare, Klein, stereographic).

## Performance

### Avoid Allocation in Hot Paths

Functions called frequently (transforms, matrix operations) should accept
an output array parameter rather than allocating new arrays. This reduces
garbage collection pressure. Follow the gl-matrix pattern.

```typescript
// Good: Output parameter avoids allocation
rotation(angle: number, out: Matrix): Matrix {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  out[0] = c; out[1] = -s; out[2] = 0
  out[3] = s; out[4] = c;  out[5] = 0
  out[6] = 0; out[7] = 0;  out[8] = 1
  return out
}

// Avoid: Allocates new array every call
rotation(angle: number): Matrix {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [c, -s, 0, s, c, 0, 0, 0, 1]  // GC pressure
}
```

For convenience, provide overloads or wrapper functions that allocate
when the caller doesn't need to avoid allocation.

### Hybrid Data Layout

Objects for API ergonomics, typed arrays for GPU batching.

### Caching

Full caching for transforms and geometry with LRU eviction.

### Instanced Rendering

Use instanced rendering for tiles (many identical shapes at different
positions).
