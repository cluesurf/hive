# Layer Separation: Computation vs Rendering

Package: `@cluesurf/hive`

The library is designed with strict separation between computational
geometry and visualization. The core can run in Node.js, Web Workers, or
any JavaScript environment without any rendering dependencies.

All internal imports use `@/` which maps to `./code/*`.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Application                           │
├─────────────────────────────────────────────────────────┤
│                  Rendering Layer                         │
│         (Three.js, Canvas 2D, SVG, WebGL)               │
│                    OPTIONAL                              │
├─────────────────────────────────────────────────────────┤
│                  Adapter Layer                           │
│     (Converts core objects to renderer format)          │
├─────────────────────────────────────────────────────────┤
│                    Core Layer                            │
│         (Pure math, no rendering dependencies)          │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Points  │ │ Geodesics│ │  Tiles   │ │ Tilings  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Matrices │ │  Groups  │ │  Paths   │ │   CA     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Core Layer (No Dependencies)

Pure TypeScript/JavaScript. No DOM, no WebGL, no Three.js.

### Module: `@/form`

```typescript
// Pure data types - plain objects or simple classes
export interface HyperPoint {
  x: number
  y: number
  t: number
}

export interface Geodesic {
  normal: HyperPoint
}

export interface Polygon {
  vertices: HyperPoint[]
  center: HyperPoint
}

export interface Tile {
  id: string
  polygon: Polygon
  transform: Matrix3
  neighbors: (Tile | null)[]
  data?: unknown
}

export interface Tiling {
  config: TilingConfig
  tiles: Map<string, Tile>
  baseTile: Tile
}

export interface Path {
  tiles: Tile[]
  waypoints: HyperPoint[]
}
```

### Module: `@/math`

```typescript
// Pure functions - no side effects, no state
export function minkowskiDot(a: HyperPoint, b: HyperPoint): number
export function distance(a: HyperPoint, b: HyperPoint): number
export function normalize(p: HyperPoint): HyperPoint
export function hlerp(
  a: HyperPoint,
  b: HyperPoint,
  t: number,
): HyperPoint

export function geodesicThrough(a: HyperPoint, b: HyperPoint): Geodesic
export function reflect(
  point: HyperPoint,
  geodesic: Geodesic,
): HyperPoint

export function rotation(angle: number): Matrix3
export function translation(
  distance: number,
  direction: number,
): Matrix3
export function compose(...matrices: Matrix3[]): Matrix3
export function applyMatrix(m: Matrix3, p: HyperPoint): HyperPoint
```

### Module: `@/tiling`

```typescript
// Tiling generation - returns plain data structures
export function generateTiling(config: TilingConfig): Tiling
export function expandTiling(tiling: Tiling, count: number): void
export function getTileAt(
  tiling: Tiling,
  point: HyperPoint,
): Tile | null
export function getNeighbors(tile: Tile): Tile[]
export function shortestPath(from: Tile, to: Tile): Tile[]
```

### Module: `@/model`

```typescript
// Model conversions - pure functions
export function toPoincare(p: HyperPoint): [number, number]
export function fromPoincare(x: number, y: number): HyperPoint
export function toKlein(p: HyperPoint): [number, number]
export function fromKlein(x: number, y: number): HyperPoint
export function toBall3D(p: HyperPoint3D): [number, number, number]
```

### Module: `@/group`

```typescript
// Group theory for infinite tilings
export interface GroupElement {
  chain: { gen: 'a' | 'b'; pow: number }[]
}

export function multiply(a: GroupElement, b: GroupElement): GroupElement
export function inverse(g: GroupElement): GroupElement
export function toMatrix(g: GroupElement, p: number, q: number): Matrix3
export function neighbors(
  g: GroupElement,
  p: number,
  q: number,
): GroupElement[]
```

### Module: `@/ca`

```typescript
// Cellular automata on tilings
export interface Field<T> {
  get(tile: Tile): T | undefined
  set(tile: Tile, value: T): void
  entries(): Iterable<[Tile, T]>
}

export interface Rule {
  states: number
  transition(center: number, neighbors: number[]): number
}

export function step(
  field: Field<number>,
  tiling: Tiling,
  rule: Rule,
): Field<number>
export function run(
  field: Field<number>,
  tiling: Tiling,
  rule: Rule,
  steps: number,
): Field<number>[]
```

## Adapter Layer

Converts core objects to renderer-specific formats.

### Module: `@/adapter-three`

```typescript
import * as THREE from 'three'
import { Tiling, Tile, Path, HyperPoint } from '@cluesurf/hive'

// Convert tiling to Three.js geometry
export function tilingToGeometry(
  tiling: Tiling,
  options?: {
    shrinkFactor?: number
    model?: 'poincare' | 'klein' | 'ball'
  },
): THREE.BufferGeometry

// Convert path to Three.js line
export function pathToLine(
  path: Path,
  options?: {
    width?: number
    model?: 'poincare' | 'klein'
  },
): THREE.Line | THREE.Mesh

// Convert tile to mesh
export function tileToMesh(
  tile: Tile,
  options?: TileMeshOptions,
): THREE.Mesh

// Create Three.js scene from tiling
export function createScene(
  tiling: Tiling,
  options?: SceneOptions,
): THREE.Scene
```

### Module: `@/adapter-canvas`

```typescript
import { Tiling, Tile, Path } from '@cluesurf/hive'

export interface CanvasRenderer {
  ctx: CanvasRenderingContext2D

  clear(): void
  drawTiling(tiling: Tiling, style?: TilingStyle): void
  drawTile(tile: Tile, style?: TileStyle): void
  drawPath(path: Path, style?: PathStyle): void
  drawPoint(point: HyperPoint, style?: PointStyle): void
}

export function createCanvasRenderer(
  canvas: HTMLCanvasElement,
): CanvasRenderer
```

### Module: `@/adapter-svg`

```typescript
import { Tiling, Path } from '@cluesurf/hive'

export function tilingToSVG(
  tiling: Tiling,
  options?: SVGOptions,
): string
export function pathToSVGPath(path: Path, options?: PathOptions): string
export function exportSVG(tiling: Tiling, filename: string): void
```

## Rendering Layer

Optional. Only needed for visualization.

### Module: `@/render-three`

```typescript
import * as THREE from 'three'
import { Tiling } from '@cluesurf/hive'
import { tilingToGeometry } from '@cluesurf/hive/render/three'

export class HyperbolicScene {
  scene: THREE.Scene
  camera: THREE.Camera
  renderer: THREE.WebGLRenderer

  constructor(container: HTMLElement, options?: SceneOptions)

  setTiling(tiling: Tiling): void
  addPath(path: Path, style?: PathStyle): void

  // Camera controls
  pan(dx: number, dy: number): void
  zoom(factor: number): void

  // Animation
  animate(callback?: () => void): void

  dispose(): void
}
```

## Usage Examples

### Computation Only (Node.js)

```typescript
import { generateTiling, shortestPath } from '@cluesurf/hive'
import { step } from '@cluesurf/hive'

// Generate tiling
const tiling = generateTiling({ p: 7, q: 3, maxTiles: 1000 })

// Find path between tiles
const path = shortestPath(tiling.baseTile, someTile)
console.log(`Path length: ${path.length}`)

// Run cellular automaton
const initialField = new Map([[tiling.baseTile, 1]])
const rule = {
  states: 2,
  transition: (c, n) => (n.filter(x => x).length === 2 ? 1 : 0),
}
const history = run(initialField, tiling, rule, 100)

// Serialize results
const json = JSON.stringify({
  tiles: Array.from(tiling.tiles.values()).map(serializeTile),
  path: path.map(t => t.id),
  caHistory: history.map(f => Array.from(f.entries())),
})
```

### With Visualization (Browser)

```typescript
import { generateTiling } from '@cluesurf/hive'
import { HyperbolicScene } from '@cluesurf/hive/render/three'

// Same computation
const tiling = generateTiling({ p: 7, q: 3, maxTiles: 1000 })

// Add visualization
const scene = new HyperbolicScene(document.getElementById('canvas'))
scene.setTiling(tiling)
scene.animate()
```

### Server-Side Rendering

```typescript
import { generateTiling } from '@cluesurf/hive'
import { tilingToSVG } from '@cluesurf/hive/render/svg'
import { writeFileSync } from 'fs'

const tiling = generateTiling({ p: 5, q: 4, maxTiles: 500 })
const svg = tilingToSVG(tiling, { width: 800, height: 800 })
writeFileSync('tiling.svg', svg)
```

### Web Worker Computation

```typescript
// worker.ts
import { generateTiling, expandTiling } from '@cluesurf/hive'

self.onmessage = e => {
  const { config, targetTiles } = e.data
  const tiling = generateTiling(config)

  while (tiling.tiles.size < targetTiles) {
    expandTiling(tiling, 100)
    // Report progress
    self.postMessage({ type: 'progress', count: tiling.tiles.size })
  }

  // Send serializable result
  self.postMessage({
    type: 'complete',
    tiles: serializeTiling(tiling),
  })
}

// main.ts
const worker = new Worker('./worker.ts')
worker.onmessage = e => {
  if (e.data.type === 'complete') {
    const tiling = deserializeTiling(e.data.tiles)
    scene.setTiling(tiling)
  }
}
worker.postMessage({ config: { p: 7, q: 3 }, targetTiles: 10000 })
```

## Serialization

Core objects are plain data, easily serializable:

```typescript
// Serialize
function serializeTiling(tiling: Tiling): string {
  return JSON.stringify({
    config: tiling.config,
    tiles: Array.from(tiling.tiles.values()).map(tile => ({
      id: tile.id,
      center: tile.polygon.center,
      vertices: tile.polygon.vertices,
      transform: tile.transform,
      neighborIds: tile.neighbors.map(n => n?.id ?? null),
    })),
  })
}

// Deserialize
function deserializeTiling(json: string): Tiling {
  const data = JSON.parse(json)
  // Reconstruct tiles and neighbor references
}
```

## Benefits of This Separation

1. **Testable**: Core logic tested without browser/WebGL
2. **Portable**: Run in Node.js, Workers, Deno, etc.
3. **Cacheable**: Serialize computed tilings, load later
4. **Parallel**: Heavy computation in Workers
5. **Flexible**: Swap renderers without changing core
6. **Lightweight**: Import only what you need
7. **Debuggable**: Inspect plain objects easily

## Module Dependencies

All modules are part of the single `@cluesurf/hive` package. Internal
imports use the `@/` alias which maps to `./code/*`.

```
@/form     → (none)
@/math     → @/form
@/model    → @/form, @/math
@/tiling   → @/form, @/math
@/group    → @/form, @/math
@/ca       → @/form, @/tiling
@/camera   → @/form, @/math, @/model
@/interact → @/form, @/tiling, @/camera (+ DOM optionally)

@/render/three  → @/form, @/model, @/camera, three
@/render/canvas → @/form, @/model
@/render/svg    → @/form, @/model
```

The form/math/model/tiling/group/ca modules have zero external
dependencies. Only the render modules import Three.js or browser APIs.
