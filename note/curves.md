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

## Generic Curve Architecture

A unified system for handling all curve types with consistent
interfaces.

### Unified Curve Interface

All curves implement a common interface for evaluation, derivatives, and
operations.

```typescript
// In @/form/curve.ts

interface Curve<P> {
  // Core evaluation
  evaluate(t: number): P
  derivative(t: number): P
  secondDerivative?(t: number): P

  // Parameter bounds
  tMin: number
  tMax: number

  // Properties
  isClosed: boolean

  // Arc length
  arcLength(t0: number, t1: number): number
  arcLengthToParameter(s: number, start?: number): number

  // Bounding
  boundingBox(): BoundingBox<P>

  // Subdivision
  split(t: number): [Curve<P>, Curve<P>]
  subdivide(n: number): Curve<P>[]
}

// 2D hyperbolic curve
type HyperbolicCurve2D = Curve<HyperPoint>

// 3D hyperbolic curve
type HyperbolicCurve3D = Curve<HyperPoint3D>

// Unified geometry curve (with curvature K)
interface UnifiedCurve<P> extends Curve<P> {
  curvature: number // K: positive=spherical, 0=euclidean, negative=hyperbolic
}
```

### NURBS in Hyperbolic Space

Non-Uniform Rational B-Splines adapted for hyperbolic geometry.

```typescript
interface HyperbolicNURBS {
  controlPoints: HyperPoint[]
  weights: number[]
  knots: number[]
  degree: number
}

function evaluateNURBS(nurbs: HyperbolicNURBS, t: number): HyperPoint {
  const { controlPoints, weights, knots, degree } = nurbs
  const n = controlPoints.length - 1

  // Find knot span
  const span = findKnotSpan(t, knots, degree, n)

  // Compute basis functions
  const basis = bSplineBasis(t, span, knots, degree)

  // Weighted average using hlerp
  // For rational curves, we compute in homogeneous coordinates
  let numerator = origin()
  let denominator = 0

  for (let i = 0; i <= degree; i++) {
    const idx = span - degree + i
    const w = basis[i] * weights[idx]
    numerator = hlerp(
      origin(),
      controlPoints[idx],
      w * distance(origin(), controlPoints[idx]),
    )
    denominator += w
  }

  return scale(numerator, 1 / denominator)
}

// Rational Bezier (special case of NURBS)
interface RationalBezier {
  controlPoints: HyperPoint[]
  weights: number[]
}

function evaluateRationalBezier(
  rb: RationalBezier,
  t: number,
): HyperPoint {
  const n = rb.controlPoints.length - 1

  // De Casteljau with weights
  let points = [...rb.controlPoints]
  let weights = [...rb.weights]

  for (let r = 1; r <= n; r++) {
    const newPoints: HyperPoint[] = []
    const newWeights: number[] = []

    for (let i = 0; i <= n - r; i++) {
      const w0 = weights[i] * (1 - t)
      const w1 = weights[i + 1] * t
      const wSum = w0 + w1

      newWeights.push(wSum)
      newPoints.push(hlerp(points[i], points[i + 1], w1 / wSum))
    }

    points = newPoints
    weights = newWeights
  }

  return points[0]
}
```

### Arc-Length Parameterization

Convert parameter t to arc length for uniform speed traversal.

```typescript
interface ArcLengthTable {
  parameters: number[] // t values
  arcLengths: number[] // Corresponding arc lengths
  totalLength: number
}

function buildArcLengthTable(
  curve: Curve<HyperPoint>,
  samples: number = 100,
): ArcLengthTable {
  const parameters: number[] = []
  const arcLengths: number[] = []

  let totalLength = 0
  let prevPoint = curve.evaluate(curve.tMin)

  for (let i = 0; i <= samples; i++) {
    const t = curve.tMin + (i / samples) * (curve.tMax - curve.tMin)
    const point = curve.evaluate(t)

    if (i > 0) {
      totalLength += distance(prevPoint, point)
    }

    parameters.push(t)
    arcLengths.push(totalLength)
    prevPoint = point
  }

  return { parameters, arcLengths, totalLength }
}

function arcLengthToParameter(
  table: ArcLengthTable,
  targetLength: number,
): number {
  // Binary search for the parameter
  const { parameters, arcLengths } = table

  let lo = 0
  let hi = arcLengths.length - 1

  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2)
    if (arcLengths[mid] < targetLength) {
      lo = mid
    } else {
      hi = mid
    }
  }

  // Linear interpolation within segment
  const segmentLength = arcLengths[hi] - arcLengths[lo]
  const segmentT = (targetLength - arcLengths[lo]) / segmentLength

  return parameters[lo] + segmentT * (parameters[hi] - parameters[lo])
}

// Wrapper for uniform-speed evaluation
class ArcLengthCurve implements Curve<HyperPoint> {
  private base: Curve<HyperPoint>
  private table: ArcLengthTable

  constructor(base: Curve<HyperPoint>, samples: number = 100) {
    this.base = base
    this.table = buildArcLengthTable(base, samples)
  }

  get tMin() {
    return 0
  }
  get tMax() {
    return this.table.totalLength
  }
  get isClosed() {
    return this.base.isClosed
  }

  evaluate(s: number): HyperPoint {
    const t = arcLengthToParameter(this.table, s)
    return this.base.evaluate(t)
  }

  derivative(s: number): HyperPoint {
    // Normalized tangent (unit speed)
    const t = arcLengthToParameter(this.table, s)
    return normalize(this.base.derivative(t))
  }

  arcLength(s0: number, s1: number): number {
    return Math.abs(s1 - s0)
  }

  arcLengthToParameter(s: number): number {
    return s // Already parameterized by arc length
  }

  boundingBox() {
    return this.base.boundingBox()
  }

  split(s: number): [Curve<HyperPoint>, Curve<HyperPoint>] {
    const t = arcLengthToParameter(this.table, s)
    const [left, right] = this.base.split(t)
    return [new ArcLengthCurve(left), new ArcLengthCurve(right)]
  }

  subdivide(n: number): Curve<HyperPoint>[] {
    const step = this.table.totalLength / n
    const result: Curve<HyperPoint>[] = []
    for (let i = 0; i < n; i++) {
      const [_, right] = this.split(i * step)
      const [segment, _2] = right.split(step)
      result.push(segment)
    }
    return result
  }
}
```

### Curve Operations

Common operations on curves.

```typescript
// Split curve at parameter t
function splitCurve<P>(
  curve: Curve<P>,
  t: number,
): [Curve<P>, Curve<P>] {
  return curve.split(t)
}

// Join two curves (end of first connects to start of second)
function joinCurves<P>(
  curve1: Curve<P>,
  curve2: Curve<P>,
  continuity: 'C0' | 'C1' | 'G1' = 'C0',
): Curve<P> {
  // C0: Just connect endpoints
  // C1: Match tangent vectors
  // G1: Match tangent directions (not magnitudes)
  return new CompositeCurve([curve1, curve2], continuity)
}

// Reverse curve direction
function reverseCurve<P>(curve: Curve<P>): Curve<P> {
  return {
    ...curve,
    evaluate: (t: number) =>
      curve.evaluate(curve.tMax - t + curve.tMin),
    derivative: (t: number) =>
      scale(curve.derivative(curve.tMax - t + curve.tMin), -1),
  }
}

// Offset curve (parallel curve at distance d)
function offsetCurve(
  curve: Curve<HyperPoint>,
  distance: number,
): Curve<HyperPoint> {
  return {
    ...curve,
    evaluate: (t: number) => {
      const p = curve.evaluate(t)
      const tangent = curve.derivative(t)
      const normal = perpendicularVector(tangent)
      return translateAlongGeodesic(p, normal, distance)
    },
  }
}

// Trim curve to parameter range
function trimCurve<P>(
  curve: Curve<P>,
  t0: number,
  t1: number,
): Curve<P> {
  return {
    ...curve,
    tMin: t0,
    tMax: t1,
    evaluate: (t: number) => curve.evaluate(t0 + t * (t1 - t0)),
  }
}

// Composite curve (piecewise)
class CompositeCurve<P> implements Curve<P> {
  private segments: Curve<P>[]
  private breakpoints: number[]

  constructor(
    segments: Curve<P>[],
    continuity: 'C0' | 'C1' | 'G1' = 'C0',
  ) {
    this.segments = segments
    this.breakpoints = this.computeBreakpoints()
  }

  private computeBreakpoints(): number[] {
    const breaks = [0]
    for (const seg of this.segments) {
      breaks.push(breaks[breaks.length - 1] + (seg.tMax - seg.tMin))
    }
    return breaks
  }

  get tMin() {
    return 0
  }
  get tMax() {
    return this.breakpoints[this.breakpoints.length - 1]
  }
  get isClosed() {
    return false
  }

  evaluate(t: number): P {
    const { segment, localT } = this.findSegment(t)
    return segment.evaluate(localT)
  }

  derivative(t: number): P {
    const { segment, localT } = this.findSegment(t)
    return segment.derivative(localT)
  }

  private findSegment(t: number): {
    segment: Curve<P>
    localT: number
  } {
    for (let i = 0; i < this.segments.length; i++) {
      if (t <= this.breakpoints[i + 1]) {
        const localT =
          this.segments[i].tMin +
          ((t - this.breakpoints[i]) *
            (this.segments[i].tMax - this.segments[i].tMin)) /
            (this.breakpoints[i + 1] - this.breakpoints[i])
        return { segment: this.segments[i], localT }
      }
    }
    return {
      segment: this.segments[this.segments.length - 1],
      localT: this.segments[this.segments.length - 1].tMax,
    }
  }

  // ... other methods
}
```

### Curve Factories

Create curves from various inputs.

```typescript
// From points (interpolating spline)
function curveFromPoints(
  points: HyperPoint[],
  type: 'catmull-rom' | 'cubic-bezier' | 'geodesic' = 'catmull-rom',
  closed: boolean = false,
): Curve<HyperPoint> {
  switch (type) {
    case 'geodesic':
      return new GeodesicPolyline(points, closed)
    case 'cubic-bezier':
      return new CubicBezierSpline(points, closed)
    case 'catmull-rom':
    default:
      return new CatmullRomSpline(points, closed)
  }
}

// From SVG path data
function curveFromSVGPath(
  d: string,
  coordinateSystem: 'poincare' | 'klein' | 'hyperboloid' = 'poincare',
): Curve<HyperPoint> {
  const commands = parseSVGPath(d)
  const segments: Curve<HyperPoint>[] = []

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'L':
        segments.push(new GeodesicSegment(cmd.from, cmd.to))
        break
      case 'C':
        segments.push(
          new CubicBezierSegment(
            cmd.from,
            cmd.control1,
            cmd.control2,
            cmd.to,
          ),
        )
        break
      case 'Q':
        segments.push(
          new QuadraticBezierSegment(cmd.from, cmd.control, cmd.to),
        )
        break
      case 'A':
        segments.push(
          new ArcSegment(cmd.from, cmd.to, cmd.rx, cmd.ry, cmd.angle),
        )
        break
    }
  }

  return new CompositeCurve(segments)
}

// Circle/arc factory
function circleArc(
  center: HyperPoint,
  radius: number,
  startAngle: number,
  endAngle: number,
): Curve<HyperPoint> {
  return new HyperbolicArc(center, radius, startAngle, endAngle)
}

// Horocycle arc
function horocycleArc(
  idealPoint: HyperPoint,
  startPoint: HyperPoint,
  arcLength: number,
): Curve<HyperPoint> {
  return new HorocycleSegment(idealPoint, startPoint, arcLength)
}

// Hypercycle arc
function hypercycleArc(
  axis: Geodesic2D,
  distance: number,
  tStart: number,
  tEnd: number,
): Curve<HyperPoint> {
  return new HypercycleSegment(axis, distance, tStart, tEnd)
}
```

### Curve Interpolation and Fitting

```typescript
// Interpolate curve through points
function interpolateCurve(
  points: HyperPoint[],
  method: 'hermite' | 'natural-spline' | 'monotone' = 'natural-spline',
): Curve<HyperPoint> {
  switch (method) {
    case 'hermite':
      return hermiteInterpolation(points)
    case 'monotone':
      return monotoneInterpolation(points)
    case 'natural-spline':
    default:
      return naturalSplineInterpolation(points)
  }
}

// Fit curve to points (least squares)
function fitCurve(
  points: HyperPoint[],
  degree: number,
  numControlPoints: number,
): HyperbolicBezier {
  // Least squares fitting using log/exp maps
  // Minimize sum of squared distances
}

// Simplify curve (reduce control points while preserving shape)
function simplifyCurve(
  curve: Curve<HyperPoint>,
  tolerance: number,
): Curve<HyperPoint> {
  // Douglas-Peucker style algorithm in hyperbolic space
}
```

### Curve Intersection

```typescript
interface Intersection {
  t1: number // Parameter on first curve
  t2: number // Parameter on second curve
  point: HyperPoint // Intersection point
}

function findIntersections(
  curve1: Curve<HyperPoint>,
  curve2: Curve<HyperPoint>,
  tolerance: number = 1e-6,
): Intersection[] {
  // Bezier clipping or subdivision approach
  const intersections: Intersection[] = []

  function subdivideAndCheck(
    c1: Curve<HyperPoint>,
    t1Min: number,
    t1Max: number,
    c2: Curve<HyperPoint>,
    t2Min: number,
    t2Max: number,
  ) {
    const box1 = c1.boundingBox()
    const box2 = c2.boundingBox()

    if (!boxesIntersect(box1, box2)) return

    const size1 = boxDiameter(box1)
    const size2 = boxDiameter(box2)

    if (size1 < tolerance && size2 < tolerance) {
      // Found intersection
      const t1 = (t1Min + t1Max) / 2
      const t2 = (t2Min + t2Max) / 2
      intersections.push({
        t1,
        t2,
        point: curve1.evaluate(t1),
      })
      return
    }

    // Subdivide larger curve
    if (size1 > size2) {
      const tMid = (t1Min + t1Max) / 2
      const [left, right] = c1.split(tMid)
      subdivideAndCheck(left, t1Min, tMid, c2, t2Min, t2Max)
      subdivideAndCheck(right, tMid, t1Max, c2, t2Min, t2Max)
    } else {
      const tMid = (t2Min + t2Max) / 2
      const [left, right] = c2.split(tMid)
      subdivideAndCheck(c1, t1Min, t1Max, left, t2Min, tMid)
      subdivideAndCheck(c1, t1Min, t1Max, right, tMid, t2Max)
    }
  }

  subdivideAndCheck(
    curve1,
    curve1.tMin,
    curve1.tMax,
    curve2,
    curve2.tMin,
    curve2.tMax,
  )

  return intersections
}
```

### Curve Decorators

Modify curves with visual effects.

```typescript
// Dashed curve
class DashedCurve<P> implements Curve<P> {
  constructor(
    private base: Curve<P>,
    private dashLength: number,
    private gapLength: number,
  ) {}

  // Returns array of visible segments
  getVisibleSegments(): Curve<P>[] {
    const arcTable = buildArcLengthTable(this.base)
    const totalLength = arcTable.totalLength
    const segments: Curve<P>[] = []

    let s = 0
    while (s < totalLength) {
      const dashEnd = Math.min(s + this.dashLength, totalLength)
      const t0 = arcLengthToParameter(arcTable, s)
      const t1 = arcLengthToParameter(arcTable, dashEnd)
      segments.push(trimCurve(this.base, t0, t1))
      s = dashEnd + this.gapLength
    }

    return segments
  }
}

// Tapered curve (variable width)
class TaperedCurve<P> implements Curve<P> {
  constructor(
    private base: Curve<P>,
    private startWidth: number,
    private endWidth: number,
    private easing: (t: number) => number = t => t,
  ) {}

  widthAt(t: number): number {
    const normalizedT =
      (t - this.base.tMin) / (this.base.tMax - this.base.tMin)
    const easedT = this.easing(normalizedT)
    return this.startWidth + easedT * (this.endWidth - this.startWidth)
  }
}

// Wavy curve
class WavyCurve<P> implements Curve<P> {
  constructor(
    private base: Curve<P>,
    private amplitude: number,
    private frequency: number,
  ) {}

  evaluate(t: number): P {
    const basePoint = this.base.evaluate(t)
    const tangent = this.base.derivative(t)
    const normal = perpendicularVector(tangent)

    const phase = t * this.frequency * 2 * Math.PI
    const offset = Math.sin(phase) * this.amplitude

    return translateAlongGeodesic(basePoint, normal, offset)
  }
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
