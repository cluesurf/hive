# 3D Hyperbolic Honeycomb Implementation Plan

Plan for implementing correct and optimized 3D hyperbolic honeycomb
rendering based on the Hyperbolic-Honeycombs reference.

## Goals

1. **Correctness**: Render mathematically accurate {p,q,r} honeycombs
2. **Generalization**: Support any hyperbolic {p,q,r}, not just {5,3,4}
3. **Performance**: GPU-accelerated ray marching for smooth rendering
4. **Integration**: Work with existing Three.js infrastructure

## Current State Analysis

### What We Have

The current implementation in
`test/site/routes/hyperbolic.3d.threejs.$p.$q.$r.tsx`:

- Uses explicit dodecahedron vertices (Euclidean)
- Places cells via BFS with Mobius addition
- Renders geodesic arcs as tube geometry
- Only produces {5,3,4}-like output regardless of parameters

### What We Need

- Coxeter group-based fundamental domain
- Hyperboloid model for internal computation
- Ray marching SDF for rendering
- Proper {p,q,r} parameterization

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      React Component                        │
│  hyperbolic.3d.threejs.$p.$q.$r.tsx                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Three.js Scene Setup                      │
│  - Camera (inside Poincare ball)                           │
│  - Controls (custom hyperbolic movement)                   │
│  - Lighting (ambient + point)                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Rendering Strategy                       │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   Full-Screen   │ OR │  Per-Cell Mesh  │                │
│  │   Ray Marching  │    │  with SDF Shader│                │
│  └─────────────────┘    └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     GLSL Shader Core                        │
│  - Minkowski inner product                                 │
│  - Coxeter mirror initialization                           │
│  - Fold4d (reflection loop)                                │
│  - Distance estimators (vertex, edge, face)                │
│  - KnightyDD distance conversion                           │
└─────────────────────────────────────────────────────────────┘
```

## Phase 1: Core Math in TypeScript

Create the mathematical foundation before shader work.

### 1.1 Minkowski Operations

Location: `code/math/minkowski.ts`

```typescript
export interface Vec4 {
  x: number
  y: number
  z: number
  w: number
}

// Minkowski inner product with signature (3,1)
export function hdot(a: Vec4, b: Vec4): number {
  return a.x * b.x + a.y * b.y + a.z * b.z - a.w * b.w
}

// Normalize a timelike vector
export function hnormalize(p: Vec4): Vec4 {
  const norm = Math.sqrt(-hdot(p, p))
  return { x: p.x / norm, y: p.y / norm, z: p.z / norm, w: p.w / norm }
}
```

### 1.2 Coxeter Group Initialization

Location: `code/honeycomb/coxeter.ts`

```typescript
export interface CoxeterGroup {
  mirrors: [Vec4, Vec4, Vec4, Vec4] // A, B, C, D
  vertex: Vec4 // Initial vertex v0
  schlafli: [number, number, number, number, number, number] // AB, AC, AD, BC, BD, CD
}

export function initCoxeterGroup(
  AB: number,
  AC: number,
  AD: number,
  BC: number,
  BD: number,
  CD: number,
  activeMirrors: [number, number, number, number],
): CoxeterGroup {
  // Compute mirrors A, B, C, D
  // Compute initial vertex from activeMirrors
}
```

### 1.3 Folding Algorithm

Location: `code/honeycomb/fold.ts`

```typescript
export function tryReflect(
  p: Vec4,
  n: Vec4,
): { reflected: Vec4; didReflect: boolean } {
  const k = hdot(p, n)
  if (k >= 0) return { reflected: p, didReflect: false }
  return {
    reflected: {
      x: p.x - 2 * k * n.x,
      y: p.y - 2 * k * n.y,
      z: p.z - 2 * k * n.z,
      w: p.w - 2 * k * n.w,
    },
    didReflect: true,
  }
}

export function fold4d(
  p: Vec4,
  mirrors: Vec4[],
  maxIter: number,
): { point: Vec4; converged: boolean } {
  // Iterate reflections until in fundamental domain
}
```

## Phase 2: GLSL Shader Implementation

Port the core math to GLSL for GPU rendering.

### 2.1 Vertex Shader

```glsl
varying vec3 vPosition;
varying vec3 vNormal;

void main() {
    vPosition = position;
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

### 2.2 Fragment Shader (Ray Marching)

Create `code/render/shaders/honeycomb.frag.glsl`:

```glsl
precision highp float;

uniform vec3 cameraPos;
uniform vec3 cameraDir;
uniform vec3 cameraUp;
uniform vec2 resolution;
uniform mat4 mirrors;      // 4 mirror normals as columns
uniform vec4 vertex0;      // Initial vertex
uniform float vertexSize;
uniform float edgeSize;
uniform int maxIterations;
uniform float clipRadius;

// ... (port all functions from reference)

void main() {
    // Ray direction from pixel coordinates
    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / resolution.y;
    vec3 rayDir = normalize(cameraDir + uv.x * cross(cameraDir, cameraUp) + uv.y * cameraUp);
    vec3 rayOrigin = cameraPos;

    // Ray march
    float t = 0.0;
    for (int i = 0; i < 200; i++) {
        vec3 p = rayOrigin + t * rayDir;
        float d = DE(p);
        if (d < 0.0001 || t > 10.0) break;
        t += d * 0.8;
    }

    // Shading
    if (t < 10.0) {
        vec3 p = rayOrigin + t * rayDir;
        vec3 color = baseColor(p, estimateNormal(p));
        gl_FragColor = vec4(color, 1.0);
    } else {
        gl_FragColor = vec4(0.1, 0.15, 0.2, 1.0);
    }
}
```

### 2.3 Three.js ShaderMaterial Integration

```typescript
const honeycombMaterial = new THREE.ShaderMaterial({
  uniforms: {
    cameraPos: { value: new THREE.Vector3() },
    cameraDir: { value: new THREE.Vector3() },
    cameraUp: { value: new THREE.Vector3(0, 1, 0) },
    resolution: { value: new THREE.Vector2() },
    mirrors: { value: new THREE.Matrix4() },
    vertex0: { value: new THREE.Vector4() },
    vertexSize: { value: 0.1 },
    edgeSize: { value: 0.05 },
    maxIterations: { value: 100 },
    clipRadius: { value: 0.999 },
  },
  vertexShader: vertexShaderSource,
  fragmentShader: fragmentShaderSource,
})
```

## Phase 3: Three.js Scene Setup

### 3.1 Full-Screen Quad Approach

For pure ray marching, render a full-screen quad:

```typescript
const geometry = new THREE.PlaneGeometry(2, 2)
const mesh = new THREE.Mesh(geometry, honeycombMaterial)
mesh.frustumCulled = false
scene.add(mesh)
```

### 3.2 Camera and Controls

Custom controls for hyperbolic movement:

```typescript
class HyperbolicControls {
  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
  ) {
    // Rotation: standard orbit
    // Translation: hyperbolic movement (boost along geodesic)
  }

  update() {
    // Update camera uniforms for shader
    this.material.uniforms.cameraPos.value.copy(this.camera.position)
    this.material.uniforms.cameraDir.value.copy(this.getViewDirection())
    this.material.uniforms.cameraUp.value.copy(this.camera.up)
  }
}
```

## Phase 4: Optimization

### 4.1 Early Ray Termination

Add sphere tracing optimizations:

```glsl
// Skip rays pointing away from ball
if (dot(rayDir, -normalize(rayOrigin)) < 0.0 && length(rayOrigin) > clipRadius) {
    discard;
}

// Adaptive step size based on distance to boundary
float adaptiveStep = d * (1.0 - length(p) * 0.5);
```

### 4.2 LOD Based on Distance

Reduce iterations for distant/small features:

```glsl
int dynamicIter = int(float(maxIterations) * (1.0 - length(p) * 0.8));
```

### 4.3 Tile Caching (Optional)

For very deep honeycombs, precompute cell transforms:

```typescript
interface CellCache {
  center: Vec4
  transform: Matrix4
  depth: number
}

function buildCellCache(maxDepth: number): CellCache[] {
  // BFS from origin, store transforms
}
```

## Phase 5: Interaction and Navigation

Ray marching supports full interactivity. The camera is just uniforms,
and we can query what's under the cursor.

### 5.1 Navigation Controls

Camera position and direction are shader uniforms updated each frame:

```typescript
class HyperbolicNavigationControls {
  private camera = {
    position: new THREE.Vector3(0, 0, 0),
    direction: new THREE.Vector3(0, 0, 1),
    up: new THREE.Vector3(0, 1, 0),
  }

  constructor(
    private material: THREE.ShaderMaterial,
    private domElement: HTMLElement,
  ) {
    this.bindEvents()
  }

  // Hyperbolic translation (boost along geodesic)
  moveForward(distance: number) {
    // In Poincare ball, movement uses Mobius transforms
    const p = this.camera.position.toArray() as [number, number, number]
    const d = this.camera.direction.toArray() as [
      number,
      number,
      number,
    ]

    // Mobius addition: new_pos = p ⊕ (d * tanh(distance/2))
    const t = Math.tanh(distance / 2)
    const translation = [d[0] * t, d[1] * t, d[2] * t] as [
      number,
      number,
      number,
    ]
    const newPos = mobiusAdd(p, translation)

    this.camera.position.fromArray(newPos)
    this.updateUniforms()
  }

  // Rotation (works like Euclidean)
  rotate(yaw: number, pitch: number) {
    const right = new THREE.Vector3().crossVectors(
      this.camera.direction,
      this.camera.up,
    )
    this.camera.direction.applyAxisAngle(this.camera.up, yaw)
    this.camera.direction.applyAxisAngle(right, pitch)
    this.camera.direction.normalize()
    this.updateUniforms()
  }

  updateUniforms() {
    this.material.uniforms.cameraPos.value.copy(this.camera.position)
    this.material.uniforms.cameraDir.value.copy(this.camera.direction)
    this.material.uniforms.cameraUp.value.copy(this.camera.up)
  }
}
```

### 5.2 Click Detection (Ray Picking)

To find what was clicked, run a single ray march on the CPU or GPU:

```typescript
interface HitResult {
  hit: boolean
  position: THREE.Vector3 // World position of hit
  hyperPosition: Vec4 // Position on hyperboloid
  distance: number // Ray distance
  featureType: 'vertex' | 'edge' | 'face' | 'none'
  cellId?: string // Identified cell (from fold count)
}

class HoneycombPicker {
  constructor(
    private coxeter: CoxeterGroup,
    private camera: {
      position: THREE.Vector3
      direction: THREE.Vector3
      up: THREE.Vector3
    },
  ) {}

  pick(
    screenX: number,
    screenY: number,
    resolution: THREE.Vector2,
  ): HitResult {
    // Convert screen coords to ray direction
    const uv = new THREE.Vector2(
      (screenX - 0.5 * resolution.x) / resolution.y,
      (screenY - 0.5 * resolution.y) / resolution.y,
    )

    const right = new THREE.Vector3().crossVectors(
      this.camera.direction,
      this.camera.up,
    )
    const rayDir = new THREE.Vector3()
      .copy(this.camera.direction)
      .add(right.multiplyScalar(uv.x))
      .add(this.camera.up.clone().multiplyScalar(uv.y))
      .normalize()

    // Ray march (CPU version)
    let t = 0
    const maxDist = 10
    const minDist = 0.0001

    for (let i = 0; i < 200; i++) {
      const p = new THREE.Vector3()
        .copy(this.camera.position)
        .add(rayDir.clone().multiplyScalar(t))

      const d = this.DE(p) // Distance estimator

      if (d < minDist) {
        // Hit! Determine what was hit
        return this.identifyHit(p)
      }

      t += d * 0.8
      if (t > maxDist) break
    }

    return {
      hit: false,
      position: new THREE.Vector3(),
      hyperPosition: { x: 0, y: 0, z: 0, w: 1 },
      distance: Infinity,
      featureType: 'none',
    }
  }

  private identifyHit(p: THREE.Vector3): HitResult {
    // Lift to hyperboloid
    const r = p.length()
    const q: Vec4 = {
      x: (2 * p.x) / (1 - r * r),
      y: (2 * p.y) / (1 - r * r),
      z: (2 * p.z) / (1 - r * r),
      w: (1 + r * r) / (1 - r * r),
    }

    // Fold to find which cell
    const { point: folded, foldCount } = fold4d(
      q,
      this.coxeter.mirrors,
      100,
    )

    // Check distances to features
    const dV = this.dVertex(folded, r)
    const dE = this.dEdges(folded, r)
    const dF = this.dFaces(folded, r)

    let featureType: 'vertex' | 'edge' | 'face' = 'face'
    if (dV < dE && dV < dF) featureType = 'vertex'
    else if (dE < dF) featureType = 'edge'

    return {
      hit: true,
      position: p,
      hyperPosition: q,
      distance: p.length(),
      featureType,
      cellId: this.computeCellId(foldCount),
    }
  }
}
```

### 5.3 Focus Animation (Fly To)

Animate camera toward a clicked cell:

```typescript
class CameraAnimator {
  private animation: {
    start: Vec3
    end: Vec3
    startTime: number
    duration: number
  } | null = null

  flyTo(target: THREE.Vector3, duration: number = 1000) {
    this.animation = {
      start: this.camera.position.clone(),
      end: target,
      startTime: performance.now(),
      duration,
    }
  }

  update() {
    if (!this.animation) return

    const elapsed = performance.now() - this.animation.startTime
    const t = Math.min(1, elapsed / this.animation.duration)

    // Ease function
    const ease = t * t * (3 - 2 * t) // smoothstep

    // Hyperbolic interpolation (geodesic path)
    const newPos = hyperbolicLerp(
      this.animation.start,
      this.animation.end,
      ease,
    )

    this.camera.position.copy(newPos)

    // Look toward target
    this.camera.direction
      .copy(this.animation.end)
      .sub(this.camera.position)
      .normalize()

    this.controls.updateUniforms()

    if (t >= 1) this.animation = null
  }
}

// Hyperbolic linear interpolation in Poincare ball
function hyperbolicLerp(
  a: THREE.Vector3,
  b: THREE.Vector3,
  t: number,
): THREE.Vector3 {
  // Use gyrovector interpolation (Mobius-based)
  const aArr = a.toArray() as [number, number, number]
  const bArr = b.toArray() as [number, number, number]

  // Compute -a ⊕ b (displacement from a to b)
  const negA = [-aArr[0], -aArr[1], -aArr[2]] as [
    number,
    number,
    number,
  ]
  const aToB = mobiusAdd(negA, bArr)

  // Scale the displacement by t
  const norm = Math.sqrt(aToB[0] ** 2 + aToB[1] ** 2 + aToB[2] ** 2)
  if (norm < 1e-10) return a.clone()

  // gyrospace scalar multiplication
  const atanh_norm = Math.atanh(norm)
  const new_norm = Math.tanh(t * atanh_norm)
  const scaled = [
    (aToB[0] * new_norm) / norm,
    (aToB[1] * new_norm) / norm,
    (aToB[2] * new_norm) / norm,
  ] as [number, number, number]

  // Add back to a
  const result = mobiusAdd(aArr, scaled)
  return new THREE.Vector3(...result)
}
```

### 5.4 Hover Highlighting

Highlight cells/features under the cursor:

```glsl
// In fragment shader
uniform vec4 highlightCell;  // Cell ID to highlight
uniform float highlightIntensity;

vec3 applyHighlight(vec3 color, vec4 cellId) {
    if (distance(cellId, highlightCell) < 0.1) {
        return mix(color, vec3(1.0, 0.9, 0.7), highlightIntensity);
    }
    return color;
}
```

```typescript
// Update on mouse move
domElement.addEventListener('mousemove', e => {
  const hit = picker.pick(e.clientX, e.clientY, resolution)
  if (hit.hit) {
    material.uniforms.highlightCell.value.set(
      hit.hyperPosition.x,
      hit.hyperPosition.y,
      hit.hyperPosition.z,
      hit.hyperPosition.w,
    )
    material.uniforms.highlightIntensity.value = 0.3
  } else {
    material.uniforms.highlightIntensity.value = 0
  }
})
```

### 5.5 Cell Selection State

Track selected cells for multi-select:

```typescript
interface SelectionState {
  selectedCells: Set<string>
  focusedCell: string | null
}

class CellSelector {
  private state: SelectionState = {
    selectedCells: new Set(),
    focusedCell: null,
  }

  toggle(cellId: string) {
    if (this.state.selectedCells.has(cellId)) {
      this.state.selectedCells.delete(cellId)
    } else {
      this.state.selectedCells.add(cellId)
    }
    this.updateShader()
  }

  focus(cellId: string) {
    this.state.focusedCell = cellId
    this.animator.flyTo(this.getCellCenter(cellId))
  }

  // Pass selection to shader as texture or uniform array
  updateShader() {
    // For small selections, use uniform array
    // For large selections, use a lookup texture
  }
}
```

### 5.6 Keyboard Navigation

Navigate between cells using keyboard:

```typescript
class KeyboardNavigator {
  constructor(
    private coxeter: CoxeterGroup,
    private camera: CameraAnimator,
    private selector: CellSelector,
  ) {
    window.addEventListener('keydown', this.onKeyDown.bind(this))
  }

  onKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
        this.moveToNeighbor('forward')
        break
      case 'ArrowDown':
      case 's':
        this.moveToNeighbor('backward')
        break
      case 'ArrowLeft':
      case 'a':
        this.moveToNeighbor('left')
        break
      case 'ArrowRight':
      case 'd':
        this.moveToNeighbor('right')
        break
      case 'Enter':
      case ' ':
        this.enterCurrentCell()
        break
      case 'Escape':
        this.exitToParent()
        break
    }
  }

  moveToNeighbor(direction: 'forward' | 'backward' | 'left' | 'right') {
    // Compute neighbor cell in the given direction
    // based on current camera orientation and cell structure
  }
}
```

## Phase 6: Visual Enhancements

### 6.1 Coloring Options

- **Orbit coloring**: Color by fold iteration count
- **Depth coloring**: Color by distance from origin
- **Edge coloring**: Different colors for A, B, C, D edges

### 6.2 Rendering Modes

- **Vertices only**: Show balls at vertices
- **Edges only**: Show tubes along edges
- **Faces**: Show cell faces as sheets
- **Combined**: All features with transparency

### 6.3 Ambient Occlusion

Add soft shadows for depth perception:

```glsl
float calcAO(vec3 pos, vec3 nor) {
    float occ = 0.0;
    float sca = 1.0;
    for (int i = 0; i < 5; i++) {
        float h = 0.01 + 0.12 * float(i) / 4.0;
        float d = DE(pos + h * nor);
        occ += (h - d) * sca;
        sca *= 0.95;
    }
    return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}
```

## File Structure

```
code/
├── honeycomb/
│   ├── index.ts
│   ├── coxeter.ts           # Coxeter group initialization
│   ├── fold.ts              # Folding algorithm
│   ├── distance.ts          # Distance estimators
│   └── schlafli.ts          # {p,q,r} parameter handling
├── math/
│   ├── minkowski.ts         # Minkowski space operations
│   └── matrix4-minkowski.ts # 4x4 Lorentz transforms
└── render/
    ├── shaders/
    │   ├── honeycomb.vert.glsl
    │   ├── honeycomb.frag.glsl
    │   └── common.glsl      # Shared functions
    ├── honeycomb-material.ts
    └── hyperbolic-controls.ts

test/site/routes/
└── hyperbolic.3d.threejs.$p.$q.$r.tsx  # Updated component
```

## Testing Strategy

### Unit Tests

1. Minkowski operations: hdot, hnormalize
2. Coxeter initialization: mirror angles, vertex computation
3. Folding: convergence, reflection correctness

### Visual Tests

1. Compare {5,3,4} output with reference images
2. Test edge cases: {3,3,6}, {4,4,4}, {6,3,3}
3. Camera movement: verify no visual artifacts

### Performance Tests

1. FPS at different resolutions
2. Iteration count impact
3. Memory usage

## Migration Steps

1. **Keep old code**: Rename to `hyperbolic.3d.threejs.legacy.tsx`
2. **Implement shader version**: New file with same route
3. **Compare outputs**: Ensure new is correct
4. **Remove legacy**: Once validated

## Timeline

| Phase | Tasks                      | Priority |
| ----- | -------------------------- | -------- |
| 1     | TypeScript math core       | High     |
| 2     | GLSL shader port           | High     |
| 3     | Three.js integration       | High     |
| 4     | Optimization               | Medium   |
| 5     | Interaction and navigation | Medium   |
| 6     | Visual enhancements        | Low      |

## Open Questions

1. **Camera inside vs outside**: Reference supports both. Start with
   inside view.
2. **Upper half-space model**: Reference supports this too. Add later.
3. **Face rendering**: Optional, start with vertices and edges only.
4. **Mobile support**: WebGL 1.0 compatibility may limit shader
   complexity.

## References

- `note/honeycomb-3d-theory.md` - Mathematical theory
- `note/theory.md` - General hyperbolic math
- `base/Hyperbolic-Honeycombs-main/` - Reference implementation
