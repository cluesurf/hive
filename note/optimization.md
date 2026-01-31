# Optimization Strategy

The library needs to be fast for:

1. Core calculations (pure math)
2. 2D rendering (Canvas, WebGL)
3. 3D rendering (WebGL/Three.js)

This document covers optimization strategies with trade-offs.

## Decisions (Chosen Approaches)

- **Data Layout**: Hybrid (objects for API, typed arrays for batch/GPU)
- **Rendering**: Strategy 3 (Instanced Rendering) as primary approach
- **Caching**: Full caching for transforms and geometry with LRU eviction
- **Precision**: Float64 for internal math, Float32 for GPU buffers

## Data Layout: Arrays vs Objects

### Option 1: Plain Objects

```typescript
interface HyperPoint {
  x: number
  y: number
  t: number
}

function distance(a: HyperPoint, b: HyperPoint): number {
  return Math.acosh(-(a.x * b.x + a.y * b.y - a.t * b.t))
}
```

**Pros:**

- Readable, debuggable
- Easy to serialize (JSON)
- Works everywhere

**Cons:**

- Object allocation overhead
- Not GPU-friendly
- Cache unfriendly for large arrays

### Option 2: Typed Arrays (Float32Array/Float64Array)

```typescript
// Point as 3 consecutive floats
type HyperPointArray = Float64Array // length 3

function distance(a: Float64Array, b: Float64Array): number {
  return Math.acosh(-(a[0] * b[0] + a[1] * b[1] - a[2] * b[2]))
}

// Many points packed together
class PointBuffer {
  data: Float64Array
  count: number

  constructor(capacity: number) {
    this.data = new Float64Array(capacity * 3)
    this.count = 0
  }

  getX(i: number): number {
    return this.data[i * 3]
  }
  getY(i: number): number {
    return this.data[i * 3 + 1]
  }
  getT(i: number): number {
    return this.data[i * 3 + 2]
  }

  set(i: number, x: number, y: number, t: number) {
    const offset = i * 3
    this.data[offset] = x
    this.data[offset + 1] = y
    this.data[offset + 2] = t
  }
}
```

**Pros:**

- Cache-friendly (contiguous memory)
- Directly uploadable to GPU
- Lower memory overhead
- SIMD-friendly (future)

**Cons:**

- Less readable
- Index math errors
- Float32 loses precision for deep zoom

### Option 3: Hybrid Approach

```typescript
// High-level API uses objects
interface HyperPoint {
  x: number
  y: number
  t: number
}

// Internal/batch operations use typed arrays
class TilingGeometry {
  // Packed vertex data for GPU
  positions: Float32Array // [x,y,t, x,y,t, ...]
  transforms: Float32Array // [m00,m01,m02, m10,m11,m12, m20,m21,m22, ...]

  // Convert object to array position
  static packPoint(p: HyperPoint, arr: Float32Array, offset: number) {
    arr[offset] = p.x
    arr[offset + 1] = p.y
    arr[offset + 2] = p.t
  }

  // Convert array position to object
  static unpackPoint(arr: Float32Array, offset: number): HyperPoint {
    return { x: arr[offset], y: arr[offset + 1], t: arr[offset + 2] }
  }
}
```

**Recommendation:** Hybrid. Use objects for API clarity, typed arrays
for batch operations and GPU upload.

## Matrix Operations

### CPU: Pre-allocated Output

Avoid allocating matrices on every operation:

```typescript
// Bad: allocates new array each time
function multiply(a: Matrix3, b: Matrix3): Matrix3 {
  return [
    a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
    // ... 8 more values
  ]
}

// Good: write to pre-allocated output
function multiply(a: Matrix3, b: Matrix3, out: Matrix3): Matrix3 {
  out[0] = a[0] * b[0] + a[1] * b[3] + a[2] * b[6]
  // ...
  return out
}

// Usage with reusable temps
const temp1: Matrix3 = new Float64Array(9)
const temp2: Matrix3 = new Float64Array(9)
multiply(a, b, temp1)
multiply(temp1, c, temp2)
```

### GPU: Uniform Matrices

Upload transformation matrices as uniforms:

```glsl
// Vertex shader
uniform mat3 uCameraTransform;
uniform mat3 uTileTransform;

attribute vec3 aPosition;  // Hyperboloid coords

void main() {
  vec3 worldPos = uTileTransform * aPosition;
  vec3 viewPos = uCameraTransform * worldPos;
  // Project to Poincare...
}
```

## Rendering Strategies

### Strategy 1: CPU Geometry, GPU Rasterization

Generate all geometry on CPU, upload vertex buffers, GPU just draws.

```typescript
// CPU: Generate all tile vertices
const vertices: Float32Array = new Float32Array(
  tileCount * vertsPerTile * 3,
)
for (const tile of tiles) {
  for (const vertex of tile.vertices) {
    // Pack into array
  }
}

// Upload once
const buffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

// GPU: Simple pass-through shader
```

**Pros:**

- Simple shaders
- Full control over geometry
- Easy hit testing (have all vertices)

**Cons:**

- Limited by tile count
- Must regenerate on camera move (or transform in shader)
- Memory for all vertices

### Strategy 2: GPU Geometry (Shader-Based Tiling)

Compute tiling entirely in fragment shader (like
hyperbolic-tiling-main).

```glsl
// Fragment shader
uniform float uP, uQ;  // Tiling parameters
uniform mat3 uCamera;

void main() {
  // Get fragment position in Poincare disk
  vec2 pos = (gl_FragCoord.xy / uResolution) * 2.0 - 1.0;

  // Convert to hyperboloid
  vec3 h = poincareToHyperboloid(pos);

  // Apply camera
  h = uCamera * h;

  // Find which tile we're in by repeated reflections
  int tileId = 0;
  for (int i = 0; i < MAX_REFLECTIONS; i++) {
    // Reflect across nearest edge until in fundamental domain
  }

  // Color based on tile
  gl_FragColor = getTileColor(tileId);
}
```

**Pros:**

- Infinite zoom, no tile limit
- Smooth camera movement
- No geometry upload

**Cons:**

- No tile topology (can't query neighbors)
- No hit testing
- Complex shader math
- Per-pixel computation (expensive)

### Strategy 3: Hybrid (Instanced Rendering)

Render one tile mesh, instance it with per-tile transforms.

```typescript
// CPU: One base tile geometry
const baseTileVertices = createBaseTileGeometry(p)

// Per-tile transforms as instance attributes
const transforms = new Float32Array(tileCount * 9) // 3x3 matrices
for (let i = 0; i < tiles.length; i++) {
  packMatrix(tiles[i].transform, transforms, i * 9)
}

// GPU: Instanced draw
gl.drawArraysInstanced(gl.TRIANGLES, 0, vertexCount, tileCount)
```

```glsl
// Vertex shader with instancing
attribute vec3 aPosition;         // Base tile vertex
attribute mat3 aTransform;        // Per-instance transform (as 3 vec3s)

void main() {
  vec3 worldPos = aTransform * aPosition;
  // Project...
}
```

**Pros:**

- Efficient for many similar tiles
- Explicit tile data (can query)
- Transform updates don't require geometry regeneration

**Cons:**

- Still limited by tile count
- Instance attribute setup complexity

### Strategy 4: Compute Shader (WebGPU)

Use compute shaders for geometry generation.

```wgsl
// WebGPU compute shader
@compute @workgroup_size(64)
fn generateTiles(@builtin(global_invocation_id) id: vec3<u32>) {
  let tileIdx = id.x;
  // Generate tile vertices in parallel
  // Write to storage buffer
}
```

**Pros:**

- Massive parallelism
- GPU-native data
- Future-proof

**Cons:**

- WebGPU not yet universal
- Complex pipeline
- Debugging harder

## Recommended Architecture

### For Poincare Disk (2D)

```
┌─────────────────────────────────────────────────────────┐
│                        Tiling                            │
│  (CPU: tile generation, adjacency, paths)               │
├─────────────────────────────────────────────────────────┤
│                   Geometry Buffer                        │
│  (Float32Arrays: positions, transforms, colors)         │
├─────────────────────────────────────────────────────────┤
│                    WebGL Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │  Tile Renderer  │  │  Path Renderer  │              │
│  │  (instanced)    │  │  (line strips)  │              │
│  └─────────────────┘  └─────────────────┘              │
│           │                    │                        │
│           ▼                    ▼                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Unified Shader                      │   │
│  │  - Hyperboloid → Poincare projection            │   │
│  │  - Camera transform                              │   │
│  │  - Per-tile/path styling                         │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### For 3D Hyperbolic (Ball Model)

```
┌─────────────────────────────────────────────────────────┐
│                     Honeycomb                            │
│  (CPU: cell generation, face adjacency)                 │
├─────────────────────────────────────────────────────────┤
│                   Geometry Buffer                        │
│  (positions, normals, per-cell transforms)              │
├─────────────────────────────────────────────────────────┤
│                  Three.js Layer                          │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │ InstancedMesh   │  │  Custom Shader  │              │
│  │ (one polyhedron)│  │  (hyperbolic    │              │
│  │                 │  │   lighting)     │              │
│  └─────────────────┘  └─────────────────┘              │
└─────────────────────────────────────────────────────────┘
```

## Shader Code Organization

### Shared GLSL Functions

```glsl
// code/render/shaders/common.glsl

// Hyperboloid operations
float minkowskiDot(vec3 a, vec3 b) {
  return a.x * b.x + a.y * b.y - a.z * b.z;
}

vec3 hyperNormalize(vec3 p) {
  float n = sqrt(abs(minkowskiDot(p, p)));
  return p / n;
}

float hyperDistance(vec3 a, vec3 b) {
  return acosh(abs(minkowskiDot(a, b)));
}

// Model conversions
vec2 toPoincare(vec3 p) {
  return p.xy / (1.0 + p.z);
}

vec3 fromPoincare(vec2 p) {
  float sq = dot(p, p);
  return vec3(2.0 * p / (1.0 - sq), (1.0 + sq) / (1.0 - sq));
}

// Transformations
vec3 applyTransform(mat3 m, vec3 p) {
  return m * p;
}
```

### Tile Vertex Shader

```glsl
// code/render/shaders/tile.vert

attribute vec3 aPosition;       // Base tile vertex (hyperboloid)
attribute vec3 aTransformRow0;  // Instance transform row 0
attribute vec3 aTransformRow1;  // Instance transform row 1
attribute vec3 aTransformRow2;  // Instance transform row 2
attribute vec4 aColor;          // Instance color

uniform mat3 uCamera;
uniform float uShrink;          // Tile shrink factor

varying vec4 vColor;
varying vec2 vPoincare;

void main() {
  // Reconstruct transform matrix
  mat3 transform = mat3(aTransformRow0, aTransformRow1, aTransformRow2);

  // Apply tile transform
  vec3 worldPos = transform * aPosition;

  // Apply shrink (toward tile center)
  if (uShrink < 1.0) {
    vec3 center = transform * vec3(0.0, 0.0, 1.0);  // Origin in hyperboloid
    worldPos = mix(center, worldPos, uShrink);
    worldPos = hyperNormalize(worldPos);
  }

  // Apply camera
  vec3 viewPos = uCamera * worldPos;

  // Project to Poincare disk
  vec2 poincare = toPoincare(viewPos);
  vPoincare = poincare;

  // Output position (Poincare coords mapped to clip space)
  gl_Position = vec4(poincare, 0.0, 1.0);
  vColor = aColor;
}
```

### Tile Fragment Shader

```glsl
// code/render/shaders/tile.frag

precision highp float;

varying vec4 vColor;
varying vec2 vPoincare;

uniform float uBoundaryRadius;  // Clip at disk boundary

void main() {
  // Discard outside Poincare disk
  if (length(vPoincare) > uBoundaryRadius) {
    discard;
  }

  gl_FragColor = vColor;
}
```

## Performance Benchmarks to Target

| Operation           | Target | Notes                   |
| ------------------- | ------ | ----------------------- |
| Generate 1000 tiles | < 50ms | CPU, initial generation |
| Render 10,000 tiles | 60 FPS | Instanced, static       |
| Camera pan/zoom     | 60 FPS | Only update uniform     |
| Hit test            | < 1ms  | Spatial index           |
| Path highlight      | < 5ms  | Update instance colors  |

## Memory Layout for GPU

### Vertex Buffer Layout

```typescript
// Interleaved vertex data for one tile
// Stride: 6 floats per vertex (position + normal)
const VERTEX_STRIDE = 6 * 4 // 24 bytes

// Or separate buffers:
const positions = new Float32Array(vertexCount * 3)
const normals = new Float32Array(vertexCount * 3)
```

### Instance Buffer Layout

```typescript
// Per-tile instance data
// mat3 (9 floats) + color (4 floats) = 13 floats = 52 bytes per tile
const INSTANCE_STRIDE = 13 * 4

const instanceData = new Float32Array(tileCount * 13)
// Layout: [m00,m01,m02, m10,m11,m12, m20,m21,m22, r,g,b,a, ...]
```

## Caching Strategies

### Transform Cache

Cache frequently used matrices:

```typescript
class TransformCache {
  private cache = new Map<string, Matrix3>()

  get(key: string): Matrix3 | undefined {
    return this.cache.get(key)
  }

  set(key: string, matrix: Matrix3) {
    this.cache.set(key, matrix)
  }

  // LRU eviction for memory management
  evictOldest(maxSize: number) {
    while (this.cache.size > maxSize) {
      const oldest = this.cache.keys().next().value
      this.cache.delete(oldest)
    }
  }
}
```

### Geometry Cache

Don't regenerate static geometry:

```typescript
class GeometryCache {
  private basePolygons = new Map<string, Float32Array>()

  getBasePolygon(p: number, q: number): Float32Array {
    const key = `${p},${q}`
    if (!this.basePolygons.has(key)) {
      this.basePolygons.set(key, generateBasePolygon(p, q))
    }
    return this.basePolygons.get(key)!
  }
}
```

### Distance Cache

Cache computed distances for pathfinding:

```typescript
class DistanceCache {
  private cache = new Map<string, number>()

  private key(a: string, b: string): string {
    return a < b ? `${a}:${b}` : `${b}:${a}`
  }

  get(tileA: string, tileB: string): number | undefined {
    return this.cache.get(this.key(tileA, tileB))
  }

  set(tileA: string, tileB: string, distance: number) {
    this.cache.set(this.key(tileA, tileB), distance)
  }
}
```

### Projection Cache

Cache model conversions for frequently accessed points:

```typescript
class ProjectionCache {
  private hyperToPoincare = new Map<string, Complex>()
  private precision = 1e-6

  private quantize(p: HyperPoint): string {
    const x = Math.round(p.x / this.precision)
    const y = Math.round(p.y / this.precision)
    const t = Math.round(p.t / this.precision)
    return `${x},${y},${t}`
  }

  toPoincare(p: HyperPoint): Complex {
    const key = this.quantize(p)
    if (!this.hyperToPoincare.has(key)) {
      this.hyperToPoincare.set(key, hyperboloidToPoincare(p))
    }
    return this.hyperToPoincare.get(key)!
  }
}
```

### Shader Uniform Pool

Minimize uniform updates by batching:

```typescript
class UniformPool {
  private dirty = new Set<string>()
  private values = new Map<string, number | Float32Array>()

  set(name: string, value: number | Float32Array) {
    this.values.set(name, value)
    this.dirty.add(name)
  }

  flush(gl: WebGLRenderingContext, program: WebGLProgram) {
    for (const name of this.dirty) {
      const location = gl.getUniformLocation(program, name)
      const value = this.values.get(name)
      if (typeof value === 'number') {
        gl.uniform1f(location, value)
      } else if (value) {
        gl.uniformMatrix3fv(location, false, value)
      }
    }
    this.dirty.clear()
  }
}
```

## Float32 vs Float64

### When to Use Float32

- GPU buffers (WebGL only supports Float32)
- Large arrays where memory matters
- Coordinates already in Poincare disk (bounded -1 to 1)

### When to Use Float64

- Core calculations (hyperboloid coordinates can grow large)
- Deep zoom (precision matters)
- Serialization (preserve full precision)

```typescript
// Internal: Float64 for precision
const center: HyperPoint = {
  x: 1.4142135623730951, // Full precision
  y: 0,
  t: 1.7320508075688772,
}

// GPU upload: downcast to Float32
const gpuBuffer = new Float32Array([
  Math.fround(center.x),
  Math.fround(center.y),
  Math.fround(center.t),
])
```

## Summary of Recommendations

1. **API Layer**: Plain objects for clarity
2. **Internal Math**: Float64 typed arrays with pre-allocation
3. **GPU Data**: Float32 interleaved or separate buffers
4. **Rendering**: Instanced rendering for tiles, line strips for paths
5. **Shaders**: Shared GLSL library for hyperbolic math
6. **Caching**: Transform and geometry caches with LRU eviction
7. **Updates**: Minimize buffer uploads, use uniforms for camera
