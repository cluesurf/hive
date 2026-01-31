# Fractal System

Fractals in 2D, 3D, and all geometries. Standalone and integrated with
kaleidoscopes and tessellations.

## Overview

Fractals are self-similar structures at multiple scales. This system
supports:

- **Classic fractals**: Sierpinski, Mandelbrot, Julia, Koch, etc.
- **3D fractals**: Menger sponge, Sierpinski tetrahedron, nested solids
- **Geometry-native**: Fractals in hyperbolic and spherical space
- **L-systems**: Grammar-based generative fractals
- **IFS**: Iterated function systems
- **Escape-time**: Complex plane fractals
- **Integration**: Combined with tessellations and kaleidoscopes

## Fractal Types

### By Construction Method

| Type | Description | Examples |
|------|-------------|----------|
| Geometric | Recursive subdivision | Sierpinski, Koch, Cantor |
| L-system | Grammar rewriting | Dragon curve, Hilbert, plants |
| IFS | Iterated functions | Barnsley fern, flame fractals |
| Escape-time | Complex iteration | Mandelbrot, Julia, Burning Ship |
| Strange attractor | Dynamic systems | Lorenz, Rössler, Hénon |
| Nested | Recursive nesting | Apollonian gasket, nested polygons |

### By Dimension

| Dimension | Examples |
|-----------|----------|
| 2D | Sierpinski triangle, Mandelbrot, Koch snowflake |
| 3D | Menger sponge, Sierpinski tetrahedron, 3D Julia |
| 4D+ | Quaternion Julia, hypercube fractals |

## Core Interfaces

```typescript
// Base fractal interface
interface Fractal<G extends Geometry> {
  geometry: G

  // Generate fractal geometry at given depth
  generate(depth: number): FractalGeometry

  // Get bounding region
  bounds(): BoundingRegion

  // Fractal dimension (Hausdorff)
  dimension(): number
}

interface FractalGeometry {
  // For geometric fractals: list of primitives
  primitives?: Primitive[]

  // For pixel fractals: sampling function
  sample?: (point: Point, maxIter: number) => FractalSample

  // For curve fractals: list of curves
  curves?: Curve[]

  // For mesh fractals (3D): mesh data
  mesh?: Mesh
}

interface FractalSample {
  escaped: boolean
  iterations: number
  finalValue: Complex | Point
}

interface Primitive {
  type: 'point' | 'line' | 'triangle' | 'polygon' | 'circle'
  points: Point[]
  depth: number // Recursion depth this was created at
  style?: Style
}
```

## Geometric Fractals

### Sierpinski Triangle

```typescript
class SierpinskiTriangle implements Fractal<Geometry> {
  constructor(
    public geometry: Geometry,
    private vertices: [Point, Point, Point],
  ) {}

  generate(depth: number): FractalGeometry {
    const triangles: Primitive[] = []
    this.subdivide(this.vertices, depth, triangles)
    return { primitives: triangles }
  }

  private subdivide(
    [a, b, c]: [Point, Point, Point],
    depth: number,
    out: Primitive[],
  ): void {
    if (depth === 0) {
      out.push({ type: 'triangle', points: [a, b, c], depth })
      return
    }

    // Midpoints (using geometry's interpolation)
    const ab = this.geometry.interpolate(a, b, 0.5)
    const bc = this.geometry.interpolate(b, c, 0.5)
    const ca = this.geometry.interpolate(c, a, 0.5)

    // Recurse on three corner triangles (skip center)
    this.subdivide([a, ab, ca], depth - 1, out)
    this.subdivide([ab, b, bc], depth - 1, out)
    this.subdivide([ca, bc, c], depth - 1, out)
  }

  dimension(): number {
    return Math.log(3) / Math.log(2) // ≈ 1.585
  }
}
```

### Koch Snowflake

```typescript
class KochSnowflake implements Fractal<Geometry> {
  constructor(
    public geometry: Geometry,
    private center: Point,
    private radius: number,
  ) {}

  generate(depth: number): FractalGeometry {
    // Start with equilateral triangle
    const vertices = this.equilateralTriangle()
    const curves: Curve[] = []

    for (let i = 0; i < 3; i++) {
      const start = vertices[i]
      const end = vertices[(i + 1) % 3]
      curves.push(...this.kochCurve(start, end, depth))
    }

    return { curves }
  }

  private kochCurve(start: Point, end: Point, depth: number): Curve[] {
    if (depth === 0) {
      return [{ type: 'line', points: [start, end] }]
    }

    // Divide into thirds
    const p1 = this.geometry.interpolate(start, end, 1 / 3)
    const p2 = this.geometry.interpolate(start, end, 2 / 3)

    // Peak point (equilateral triangle on middle third)
    const peak = this.computePeak(p1, p2)

    // Recurse
    return [
      ...this.kochCurve(start, p1, depth - 1),
      ...this.kochCurve(p1, peak, depth - 1),
      ...this.kochCurve(peak, p2, depth - 1),
      ...this.kochCurve(p2, end, depth - 1),
    ]
  }

  dimension(): number {
    return Math.log(4) / Math.log(3) // ≈ 1.262
  }
}
```

### Cantor Set

```typescript
class CantorSet implements Fractal<Geometry> {
  constructor(
    public geometry: Geometry,
    private start: Point,
    private end: Point,
  ) {}

  generate(depth: number): FractalGeometry {
    const segments: Primitive[] = []
    this.subdivide(this.start, this.end, depth, segments)
    return { primitives: segments }
  }

  private subdivide(
    start: Point,
    end: Point,
    depth: number,
    out: Primitive[],
  ): void {
    if (depth === 0) {
      out.push({ type: 'line', points: [start, end], depth })
      return
    }

    // Remove middle third
    const oneThird = this.geometry.interpolate(start, end, 1 / 3)
    const twoThirds = this.geometry.interpolate(start, end, 2 / 3)

    this.subdivide(start, oneThird, depth - 1, out)
    this.subdivide(twoThirds, end, depth - 1, out)
  }

  dimension(): number {
    return Math.log(2) / Math.log(3) // ≈ 0.631
  }
}
```

### Apollonian Gasket

Circles packed recursively, touching tangentially:

```typescript
class ApollonianGasket implements Fractal<Geometry> {
  constructor(
    public geometry: Geometry,
    private outerCircle: Circle,
  ) {}

  generate(depth: number): FractalGeometry {
    const circles: Primitive[] = []

    // Start with three mutually tangent circles inside outer
    const [c1, c2, c3] = this.initialConfiguration()
    circles.push(
      { type: 'circle', points: [c1.center], radius: c1.radius, depth: 0 },
      { type: 'circle', points: [c2.center], radius: c2.radius, depth: 0 },
      { type: 'circle', points: [c3.center], radius: c3.radius, depth: 0 },
    )

    // Recursively fill gaps
    this.fillGap(c1, c2, c3, depth, circles)
    this.fillGap(c1, c2, this.outerCircle, depth, circles)
    this.fillGap(c1, c3, this.outerCircle, depth, circles)
    this.fillGap(c2, c3, this.outerCircle, depth, circles)

    return { primitives: circles }
  }

  private fillGap(
    c1: Circle,
    c2: Circle,
    c3: Circle,
    depth: number,
    out: Primitive[],
  ): void {
    if (depth === 0) return

    // Descartes Circle Theorem to find fourth tangent circle
    const c4 = this.descartesCircle(c1, c2, c3)
    if (!c4 || c4.radius < this.minRadius) return

    out.push({
      type: 'circle',
      points: [c4.center],
      radius: c4.radius,
      depth: this.maxDepth - depth,
    })

    // Recurse into three new gaps
    this.fillGap(c1, c2, c4, depth - 1, out)
    this.fillGap(c1, c3, c4, depth - 1, out)
    this.fillGap(c2, c3, c4, depth - 1, out)
  }

  private descartesCircle(c1: Circle, c2: Circle, c3: Circle): Circle | null {
    // Curvatures (k = 1/r, negative for outer circle)
    const k1 = 1 / c1.radius
    const k2 = 1 / c2.radius
    const k3 = 1 / c3.radius

    // Descartes formula: k4 = k1 + k2 + k3 ± 2√(k1k2 + k2k3 + k3k1)
    const sum = k1 + k2 + k3
    const root = 2 * Math.sqrt(k1 * k2 + k2 * k3 + k3 * k1)
    const k4 = sum + root // Take positive solution for inscribed circle

    // Complex Descartes for center position
    // ...

    return { center: computedCenter, radius: 1 / k4 }
  }
}
```

## 3D Geometric Fractals

### Menger Sponge

```typescript
class MengerSponge implements Fractal<Geometry3D> {
  constructor(
    public geometry: Geometry3D,
    private center: Point3D,
    private size: number,
  ) {}

  generate(depth: number): FractalGeometry {
    const cubes: Primitive[] = []
    this.subdivide(this.center, this.size, depth, cubes)
    return { primitives: cubes }
  }

  private subdivide(
    center: Point3D,
    size: number,
    depth: number,
    out: Primitive[],
  ): void {
    if (depth === 0) {
      out.push(this.cube(center, size, depth))
      return
    }

    const newSize = size / 3
    const offset = size / 3

    // 27 positions, but skip center of each face and center cube (7 removed)
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          // Skip if 2 or more coordinates are 0 (center cross)
          const zeros = (x === 0 ? 1 : 0) + (y === 0 ? 1 : 0) + (z === 0 ? 1 : 0)
          if (zeros >= 2) continue

          const newCenter = [
            center[0] + x * offset,
            center[1] + y * offset,
            center[2] + z * offset,
          ]
          this.subdivide(newCenter, newSize, depth - 1, out)
        }
      }
    }
  }

  dimension(): number {
    return Math.log(20) / Math.log(3) // ≈ 2.727
  }
}
```

### Sierpinski Tetrahedron

```typescript
class SierpinskiTetrahedron implements Fractal<Geometry3D> {
  constructor(
    public geometry: Geometry3D,
    private vertices: [Point3D, Point3D, Point3D, Point3D],
  ) {}

  generate(depth: number): FractalGeometry {
    const tetrahedra: Primitive[] = []
    this.subdivide(this.vertices, depth, tetrahedra)
    return { primitives: tetrahedra }
  }

  private subdivide(
    [a, b, c, d]: [Point3D, Point3D, Point3D, Point3D],
    depth: number,
    out: Primitive[],
  ): void {
    if (depth === 0) {
      out.push({ type: 'tetrahedron', points: [a, b, c, d], depth })
      return
    }

    // Midpoints of all 6 edges
    const ab = this.geometry.interpolate(a, b, 0.5)
    const ac = this.geometry.interpolate(a, c, 0.5)
    const ad = this.geometry.interpolate(a, d, 0.5)
    const bc = this.geometry.interpolate(b, c, 0.5)
    const bd = this.geometry.interpolate(b, d, 0.5)
    const cd = this.geometry.interpolate(c, d, 0.5)

    // 4 corner tetrahedra (skip central octahedron)
    this.subdivide([a, ab, ac, ad], depth - 1, out)
    this.subdivide([ab, b, bc, bd], depth - 1, out)
    this.subdivide([ac, bc, c, cd], depth - 1, out)
    this.subdivide([ad, bd, cd, d], depth - 1, out)
  }

  dimension(): number {
    return 2 // Exactly 2
  }
}
```

### Nested Polyhedra

Recursive nesting of any polyhedron:

```typescript
class NestedPolyhedra implements Fractal<Geometry3D> {
  constructor(
    public geometry: Geometry3D,
    private basePolyhedron: Polyhedron,
    private nestingRule: NestingRule,
  ) {}

  generate(depth: number): FractalGeometry {
    const meshes: Mesh[] = []
    this.nest(this.basePolyhedron, depth, meshes)
    return { mesh: this.combineMeshes(meshes) }
  }

  private nest(poly: Polyhedron, depth: number, out: Mesh[]): void {
    out.push(poly.toMesh())

    if (depth === 0) return

    // Apply nesting rule
    const children = this.nestingRule.apply(poly, this.geometry)
    for (const child of children) {
      this.nest(child, depth - 1, out)
    }
  }
}

interface NestingRule {
  apply(parent: Polyhedron, geometry: Geometry3D): Polyhedron[]
}

// Built-in nesting rules
class InsideFaces implements NestingRule {
  apply(parent: Polyhedron): Polyhedron[] {
    // Place smaller polyhedron on each face, pointing inward
  }
}

class InsideVertices implements NestingRule {
  apply(parent: Polyhedron): Polyhedron[] {
    // Place smaller polyhedron at each vertex
  }
}

class DualNesting implements NestingRule {
  apply(parent: Polyhedron): Polyhedron[] {
    // Nest the dual polyhedron inside
  }
}

class ScaledCenter implements NestingRule {
  constructor(private scale: number) {}
  apply(parent: Polyhedron): Polyhedron[] {
    // Single scaled copy at center
    return [parent.scaled(this.scale)]
  }
}
```

## L-System Fractals

Grammar-based generation:

```typescript
interface LSystemRule {
  predecessor: string
  successor: string
  probability?: number // For stochastic L-systems
}

interface LSystem {
  axiom: string
  rules: LSystemRule[]
  angle: number // Turn angle in degrees
  commands: Record<string, LSystemCommand>
}

type LSystemCommand =
  | { type: 'forward'; distance: number }
  | { type: 'turn'; angle: number }
  | { type: 'push' } // Save state
  | { type: 'pop' } // Restore state
  | { type: 'scale'; factor: number }

class LSystemFractal implements Fractal<Geometry> {
  constructor(
    public geometry: Geometry,
    private system: LSystem,
  ) {}

  generate(depth: number): FractalGeometry {
    // Expand string
    let current = this.system.axiom
    for (let i = 0; i < depth; i++) {
      current = this.expand(current)
    }

    // Interpret as geometry
    return this.interpret(current)
  }

  private expand(input: string): string {
    let result = ''
    for (const char of input) {
      const rule = this.system.rules.find((r) => r.predecessor === char)
      result += rule ? rule.successor : char
    }
    return result
  }

  private interpret(commands: string): FractalGeometry {
    const curves: Curve[] = []
    const stack: TurtleState[] = []
    let state: TurtleState = {
      position: this.geometry.origin(),
      direction: [1, 0],
      scale: 1,
    }

    for (const char of commands) {
      const cmd = this.system.commands[char]
      if (!cmd) continue

      switch (cmd.type) {
        case 'forward':
          const newPos = this.moveForward(state, cmd.distance)
          curves.push({ type: 'line', points: [state.position, newPos] })
          state.position = newPos
          break
        case 'turn':
          state.direction = this.rotate(state.direction, cmd.angle)
          break
        case 'push':
          stack.push({ ...state })
          break
        case 'pop':
          state = stack.pop()!
          break
        case 'scale':
          state.scale *= cmd.factor
          break
      }
    }

    return { curves }
  }
}

// Common L-systems
const dragonCurve: LSystem = {
  axiom: 'FX',
  rules: [
    { predecessor: 'X', successor: 'X+YF+' },
    { predecessor: 'Y', successor: '-FX-Y' },
  ],
  angle: 90,
  commands: {
    F: { type: 'forward', distance: 1 },
    '+': { type: 'turn', angle: 90 },
    '-': { type: 'turn', angle: -90 },
  },
}

const hilbertCurve: LSystem = {
  axiom: 'A',
  rules: [
    { predecessor: 'A', successor: '-BF+AFA+FB-' },
    { predecessor: 'B', successor: '+AF-BFB-FA+' },
  ],
  angle: 90,
  commands: {
    F: { type: 'forward', distance: 1 },
    '+': { type: 'turn', angle: 90 },
    '-': { type: 'turn', angle: -90 },
  },
}

const sierpinskiArrowhead: LSystem = {
  axiom: 'A',
  rules: [
    { predecessor: 'A', successor: 'B-A-B' },
    { predecessor: 'B', successor: 'A+B+A' },
  ],
  angle: 60,
  commands: {
    A: { type: 'forward', distance: 1 },
    B: { type: 'forward', distance: 1 },
    '+': { type: 'turn', angle: 60 },
    '-': { type: 'turn', angle: -60 },
  },
}

const plant: LSystem = {
  axiom: 'X',
  rules: [
    { predecessor: 'X', successor: 'F+[[X]-X]-F[-FX]+X' },
    { predecessor: 'F', successor: 'FF' },
  ],
  angle: 25,
  commands: {
    F: { type: 'forward', distance: 1 },
    '+': { type: 'turn', angle: 25 },
    '-': { type: 'turn', angle: -25 },
    '[': { type: 'push' },
    ']': { type: 'pop' },
  },
}
```

## IFS Fractals

Iterated Function Systems:

```typescript
interface AffineTransform {
  // 2D: [a, b, c, d, e, f] for x' = ax + by + e, y' = cx + dy + f
  // 3D: 4x4 matrix
  matrix: number[]
  probability: number
}

interface IFS {
  transforms: AffineTransform[]
}

class IFSFractal implements Fractal<Geometry> {
  constructor(
    public geometry: Geometry,
    private ifs: IFS,
  ) {}

  // Chaos game - random iteration
  generatePoints(numPoints: number): Point[] {
    const points: Point[] = []
    let current = this.geometry.origin()

    for (let i = 0; i < numPoints; i++) {
      // Pick random transform by probability
      const transform = this.pickTransform()
      current = this.applyTransform(current, transform)

      if (i > 100) {
        // Skip initial transient
        points.push(current)
      }
    }

    return points
  }

  // Deterministic - render all transformed copies
  generate(depth: number): FractalGeometry {
    const primitives: Primitive[] = []
    this.iterate(identity(), depth, primitives)
    return { primitives }
  }

  private iterate(transform: Matrix, depth: number, out: Primitive[]): void {
    if (depth === 0) {
      // Draw base shape transformed
      out.push(this.transformedShape(transform, depth))
      return
    }

    for (const t of this.ifs.transforms) {
      const combined = this.compose(transform, t.matrix)
      this.iterate(combined, depth - 1, out)
    }
  }
}

// Classic IFS fractals
const barnsleyFern: IFS = {
  transforms: [
    { matrix: [0, 0, 0, 0.16, 0, 0], probability: 0.01 }, // Stem
    { matrix: [0.85, 0.04, -0.04, 0.85, 0, 1.6], probability: 0.85 }, // Main
    { matrix: [0.2, -0.26, 0.23, 0.22, 0, 1.6], probability: 0.07 }, // Left
    { matrix: [-0.15, 0.28, 0.26, 0.24, 0, 0.44], probability: 0.07 }, // Right
  ],
}

const sierpinskiIFS: IFS = {
  transforms: [
    { matrix: [0.5, 0, 0, 0.5, 0, 0], probability: 1 / 3 },
    { matrix: [0.5, 0, 0, 0.5, 0.5, 0], probability: 1 / 3 },
    { matrix: [0.5, 0, 0, 0.5, 0.25, 0.5], probability: 1 / 3 },
  ],
}
```

## Escape-Time Fractals

Complex plane iteration:

```typescript
interface EscapeTimeFractal {
  // Iterate z = f(z, c) until |z| > escapeRadius or maxIter
  iterate(z: Complex, c: Complex): FractalSample
}

class MandelbrotSet implements EscapeTimeFractal {
  constructor(
    private maxIter: number = 1000,
    private escapeRadius: number = 2,
  ) {}

  // For Mandelbrot: z starts at 0, c is the point
  sample(c: Complex): FractalSample {
    let z = { re: 0, im: 0 }
    let iter = 0

    while (iter < this.maxIter) {
      const zNext = {
        re: z.re * z.re - z.im * z.im + c.re,
        im: 2 * z.re * z.im + c.im,
      }
      z = zNext

      if (z.re * z.re + z.im * z.im > this.escapeRadius * this.escapeRadius) {
        return { escaped: true, iterations: iter, finalValue: z }
      }
      iter++
    }

    return { escaped: false, iterations: iter, finalValue: z }
  }

  // Render to image
  render(
    width: number,
    height: number,
    bounds: ComplexBounds,
    colorMap: ColorMap,
  ): ImageData {
    const data = new ImageData(width, height)

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const c = this.pixelToComplex(px, py, width, height, bounds)
        const sample = this.sample(c)
        const color = colorMap(sample)

        const idx = (py * width + px) * 4
        data.data[idx] = color.r
        data.data[idx + 1] = color.g
        data.data[idx + 2] = color.b
        data.data[idx + 3] = 255
      }
    }

    return data
  }
}

class JuliaSet implements EscapeTimeFractal {
  constructor(
    private c: Complex, // Fixed parameter
    private maxIter: number = 1000,
    private escapeRadius: number = 2,
  ) {}

  // For Julia: z is the point, c is fixed
  sample(z: Complex): FractalSample {
    let current = z
    let iter = 0

    while (iter < this.maxIter) {
      const zNext = {
        re: current.re * current.re - current.im * current.im + this.c.re,
        im: 2 * current.re * current.im + this.c.im,
      }
      current = zNext

      if (
        current.re * current.re + current.im * current.im >
        this.escapeRadius * this.escapeRadius
      ) {
        return { escaped: true, iterations: iter, finalValue: current }
      }
      iter++
    }

    return { escaped: false, iterations: iter, finalValue: current }
  }
}

// Other escape-time fractals
class BurningShip implements EscapeTimeFractal {
  sample(c: Complex): FractalSample {
    let z = { re: 0, im: 0 }
    // z = (|Re(z)| + i|Im(z)|)² + c
  }
}

class Tricorn implements EscapeTimeFractal {
  sample(c: Complex): FractalSample {
    // z = conj(z)² + c
  }
}

class Nova implements EscapeTimeFractal {
  sample(c: Complex): FractalSample {
    // Newton's method variant
  }
}
```

## Fractals in Non-Euclidean Geometry

### Hyperbolic Fractals

Fractals native to hyperbolic space:

```typescript
class HyperbolicSierpinski implements Fractal<Hyperbolic2D> {
  constructor(
    public geometry: Hyperbolic2D,
    private idealTriangle: [Point, Point, Point], // Vertices at infinity
  ) {}

  generate(depth: number): FractalGeometry {
    // In hyperbolic space, we can have ideal triangles
    // with vertices at infinity (on the boundary circle)
    const triangles: Primitive[] = []
    this.subdivide(this.idealTriangle, depth, triangles)
    return { primitives: triangles }
  }

  private subdivide(
    vertices: [Point, Point, Point],
    depth: number,
    out: Primitive[],
  ): void {
    if (depth === 0) {
      out.push({ type: 'triangle', points: vertices, depth })
      return
    }

    // Midpoints along hyperbolic geodesics
    const [a, b, c] = vertices
    const ab = this.geometry.interpolate(a, b, 0.5)
    const bc = this.geometry.interpolate(b, c, 0.5)
    const ca = this.geometry.interpolate(c, a, 0.5)

    // Three corner triangles
    this.subdivide([a, ab, ca], depth - 1, out)
    this.subdivide([ab, b, bc], depth - 1, out)
    this.subdivide([ca, bc, c], depth - 1, out)
  }
}

class HyperbolicApollonian implements Fractal<Hyperbolic2D> {
  // Apollonian gasket in the Poincare disk
  // Uses hyperbolic circles (Euclidean circles in the model)
}

class LimitSet implements Fractal<Hyperbolic2D> {
  constructor(
    public geometry: Hyperbolic2D,
    private group: KleinianGroup,
  ) {}

  // Generate the limit set of a Kleinian group
  // (fractal boundary of a hyperbolic group action)
  generate(depth: number): FractalGeometry {
    const points: Point[] = []

    // DFS through group elements
    this.generateGroupOrbit(identity(), depth, points)

    return { primitives: points.map((p) => ({ type: 'point', points: [p] })) }
  }
}
```

### Spherical Fractals

```typescript
class SphericalSierpinski implements Fractal<Spherical2D> {
  constructor(
    public geometry: Spherical2D,
    private baseTriangle: [Point, Point, Point],
  ) {}

  generate(depth: number): FractalGeometry {
    // Sierpinski on the sphere
    // Uses spherical triangles and geodesic midpoints
    const triangles: Primitive[] = []
    this.subdivide(this.baseTriangle, depth, triangles)
    return { primitives: triangles }
  }
}

class SphericalApollonian implements Fractal<Spherical2D> {
  // Apollonian gasket on the sphere
  // Circles become spherical caps
}
```

## Integration with Tessellations

Fractals within tessellations:

```typescript
class TessellatedFractal {
  constructor(
    private tiling: TilingGenerator,
    private fractal: Fractal<Geometry>,
    private placement: 'inside' | 'border' | 'vertex',
  ) {}

  generate(tilingDepth: number, fractalDepth: number): FractalGeometry {
    const tiles = this.tiling.generate(tilingDepth)
    const allPrimitives: Primitive[] = []

    for (const tile of tiles) {
      // Place fractal in each tile
      const tileFractal = this.placeFractalInTile(tile, fractalDepth)
      allPrimitives.push(...tileFractal.primitives)
    }

    return { primitives: allPrimitives }
  }

  private placeFractalInTile(tile: Tile, depth: number): FractalGeometry {
    switch (this.placement) {
      case 'inside':
        // Scale and position fractal to fit inside tile
        return this.fractalInside(tile, depth)
      case 'border':
        // Draw fractal along tile edges (Koch-like)
        return this.fractalOnBorder(tile, depth)
      case 'vertex':
        // Place fractal at each vertex
        return this.fractalAtVertices(tile, depth)
    }
  }
}

// Example: Koch snowflake borders on hyperbolic tiling
const kochTiling = new TessellatedFractal(
  new TilingGenerator(7, 3, new Hyperbolic2D()),
  new KochSnowflake(new Hyperbolic2D(), origin, 1),
  'border',
)
```

## Integration with Kaleidoscopes

Kaleidoscopic fractals:

```typescript
class KaleidoscopicFractal {
  constructor(
    private fractal: Fractal<Geometry>,
    private kaleidoscope: GeometricKaleidoscope,
  ) {}

  generate(fractalDepth: number): FractalGeometry {
    // Generate fractal
    const fractalGeom = this.fractal.generate(fractalDepth)

    // Apply kaleidoscope reflections
    const reflected = this.kaleidoscope.reflect(fractalGeom)

    return reflected
  }
}

class FractalKaleidoscopeSource implements GeometrySource {
  constructor(private fractal: Fractal<Geometry>) {}

  generate(time: number): Geometry[] {
    // Animate fractal parameters over time
    const depth = Math.floor(3 + 2 * Math.sin(time * 0.5))
    const geom = this.fractal.generate(depth)
    return geom.primitives || []
  }
}

// Mandelbrot zoom as kaleidoscope source
class MandelbrotSource implements PixelSource {
  constructor(
    private mandelbrot: MandelbrotSet,
    private colorMap: ColorMap,
  ) {}

  sample(u: number, v: number, time: number): Color {
    // Zoom into Mandelbrot over time
    const zoom = Math.exp(time * 0.1)
    const center = { re: -0.75, im: 0 }

    const c = {
      re: center.re + (u - 0.5) / zoom,
      im: center.im + (v - 0.5) / zoom,
    }

    const sample = this.mandelbrot.sample(c)
    return this.colorMap(sample)
  }
}
```

## Combined Systems

Mix everything together:

```typescript
class FractalScene {
  layers: FractalLayer[] = []

  addLayer(layer: FractalLayer): void {
    this.layers.push(layer)
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    for (const layer of this.layers) {
      ctx.save()
      ctx.globalAlpha = layer.opacity
      ctx.globalCompositeOperation = layer.blendMode

      layer.render(ctx, time)

      ctx.restore()
    }
  }
}

interface FractalLayer {
  type: 'fractal' | 'tessellation' | 'kaleidoscope' | 'combined'
  opacity: number
  blendMode: BlendMode
  render(ctx: CanvasRenderingContext2D, time: number): void
}

// Example: Everything combined
const epicScene = new FractalScene()

// Base: Hyperbolic tiling
epicScene.addLayer({
  type: 'tessellation',
  opacity: 1,
  blendMode: 'source-over',
  content: new TilingGenerator(7, 3, new Hyperbolic2D()),
})

// Overlay: Sierpinski in each tile
epicScene.addLayer({
  type: 'combined',
  opacity: 0.7,
  blendMode: 'multiply',
  content: new TessellatedFractal(tiling, sierpinski, 'inside'),
})

// Overlay: Kaleidoscoped L-system
epicScene.addLayer({
  type: 'kaleidoscope',
  opacity: 0.5,
  blendMode: 'add',
  content: new KaleidoscopicFractal(dragonCurveFractal, kaleidoscope6),
})

// Background: Mandelbrot zoom
epicScene.addLayer({
  type: 'fractal',
  opacity: 0.3,
  blendMode: 'screen',
  content: mandelbrotZoom,
})
```

## Animation

Animated fractals:

```typescript
interface FractalAnimation {
  // Parameter to animate
  parameter: 'depth' | 'zoom' | 'rotation' | 'color' | 'julia_c' | 'custom'

  // Animation curve
  curve: (time: number) => number

  // Range
  min: number
  max: number
}

class AnimatedFractal {
  constructor(
    private fractal: Fractal<Geometry>,
    private animations: FractalAnimation[],
  ) {}

  generate(time: number): FractalGeometry {
    // Apply animations
    for (const anim of this.animations) {
      const value = anim.min + (anim.max - anim.min) * anim.curve(time)
      this.applyParameter(anim.parameter, value)
    }

    return this.fractal.generate(this.currentDepth)
  }
}

// Julia set morphing
class MorphingJulia {
  constructor(private cPath: (time: number) => Complex) {}

  sample(z: Complex, time: number): FractalSample {
    const c = this.cPath(time)
    return new JuliaSet(c).sample(z)
  }
}

// Example: c traces a circle in the complex plane
const orbitingJulia = new MorphingJulia((time) => ({
  re: 0.7885 * Math.cos(time * 0.5),
  im: 0.7885 * Math.sin(time * 0.5),
}))
```

## Directory Structure

```
code/
├── fractal/
│   ├── index.ts
│   ├── types.ts              # Core interfaces
│   ├── geometric/
│   │   ├── sierpinski.ts
│   │   ├── koch.ts
│   │   ├── cantor.ts
│   │   ├── apollonian.ts
│   │   └── tree.ts
│   ├── 3d/
│   │   ├── menger.ts
│   │   ├── sierpinski-tetra.ts
│   │   └── nested.ts
│   ├── lsystem/
│   │   ├── lsystem.ts
│   │   ├── interpreter.ts
│   │   └── presets.ts
│   ├── ifs/
│   │   ├── ifs.ts
│   │   ├── chaos-game.ts
│   │   └── presets.ts
│   ├── escape-time/
│   │   ├── mandelbrot.ts
│   │   ├── julia.ts
│   │   ├── burning-ship.ts
│   │   └── coloring.ts
│   ├── non-euclidean/
│   │   ├── hyperbolic.ts
│   │   └── spherical.ts
│   ├── integration/
│   │   ├── tessellated-fractal.ts
│   │   ├── kaleidoscopic-fractal.ts
│   │   └── combined-scene.ts
│   └── animation/
│       ├── animated-fractal.ts
│       └── morphing.ts
```
