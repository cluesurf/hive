# Geometry Models

Clean architecture: one interface, pluggable class implementations.

## Core Idea

```typescript
// User picks a geometry, uses it consistently
const geom = new Hyperbolic2D()

const a = geom.origin()
const b = geom.translate(a, 1, 0)
const mid = geom.interpolate(a, b, 0.5)
const d = geom.distance(a, b)
```

No branching on K. No type unions. Just call methods on your geometry.

## Directory Structure

```
code/
├── form/
│   ├── point.ts              # Point type (just number[])
│   ├── matrix.ts             # Matrix types
│   └── geometry.ts           # Geometry abstract class
│
├── math/
│   ├── geometry/
│   │   ├── index.ts          # Re-exports
│   │   ├── hyperbolic2d.ts   # H² implementation
│   │   ├── hyperbolic3d.ts   # H³ implementation
│   │   ├── euclidean2d.ts    # E² implementation
│   │   ├── euclidean3d.ts    # E³ implementation
│   │   ├── spherical2d.ts    # S² implementation
│   │   └── spherical3d.ts    # S³ implementation
│   │
│   └── project/              # Display model projections
│       ├── poincare.ts
│       ├── klein.ts
│       └── stereographic.ts
```

## The Geometry Abstract Class

```typescript
// code/form/geometry.ts

// Points are just number arrays (dimension varies by geometry)
type Point = number[]
type Matrix = number[]

abstract class Geometry {
  abstract readonly dimension: number // 2, 3, or 4
  abstract readonly embeddingDimension: number // dimension + 1 for hyp/sph
  abstract readonly curvature: number // K: -1, 0, or 1

  // Core operations
  abstract origin(): Point
  abstract distance(a: Point, b: Point): number
  abstract interpolate(a: Point, b: Point, t: number): Point
  abstract normalize(p: Point): Point

  // Transformations
  abstract rotation(axis: number, angle: number): Matrix
  abstract translation(direction: Point, distance: number): Matrix
  abstract reflection(geodesic: Point): Matrix
  abstract applyMatrix(m: Matrix, p: Point): Point
  abstract compose(...matrices: Matrix[]): Matrix

  // Geodesics
  abstract geodesicThrough(a: Point, b: Point): Point // Returns normal vector
  abstract pointOnGeodesic(origin: Point, direction: Point, t: number): Point
}
```

## Implementations

Each geometry extends the abstract class with its specific math.

### `code/math/geometry/hyperbolic2d.ts`

```typescript
export class Hyperbolic2D extends Geometry {
  readonly dimension = 2
  readonly embeddingDimension = 3 // ℝ²'¹
  readonly curvature = -1

  origin(): Point {
    return [0, 0, 1]
  }

  distance(a: Point, b: Point): number {
    const dot = a[0] * b[0] + a[1] * b[1] - a[2] * b[2] // Minkowski
    return Math.acosh(-dot)
  }

  interpolate(a: Point, b: Point, t: number): Point {
    const d = this.distance(a, b)
    if (d < 1e-10) return [...a]
    const sinhD = Math.sinh(d)
    const wa = Math.sinh((1 - t) * d) / sinhD
    const wb = Math.sinh(t * d) / sinhD
    return [
      wa * a[0] + wb * b[0],
      wa * a[1] + wb * b[1],
      wa * a[2] + wb * b[2],
    ]
  }

  // ... other methods
}
```

### `code/math/geometry/euclidean2d.ts`

```typescript
export class Euclidean2D extends Geometry {
  readonly dimension = 2
  readonly embeddingDimension = 2
  readonly curvature = 0

  origin(): Point {
    return [0, 0]
  }

  distance(a: Point, b: Point): number {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    return Math.sqrt(dx * dx + dy * dy)
  }

  interpolate(a: Point, b: Point, t: number): Point {
    return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]
  }

  // ... other methods
}
```

### `code/math/geometry/spherical2d.ts`

```typescript
export class Spherical2D extends Geometry {
  readonly dimension = 2
  readonly embeddingDimension = 3 // S² in ℝ³
  readonly curvature = 1

  origin(): Point {
    return [0, 0, 1] // North pole
  }

  distance(a: Point, b: Point): number {
    const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    return Math.acos(Math.max(-1, Math.min(1, dot)))
  }

  interpolate(a: Point, b: Point, t: number): Point {
    const d = this.distance(a, b)
    if (d < 1e-10) return [...a]
    const sinD = Math.sin(d)
    const wa = Math.sin((1 - t) * d) / sinD
    const wb = Math.sin(t * d) / sinD
    const p = [
      wa * a[0] + wb * b[0],
      wa * a[1] + wb * b[1],
      wa * a[2] + wb * b[2],
    ]
    return this.normalize(p)
  }

  // ... other methods
}
```

## Usage

```typescript
import { Hyperbolic2D, Euclidean2D, Spherical2D } from '@/math/geometry'

// Pick your geometry
const geom = new Hyperbolic2D()

// All code works the same way
const origin = geom.origin()
const p = geom.pointOnGeodesic(origin, [1, 0, 0], 2.0)
const mid = geom.interpolate(origin, p, 0.5)
const dist = geom.distance(origin, p)

// Switch geometry? Just change the class
const geom2 = new Spherical2D()
// Same API, different math
```

## Summary

| Geometry | Class          | Embedding | Point Size |
| -------- | -------------- | --------- | ---------- |
| H²       | `Hyperbolic2D` | ℝ²'¹      | 3          |
| H³       | `Hyperbolic3D` | ℝ³'¹      | 4          |
| E²       | `Euclidean2D`  | ℝ²        | 2          |
| E³       | `Euclidean3D`  | ℝ³        | 3          |
| S²       | `Spherical2D`  | ℝ³        | 3          |
| S³       | `Spherical3D`  | ℝ⁴        | 4          |
