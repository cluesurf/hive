# Fractal Cathedral System Specification

A data model and implementation plan for infinite tunnel kaleidoscope
fractal animations. This document defines the architecture for building
"psychedelic cathedral" style visuals.

## System Overview

The system is a **composable pipeline** where each stage transforms
space or accumulates visual information:

```
Space Definition → Folding → Warping → Distance Field → Raymarching → Shading → Post
```

All operations work on points in space. The renderer samples this
pipeline millions of times per frame.

## Core Data Model

### 1. Point Types

```typescript
// 2D point in various coordinate systems
type Point2D = [number, number]

// 3D point
type Point3D = [number, number, number]

// Polar coordinates
interface Polar2D {
  r: number // radius
  theta: number // angle in radians
}

// Spherical coordinates
interface Spherical3D {
  r: number // radius
  theta: number // polar angle (from z-axis)
  phi: number // azimuthal angle (in xy-plane)
}

// Log-polar (for infinite zoom)
interface LogPolar2D {
  logR: number // log(radius)
  theta: number // angle
}
```

### 2. Transform Types

Transforms are functions that modify points. They compose left-to-right.

```typescript
type Transform2D = (p: Point2D, time: number) => Point2D
type Transform3D = (p: Point3D, time: number) => Point3D

// A transform with derivative info (for distance estimation)
interface DifferentiableTransform3D {
  apply: (p: Point3D, time: number) => Point3D
  jacobian?: (p: Point3D, time: number) => Matrix3x3
}
```

### 3. Distance Estimator

The core of fractal rendering. Returns distance to nearest surface.

```typescript
interface DistanceEstimator {
  // Estimate distance from point to surface
  distance: (p: Point3D, time: number) => number

  // Optional: return extra info for coloring
  distanceWithInfo?: (p: Point3D, time: number) => DistanceResult
}

interface DistanceResult {
  distance: number
  iterations?: number // how many iterations before escape
  orbitTrap?: number // minimum distance to trap point
  lastZ?: Point3D // final iterated position
  derivative?: number // for accurate DE
}
```

### 4. Color Palette

Smooth procedural color generation.

```typescript
interface ColorPalette {
  // Sample color at parameter t (typically 0-1 but can exceed)
  sample: (t: number) => Color
}

// RGB color (0-1 range, can exceed for HDR)
type Color = [number, number, number]

// Inigo Quilez style cosine palette parameters
interface CosinePaletteParams {
  a: Color // bias
  b: Color // amplitude
  c: Color // frequency
  d: Color // phase
}
```

### 5. Camera

Defines the viewpoint for raymarching.

```typescript
interface Camera {
  position: Point3D
  target: Point3D
  up: Point3D
  fov: number // field of view in radians

  // Generate ray for screen coordinate
  getRay: (uv: Point2D) => Ray
}

interface Ray {
  origin: Point3D
  direction: Point3D // normalized
}
```

### 6. Render Settings

```typescript
interface RenderSettings {
  resolution: [number, number]
  maxSteps: number // raymarch iterations
  maxDistance: number // far plane
  surfaceThreshold: number // hit distance
  stepScale: number // DE multiplier (< 1 for safety)
}
```

## Folding Operations

These are the symmetry transforms that create kaleidoscopic effects.

### 1. Angular Fold (2D Kaleidoscope)

```typescript
interface AngularFoldConfig {
  slices: number // number of symmetry wedges (e.g., 8)
}

function angularFold(p: Point2D, config: AngularFoldConfig): Point2D {
  const [x, y] = p
  const r = Math.sqrt(x * x + y * y)
  let theta = Math.atan2(y, x)

  const sector = (2 * Math.PI) / config.slices
  theta = theta % sector
  if (theta < 0) theta += sector
  theta = Math.abs(theta - sector / 2)

  return [r * Math.cos(theta), r * Math.sin(theta)]
}
```

### 2. Multi-Plane Fold (3D Kaleidoscope)

```typescript
interface MultiPlaneFoldConfig {
  planes: Array<'xy' | 'xz' | 'yz'>
  slices: number
}

function multiPlaneFold(
  p: Point3D,
  config: MultiPlaneFoldConfig,
): Point3D {
  let [x, y, z] = p

  for (const plane of config.planes) {
    if (plane === 'xy') {
      ;[x, y] = angularFold([x, y], { slices: config.slices })
    } else if (plane === 'xz') {
      ;[x, z] = angularFold([x, z], { slices: config.slices })
    } else if (plane === 'yz') {
      ;[y, z] = angularFold([y, z], { slices: config.slices })
    }
  }

  return [x, y, z]
}
```

### 3. Abs/Mirror Fold

```typescript
interface AbsFoldConfig {
  axes: Array<'x' | 'y' | 'z'>
  sortAxes?: boolean // if true, sort coordinates for tetrahedral symmetry
}

function absFold(p: Point3D, config: AbsFoldConfig): Point3D {
  let [x, y, z] = p

  if (config.axes.includes('x')) x = Math.abs(x)
  if (config.axes.includes('y')) y = Math.abs(y)
  if (config.axes.includes('z')) z = Math.abs(z)

  if (config.sortAxes) {
    // Creates tetrahedral/cubic symmetry
    if (x < y) [x, y] = [y, x]
    if (x < z) [x, z] = [z, x]
    if (y < z) [y, z] = [z, y]
  }

  return [x, y, z]
}
```

### 4. Log-Polar Fold (Infinite Zoom)

```typescript
interface LogPolarFoldConfig {
  zoomSpeed: number // how fast to scroll through scales
  layers: number // optional: number of visible layers
}

function logPolarFold(
  p: Point2D,
  time: number,
  config: LogPolarFoldConfig,
): Point2D {
  const [x, y] = p
  const r = Math.sqrt(x * x + y * y)
  const theta = Math.atan2(y, x)

  // Convert to log space, animate, wrap
  let logR = Math.log(r + 1e-6)
  logR += time * config.zoomSpeed
  const fractR = logR - Math.floor(logR) // fract()

  // Convert back
  const newR = Math.exp(fractR)
  return [newR * Math.cos(theta), newR * Math.sin(theta)]
}
```

## Distance Estimators

### 1. Mandelbulb

```typescript
interface MandelbulbConfig {
  power: number // typically 8
  iterations: number // typically 8-15
  bailout: number // typically 2-4
}

function mandelbulbDE(
  p: Point3D,
  config: MandelbulbConfig,
): DistanceResult {
  let [x, y, z] = p
  let dr = 1
  let r = 0

  for (let i = 0; i < config.iterations; i++) {
    r = Math.sqrt(x * x + y * y + z * z)
    if (r > config.bailout) break

    // Convert to spherical
    const theta = Math.acos(z / r)
    const phi = Math.atan2(y, x)

    // Scale derivative
    dr = Math.pow(r, config.power - 1) * config.power * dr + 1

    // Scale and rotate
    const zr = Math.pow(r, config.power)
    const newTheta = theta * config.power
    const newPhi = phi * config.power

    x = zr * Math.sin(newTheta) * Math.cos(newPhi) + p[0]
    y = zr * Math.sin(newPhi) * Math.sin(newTheta) + p[1]
    z = zr * Math.cos(newTheta) + p[2]
  }

  return {
    distance: (0.5 * Math.log(r) * r) / dr,
    iterations: config.iterations,
    lastZ: [x, y, z],
  }
}
```

### 2. Mandelbox

```typescript
interface MandelboxConfig {
  scale: number // typically -1.5 to 3
  foldingLimit: number // box fold limit, typically 1
  minRadius: number // sphere fold inner, typically 0.5
  maxRadius: number // sphere fold outer, typically 1
  iterations: number // typically 10-20
}

function mandelboxDE(
  p: Point3D,
  config: MandelboxConfig,
): DistanceResult {
  let [x, y, z] = p
  const offset = [...p] as Point3D
  let dr = 1

  for (let i = 0; i < config.iterations; i++) {
    // Box fold
    x = boxFoldComponent(x, config.foldingLimit)
    y = boxFoldComponent(y, config.foldingLimit)
    z = boxFoldComponent(z, config.foldingLimit)

    // Sphere fold
    const r2 = x * x + y * y + z * z
    const minR2 = config.minRadius * config.minRadius
    const maxR2 = config.maxRadius * config.maxRadius

    if (r2 < minR2) {
      const factor = maxR2 / minR2
      x *= factor
      y *= factor
      z *= factor
      dr *= factor
    } else if (r2 < maxR2) {
      const factor = maxR2 / r2
      x *= factor
      y *= factor
      z *= factor
      dr *= factor
    }

    // Scale and translate
    x = x * config.scale + offset[0]
    y = y * config.scale + offset[1]
    z = z * config.scale + offset[2]
    dr = dr * Math.abs(config.scale) + 1
  }

  const r = Math.sqrt(x * x + y * y + z * z)
  return {
    distance: r / Math.abs(dr),
    lastZ: [x, y, z],
  }
}

function boxFoldComponent(v: number, limit: number): number {
  if (v > limit) return 2 * limit - v
  if (v < -limit) return -2 * limit - v
  return v
}
```

### 3. Hybrid / IFS Style

```typescript
interface HybridFractalConfig {
  transforms: Array<{
    type: 'boxFold' | 'sphereFold' | 'rotate' | 'scale' | 'translate'
    params: Record<string, number>
  }>
  iterations: number
}

function hybridDE(
  p: Point3D,
  config: HybridFractalConfig,
): DistanceResult {
  let [x, y, z] = p
  let dr = 1

  for (let i = 0; i < config.iterations; i++) {
    for (const transform of config.transforms) {
      ;[x, y, z, dr] = applyHybridTransform([x, y, z], dr, transform)
    }
  }

  const r = Math.sqrt(x * x + y * y + z * z)
  return { distance: r / dr, lastZ: [x, y, z] }
}
```

## Domain Warping

Makes geometry feel organic and alive.

```typescript
interface DomainWarpConfig {
  type: 'sin' | 'fbm' | 'curl'
  frequency: number
  amplitude: number
  octaves?: number // for fbm
  timeScale?: number // animation speed
}

function domainWarp(
  p: Point3D,
  time: number,
  config: DomainWarpConfig,
): Point3D {
  const [x, y, z] = p
  const t = time * (config.timeScale ?? 1)

  if (config.type === 'sin') {
    return [
      x + config.amplitude * Math.sin(y * config.frequency + t),
      y + config.amplitude * Math.sin(z * config.frequency + t * 1.1),
      z + config.amplitude * Math.sin(x * config.frequency + t * 0.9),
    ]
  }

  if (config.type === 'fbm') {
    const noise = fbmNoise3D(
      x * config.frequency,
      y * config.frequency,
      z * config.frequency + t,
      config.octaves ?? 4,
    )
    return [
      x + noise[0] * config.amplitude,
      y + noise[1] * config.amplitude,
      z + noise[2] * config.amplitude,
    ]
  }

  // curl noise for divergence-free flow
  if (config.type === 'curl') {
    const curl = curlNoise3D(p, config.frequency, t)
    return [
      x + curl[0] * config.amplitude,
      y + curl[1] * config.amplitude,
      z + curl[2] * config.amplitude,
    ]
  }

  return p
}
```

## Color System

### 1. Cosine Palette

```typescript
function cosinePalette(t: number, params: CosinePaletteParams): Color {
  const TAU = 2 * Math.PI
  return [
    params.a[0] +
      params.b[0] * Math.cos(TAU * (params.c[0] * t + params.d[0])),
    params.a[1] +
      params.b[1] * Math.cos(TAU * (params.c[1] * t + params.d[1])),
    params.a[2] +
      params.b[2] * Math.cos(TAU * (params.c[2] * t + params.d[2])),
  ]
}

// Preset palettes
const PALETTES = {
  rainbow: {
    a: [0.5, 0.5, 0.5],
    b: [0.5, 0.5, 0.5],
    c: [1.0, 1.0, 1.0],
    d: [0.0, 0.33, 0.67],
  },
  fire: {
    a: [0.5, 0.5, 0.5],
    b: [0.5, 0.5, 0.5],
    c: [1.0, 0.7, 0.4],
    d: [0.0, 0.15, 0.2],
  },
  ocean: {
    a: [0.5, 0.5, 0.5],
    b: [0.5, 0.5, 0.5],
    c: [1.0, 1.0, 1.0],
    d: [0.3, 0.2, 0.2],
  },
  neon: {
    a: [0.5, 0.5, 0.5],
    b: [0.5, 0.5, 0.5],
    c: [2.0, 1.0, 0.0],
    d: [0.5, 0.2, 0.25],
  },
} as const
```

### 2. Color Mapping

```typescript
interface ColorMappingConfig {
  palette: ColorPalette
  source: 'position' | 'iteration' | 'distance' | 'normal' | 'orbit'
  scale: number
  offset: number
  timePhase?: number // animate color over time
}

function mapColor(
  result: DistanceResult,
  hit: Point3D,
  normal: Point3D,
  time: number,
  config: ColorMappingConfig,
): Color {
  let t = 0

  switch (config.source) {
    case 'position':
      t = hit[2] * 0.1 + Math.sin(hit[0] * 0.5) * 0.2
      break
    case 'iteration':
      t = (result.iterations ?? 0) / 15
      break
    case 'distance':
      t = result.distance * 10
      break
    case 'normal':
      t = (normal[0] + normal[1] + normal[2]) / 3
      break
    case 'orbit':
      t = result.orbitTrap ?? 0
      break
  }

  t = t * config.scale + config.offset
  if (config.timePhase) {
    t += time * config.timePhase
  }

  return config.palette.sample(t)
}
```

## Raymarching Renderer

### 1. Core Raymarch

```typescript
interface RaymarchResult {
  hit: boolean
  distance: number // total distance traveled
  position: Point3D // hit position
  steps: number // iterations used
  glow: number // accumulated glow
  deResult: DistanceResult
}

function raymarch(
  ray: Ray,
  scene: DistanceEstimator,
  settings: RenderSettings,
): RaymarchResult {
  let t = 0
  let glow = 0

  for (let i = 0; i < settings.maxSteps; i++) {
    const p: Point3D = [
      ray.origin[0] + ray.direction[0] * t,
      ray.origin[1] + ray.direction[1] * t,
      ray.origin[2] + ray.direction[2] * t,
    ]

    const result = scene.distanceWithInfo
      ? scene.distanceWithInfo(p, 0)
      : { distance: scene.distance(p, 0) }

    // Accumulate glow from near-misses
    glow += Math.exp(-Math.abs(result.distance) * 12) * 0.02

    if (result.distance < settings.surfaceThreshold) {
      return {
        hit: true,
        distance: t,
        position: p,
        steps: i,
        glow,
        deResult: result,
      }
    }

    t += result.distance * settings.stepScale
    if (t > settings.maxDistance) break
  }

  return {
    hit: false,
    distance: t,
    position: [
      ray.origin[0] + ray.direction[0] * t,
      ray.origin[1] + ray.direction[1] * t,
      ray.origin[2] + ray.direction[2] * t,
    ],
    steps: settings.maxSteps,
    glow,
    deResult: { distance: settings.maxDistance },
  }
}
```

### 2. Normal Estimation

```typescript
function estimateNormal(
  p: Point3D,
  scene: DistanceEstimator,
  time: number,
  epsilon: number = 0.001,
): Point3D {
  const d = scene.distance(p, time)
  const nx = d - scene.distance([p[0] - epsilon, p[1], p[2]], time)
  const ny = d - scene.distance([p[0], p[1] - epsilon, p[2]], time)
  const nz = d - scene.distance([p[0], p[1], p[2] - epsilon], time)

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
  return [nx / len, ny / len, nz / len]
}
```

### 3. Shading

```typescript
interface ShadingConfig {
  lightDir: Point3D
  ambient: number
  diffuse: number
  fresnel: number
  glowColor: Color
  glowIntensity: number
  fogColor: Color
  fogDensity: number
}

function shade(
  result: RaymarchResult,
  ray: Ray,
  normal: Point3D,
  baseColor: Color,
  config: ShadingConfig,
): Color {
  if (!result.hit) {
    // Background with glow
    return [
      config.fogColor[0] +
        result.glow * config.glowColor[0] * config.glowIntensity,
      config.fogColor[1] +
        result.glow * config.glowColor[1] * config.glowIntensity,
      config.fogColor[2] +
        result.glow * config.glowColor[2] * config.glowIntensity,
    ]
  }

  // Diffuse
  const diff = Math.max(0, dot3(normal, config.lightDir))

  // Fresnel (edge glow)
  const viewDot = dot3(normal, [
    -ray.direction[0],
    -ray.direction[1],
    -ray.direction[2],
  ])
  const fresnel = Math.pow(1 - Math.max(0, viewDot), 2)

  // Combine
  let color: Color = [
    baseColor[0] * (config.ambient + config.diffuse * diff) +
      fresnel * config.fresnel,
    baseColor[1] * (config.ambient + config.diffuse * diff) +
      fresnel * config.fresnel,
    baseColor[2] * (config.ambient + config.diffuse * diff) +
      fresnel * config.fresnel,
  ]

  // Add glow
  color[0] += result.glow * config.glowColor[0] * config.glowIntensity
  color[1] += result.glow * config.glowColor[1] * config.glowIntensity
  color[2] += result.glow * config.glowColor[2] * config.glowIntensity

  // Fog
  const fogFactor = 1 - Math.exp(-result.distance * config.fogDensity)
  color[0] = mix(color[0], config.fogColor[0], fogFactor)
  color[1] = mix(color[1], config.fogColor[1], fogFactor)
  color[2] = mix(color[2], config.fogColor[2], fogFactor)

  return color
}
```

## Post-Processing

### 1. Bloom

```typescript
interface BloomConfig {
  threshold: number // brightness threshold
  intensity: number // bloom strength
  radius: number // blur radius
  passes: number // blur iterations
}

function applyBloom(
  image: Float32Array,
  width: number,
  height: number,
  config: BloomConfig,
): Float32Array {
  // Extract bright pixels
  const bright = extractBright(image, width, height, config.threshold)

  // Blur in multiple passes
  let blurred = bright
  for (let i = 0; i < config.passes; i++) {
    blurred = gaussianBlur(blurred, width, height, config.radius)
  }

  // Add back to original
  const result = new Float32Array(image.length)
  for (let i = 0; i < image.length; i++) {
    result[i] = image[i] + blurred[i] * config.intensity
  }

  return result
}
```

### 2. Tone Mapping

```typescript
type ToneMapMode = 'reinhard' | 'aces' | 'uncharted2'

function toneMap(color: Color, mode: ToneMapMode): Color {
  if (mode === 'reinhard') {
    return [
      color[0] / (1 + color[0]),
      color[1] / (1 + color[1]),
      color[2] / (1 + color[2]),
    ]
  }

  if (mode === 'aces') {
    // Attempt an ACES filmic tone mapping
    const a = 2.51
    const b = 0.03
    const c = 2.43
    const d = 0.59
    const e = 0.14
    return [
      clamp(
        (color[0] * (a * color[0] + b)) /
          (color[0] * (c * color[0] + d) + e),
      ),
      clamp(
        (color[1] * (a * color[1] + b)) /
          (color[1] * (c * color[1] + d) + e),
      ),
      clamp(
        (color[2] * (a * color[2] + b)) /
          (color[2] * (c * color[2] + d) + e),
      ),
    ]
  }

  return color
}
```

### 3. Feedback Buffer

```typescript
interface FeedbackConfig {
  decay: number // 0-1, how much previous frame persists
  blend: 'add' | 'mix' | 'screen'
  offset?: Point2D // slight UV shift for trails
  zoom?: number // slight zoom for spiral effect
}

function applyFeedback(
  current: Float32Array,
  previous: Float32Array,
  width: number,
  height: number,
  config: FeedbackConfig,
): Float32Array {
  const result = new Float32Array(current.length)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Sample previous with optional offset/zoom
      let px = x
      let py = y
      if (config.offset) {
        px += config.offset[0]
        py += config.offset[1]
      }
      if (config.zoom) {
        const cx = width / 2
        const cy = height / 2
        px = cx + (px - cx) * config.zoom
        py = cy + (py - cy) * config.zoom
      }

      const prevColor = sampleBilinear(previous, width, height, px, py)
      const currColor = getPixel(current, width, x, y)

      const i = (y * width + x) * 3
      if (config.blend === 'add') {
        result[i + 0] = currColor[0] + prevColor[0] * config.decay
        result[i + 1] = currColor[1] + prevColor[1] * config.decay
        result[i + 2] = currColor[2] + prevColor[2] * config.decay
      } else if (config.blend === 'mix') {
        result[i + 0] = mix(currColor[0], prevColor[0], config.decay)
        result[i + 1] = mix(currColor[1], prevColor[1], config.decay)
        result[i + 2] = mix(currColor[2], prevColor[2], config.decay)
      }
    }
  }

  return result
}
```

## Complete Scene Configuration

### Scene Definition

```typescript
interface FractalCathedralScene {
  // Geometry
  fractal: {
    type: 'mandelbulb' | 'mandelbox' | 'hybrid'
    config: MandelbulbConfig | MandelboxConfig | HybridFractalConfig
  }

  // Symmetry
  folding: {
    preFolds: Array<{
      type: 'angular' | 'multiPlane' | 'abs' | 'logPolar'
      config:
        | AngularFoldConfig
        | MultiPlaneFoldConfig
        | AbsFoldConfig
        | LogPolarFoldConfig
    }>
    postFolds?: Array<{
      type: 'angular' | 'multiPlane' | 'abs'
      config: AngularFoldConfig | MultiPlaneFoldConfig | AbsFoldConfig
    }>
  }

  // Warping
  domainWarp?: DomainWarpConfig

  // Animation
  animation: {
    tunnelSpeed: number // z-axis movement
    rotationSpeed: number // camera rotation
    colorPhase: number // palette animation
  }

  // Appearance
  color: ColorMappingConfig
  shading: ShadingConfig

  // Post
  post: {
    bloom?: BloomConfig
    feedback?: FeedbackConfig
    toneMap: ToneMapMode
  }

  // Render
  render: RenderSettings
}
```

### Example Configuration

```typescript
const cathedralScene: FractalCathedralScene = {
  fractal: {
    type: 'mandelbox',
    config: {
      scale: 2.0,
      foldingLimit: 1.0,
      minRadius: 0.5,
      maxRadius: 1.0,
      iterations: 15,
    },
  },

  folding: {
    preFolds: [
      {
        type: 'multiPlane',
        config: { planes: ['xy', 'xz'], slices: 8 },
      },
    ],
  },

  domainWarp: {
    type: 'sin',
    frequency: 2.0,
    amplitude: 0.05,
    timeScale: 0.3,
  },

  animation: {
    tunnelSpeed: 1.2,
    rotationSpeed: 0.2,
    colorPhase: 0.1,
  },

  color: {
    palette: { sample: t => cosinePalette(t, PALETTES.neon) },
    source: 'position',
    scale: 0.15,
    offset: 0,
    timePhase: 0.1,
  },

  shading: {
    lightDir: normalize3([0.4, 0.7, 0.2]),
    ambient: 0.15,
    diffuse: 0.85,
    fresnel: 0.4,
    glowColor: [1.2, 0.8, 1.6],
    glowIntensity: 1.0,
    fogColor: [0.02, 0.02, 0.05],
    fogDensity: 0.02,
  },

  post: {
    bloom: {
      threshold: 0.8,
      intensity: 0.5,
      radius: 4,
      passes: 3,
    },
    feedback: {
      decay: 0.85,
      blend: 'add',
      zoom: 1.002,
    },
    toneMap: 'aces',
  },

  render: {
    resolution: [1920, 1080],
    maxSteps: 128,
    maxDistance: 60,
    surfaceThreshold: 0.001,
    stepScale: 0.9,
  },
}
```

## Render Pipeline

### Main Render Function

```typescript
function renderFrame(
  scene: FractalCathedralScene,
  camera: Camera,
  time: number,
  previousFrame?: Float32Array,
): Float32Array {
  const [width, height] = scene.render.resolution
  const pixels = new Float32Array(width * height * 3)

  // Build the distance estimator with all transforms
  const distanceEstimator = buildSceneDE(scene, time)

  // Render each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const uv: Point2D = [
        (x - width / 2) / height,
        (y - height / 2) / height,
      ]

      const ray = camera.getRay(uv)
      const result = raymarch(ray, distanceEstimator, scene.render)

      let color: Color
      if (result.hit) {
        const normal = estimateNormal(
          result.position,
          distanceEstimator,
          time,
        )
        const baseColor = mapColor(
          result.deResult,
          result.position,
          normal,
          time,
          scene.color,
        )
        color = shade(result, ray, normal, baseColor, scene.shading)
      } else {
        color = shade(result, ray, [0, 0, 0], [0, 0, 0], scene.shading)
      }

      const i = (y * width + x) * 3
      pixels[i + 0] = color[0]
      pixels[i + 1] = color[1]
      pixels[i + 2] = color[2]
    }
  }

  // Post-processing
  let output = pixels

  if (scene.post.bloom) {
    output = applyBloom(output, width, height, scene.post.bloom)
  }

  if (scene.post.feedback && previousFrame) {
    output = applyFeedback(
      output,
      previousFrame,
      width,
      height,
      scene.post.feedback,
    )
  }

  // Tone map
  for (let i = 0; i < output.length; i += 3) {
    const mapped = toneMap(
      [output[i], output[i + 1], output[i + 2]],
      scene.post.toneMap,
    )
    output[i + 0] = mapped[0]
    output[i + 1] = mapped[1]
    output[i + 2] = mapped[2]
  }

  return output
}
```

### Scene DE Builder

```typescript
function buildSceneDE(
  scene: FractalCathedralScene,
  time: number,
): DistanceEstimator {
  return {
    distance: (p: Point3D, t: number) => {
      let point = [...p] as Point3D

      // Tunnel motion
      point[2] += time * scene.animation.tunnelSpeed

      // Pre-folds
      for (const fold of scene.folding.preFolds) {
        point = applyFold(point, fold, time)
      }

      // Domain warp
      if (scene.domainWarp) {
        point = domainWarp(point, time, scene.domainWarp)
      }

      // Fractal DE
      let result: DistanceResult
      if (scene.fractal.type === 'mandelbulb') {
        result = mandelbulbDE(
          point,
          scene.fractal.config as MandelbulbConfig,
        )
      } else if (scene.fractal.type === 'mandelbox') {
        result = mandelboxDE(
          point,
          scene.fractal.config as MandelboxConfig,
        )
      } else {
        result = hybridDE(
          point,
          scene.fractal.config as HybridFractalConfig,
        )
      }

      return result.distance
    },

    distanceWithInfo: (p: Point3D, t: number) => {
      // Same as above but returns full DistanceResult
      // (implementation mirrors distance but returns result object)
      let point = [...p] as Point3D
      point[2] += time * scene.animation.tunnelSpeed

      for (const fold of scene.folding.preFolds) {
        point = applyFold(point, fold, time)
      }

      if (scene.domainWarp) {
        point = domainWarp(point, time, scene.domainWarp)
      }

      if (scene.fractal.type === 'mandelbulb') {
        return mandelbulbDE(
          point,
          scene.fractal.config as MandelbulbConfig,
        )
      } else if (scene.fractal.type === 'mandelbox') {
        return mandelboxDE(
          point,
          scene.fractal.config as MandelboxConfig,
        )
      } else {
        return hybridDE(
          point,
          scene.fractal.config as HybridFractalConfig,
        )
      }
    },
  }
}
```

## Implementation Phases

### Phase 1: Core Math

1. Implement point types and coordinate conversions
2. Implement basic folds (angular, abs, log-polar)
3. Implement Mandelbulb and Mandelbox DE
4. Unit test all transforms

### Phase 2: Rendering

1. Implement camera and ray generation
2. Implement basic raymarcher
3. Implement normal estimation
4. Add glow accumulation
5. Test with simple scenes

### Phase 3: Color and Shading

1. Implement cosine palette system
2. Implement color mapping from DE results
3. Implement full shading model
4. Add fog

### Phase 4: Post-Processing

1. Implement bloom (extract bright, blur, combine)
2. Implement feedback buffer
3. Implement tone mapping
4. Add gamma correction

### Phase 5: GPU Acceleration

1. Port DE functions to GLSL
2. Port folds to GLSL
3. Build fullscreen shader pipeline
4. Add Three.js wrapper

### Phase 6: Interactivity

1. Add parameter controls
2. Add camera controls
3. Add audio reactivity (optional)
4. Add preset system

## File Structure

```
code/
├── fractal-cathedral/
│   ├── index.ts
│   ├── types.ts              # Point, Color, Config types
│   ├── math/
│   │   ├── vec.ts            # Vector operations
│   │   ├── noise.ts          # Noise functions
│   │   └── coords.ts         # Coordinate conversions
│   ├── folds/
│   │   ├── angular.ts        # 2D kaleidoscope
│   │   ├── multiplane.ts     # 3D kaleidoscope
│   │   ├── abs.ts            # Mirror folds
│   │   └── logpolar.ts       # Infinite zoom
│   ├── fractals/
│   │   ├── mandelbulb.ts
│   │   ├── mandelbox.ts
│   │   └── hybrid.ts
│   ├── render/
│   │   ├── camera.ts
│   │   ├── raymarch.ts
│   │   ├── shade.ts
│   │   └── scene.ts
│   ├── color/
│   │   ├── palette.ts
│   │   └── mapping.ts
│   ├── post/
│   │   ├── bloom.ts
│   │   ├── feedback.ts
│   │   └── tonemap.ts
│   ├── gpu/
│   │   ├── shaders/
│   │   │   ├── fractal.frag
│   │   │   ├── post.frag
│   │   │   └── fullscreen.vert
│   │   └── renderer.ts
│   └── presets/
│       ├── cathedral.ts
│       ├── tunnel.ts
│       └── kaleidoscope.ts
```

## Key Design Decisions

1. **Composition over inheritance**: All transforms are functions that
   compose. No class hierarchies for fractals.

2. **Config objects over parameters**: Every component takes a typed
   config object. Easy to serialize, easy to animate.

3. **CPU reference, GPU production**: Full CPU implementation for
   testing and understanding. GPU (GLSL) for real-time.

4. **Separable pipeline**: Each stage (fold, warp, DE, shade, post) is
   independent. Can swap, reorder, or skip.

5. **Time is explicit**: Every function that can animate takes `time` as
   a parameter. No global state.

6. **HDR throughout**: Colors are float, can exceed 1.0. Tone mapping
   happens at the end only.
