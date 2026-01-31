# Curves in Hyperbolic Geometry

This document covers the theory and implementation of curves in 2D and
3D hyperbolic space, with notes on spherical and Euclidean analogues.

## Overview of Curve Types

In hyperbolic geometry, there are several fundamental curve types that
have no direct Euclidean analogue:

| Curve Type | 2D                     | 3D                  | Euclidean Analogue |
| ---------- | ---------------------- | ------------------- | ------------------ |
| Geodesic   | Straight line          | Straight line       | Line               |
| Circle     | Equidistant from point | Sphere              | Circle/Sphere      |
| Horocycle  | Limit circle           | Horosphere          | Line (at infinity) |
| Hypercycle | Equidistant curve      | Equidistant surface | Line (parallel)    |

## 2D Curves

### Geodesics (Hyperbolic Lines)

The shortest path between two points. In the hyperboloid model, a
geodesic is the intersection of a plane through the origin with the
hyperboloid.

```typescript
interface Geodesic2D {
  // Normal vector to the plane (space-like)
  normal: HyperPoint
}

// Create geodesic through two points
function geodesicThrough(a: HyperPoint, b: HyperPoint): Geodesic2D {
  // Cross product in Minkowski space
  const normal = minkowskiCross(a, b)
  return { normal: normalize(normal) }
}

// Point on geodesic at parameter t
function pointOnGeodesic(
  g: Geodesic2D,
  basePoint: HyperPoint,
  t: number,
): HyperPoint {
  // Translate along geodesic by hyperbolic distance t
  const direction = geodesicDirection(g, basePoint)
  return translateAlongGeodesic(basePoint, direction, t)
}

// Distance from point to geodesic
function distanceToGeodesic(p: HyperPoint, g: Geodesic2D): number {
  return Math.asinh(Math.abs(minkowskiDot(p, g.normal)))
}
```

**Poincare disk representation:** Geodesics appear as circular arcs
orthogonal to the boundary circle, or diameters through the center.

```typescript
interface GeodesicArc {
  // If through center: a diameter
  isDiameter: boolean
  direction?: Complex // For diameters

  // Otherwise: circular arc
  center?: Complex // Center of the circle (outside unit disk)
  radius?: number
  startAngle?: number
  endAngle?: number
}
```

### Circles

Points equidistant from a center point. Unlike Euclidean circles, the
center of a hyperbolic circle is NOT at the geometric center in the
Poincare model.

```typescript
interface HyperbolicCircle {
  center: HyperPoint // Hyperbolic center
  radius: number // Hyperbolic radius
}

// Points on circle
function pointOnCircle(c: HyperbolicCircle, angle: number): HyperPoint {
  // Rotate around center by angle, at distance radius
  const direction = rotateVector(baseDirection, angle)
  return translateAlongGeodesic(c.center, direction, c.radius)
}

// Circumference (different from Euclidean!)
function circumference(c: HyperbolicCircle): number {
  return 2 * Math.PI * Math.sinh(c.radius)
}

// Area
function area(c: HyperbolicCircle): number {
  return 4 * Math.PI * Math.sinh(c.radius / 2) ** 2
}
```

**Key property:** Hyperbolic circles grow exponentially with radius, not
quadratically.

**Poincare representation:** A hyperbolic circle appears as a Euclidean
circle, but with different center and radius:

```typescript
function circleToPoincareCircle(c: HyperbolicCircle): {
  euclideanCenter: Complex
  euclideanRadius: number
} {
  const pc = toPoincare(c.center)
  const d = abs(pc)

  // Euclidean radius depends on position and hyperbolic radius
  const r = Math.tanh(c.radius / 2)
  const euclideanRadius = (r * (1 - d * d)) / (1 - r * r * d * d)

  // Euclidean center is shifted
  const euclideanCenter = scale(pc, (1 - r * r) / (1 - r * r * d * d))

  return { euclideanCenter, euclideanRadius }
}
```

### Horocycles

A horocycle is the limit of circles whose centers go to infinity while
passing through a fixed point. It is perpendicular to all geodesics that
meet at its ideal point.

```typescript
interface Horocycle {
  // The ideal point (on the boundary at infinity)
  idealPoint: HyperPoint // Null vector: x² + y² - t² = 0

  // A point on the horocycle
  basePoint: HyperPoint
}

// All geodesics through idealPoint are perpendicular to the horocycle
function isPerpendicularToHorocycle(
  g: Geodesic2D,
  h: Horocycle,
): boolean {
  return geodesicPassesThrough(g, h.idealPoint)
}

// Point on horocycle at arc length s from basePoint
function pointOnHorocycle(h: Horocycle, s: number): HyperPoint {
  // Horocycle has Euclidean geometry along its length
  // Arc length equals Euclidean arc length in suitable coordinates
}

// Distance between two horocycles with same ideal point
function horocycleDistance(h1: Horocycle, h2: Horocycle): number {
  // Constant along the horocycles (they are equidistant curves)
}
```

**Poincare representation:** A horocycle appears as a circle tangent to
the boundary circle at the ideal point.

**Key property:** A horocycle has the geometry of a Euclidean line. The
"curvature" exactly cancels the hyperbolic expansion.

### Hypercycles (Equidistant Curves)

Points at constant distance from a geodesic. The hyperbolic analogue of
parallel lines.

```typescript
interface Hypercycle {
  // The base geodesic
  axis: Geodesic2D

  // Distance from the geodesic (signed: positive = one side)
  distance: number
}

// Point on hypercycle
function pointOnHypercycle(
  h: Hypercycle,
  t: number, // Parameter along the axis
): HyperPoint {
  const axisPoint = pointOnGeodesic(h.axis, origin, t)
  const perpDirection = perpendicularToGeodesic(h.axis, axisPoint)
  return translateAlongGeodesic(axisPoint, perpDirection, h.distance)
}

// Hypercycles share ideal endpoints with their axis
function idealEndpoints(h: Hypercycle): [HyperPoint, HyperPoint] {
  return geodesicIdealPoints(h.axis)
}
```

**Poincare representation:** A hypercycle appears as a circular arc that
shares both endpoints with its axis geodesic but is not perpendicular to
the boundary.

**Key property:** Two hypercycles equidistant from the same geodesic on
opposite sides form an "ultraparallel" pair that never meet.

### General Curves

Arbitrary smooth curves in hyperbolic space.

```typescript
interface Curve2D {
  // Parametric representation
  evaluate(t: number): HyperPoint

  // Derivative (tangent vector)
  tangent(t: number): HyperPoint

  // Geodesic curvature at parameter t
  curvature(t: number): number

  // Arc length from t=0 to t
  arcLength(t: number): number
}

// Geodesic curvature (deviation from geodesic)
function geodesicCurvature(curve: Curve2D, t: number): number {
  // Zero for geodesics
  // Constant for circles
  // Variable for general curves
}

// Parallel transport of vector along curve
function parallelTransport(
  curve: Curve2D,
  v: HyperPoint, // Vector at curve(t0)
  t0: number,
  t1: number,
): HyperPoint {
  // Transport vector along curve maintaining angle with tangent
}
```

### Bezier Curves in Hyperbolic Space

Bezier curves generalized to hyperbolic geometry.

```typescript
// Quadratic Bezier using de Casteljau with hlerp
function quadraticBezier(
  p0: HyperPoint,
  p1: HyperPoint, // Control point
  p2: HyperPoint,
  t: number,
): HyperPoint {
  const a = hlerp(p0, p1, t)
  const b = hlerp(p1, p2, t)
  return hlerp(a, b, t)
}

// Cubic Bezier
function cubicBezier(
  p0: HyperPoint,
  p1: HyperPoint,
  p2: HyperPoint,
  p3: HyperPoint,
  t: number,
): HyperPoint {
  const a = hlerp(p0, p1, t)
  const b = hlerp(p1, p2, t)
  const c = hlerp(p2, p3, t)
  const d = hlerp(a, b, t)
  const e = hlerp(b, c, t)
  return hlerp(d, e, t)
}

interface HyperbolicBezier {
  controlPoints: HyperPoint[]
  degree: number
}

function evaluateBezier(b: HyperbolicBezier, t: number): HyperPoint {
  // de Casteljau algorithm with hlerp
  let points = [...b.controlPoints]
  while (points.length > 1) {
    const next: HyperPoint[] = []
    for (let i = 0; i < points.length - 1; i++) {
      next.push(hlerp(points[i], points[i + 1], t))
    }
    points = next
  }
  return points[0]
}
```

### Splines in Hyperbolic Space

Piecewise curves with continuity constraints.

```typescript
interface HyperbolicSpline {
  points: HyperPoint[] // Interpolation points
  type: 'catmull-rom' | 'b-spline' | 'hermite'
  tension?: number
  closed: boolean
}

// Catmull-Rom using hyperbolic interpolation
function catmullRomSegment(
  p0: HyperPoint,
  p1: HyperPoint,
  p2: HyperPoint,
  p3: HyperPoint,
  t: number,
  tension: number = 0.5,
): HyperPoint {
  // Compute tangents using log map
  const t1 = scale(logMap(p1, p2), tension)
  const t2 = scale(logMap(p2, p1), -tension)

  // Hermite interpolation
  return hermiteInterpolate(p1, p2, t1, t2, t)
}

// Log map: vector from a to b in tangent space at a
function logMap(a: HyperPoint, b: HyperPoint): HyperPoint {
  const d = distance(a, b)
  if (d < 1e-10) return { x: 0, y: 0, t: 0 }

  const direction = normalize(projectToTangentSpace(a, b))
  return scale(direction, d)
}

// Exp map: move from a in direction v
function expMap(a: HyperPoint, v: HyperPoint): HyperPoint {
  const d = tangentLength(v)
  if (d < 1e-10) return a

  const direction = normalize(v)
  return translateAlongGeodesic(a, direction, d)
}
```

## 3D Curves and Surfaces

### Geodesics in H³

In 3D hyperbolic space, geodesics work similarly to 2D.

```typescript
interface Geodesic3D {
  // Two points defining the geodesic
  p1: HyperPoint3D
  p2: HyperPoint3D
}

// Or equivalently, a 2D plane through origin in Minkowski space
interface Geodesic3DPlane {
  // Two linearly independent space-like vectors spanning the plane
  u: Vector4
  v: Vector4
}
```

### Geodesic Planes (Totally Geodesic Surfaces)

2D hyperbolic planes embedded in H³.

```typescript
interface GeodesicPlane {
  // Normal vector (space-like in Minkowski space)
  normal: Vector4
}

// Create plane through three points
function planeThrough(
  a: HyperPoint3D,
  b: HyperPoint3D,
  c: HyperPoint3D,
): GeodesicPlane {
  // Find normal to the 3D subspace containing origin, a, b, c
}

// Distance from point to plane
function distanceToPlane(
  p: HyperPoint3D,
  plane: GeodesicPlane,
): number {
  return Math.asinh(Math.abs(minkowskiDot4(p, plane.normal)))
}

// Intersection of two planes is a geodesic
function planeIntersection(
  p1: GeodesicPlane,
  p2: GeodesicPlane,
): Geodesic3D | null {
  // May be empty, a geodesic, or coincident
}
```

**Poincare ball representation:** Geodesic planes appear as spherical
caps orthogonal to the boundary sphere.

### Spheres in H³

Points at constant distance from a center.

```typescript
interface HyperbolicSphere {
  center: HyperPoint3D
  radius: number
}

// Surface area (grows exponentially!)
function surfaceArea(s: HyperbolicSphere): number {
  return 4 * Math.PI * Math.sinh(s.radius) ** 2
}

// Volume
function volume(s: HyperbolicSphere): number {
  return Math.PI * (Math.sinh(2 * s.radius) - 2 * s.radius)
}
```

### Horospheres

The 3D analogue of horocycles. A horosphere is tangent to the boundary
at an ideal point and has Euclidean geometry on its surface.

```typescript
interface Horosphere {
  // Ideal point on the boundary at infinity
  idealPoint: HyperPoint3D // Null vector

  // A point on the horosphere
  basePoint: HyperPoint3D
}

// Horosphere has intrinsic Euclidean geometry
function horosphereMetric(
  h: Horosphere,
  p1: HyperPoint3D, // Points on horosphere
  p2: HyperPoint3D,
): number {
  // Returns Euclidean distance in the horosphere
}
```

**Poincare ball representation:** A horosphere appears as a sphere
tangent to the boundary sphere.

**Key property:** Horospheres are the only surfaces in H³ with zero
Gaussian curvature (flat, like Euclidean planes).

### Equidistant Surfaces

Points at constant distance from a geodesic plane.

```typescript
interface EquidistantSurface {
  basePlane: GeodesicPlane
  distance: number // Signed distance
}

// Equidistant surfaces share the ideal boundary with their base plane
```

### Tubes (Equidistant from Geodesic)

Points at constant distance from a geodesic line in H³.

```typescript
interface HyperbolicTube {
  axis: Geodesic3D
  radius: number
}

// Cross-section is a hyperbolic circle
function crossSection(
  tube: HyperbolicTube,
  t: number, // Parameter along axis
): HyperbolicCircle {
  const center = pointOnGeodesic3D(tube.axis, t)
  return { center, radius: tube.radius }
}
```

### General Surfaces

```typescript
interface Surface3D {
  // Parametric representation
  evaluate(u: number, v: number): HyperPoint3D

  // Partial derivatives
  du(u: number, v: number): Vector4
  dv(u: number, v: number): Vector4

  // Normal vector
  normal(u: number, v: number): Vector4

  // Gaussian curvature
  gaussianCurvature(u: number, v: number): number

  // Mean curvature
  meanCurvature(u: number, v: number): number
}
```

### Space Curves in H³

```typescript
interface SpaceCurve {
  evaluate(t: number): HyperPoint3D
  tangent(t: number): Vector4
  normal(t: number): Vector4 // Principal normal
  binormal(t: number): Vector4

  curvature(t: number): number
  torsion(t: number): number
}

// Frenet-Serret formulas in hyperbolic space
// Similar structure to Euclidean but with hyperbolic parallel transport
```

## Curve Rendering

### Tessellation for Display

Curves must be subdivided for rendering.

```typescript
interface TessellatedCurve {
  points: HyperPoint[] // Polyline approximation
  maxError: number // Maximum deviation from true curve
}

function tessellateCurve(
  curve: Curve2D,
  tStart: number,
  tEnd: number,
  maxError: number,
): TessellatedCurve {
  // Adaptive subdivision based on curvature
  const points: HyperPoint[] = []

  function subdivide(t0: number, t1: number) {
    const mid = (t0 + t1) / 2
    const p0 = curve.evaluate(t0)
    const p1 = curve.evaluate(t1)
    const pMid = curve.evaluate(mid)

    // Check if geodesic from p0 to p1 is close enough to pMid
    const geodesicMid = hlerp(p0, p1, 0.5)
    const error = distance(pMid, geodesicMid)

    if (error > maxError) {
      subdivide(t0, mid)
      subdivide(mid, t1)
    } else {
      points.push(p1)
    }
  }

  points.push(curve.evaluate(tStart))
  subdivide(tStart, tEnd)

  return { points, maxError }
}
```

### Width and Offset Curves

For rendering thick curves.

```typescript
interface OffsetCurve {
  baseCurve: Curve2D
  offset: number // Hyperbolic distance from base curve
}

function evaluateOffsetCurve(oc: OffsetCurve, t: number): HyperPoint {
  const p = oc.baseCurve.evaluate(t)
  const tangent = oc.baseCurve.tangent(t)
  const normal = perpendicularVector(tangent)
  return translateAlongGeodesic(p, normal, oc.offset)
}

// For thick curves, generate two offset curves and fill between
function thickCurve(
  curve: Curve2D,
  width: number,
): { left: Curve2D; right: Curve2D } {
  return {
    left: offsetCurve(curve, width / 2),
    right: offsetCurve(curve, -width / 2),
  }
}
```

## Unified Geometry Curves

Curves with curvature parameter K.

```typescript
// Interpolation varies by geometry
function geometricLerp(
  a: Point,
  b: Point,
  t: number,
  K: number, // Curvature
): Point {
  if (K > 0) {
    // Spherical: slerp
    return slerp(a, b, t)
  } else if (K < 0) {
    // Hyperbolic: hlerp
    return hlerp(a, b, t)
  } else {
    // Euclidean: lerp
    return lerp(a, b, t)
  }
}

// Circle properties vary by geometry
function circleCircumference(radius: number, K: number): number {
  if (K > 0) {
    // Spherical
    return (
      (2 * Math.PI * Math.sin(Math.sqrt(K) * radius)) / Math.sqrt(K)
    )
  } else if (K < 0) {
    // Hyperbolic
    return (
      (2 * Math.PI * Math.sinh(Math.sqrt(-K) * radius)) / Math.sqrt(-K)
    )
  } else {
    // Euclidean
    return 2 * Math.PI * radius
  }
}
```

## Implementation Files

These curve types will be implemented in:

- `code/form/curve.ts` - Curve type definitions
- `code/form/geodesic.ts` - Geodesic types
- `code/math/geodesic.ts` - Geodesic operations
- `code/math/curve.ts` - General curve operations
- `code/math/bezier.ts` - Bezier and spline curves
- `code/math/horocycle.ts` - Horocycle operations
- `code/math/hypercycle.ts` - Hypercycle operations
- `code/render/curve.ts` - Curve tessellation and rendering
