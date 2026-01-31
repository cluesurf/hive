# Dependencies and Three.js Integration

## The Three.js Question

Three.js provides excellent scene management, camera controls, and
rendering infrastructure. The question is how hyperbolic geometry
integrates with it.

### What Three.js Gives Us

1. **Scene Graph** - Hierarchical object management
2. **Cameras** - PerspectiveCamera, OrthographicCamera, controls
3. **Renderers** - WebGLRenderer with all the optimizations
4. **Geometries** - BufferGeometry for custom shapes
5. **Materials** - Shaders, textures, lighting
6. **Controls** - OrbitControls, TrackballControls, etc.
7. **Math** - Vector2, Vector3, Matrix3, Matrix4, Quaternion
8. **Animation** - AnimationMixer, requestAnimationFrame integration
9. **Post-processing** - EffectComposer, various passes

### The Challenge

Three.js works in Euclidean 3D space. Hyperbolic space is fundamentally
different:

- Geodesics are curves, not straight lines
- Distances scale non-linearly
- The Poincare disk is a 2D projection of infinite space

### Integration Approaches

#### Approach 1: Three.js for 3D, Custom for 2D

Use Three.js for 3D hyperbolic visualizations (honeycombs, 3D tilings).
Use custom Canvas2D/WebGL for 2D Poincare disk.

**Pros:**

- Three.js optimized for 3D
- Simpler 2D implementation
- Clear separation

**Cons:**

- Two rendering systems to maintain
- Inconsistent API

#### Approach 2: Three.js as Foundation for Both

Use Three.js for all rendering. Hyperbolic objects become Three.js
objects (custom geometries).

**For 2D Poincare disk:**

- OrthographicCamera looking at XY plane
- Custom ShaderMaterial for hyperbolic rendering
- Or: Generate mesh geometry for tiles

**For 3D hyperbolic:**

- PerspectiveCamera inside the ball model
- Curved edges as tube geometries or line segments
- Custom shaders for proper hyperbolic lighting

**Pros:**

- Unified rendering pipeline
- Leverage Three.js ecosystem
- Consistent API

**Cons:**

- Some overhead
- Need to map hyperbolic concepts to Euclidean geometry

#### Approach 3: Shader-Only on Three.js

Use Three.js just for WebGL context management. All hyperbolic math
happens in shaders.

**Implementation:**

- Full-screen quad geometry
- Custom ShaderMaterial
- Fragment shader computes hyperbolic geometry per pixel

**Pros:**

- Maximum performance
- Infinite resolution
- Works for any projection

**Cons:**

- No object picking
- No individual tile manipulation
- Complex shader development

### Recommendation: Hybrid (Approach 2 + 3)

Use Three.js as the foundation with two rendering modes:

1. **Explicit Mode** (Approach 2)

   - For interactive tilings with clickable tiles
   - Generate BufferGeometry for each tile
   - Standard Three.js object picking
   - Good for finite tilings, manipulation

2. **Shader Mode** (Approach 3)
   - For infinite tilings, smooth navigation
   - Full-screen shader rendering
   - Maximum performance
   - Good for visualization, zooming

Switch between modes based on use case or even dynamically (explicit
near center, shader at edges).

## Math Libraries

### gl-matrix

**npm:** `gl-matrix`

Industry standard for WebGL math. Fast, typed array based.

**Provides:**

- vec2, vec3, vec4
- mat2, mat3, mat4
- quat, quat2

**Use for:** Basic linear algebra, matrix operations.

**Note:** Already used by hyperboloid-model. Natural choice.

### mathjs

**npm:** `mathjs`

Comprehensive math library.

**Provides:**

- Complex numbers
- Arbitrary precision (BigNumber)
- Symbolic computation
- Matrix operations

**Consideration:** Large bundle size. May only need complex numbers.

### complex.js

**npm:** `complex.js`

Lightweight complex number library.

**Provides:**

- add, sub, mul, div
- abs, arg, exp, log
- trig functions
- parsing

**Recommendation:** Good lightweight option for complex numbers.

### decimal.js / bignumber.js

**npm:** `decimal.js` or `bignumber.js`

Arbitrary precision arithmetic.

**Use for:** Deep zoom (avoiding floating point limits).

### Custom Implementation

The hyperbolic-specific math (Mobius transforms, model conversions,
geodesic computations) is specialized enough that we need custom
implementations regardless of libraries.

**Build custom:**

- Mobius transformations
- Hyperboloid operations
- Model conversions
- Tiling generation
- Group theory (von Dyck groups)

**Use libraries for:**

- Basic vectors/matrices (gl-matrix)
- Complex numbers (complex.js or custom)
- Arbitrary precision (decimal.js if needed)

## Recommended Dependencies

```json
{
  "dependencies": {
    "three": "^0.160.0",
    "gl-matrix": "^3.4.3",
    "complex.js": "^2.1.1"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/three": "^0.160.0"
  }
}
```

### Optional (as needed):

- `decimal.js` - For deep zoom precision
- `@tweenjs/tween.js` - For animations (or use Three.js built-in)
- `stats.js` - Performance monitoring

## Three.js Integration Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Application                       │
├─────────────────────────────────────────────────────┤
│                   Scene Manager                      │
│  (Three.js Scene + our hyperbolic layer)            │
├───────────────────┬─────────────────────────────────┤
│   Explicit Mode   │        Shader Mode              │
│   (Mesh objects)  │  (Full-screen fragment shader)  │
├───────────────────┴─────────────────────────────────┤
│              Hyperbolic Math Layer                   │
│  (Mobius, Hyperboloid, Groups, Tiling generation)   │
├─────────────────────────────────────────────────────┤
│              Three.js / gl-matrix                    │
│  (Vectors, Matrices, WebGL, Scene graph)            │
└─────────────────────────────────────────────────────┘
```

## Custom Three.js Objects

### HyperbolicTilingGeometry

```typescript
class HyperbolicTilingGeometry extends THREE.BufferGeometry {
  constructor(config: TilingConfig) {
    // Generate vertices for all tiles
    // Create position, normal, uv attributes
  }

  update(camera: HyperbolicCamera): void {
    // Regenerate geometry when view changes
  }
}
```

### HyperbolicMaterial

```typescript
class HyperbolicMaterial extends THREE.ShaderMaterial {
  constructor(options: HyperbolicMaterialOptions) {
    // Custom vertex/fragment shaders
    // Uniforms for hyperbolic parameters
  }
}
```

### HyperbolicCamera

Extends Three.js camera with hyperbolic navigation:

```typescript
class HyperbolicCamera extends THREE.OrthographicCamera {
  // Internal hyperbolic position
  hyperbolicCenter: Complex

  // Override project/unproject for hyperbolic coords
  projectHyperbolic(point: Complex): THREE.Vector3
  unprojectHyperbolic(screen: THREE.Vector2): Complex

  // Hyperbolic navigation
  translateHyperbolic(direction: Complex, distance: number): void
  rotateHyperbolic(angle: number): void
}
```

### HyperbolicControls

```typescript
class HyperbolicControls {
  camera: HyperbolicCamera
  domElement: HTMLElement

  // Mouse/touch handling
  // Hyperbolic pan, zoom, rotate
}
```

## Example Usage

```typescript
import * as THREE from 'three'
import {
  HyperbolicTiling,
  HyperbolicCamera,
  HyperbolicControls,
  PoincareRenderer,
} from '@geom/hyperbolic'

// Create Three.js scene
const scene = new THREE.Scene()
const renderer = new THREE.WebGLRenderer()

// Create hyperbolic camera (extends Three.js camera)
const camera = new HyperbolicCamera()

// Create hyperbolic tiling
const tiling = new HyperbolicTiling({ p: 7, q: 3 })

// Add to scene (converts to Three.js mesh internally)
scene.add(tiling.toMesh())

// Setup controls
const controls = new HyperbolicControls(camera, renderer.domElement)

// Render loop
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
```

## Bundle Size Considerations

Three.js is large (~600KB minified). Options:

1. **Full Three.js** - Simple, but large bundle
2. **Tree-shaking** - Import only what's needed
3. **Three.js module build** - Smaller if using ES modules
4. **Standalone WebGL** - Maximum control, more work

For a specialized geometry library, consider offering:

- Full build with Three.js
- Core build without Three.js (bring your own renderer)
