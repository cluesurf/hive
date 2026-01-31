# Implementation Plan

## Phase 1: Core Mathematics

### 1.1 Primitive Types

Create foundational types for all geometric computations.

**Files:**

- `code/form/complex.ts` - Complex number operations
- `code/form/vector.ts` - Vector2, Vector3, Vector4
- `code/form/matrix.ts` - Matrix3, Matrix4

**Complex Operations:**

```typescript
add, sub, mul, div
conjugate, abs, arg
exp, log, sqrt, pow
fromPolar(r, theta)
```

**Vector Operations:**

```typescript
add, sub, scale, dot
cross (3D/4D), normalize
length, lengthSquared
lerp, slerp (spherical)
```

**Matrix Operations:**

```typescript
identity, multiply, transpose
determinant, inverse
fromRows, fromCols
applyToVector
```

### 1.2 Hyperboloid Model

Core internal representation for hyperbolic geometry.

**Files:**

- `code/model/hyperboloid.ts`

**Functions:**

```typescript
// Point operations
normalize(p: Vector3): Vector3       // Project to hyperboloid
minkowskiDot(a, b): number           // <a,b> = ax*bx + ay*by - az*bz
distance(a, b): number               // acosh(-<a,b>)
midpoint(a, b): Vector3              // Hyperbolic midpoint
hlerp(a, b, t): Vector3              // Hyperbolic interpolation

// Point classification
classify(p): 'point' | 'ideal' | 'ultra'

// Geodesics
geodesicThrough(a, b): Geodesic
pointOnGeodesic(g, t): Vector3
ideals(g): [Vector3, Vector3]        // Endpoints at infinity

// Transformations
rotationMatrix(angle): Matrix3
translationMatrix(direction, distance): Matrix3
reflectionMatrix(geodesic): Matrix3
```

### 1.3 Model Conversions

Convert between different hyperbolic models.

**Files:**

- `code/model/poincare.ts`
- `code/model/klein.ts`
- `code/model/halfplane.ts`
- `code/model/band.ts`

**Conversions:**

```typescript
// Hyperboloid <-> Poincare
hyperboloidToPoincare(p: Vector3): Complex
poincareToHyperboloid(z: Complex): Vector3

// Poincare <-> Klein
poincareToKlein(z: Complex): Complex
kleinToPoincare(z: Complex): Complex

// Poincare <-> Upper Half-Plane
poincareToUHP(z: Complex): Complex
uhpToPoincare(z: Complex): Complex

// Poincare <-> Band
poincareToBand(z: Complex): Complex
bandToPoincare(z: Complex): Complex
```

### 1.4 Mobius Transformations

Complex analysis approach for 2D transformations.

**Files:**

- `code/transform/mobius.ts`

**Class:**

```typescript
class Mobius {
  a, b, c, d: Complex

  static identity(): Mobius
  static rotation(center: Complex, angle: number): Mobius
  static translation(from: Complex, to: Complex): Mobius
  static reflection(geodesic: Geodesic): Mobius
  static isometry(geometry, angle, point): Mobius

  apply(z: Complex): Complex
  applyToCircle(c: Circle): Circle
  compose(m: Mobius): Mobius
  inverse(): Mobius

  // Classification
  trace(): Complex
  classify(): 'elliptic' | 'parabolic' | 'hyperbolic' | 'loxodromic'
  fixedPoints(): Complex[]
}
```

## Phase 2: Geometric Objects

### 2.1 Circles and Geodesics

Generalized circles (including lines as limiting case).

**Files:**

- `code/geometry/circle.ts`
- `code/geometry/geodesic.ts`

**Circle:**

```typescript
interface Circle {
  center: Complex
  radius: number
  isLine: boolean
  // For lines: normal direction
  direction?: Complex
}

// Constructors
circleFrom3Points(a, b, c): Circle
circleFrom2PointsAndRadius(a, b, r): Circle
lineFromPointAndDirection(p, d): Circle
geodesicThroughPoints(a, b): Circle   // Orthogonal to unit circle
```

### 2.2 Polygons

Regular and irregular polygons.

**Files:**

- `code/geometry/polygon.ts`
- `code/geometry/segment.ts`

**Segment:**

```typescript
interface Segment {
  start: Complex
  end: Complex
  arc?: {
    center: Complex
    radius: number
    clockwise: boolean
  }
}
```

**Polygon:**

```typescript
interface Polygon {
  segments: Segment[]
  center: Complex
}

// Constructors
regularPolygon(p: number, q: number): Polygon  // {p,q} tiling center tile
polygonFromVertices(vertices: Complex[]): Polygon

// Operations
reflectPolygon(poly: Polygon, edge: number): Polygon
transformPolygon(poly: Polygon, m: Mobius): Polygon
shrinkPolygon(poly: Polygon, factor: number): Polygon
```

### 2.3 Tiles

Tiles with adjacency information.

**Files:**

- `code/tiling/tile.ts`

```typescript
interface Tile {
  id: string
  boundary: Polygon
  drawn: Polygon // Possibly shrunk for display
  center: Complex
  vertexCircle: Circle // Circumscribed circle
  isometry: Mobius // Transform back to base tile

  // Adjacency
  edgeNeighbors: (Tile | null)[]
  vertexNeighbors: (Tile | null)[][]
}
```

## Phase 3: Tessellation Generation

### 3.1 Reflection-Based Generator

For finite, explicit tilings.

**Files:**

- `code/tiling/reflection-generator.ts`

```typescript
interface TilingConfig {
  p: number
  q: number
  maxTiles?: number
  shrinkFactor?: number
}

class ReflectionGenerator {
  config: TilingConfig
  tiles: Map<string, Tile>
  baseTile: Tile

  generate(): void
  getTileAt(point: Complex): Tile | null
  getVisibleTiles(viewport: Rect): Tile[]

  private reflectAcrossEdge(tile: Tile, edge: number): Tile
  private positionHash(center: Complex): string
}
```

### 3.2 Group-Based Generator

For infinite, sparse tilings (cellular automata).

**Files:**

- `code/tiling/group-generator.ts`
- `code/tiling/von-dyck.ts`

```typescript
// Von Dyck group element
interface GroupElement {
  chain: { gen: 'a' | 'b'; pow: number }[]
}

class VonDyckGroup {
  p: number // a^p = e
  q: number // b^q = e

  identity(): GroupElement
  multiply(g1: GroupElement, g2: GroupElement): GroupElement
  inverse(g: GroupElement): GroupElement
  normalize(g: GroupElement): GroupElement

  // Cached matrices
  getMatrix(g: GroupElement): Matrix3
}

class GroupGenerator {
  group: VonDyckGroup
  cells: Map<string, Cell>

  getCell(element: GroupElement): Cell
  edgeNeighbors(cell: Cell): Cell[]
  vertexNeighbors(cell: Cell): Cell[]
  neighborhood(center: Cell, radius: number): Cell[]
}
```

### 3.3 Wythoff Constructions

Uniform tilings beyond regular {p,q}.

**Files:**

- `code/tiling/wythoff.ts`

```typescript
type WythoffSymbol =
  | { type: 'pqr' } // p|qr - triangles
  | { type: 'p|qr'; p: number }
  | { type: 'pq|r'; r: number }
  | { type: 'pqr|' } // Full tiling

class WythoffGenerator {
  p: number
  q: number
  r: number
  symbol: WythoffSymbol

  generateFundamentalRegion(): Polygon
  generateTiling(maxTiles: number): Tile[]
}
```

## Phase 4: 3D Extension

### 4.1 3D Hyperboloid Model

4D Minkowski space for H³.

**Files:**

- `code/model/hyperboloid3d.ts`

```typescript
// Point on 4D hyperboloid: x² + y² + z² - w² = -1
interface H3Point {
  x: number
  y: number
  z: number
  w: number
}

// Geodesic plane in H³
interface H3Plane {
  normal: Vector4 // Space-like vector
}

// Operations
function distance3d(a: H3Point, b: H3Point): number
function geodesicPlane(a: H3Point, b: H3Point, c: H3Point): H3Plane
function reflect3d(point: H3Point, plane: H3Plane): H3Point
```

### 4.2 3D Polyhedra

Regular and uniform polyhedra as cell faces.

**Files:**

- `code/geometry/polyhedron.ts`

```typescript
interface Face {
  vertices: number[]  // Indices into vertex array
  polygon: Polygon    // 2D representation on face plane
}

interface Polyhedron {
  vertices: H3Point[]
  edges: [number, number][]
  faces: Face[]
  center: H3Point
}

// Constructors
tetrahedron(): Polyhedron
cube(): Polyhedron
octahedron(): Polyhedron
dodecahedron(): Polyhedron
icosahedron(): Polyhedron
// Hyperbolic versions with p,q,r parameters
```

### 4.3 Honeycomb Generator

3D tessellations {p,q,r}.

**Files:**

- `code/tiling/honeycomb.ts`

```typescript
interface HoneycombConfig {
  p: number // Face sides
  q: number // Faces per vertex of cell
  r: number // Cells per edge
  maxCells?: number
}

class HoneycombGenerator {
  config: HoneycombConfig
  cells: Map<string, Cell3D>

  generate(): void
  getCellAt(point: H3Point): Cell3D | null
}
```

## Phase 5: Rendering

### 5.1 WebGL Renderer

GPU-accelerated rendering.

**Files:**

- `code/render/webgl/renderer.ts`
- `code/render/webgl/shaders/*.glsl`

```typescript
interface RenderOptions {
  antialias: boolean
  preserveDrawingBuffer: boolean
}

class WebGLRenderer {
  canvas: HTMLCanvasElement
  gl: WebGL2RenderingContext

  constructor(canvas: HTMLCanvasElement, options?: RenderOptions)

  setCamera(camera: Camera): void
  render(scene: Scene): void
  dispose(): void
}
```

### 5.2 Shader-Based Tiling

For infinite tilings without explicit geometry.

**Files:**

- `code/render/webgl/tiling-shader.ts`
- `code/render/webgl/shaders/tiling.frag`

```typescript
class TilingShaderRenderer {
  setParams(p: number, q: number, r: number): void
  setWythoff(symbol: WythoffSymbol): void
  setCamera(center: Complex, zoom: number): void
  render(): void
}
```

### 5.3 Canvas 2D Renderer

Fallback and simple use cases.

**Files:**

- `code/render/canvas/renderer.ts`

```typescript
class CanvasRenderer {
  ctx: CanvasRenderingContext2D

  clear(): void
  drawCircle(circle: Circle, style: Style): void
  drawPolygon(polygon: Polygon, style: Style): void
  drawTiling(tiling: Tiling, style: TilingStyle): void
}
```

### 5.4 SVG Renderer

For export and vector graphics.

**Files:**

- `code/render/svg/renderer.ts`

```typescript
class SVGRenderer {
  toSVG(tiling: Tiling, options?: SVGOptions): string
  toPath(polygon: Polygon): string
}
```

## Phase 6: Interactivity

### 6.1 Camera System

**Files:**

- `code/camera/camera2d.ts`
- `code/camera/camera3d.ts`

```typescript
class Camera2D {
  center: Complex
  zoom: number
  rotation: number

  pan(dx: number, dy: number): void
  zoomAt(factor: number, x: number, y: number): void
  screenToWorld(x: number, y: number): Complex
  worldToScreen(z: Complex): [number, number]
}

class Camera3D {
  position: H3Point
  target: H3Point
  up: Vector3
  fov: number

  orbit(azimuth: number, elevation: number): void
  dolly(distance: number): void
  lookAt(target: H3Point): void
}
```

### 6.2 Input Handling

**Files:**

- `code/input/mouse.ts`
- `code/input/touch.ts`
- `code/input/keyboard.ts`

```typescript
class InputHandler {
  constructor(element: HTMLElement)

  onPan(callback: (dx, dy) => void): void
  onZoom(callback: (factor, x, y) => void): void
  onRotate(callback: (angle) => void): void
  onClick(callback: (x, y) => void): void
  onKeyDown(callback: (key) => void): void
}
```

### 6.3 Animation System

**Files:**

- `code/animation/animator.ts`
- `code/animation/easing.ts`

```typescript
type EasingFunction = (t: number) => number

interface Animation {
  duration: number
  easing: EasingFunction
  onUpdate: (progress: number) => void
  onComplete?: () => void
}

class Animator {
  add(animation: Animation): void
  update(deltaTime: number): void
  stop(): void
}

// Easing functions
const easing = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  // etc.
}
```

## Phase 7: Scene Management

### 7.1 Scene Graph

**Files:**

- `code/scene/node.ts`
- `code/scene/scene.ts`

```typescript
abstract class SceneNode {
  parent: SceneNode | null
  children: SceneNode[]
  transform: Matrix3 | Matrix4
  visible: boolean

  addChild(node: SceneNode): void
  removeChild(node: SceneNode): void
  getWorldTransform(): Matrix3 | Matrix4

  abstract render(ctx: RenderContext): void
}

class Scene {
  root: SceneNode
  camera: Camera2D | Camera3D

  add(node: SceneNode): void
  remove(node: SceneNode): void
  render(renderer: Renderer): void
  pick(x: number, y: number): SceneNode | null
}
```

### 7.2 Specialized Nodes

**Files:**

- `code/scene/tiling-node.ts`
- `code/scene/shape-node.ts`
- `code/scene/group-node.ts`

```typescript
class TilingNode extends SceneNode {
  tiling: Tiling
  style: TilingStyle
}

class PolygonNode extends SceneNode {
  polygon: Polygon
  style: ShapeStyle
}

class CircleNode extends SceneNode {
  circle: Circle
  style: ShapeStyle
}

class GroupNode extends SceneNode {
  // Just a container for organizing
}
```

## Phase 8: Advanced Features

### 8.1 Cellular Automata

**Files:**

- `code/ca/field.ts`
- `code/ca/rules.ts`
- `code/ca/simulator.ts`

```typescript
interface Rule {
  name: string
  states: number
  neighborhoodType: 'moore' | 'vonNeumann'
  transition(center: number, neighbors: number[]): number
}

class Field<T> {
  tiling: GroupGenerator
  values: Map<string, T>

  get(cell: Cell): T | undefined
  set(cell: Cell, value: T): void
  clear(): void
}

class CASimulator {
  field: Field<number>
  rule: Rule

  step(): void
  run(steps: number): void
  reset(): void
}
```

### 8.2 Fractals

**Files:**

- `code/fractal/ifs.ts`
- `code/fractal/kleinian.ts`

```typescript
// Iterated Function System
interface IFS {
  transforms: Mobius[]
  probabilities: number[]
}

function renderIFS(ifs: IFS, iterations: number): Complex[]

// Kleinian group limit sets
class KleinianGroup {
  generators: Mobius[]

  limitSet(depth: number): Complex[]
  fundamentalDomain(): Polygon
}
```

### 8.3 Higher Dimensions

**Files:**

- `code/4d/hyperboloid4d.ts`
- `code/4d/projection.ts`

```typescript
// 5D Minkowski for H⁴
interface H4Point {
  coords: [number, number, number, number, number]
}

// Projections to 3D for display
function stereographicProject4D(p: H4Point): Vector3
function perspectiveProject4D(p: H4Point, distance: number): Vector3
```

## Milestone Summary

| Phase | Description             | Dependencies |
| ----- | ----------------------- | ------------ |
| 1     | Core Mathematics        | None         |
| 2     | Geometric Objects       | Phase 1      |
| 3     | Tessellation Generation | Phases 1-2   |
| 4     | 3D Extension            | Phases 1-3   |
| 5     | Rendering               | Phases 1-4   |
| 6     | Interactivity           | Phase 5      |
| 7     | Scene Management        | Phases 5-6   |
| 8     | Advanced Features       | Phases 1-7   |

## Estimated Complexity

- **Phase 1-2:** Foundation, relatively straightforward
- **Phase 3:** Core challenge, port from ht.js-make + enhance
- **Phase 4:** Significant complexity, 4D math
- **Phase 5:** WebGL expertise needed
- **Phase 6-7:** Standard interactive graphics
- **Phase 8:** Research-level implementations
