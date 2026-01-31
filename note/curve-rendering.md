# Curve Rendering Architecture

This document describes how geometric curves (geodesics, circles, etc.)
get converted to drawable primitives with styling for each rendering
backend.

## The Problem

Tile vertices exist as `HyperPoint` values in hyperboloid coordinates.
But to draw the edges:

1. Edges are geodesics, not straight lines in screen space
2. In Poincare disk, geodesics appear as circular arcs
3. In Klein model, geodesics are straight but tiles are distorted
4. Each rendering backend (Canvas, SVG, WebGL) needs different formats
5. Users want customizable styles (width, color, dash, glow, etc.)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Geometric Layer                             │
│  HyperPoint, Geodesic, Polygon - pure math, model-independent   │
├─────────────────────────────────────────────────────────────────┤
│                      Projection Layer                            │
│  Convert to display model (Poincare, Klein, etc.)               │
│  Geodesic → ProjectedArc                                        │
├─────────────────────────────────────────────────────────────────┤
│                      Drawable Layer                              │
│  Apply styling, create render-ready primitives                  │
│  ProjectedArc + Style → DrawableCurve                           │
├─────────────────────────────────────────────────────────────────┤
│                      Render Backends                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ Canvas  │  │   SVG   │  │  WebGL  │  │ Three.js│           │
│  │   2D    │  │         │  │         │  │         │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

## Layer 1: Geometric Primitives

Pure math, no rendering concerns.

```typescript
// In @/form/geodesic.ts
interface Geodesic {
  // Defined by normal vector in Minkowski space
  normal: HyperPoint
}

// In @/form/polygon.ts
interface Polygon {
  vertices: HyperPoint[]
  center: HyperPoint
}

// In @/form/edge.ts
interface Edge {
  start: HyperPoint
  end: HyperPoint
  geodesic: Geodesic
}
```

## Layer 2: Projected Primitives

Model-specific representations ready for drawing.

```typescript
// In @/model/project.ts

// A geodesic projected to a display model
type ProjectedArc =
  | { type: 'line'; p1: Vec2; p2: Vec2 }
  | {
      type: 'arc'
      center: Vec2
      radius: number
      startAngle: number
      endAngle: number
      ccw: boolean
    }

// Project a geodesic segment to Poincare disk
function projectGeodesicToPoincare(
  start: HyperPoint,
  end: HyperPoint,
): ProjectedArc {
  const p1 = toPoincare(start)
  const p2 = toPoincare(end)

  // Check if geodesic passes through origin (becomes a diameter)
  if (
    isNearOrigin(p1) ||
    isNearOrigin(p2) ||
    areDiametricallyOpposite(p1, p2)
  ) {
    return { type: 'line', p1, p2 }
  }

  // Otherwise, find the circle orthogonal to unit circle through p1, p2
  const arc = findOrthogonalArc(p1, p2)
  return {
    type: 'arc',
    center: arc.center,
    radius: arc.radius,
    startAngle: arc.startAngle,
    endAngle: arc.endAngle,
    ccw: arc.ccw,
  }
}

// Find circle through two points that is orthogonal to unit circle
function findOrthogonalArc(
  p1: Vec2,
  p2: Vec2,
): {
  center: Vec2
  radius: number
  startAngle: number
  endAngle: number
  ccw: boolean
} {
  // The center lies on the perpendicular bisector of p1-p2
  // AND on the polar line of the chord p1-p2 with respect to unit circle

  const mid = scale(add(p1, p2), 0.5)
  const d = subtract(p2, p1)
  const perpendicular = { x: -d.y, y: d.x }

  // For orthogonality to unit circle: |center|² = radius² + 1
  // Solving these constraints gives the center

  const denom = 2 * (p1.x * p2.y - p2.x * p1.y)
  const cx =
    (p2.y * (p1.x * p1.x + p1.y * p1.y) -
      p1.y * (p2.x * p2.x + p2.y * p2.y) +
      p2.y -
      p1.y) /
    denom
  const cy =
    (p1.x * (p2.x * p2.x + p2.y * p2.y) -
      p2.x * (p1.x * p1.x + p1.y * p1.y) +
      p1.x -
      p2.x) /
    denom

  const center = { x: cx, y: cy }
  const radius = Math.sqrt(cx * cx + cy * cy - 1) // From orthogonality condition

  // Compute angles
  const startAngle = Math.atan2(p1.y - cy, p1.x - cx)
  const endAngle = Math.atan2(p2.y - cy, p2.x - cx)

  // Determine direction (shorter arc)
  const ccw = shouldGoCounterClockwise(startAngle, endAngle, center)

  return { center, radius, startAngle, endAngle, ccw }
}

// Project entire polygon
function projectPolygonToPoincare(poly: Polygon): ProjectedArc[] {
  const arcs: ProjectedArc[] = []
  const n = poly.vertices.length

  for (let i = 0; i < n; i++) {
    const start = poly.vertices[i]
    const end = poly.vertices[(i + 1) % n]
    arcs.push(projectGeodesicToPoincare(start, end))
  }

  return arcs
}
```

### Klein Model Projection

In Klein model, geodesics are straight lines (simpler).

```typescript
function projectGeodesicToKlein(
  start: HyperPoint,
  end: HyperPoint,
): ProjectedArc {
  const p1 = toKlein(start)
  const p2 = toKlein(end)
  return { type: 'line', p1, p2 }
}
```

### Half-Plane Model Projection

```typescript
function projectGeodesicToHalfPlane(
  start: HyperPoint,
  end: HyperPoint,
): ProjectedArc {
  const p1 = toHalfPlane(start)
  const p2 = toHalfPlane(end)

  // Geodesics are either vertical lines or semicircles centered on x-axis
  if (Math.abs(p1.x - p2.x) < EPSILON) {
    return { type: 'line', p1, p2 }
  }

  // Find semicircle
  const centerX =
    (p1.x * p1.x + p1.y * p1.y - p2.x * p2.x - p2.y * p2.y) /
    (2 * (p1.x - p2.x))
  const center = { x: centerX, y: 0 }
  const radius = Math.sqrt((p1.x - centerX) ** 2 + p1.y ** 2)

  const startAngle = Math.atan2(p1.y, p1.x - centerX)
  const endAngle = Math.atan2(p2.y, p2.x - centerX)

  return {
    type: 'arc',
    center,
    radius,
    startAngle,
    endAngle,
    ccw: true,
  }
}
```

## Layer 3: Drawable Primitives

Add styling information to projected primitives.

```typescript
// In @/render/style.ts

interface StrokeStyle {
  color: string | Gradient | Pattern
  width: number
  widthMode: 'screen' | 'hyperbolic' | 'proportional'
  lineCap: 'butt' | 'round' | 'square'
  lineJoin: 'miter' | 'round' | 'bevel'
  miterLimit: number
  dash?: number[]
  dashOffset?: number
  opacity: number
}

interface FillStyle {
  color: string | Gradient | Pattern
  opacity: number
}

interface GlowStyle {
  color: string
  blur: number
  spread: number
}

interface CurveStyle {
  stroke?: StrokeStyle
  fill?: FillStyle
  glow?: GlowStyle
}

// Gradient along a curve
interface Gradient {
  type: 'linear' | 'radial' | 'along-curve'
  stops: { offset: number; color: string }[]
}
```

### Width Modes

```typescript
// How stroke width is interpreted
type WidthMode =
  | 'screen' // Constant pixels on screen
  | 'hyperbolic' // Constant hyperbolic width (tapers toward boundary)
  | 'proportional' // Proportional to local scale

function computeScreenWidth(
  baseWidth: number,
  mode: WidthMode,
  point: Vec2, // Position in Poincare disk
  zoom: number,
): number {
  switch (mode) {
    case 'screen':
      return baseWidth

    case 'hyperbolic': {
      // Width in Poincare disk for constant hyperbolic width
      const r = length(point)
      const scale = 1 - r * r // Conformal factor
      return baseWidth * scale * zoom
    }

    case 'proportional': {
      // Scale with local tile size
      const r = length(point)
      const scale = (1 - r * r) ** 0.5
      return baseWidth * scale * zoom
    }
  }
}
```

### Drawable Curve

```typescript
// In @/render/drawable.ts

interface DrawableCurve {
  arc: ProjectedArc
  style: CurveStyle

  // For variable-width strokes
  widthFunction?: (t: number) => number

  // Pre-computed for rendering
  screenBounds?: Rect
}

interface DrawablePolygon {
  arcs: ProjectedArc[]
  style: CurveStyle
  closed: boolean
}

// Factory functions
function createDrawableCurve(
  start: HyperPoint,
  end: HyperPoint,
  style: CurveStyle,
  model: DisplayModel,
): DrawableCurve {
  const arc = projectGeodesic(start, end, model)
  return { arc, style }
}

function createDrawablePolygon(
  polygon: Polygon,
  style: CurveStyle,
  model: DisplayModel,
): DrawablePolygon {
  const arcs = projectPolygon(polygon, model)
  return { arcs, style, closed: true }
}
```

## Layer 4: Render Backends

Each backend converts DrawableCurve to native drawing commands.

### Canvas 2D Backend

```typescript
// In @/render/canvas/curve.ts

function renderCurveToCanvas(
  ctx: CanvasRenderingContext2D,
  curve: DrawableCurve,
  transform: Transform2D,
) {
  const { arc, style } = curve

  ctx.save()

  // Apply styles
  if (style.stroke) {
    ctx.strokeStyle = resolveColor(style.stroke.color)
    ctx.lineWidth = style.stroke.width
    ctx.lineCap = style.stroke.lineCap
    ctx.lineJoin = style.stroke.lineJoin

    if (style.stroke.dash) {
      ctx.setLineDash(style.stroke.dash)
      ctx.lineDashOffset = style.stroke.dashOffset ?? 0
    }
  }

  // Draw the arc
  ctx.beginPath()

  if (arc.type === 'line') {
    const p1 = transform.apply(arc.p1)
    const p2 = transform.apply(arc.p2)
    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
  } else {
    const center = transform.apply(arc.center)
    const radius = arc.radius * transform.scale

    ctx.arc(
      center.x,
      center.y,
      radius,
      arc.startAngle,
      arc.endAngle,
      arc.ccw,
    )
  }

  if (style.glow) {
    ctx.shadowColor = style.glow.color
    ctx.shadowBlur = style.glow.blur
  }

  if (style.stroke) {
    ctx.stroke()
  }

  ctx.restore()
}

function renderPolygonToCanvas(
  ctx: CanvasRenderingContext2D,
  polygon: DrawablePolygon,
  transform: Transform2D,
) {
  ctx.save()
  ctx.beginPath()

  for (let i = 0; i < polygon.arcs.length; i++) {
    const arc = polygon.arcs[i]

    if (arc.type === 'line') {
      const p = transform.apply(i === 0 ? arc.p1 : arc.p2)
      if (i === 0) {
        ctx.moveTo(transform.apply(arc.p1).x, transform.apply(arc.p1).y)
      }
      ctx.lineTo(p.x, p.y)
    } else {
      const center = transform.apply(arc.center)
      const radius = arc.radius * transform.scale
      ctx.arc(
        center.x,
        center.y,
        radius,
        arc.startAngle,
        arc.endAngle,
        arc.ccw,
      )
    }
  }

  if (polygon.closed) {
    ctx.closePath()
  }

  // Fill first, then stroke
  if (polygon.style.fill) {
    ctx.fillStyle = resolveColor(polygon.style.fill.color)
    ctx.globalAlpha = polygon.style.fill.opacity
    ctx.fill()
  }

  if (polygon.style.stroke) {
    applyStrokeStyle(ctx, polygon.style.stroke)
    ctx.stroke()
  }

  ctx.restore()
}
```

### SVG Backend

```typescript
// In @/render/svg/curve.ts

function curveToSVGPath(arc: ProjectedArc): string {
  if (arc.type === 'line') {
    return `M ${arc.p1.x} ${arc.p1.y} L ${arc.p2.x} ${arc.p2.y}`
  }

  // SVG arc command: A rx ry x-axis-rotation large-arc-flag sweep-flag x y
  const { center, radius, startAngle, endAngle, ccw } = arc

  const startX = center.x + radius * Math.cos(startAngle)
  const startY = center.y + radius * Math.sin(startAngle)
  const endX = center.x + radius * Math.cos(endAngle)
  const endY = center.y + radius * Math.sin(endAngle)

  // Determine arc flags
  let deltaAngle = endAngle - startAngle
  if (ccw && deltaAngle > 0) deltaAngle -= 2 * Math.PI
  if (!ccw && deltaAngle < 0) deltaAngle += 2 * Math.PI

  const largeArc = Math.abs(deltaAngle) > Math.PI ? 1 : 0
  const sweep = ccw ? 0 : 1

  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${endX} ${endY}`
}

function polygonToSVGPath(polygon: DrawablePolygon): string {
  const parts = polygon.arcs.map((arc, i) => {
    if (i === 0) {
      return curveToSVGPath(arc)
    }

    // Subsequent arcs: skip the M command
    if (arc.type === 'line') {
      return `L ${arc.p2.x} ${arc.p2.y}`
    }

    const { center, radius, endAngle, ccw, startAngle } = arc
    const endX = center.x + radius * Math.cos(endAngle)
    const endY = center.y + radius * Math.sin(endAngle)

    let deltaAngle = endAngle - startAngle
    if (ccw && deltaAngle > 0) deltaAngle -= 2 * Math.PI
    if (!ccw && deltaAngle < 0) deltaAngle += 2 * Math.PI

    const largeArc = Math.abs(deltaAngle) > Math.PI ? 1 : 0
    const sweep = ccw ? 0 : 1

    return `A ${radius} ${radius} 0 ${largeArc} ${sweep} ${endX} ${endY}`
  })

  if (polygon.closed) {
    parts.push('Z')
  }

  return parts.join(' ')
}

function curveToSVGElement(curve: DrawableCurve): string {
  const path = curveToSVGPath(curve.arc)
  const style = styleToSVGAttributes(curve.style)

  return `<path d="${path}" ${style} />`
}

function styleToSVGAttributes(style: CurveStyle): string {
  const attrs: string[] = []

  if (style.stroke) {
    attrs.push(`stroke="${style.stroke.color}"`)
    attrs.push(`stroke-width="${style.stroke.width}"`)
    attrs.push(`stroke-linecap="${style.stroke.lineCap}"`)
    attrs.push(`stroke-linejoin="${style.stroke.lineJoin}"`)
    attrs.push(`stroke-opacity="${style.stroke.opacity}"`)

    if (style.stroke.dash) {
      attrs.push(`stroke-dasharray="${style.stroke.dash.join(' ')}"`)
    }
  } else {
    attrs.push('stroke="none"')
  }

  if (style.fill) {
    attrs.push(`fill="${style.fill.color}"`)
    attrs.push(`fill-opacity="${style.fill.opacity}"`)
  } else {
    attrs.push('fill="none"')
  }

  return attrs.join(' ')
}
```

### WebGL Backend

WebGL cannot draw arcs directly. Must tessellate into line segments.

```typescript
// In @/render/webgl/curve.ts

interface TessellatedArc {
  points: Vec2[] // Polyline approximation
  widths?: number[] // Per-point width for variable-width lines
}

function tessellateArc(
  arc: ProjectedArc,
  maxError: number = 0.001, // Maximum deviation from true arc
): TessellatedArc {
  if (arc.type === 'line') {
    return { points: [arc.p1, arc.p2] }
  }

  const { center, radius, startAngle, endAngle, ccw } = arc

  // Calculate number of segments based on arc length and error tolerance
  let deltaAngle = endAngle - startAngle
  if (ccw && deltaAngle > 0) deltaAngle -= 2 * Math.PI
  if (!ccw && deltaAngle < 0) deltaAngle += 2 * Math.PI

  const arcLength = Math.abs(deltaAngle) * radius

  // Error of chord approximation: e ≈ r * (1 - cos(θ/2)) ≈ r * θ² / 8
  // Solving for θ: θ = sqrt(8 * maxError / r)
  const maxSegmentAngle = Math.sqrt((8 * maxError) / radius)
  const numSegments = Math.max(
    3,
    Math.ceil(Math.abs(deltaAngle) / maxSegmentAngle),
  )

  const points: Vec2[] = []
  const step = deltaAngle / numSegments

  for (let i = 0; i <= numSegments; i++) {
    const angle = startAngle + i * step
    points.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    })
  }

  return { points }
}

// Generate triangle strip for thick line
function generateLineStrip(
  tessellated: TessellatedArc,
  width: number,
  widthMode: WidthMode,
): Float32Array {
  const { points } = tessellated
  const vertices: number[] = []

  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const w = computeScreenWidth(width, widthMode, p, 1.0) / 2

    // Compute normal direction
    let normal: Vec2

    if (i === 0) {
      const dir = normalize(subtract(points[1], points[0]))
      normal = { x: -dir.y, y: dir.x }
    } else if (i === points.length - 1) {
      const dir = normalize(subtract(points[i], points[i - 1]))
      normal = { x: -dir.y, y: dir.x }
    } else {
      // Average of adjacent segment normals (for smooth joins)
      const dir1 = normalize(subtract(points[i], points[i - 1]))
      const dir2 = normalize(subtract(points[i + 1], points[i]))
      const avgDir = normalize(add(dir1, dir2))
      normal = { x: -avgDir.y, y: avgDir.x }

      // Miter correction
      const miterScale = 1 / dot(normal, { x: -dir1.y, y: dir1.x })
      normal = scale(normal, Math.min(miterScale, 2.0)) // Limit miter
    }

    // Two vertices per point (left and right of line)
    vertices.push(p.x + normal.x * w, p.y + normal.y * w)
    vertices.push(p.x - normal.x * w, p.y - normal.y * w)
  }

  return new Float32Array(vertices)
}

// Batch multiple curves for efficient rendering
interface CurveBatch {
  vertices: Float32Array
  indices: Uint16Array
  colors: Float32Array
  instanceCount: number
}

function batchCurves(curves: DrawableCurve[]): CurveBatch {
  // Group curves by style for instanced rendering
  // Tessellate and pack into buffers
}
```

### Three.js Backend

```typescript
// In @/render/three/curve.ts

import * as THREE from 'three'

function curveToThreeLine(
  curve: DrawableCurve,
  model: '2d' | '3d',
): THREE.Line {
  const tessellated = tessellateArc(curve.arc)

  const geometry = new THREE.BufferGeometry()

  if (model === '2d') {
    const positions = new Float32Array(tessellated.points.length * 3)
    for (let i = 0; i < tessellated.points.length; i++) {
      positions[i * 3] = tessellated.points[i].x
      positions[i * 3 + 1] = tessellated.points[i].y
      positions[i * 3 + 2] = 0
    }
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3),
    )
  }

  const material = new THREE.LineBasicMaterial({
    color: curve.style.stroke?.color ?? '#ffffff',
    linewidth: curve.style.stroke?.width ?? 1,
    opacity: curve.style.stroke?.opacity ?? 1,
    transparent: (curve.style.stroke?.opacity ?? 1) < 1,
  })

  return new THREE.Line(geometry, material)
}

// For thick lines, use THREE.Mesh with custom geometry
function curveToThreeMesh(
  curve: DrawableCurve,
  width: number,
): THREE.Mesh {
  const tessellated = tessellateArc(curve.arc)
  const stripData = generateLineStrip(tessellated, width, 'screen')

  const geometry = new THREE.BufferGeometry()
  // Convert triangle strip to indexed triangles
  // ...

  const material = new THREE.MeshBasicMaterial({
    color: curve.style.stroke?.color ?? '#ffffff',
    side: THREE.DoubleSide,
  })

  return new THREE.Mesh(geometry, material)
}

// For 3D hyperbolic space, project geodesic to ball model
function curve3DToThreeLine(
  start: HyperPoint3D,
  end: HyperPoint3D,
  style: CurveStyle,
  segments: number = 32,
): THREE.Line {
  // Geodesic in H³ projected to Poincare ball
  const points: THREE.Vector3[] = []

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const p = hlerp3D(start, end, t)
    const ball = toBall(p)
    points.push(new THREE.Vector3(ball.x, ball.y, ball.z))
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color: style.stroke?.color ?? '#ffffff',
  })

  return new THREE.Line(geometry, material)
}
```

## Caching Strategy

Projections and tessellations can be cached.

```typescript
// In @/render/cache.ts

interface ProjectionCache {
  // Key: hash of (start, end, model)
  arcs: Map<string, ProjectedArc>

  // Key: hash of (arc, maxError)
  tessellations: Map<string, TessellatedArc>
}

class CurveRenderCache {
  private projectionCache = new Map<string, ProjectedArc>()
  private tessellationCache = new Map<string, TessellatedArc>()

  private maxSize = 10000

  projectGeodesic(
    start: HyperPoint,
    end: HyperPoint,
    model: DisplayModel,
  ): ProjectedArc {
    const key = `${hashPoint(start)}-${hashPoint(end)}-${model}`

    if (this.projectionCache.has(key)) {
      return this.projectionCache.get(key)!
    }

    const arc = projectGeodesic(start, end, model)
    this.projectionCache.set(key, arc)
    this.evictIfNeeded(this.projectionCache)

    return arc
  }

  tessellate(arc: ProjectedArc, maxError: number): TessellatedArc {
    const key = `${hashArc(arc)}-${maxError}`

    if (this.tessellationCache.has(key)) {
      return this.tessellationCache.get(key)!
    }

    const tess = tessellateArc(arc, maxError)
    this.tessellationCache.set(key, tess)
    this.evictIfNeeded(this.tessellationCache)

    return tess
  }

  private evictIfNeeded(cache: Map<string, unknown>) {
    while (cache.size > this.maxSize) {
      const oldest = cache.keys().next().value
      cache.delete(oldest)
    }
  }

  invalidate() {
    this.projectionCache.clear()
    this.tessellationCache.clear()
  }
}
```

## Style Presets

Common style configurations.

```typescript
// In @/render/presets.ts

const stylePresets = {
  tileEdge: {
    stroke: {
      color: '#333333',
      width: 1,
      widthMode: 'screen' as const,
      lineCap: 'round' as const,
      lineJoin: 'round' as const,
      opacity: 1,
    },
  },

  highlightedEdge: {
    stroke: {
      color: '#ff6600',
      width: 3,
      widthMode: 'screen' as const,
      lineCap: 'round' as const,
      lineJoin: 'round' as const,
      opacity: 1,
    },
    glow: {
      color: '#ff6600',
      blur: 8,
      spread: 2,
    },
  },

  pathStroke: {
    stroke: {
      color: '#0066ff',
      width: 4,
      widthMode: 'hyperbolic' as const,
      lineCap: 'round' as const,
      lineJoin: 'round' as const,
      opacity: 0.8,
    },
  },

  dashedGeodesic: {
    stroke: {
      color: '#999999',
      width: 1,
      widthMode: 'screen' as const,
      lineCap: 'butt' as const,
      lineJoin: 'miter' as const,
      dash: [5, 5],
      opacity: 0.5,
    },
  },

  tileFill: {
    fill: {
      color: '#ffffff',
      opacity: 0.9,
    },
    stroke: {
      color: '#000000',
      width: 1,
      widthMode: 'screen' as const,
      lineCap: 'round' as const,
      lineJoin: 'round' as const,
      opacity: 1,
    },
  },
}

// User can extend or override
function createStyle(
  base: keyof typeof stylePresets,
  overrides: Partial<CurveStyle>,
): CurveStyle {
  return deepMerge(stylePresets[base], overrides)
}
```

## Implementation Files

```
code/
├── model/
│   └── project.ts          # Geodesic → ProjectedArc
├── render/
│   ├── style.ts            # Style definitions
│   ├── drawable.ts         # DrawableCurve factory
│   ├── cache.ts            # Projection/tessellation cache
│   ├── presets.ts          # Style presets
│   ├── canvas/
│   │   └── curve.ts        # Canvas 2D rendering
│   ├── svg/
│   │   └── curve.ts        # SVG path generation
│   ├── webgl/
│   │   ├── curve.ts        # WebGL tessellation and buffers
│   │   └── shaders/
│   │       └── line.glsl   # Line rendering shader
│   └── three/
│       └── curve.ts        # Three.js integration
```

## Summary

1. **Geometric layer** has pure math (Geodesic, Polygon, HyperPoint)
2. **Projection layer** converts to display model (ProjectedArc)
3. **Drawable layer** adds styling (DrawableCurve with CurveStyle)
4. **Render backends** produce native drawing commands
5. **Caching** at projection and tessellation levels
6. **Width modes** handle hyperbolic vs screen-space stroke widths
