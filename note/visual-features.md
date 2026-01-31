# Visual Features and Path Rendering

This document describes advanced visualization features beyond basic
tiling display.

## Tile Shrinking

Tiles can be shrunk toward their centers to create visual separation,
reveal the underlying structure, or make room for overlaid elements.

### Shrink Factor

A shrink factor s in [0, 1] where:

- s = 1.0: Full-size tiles (touching neighbors)
- s = 0.5: Half-size tiles (significant gaps)
- s = 0.0: Tiles collapse to center points

### Implementation

```typescript
interface TileStyle {
  shrinkFactor: number // 0 to 1
  // ... other style properties
}

function shrinkPolygon(
  vertices: HyperPoint[],
  center: HyperPoint,
  factor: number,
): HyperPoint[] {
  return vertices.map(v => hlerp(center, v, factor))
}
```

The shrink uses hyperbolic interpolation (hlerp) to move each vertex
toward the center along the geodesic connecting them.

### Visual Effects

Shrinking reveals:

- The dual graph structure (connecting tile centers)
- Edge midpoints and vertex figures
- Space for paths, labels, or decorations

## Path Rendering

Paths through tilings represent:

- Game movements or solutions
- Graph traversals (BFS, DFS, shortest path)
- Cellular automata histories
- User-drawn annotations

### Path Representation

```typescript
interface TilePath {
  tiles: Tile[] // Sequence of tiles
  style: PathStyle
}

interface PathStyle {
  strokeWidth: number // In hyperbolic units
  color: string
  lineCap: 'round' | 'square' | 'butt'
  lineJoin: 'round' | 'bevel' | 'miter'
  dash?: number[] // Dash pattern
  glow?: GlowEffect // Optional glow/shadow
  animate?: boolean // Animate drawing
}
```

### Path Geometry Options

#### 1. Center-to-Center Lines

Connect tile centers with geodesic segments:

```typescript
function pathThroughCenters(tiles: Tile[]): Geodesic[] {
  const segments: Geodesic[] = []
  for (let i = 0; i < tiles.length - 1; i++) {
    segments.push(geodesicThrough(tiles[i].center, tiles[i + 1].center))
  }
  return segments
}
```

**Pros:** Simple, always well-defined. **Cons:** Crosses through tile
interiors, may look cluttered.

#### 2. Edge-Crossing Lines

Path crosses through shared edges:

```typescript
function pathThroughEdges(tiles: Tile[]): Geodesic[] {
  const segments: Geodesic[] = []
  for (let i = 0; i < tiles.length - 1; i++) {
    const edgeIndex = findSharedEdge(tiles[i], tiles[i + 1])
    const edgeMidpoint = tiles[i].edgeMidpoints[edgeIndex]

    // From previous midpoint (or center) to this midpoint
    const from =
      i === 0
        ? tiles[i].center
        : tiles[i - 1].edgeMidpoints[
            findSharedEdge(tiles[i - 1], tiles[i])
          ]

    segments.push(geodesicThrough(from, edgeMidpoint))
  }
  return segments
}
```

**Pros:** Natural flow through tiling. **Cons:** More complex, need edge
detection.

#### 3. Smooth Curved Paths

Use splines or Bezier curves in hyperbolic space:

```typescript
interface HyperbolicSpline {
  controlPoints: HyperPoint[]
  tension: number
}

function evaluateSpline(
  spline: HyperbolicSpline,
  t: number,
): HyperPoint {
  // Catmull-Rom or similar, using hlerp instead of lerp
}
```

**Pros:** Smooth, visually appealing. **Cons:** More computation, may
drift off geodesics.

#### 4. Channel Paths (Between Shrunk Tiles)

When tiles are shrunk, paths can flow through the gaps:

```typescript
function channelPath(
  tiles: Tile[],
  shrinkFactor: number,
): HyperPoint[] {
  // Path hugs the edges of shrunk tiles
  // Flows through the "channels" between them
}
```

**Pros:** Doesn't overlap tiles, very clean. **Cons:** Requires tile
shrinking.

## SVG-Style Path Syntax

Paths can be defined using a syntax similar to SVG path data, adapted
for hyperbolic geometry.

### 2D Path Commands

```typescript
type PathCommand2D =
  | { type: 'M'; p: HyperPoint }               // Move to
  | { type: 'L'; p: HyperPoint }               // Line (geodesic) to
  | { type: 'A'; center: HyperPoint; angle: number }  // Arc around center
  | { type: 'H'; distance: number }            // Hyperbolic horizontal
  | { type: 'V'; distance: number }            // Hyperbolic vertical
  | { type: 'C'; c1: HyperPoint; c2: HyperPoint; p: HyperPoint }  // Cubic bezier
  | { type: 'Q'; c: HyperPoint; p: HyperPoint } // Quadratic bezier
  | { type: 'Z' }                               // Close path

interface HyperbolicPath2D {
  commands: PathCommand2D[]
}

// Parse SVG-like string
function parsePath(d: string): HyperbolicPath2D {
  // "M 0,0 L 0.5,0.3 A center:0,0 angle:45 Z"
}

// Example: Draw a geodesic triangle
const triangle = parsePath(`
  M ${p1.x},${p1.y}
  L ${p2.x},${p2.y}
  L ${p3.x},${p3.y}
  Z
`)
```

### 3D Path Commands

For 3D hyperbolic space (H³):

```typescript
type PathCommand3D =
  | { type: 'M'; p: HyperPoint3D }
  | { type: 'L'; p: HyperPoint3D }              // Geodesic segment
  | { type: 'A'; axis: HyperPoint3D; angle: number }  // Rotation around axis
  | { type: 'H'; plane: H3Plane; distance: number }   // Move in plane
  | { type: 'C'; c1: HyperPoint3D; c2: HyperPoint3D; p: HyperPoint3D }
  | { type: 'Z' }

interface HyperbolicPath3D {
  commands: PathCommand3D[]
}
```

### Path Builder API

Fluent API for constructing paths:

```typescript
class PathBuilder {
  private commands: PathCommand2D[] = []

  moveTo(p: HyperPoint): this {
    this.commands.push({ type: 'M', p })
    return this
  }

  lineTo(p: HyperPoint): this {
    this.commands.push({ type: 'L', p })
    return this
  }

  arcAround(center: HyperPoint, angle: number): this {
    this.commands.push({ type: 'A', center, angle })
    return this
  }

  geodesicTo(p: HyperPoint): this {
    // Same as lineTo in hyperbolic space
    return this.lineTo(p)
  }

  horocycleTo(p: HyperPoint, idealPoint: HyperPoint): this {
    // Follow horocycle toward ideal point
    // ...
    return this
  }

  close(): HyperbolicPath2D {
    this.commands.push({ type: 'Z' })
    return { commands: this.commands }
  }

  build(): HyperbolicPath2D {
    return { commands: this.commands }
  }
}

// Usage
const path = new PathBuilder()
  .moveTo(origin)
  .lineTo(point1)
  .arcAround(center, Math.PI / 4)
  .lineTo(point2)
  .close()
```

## Animating Along Paths

Objects can be animated to follow hyperbolic paths.

### Path Follower

```typescript
interface PathFollower {
  path: HyperbolicPath2D | HyperbolicPath3D
  duration: number
  easing: EasingFunction
  loop: boolean
  pingPong: boolean
  onUpdate: (position: HyperPoint, tangent: HyperPoint, t: number) => void
  onComplete?: () => void
}

class PathAnimator {
  private followers: PathFollower[] = []

  follow(follower: PathFollower): void {
    this.followers.push(follower)
  }

  update(deltaTime: number): void {
    for (const f of this.followers) {
      // Advance along path
      // Compute position and tangent
      // Call onUpdate
    }
  }
}
```

### Path Evaluation

```typescript
// Get point at parameter t (0 to 1)
function evaluatePath(path: HyperbolicPath2D, t: number): {
  position: HyperPoint
  tangent: HyperPoint
  curvature: number
} {
  // Find which segment t falls into
  // Interpolate using hlerp for geodesics
  // Compute tangent as derivative
}

// Get arc length parameterization
function reparameterizeByArcLength(
  path: HyperbolicPath2D,
  samples: number
): (t: number) => number {
  // Build lookup table for uniform speed
}
```

### Animation Types

```typescript
type PathAnimationType =
  | 'constant-speed'     // Uniform hyperbolic speed
  | 'ease-in-out'        // Smooth acceleration/deceleration
  | 'screen-constant'    // Constant speed in screen space
  | 'follow-curvature'   // Slow down on tight curves

interface PathAnimationConfig {
  type: PathAnimationType
  duration: number
  delay?: number
  repeat?: number | 'infinite'
  direction?: 'forward' | 'reverse' | 'alternate'
}
```

### Camera Path Animation

Animate the camera along a path:

```typescript
function animateCameraAlongPath(
  camera: Camera2D,
  path: HyperbolicPath2D,
  config: PathAnimationConfig
): Animation {
  return {
    duration: config.duration,
    easing: getEasing(config.type),
    onUpdate: (t: number) => {
      const { position, tangent } = evaluatePath(path, t)
      camera.center = position
      camera.rotation = Math.atan2(tangent.y, tangent.x)
    }
  }
}
```

### Entity Path Animation

Move game entities or markers along paths:

```typescript
interface EntityPathAnimation {
  entity: Entity
  path: HyperbolicPath2D
  config: PathAnimationConfig
  orientToPath: boolean  // Rotate entity to face direction
  trail?: {
    enabled: boolean
    length: number
    fadeOut: boolean
    style: PathStyle
  }
}
```

### Synchronized Animations

Multiple objects following related paths:

```typescript
interface PathGroup {
  paths: HyperbolicPath2D[]
  synchronize: 'start' | 'speed' | 'end'
  stagger?: number  // Delay between each
}

function animatePathGroup(
  group: PathGroup,
  config: PathAnimationConfig
): Animation[] {
  return group.paths.map((path, i) => ({
    duration: config.duration,
    delay: i * (group.stagger ?? 0),
    // ...
  }))
}
```

### Path Width in Hyperbolic Space

In the Poincare disk, a constant-width path appears to taper toward the
boundary. Options:

1. **Hyperbolic constant width**: Same width in hyperbolic units
   (appears to taper in Poincare view)

2. **Screen constant width**: Adjust width based on position to maintain
   visual consistency

3. **Proportional to tile size**: Width scales with local tile size

```typescript
interface PathWidthMode {
  mode: 'hyperbolic' | 'screen' | 'proportional'
  baseWidth: number
}
```

## Highlighting and Selection

### Tile Highlighting

```typescript
interface TileHighlight {
  tile: Tile
  style: HighlightStyle
}

interface HighlightStyle {
  fillColor?: string
  strokeColor?: string
  strokeWidth?: number
  opacity?: number
  glow?: GlowEffect
  pulse?: PulseAnimation
}
```

### Selection States

```typescript
type SelectionState =
  | 'normal'
  | 'hovered'
  | 'selected'
  | 'disabled'
  | 'path-member'
  | 'path-start'
  | 'path-end'

interface TileStateStyles {
  [state: SelectionState]: Partial<TileStyle>
}
```

### Multi-Selection

```typescript
interface Selection {
  tiles: Set<Tile>
  mode: 'single' | 'multi' | 'path' | 'region'
}
```

## Annotations and Labels

### Text Labels

```typescript
interface TileLabel {
  tile: Tile
  text: string
  position: 'center' | 'above' | 'below'
  style: LabelStyle
}

interface LabelStyle {
  fontSize: number // Screen pixels or hyperbolic units
  fontFamily: string
  color: string
  backgroundColor?: string
  padding?: number
}
```

Text rendering in hyperbolic space is complex. Options:

1. **Screen-space text**: Render after projection (simple, readable)
2. **Hyperbolic text**: Text follows curvature (artistic, less readable)

### Icons and Markers

```typescript
interface TileMarker {
  tile: Tile
  icon: string | ImageData
  size: number
  anchor: 'center' | 'vertex' | 'edge'
  vertexIndex?: number
  edgeIndex?: number
}
```

## Layers and Compositing

### Layer System

```typescript
interface Layer {
  id: string
  name: string
  visible: boolean
  opacity: number
  blendMode: BlendMode
  zIndex: number
}

type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'add'

interface LayerContent {
  tiles?: TileStyle
  paths?: TilePath[]
  highlights?: TileHighlight[]
  labels?: TileLabel[]
  markers?: TileMarker[]
}
```

### Suggested Layer Order (bottom to top)

1. Background / boundary circle
2. Tile fills (possibly shrunk)
3. Tile edges
4. Path strokes
5. Highlights / selection
6. Labels and markers
7. UI overlays

## Animation

### Path Animation

```typescript
interface PathAnimation {
  path: TilePath
  duration: number
  easing: EasingFunction
  style: 'draw' | 'trace' | 'pulse' | 'flow'
}

// Draw: Path progressively appears
// Trace: Moving dot follows path
// Pulse: Path pulses with color/width
// Flow: Animated texture flows along path
```

### Tile Animation

```typescript
interface TileAnimation {
  tiles: Tile[]
  property: 'shrink' | 'opacity' | 'color' | 'rotation'
  from: number | string
  to: number | string
  duration: number
  easing: EasingFunction
  stagger?: number // Delay between tiles
}
```

### Camera Animation

```typescript
interface CameraAnimation {
  type: 'pan' | 'zoom' | 'focus'
  target?: HyperPoint | Tile
  duration: number
  easing: EasingFunction
}

// Focus: Smoothly center on a tile or point
```

## Dual Graph Visualization

The dual of a {p,q} tiling is a {q,p} tiling. Visualizing both:

```typescript
interface DualGraphStyle {
  showPrimal: boolean
  showDual: boolean
  primalStyle: TilingStyle
  dualStyle: TilingStyle
  dualOffset?: number // Vertical offset in 3D view
}
```

### Dual Graph Edges

Connect centers of adjacent tiles:

```typescript
function dualEdges(tiling: Tiling): Geodesic[] {
  const edges: Geodesic[] = []
  const seen = new Set<string>()

  for (const tile of tiling.tiles) {
    for (const neighbor of tile.neighbors) {
      if (!neighbor) continue
      const key = [tile.id, neighbor.id].sort().join('-')
      if (seen.has(key)) continue
      seen.add(key)

      edges.push(geodesicThrough(tile.center, neighbor.center))
    }
  }

  return edges
}
```

## Voronoi and Delaunay

For arbitrary point sets in hyperbolic space:

```typescript
interface HyperbolicVoronoi {
  sites: HyperPoint[]
  cells: VoronoiCell[]
  edges: Geodesic[]
}

interface VoronoiCell {
  site: HyperPoint
  vertices: HyperPoint[]
  neighbors: number[] // Indices of adjacent cells
}
```

## Heat Maps and Gradients

Color tiles based on values:

```typescript
interface HeatMap {
  values: Map<Tile, number>
  colorScale: ColorScale
  normalize: boolean
}

interface ColorScale {
  type: 'linear' | 'logarithmic' | 'discrete'
  colors: string[]
  domain?: [number, number]
}

function tileColor(tile: Tile, heatMap: HeatMap): string {
  const value = heatMap.values.get(tile) ?? 0
  return interpolateColor(heatMap.colorScale, value)
}
```

## Graph Algorithms Visualization

### BFS/DFS Traversal

```typescript
interface TraversalVisualization {
  algorithm: 'bfs' | 'dfs'
  start: Tile
  visitedStyle: TileStyle
  frontierStyle: TileStyle
  pathStyle: PathStyle
  speed: number // Tiles per second
}
```

### Shortest Path

```typescript
interface ShortestPathVisualization {
  start: Tile
  end: Tile
  path: Tile[]
  exploredStyle: TileStyle
  pathStyle: PathStyle
}
```

### Spanning Tree

```typescript
interface SpanningTreeVisualization {
  root: Tile
  edges: [Tile, Tile][]
  edgeStyle: PathStyle
}
```

## Integration with Tile Data

Tiles can carry arbitrary data:

```typescript
interface Tile<T = unknown> {
  // ... geometric properties
  data?: T
}

// Example: Cellular automata state
interface CAState {
  value: number
  generation: number
  history: number[]
}

// Example: Game entity
interface GameEntity {
  type: 'player' | 'enemy' | 'item'
  health?: number
  inventory?: string[]
}
```

Visualization adapts based on data:

```typescript
function tileStyleFromData<T>(
  tile: Tile<T>,
  styleFunction: (data: T) => Partial<TileStyle>,
): TileStyle {
  const baseStyle = defaultTileStyle()
  if (tile.data) {
    return { ...baseStyle, ...styleFunction(tile.data) }
  }
  return baseStyle
}
```

## Rendering Considerations

### Performance with Many Paths

For complex visualizations with many paths:

1. Batch paths by style
2. Use instanced rendering
3. Cull paths outside viewport
4. Level-of-detail for distant paths

### Z-Fighting Prevention

When multiple elements overlap:

1. Use layer system with explicit z-order
2. Small depth offsets in 3D rendering
3. Render order: back-to-front for transparency

### Anti-Aliasing

Hyperbolic arcs need careful anti-aliasing:

1. Subdivide arcs sufficiently
2. Use MSAA or FXAA
3. Consider signed distance field rendering for paths
