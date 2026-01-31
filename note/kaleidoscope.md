# Kaleidoscope System

Kaleidoscopic art, animations, and music visualizations in 2D and 3D.

## Overview

A kaleidoscope creates symmetric patterns by reflecting a source image
or geometry across mirror lines. This system supports:

- **Pixel-based**: Reflect raster images, video, webcam, canvas
- **Geometric**: Reflect vector shapes, curves, particles
- **Hybrid**: Combine both approaches
- **Audio-reactive**: Sync to music, beats, frequencies

## Mathematical Foundation

### Symmetry Groups

Kaleidoscopes are based on reflection groups:

| Type       | Symbol          | Description                 |
| ---------- | --------------- | --------------------------- |
| Cyclic     | Cn              | n-fold rotational symmetry  |
| Dihedral   | Dn              | n mirrors meeting at center |
| Frieze     | Various         | Infinite strip patterns     |
| Wallpaper  | 17 types        | Plane-filling patterns      |
| Hyperbolic | Triangle groups | Infinite-order symmetries   |

### Mirror Configuration

```typescript
interface MirrorConfig {
  // Number of mirror lines meeting at center
  folds: number // e.g., 6 for hexagonal kaleidoscope

  // Angle between adjacent mirrors
  angle: number // = π / folds

  // For non-regular: custom angles
  angles?: number[]

  // Mirror line endpoints (for bounded regions)
  mirrors: Line[]
}

// Common configurations
const triangular: MirrorConfig = { folds: 3, angle: Math.PI / 3 }
const square: MirrorConfig = { folds: 4, angle: Math.PI / 4 }
const hexagonal: MirrorConfig = { folds: 6, angle: Math.PI / 6 }
```

### Fundamental Domain

The source region that gets reflected:

```typescript
interface FundamentalDomain {
  // Shape of the domain
  shape: 'wedge' | 'triangle' | 'rectangle' | 'custom'

  // Vertices (in geometry coordinates)
  vertices: Point[]

  // Which edges are mirrors vs boundaries
  edges: ('mirror' | 'boundary')[]
}

// Wedge for Dn symmetry
function wedgeDomain(folds: number, radius: number): FundamentalDomain {
  const angle = Math.PI / folds
  return {
    shape: 'wedge',
    vertices: [
      [0, 0],
      [radius, 0],
      [radius * Math.cos(angle), radius * Math.sin(angle)],
    ],
    edges: ['mirror', 'boundary', 'mirror'],
  }
}
```

## Pixel-Based Kaleidoscope

### Architecture

```
Source → Sampler → Fundamental Domain → Reflection Engine → Output
  │
  ├── Image (static)
  ├── Video
  ├── Webcam
  ├── Canvas (live drawing)
  └── Generated (noise, gradients)
```

### Source Types

```typescript
type PixelSource =
  | { type: 'image'; image: ImageBitmap }
  | { type: 'video'; video: HTMLVideoElement }
  | { type: 'webcam'; stream: MediaStream }
  | { type: 'canvas'; canvas: HTMLCanvasElement }
  | { type: 'generated'; generator: PixelGenerator }

interface PixelGenerator {
  // Generate pixel at (u, v) in [0,1] x [0,1]
  sample(u: number, v: number, time: number): Color
}

// Built-in generators
class PerlinNoiseGenerator implements PixelGenerator {}
class SimplexNoiseGenerator implements PixelGenerator {}
class GradientGenerator implements PixelGenerator {}
class PlasmaGenerator implements PixelGenerator {}
class FractalGenerator implements PixelGenerator {}
```

### Pixel Kaleidoscope Class

```typescript
class PixelKaleidoscope {
  private source: PixelSource
  private config: MirrorConfig
  private domain: FundamentalDomain

  constructor(source: PixelSource, folds: number) {
    this.source = source
    this.config = { folds, angle: Math.PI / folds }
    this.domain = wedgeDomain(folds, 1.0)
  }

  // Render to canvas
  render(ctx: CanvasRenderingContext2D, time: number): void {
    const { width, height } = ctx.canvas

    // For each output pixel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Convert to polar coordinates centered on canvas
        const [r, theta] = this.toPolar(x, y, width, height)

        // Fold theta into fundamental domain
        const foldedTheta = this.foldAngle(theta)

        // Sample source at folded position
        const color = this.sampleSource(r, foldedTheta, time)

        // Write pixel
        this.setPixel(ctx, x, y, color)
      }
    }
  }

  private foldAngle(theta: number): number {
    const { angle } = this.config

    // Normalize to [0, 2π)
    theta = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

    // Find which sector
    const sector = Math.floor(theta / angle)

    // Fold into [0, angle)
    let folded = theta % angle

    // Reflect odd sectors
    if (sector % 2 === 1) {
      folded = angle - folded
    }

    return folded
  }

  private sampleSource(r: number, theta: number, time: number): Color {
    // Convert back to Cartesian for source sampling
    const u = (r * Math.cos(theta) + 1) / 2
    const v = (r * Math.sin(theta) + 1) / 2

    return this.source.sample(u, v, time)
  }
}
```

### GPU-Accelerated (WebGL/WebGPU)

```glsl
// Fragment shader for pixel kaleidoscope
uniform sampler2D uSource;
uniform float uFolds;
uniform float uTime;
uniform vec2 uCenter;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 centered = uv - uCenter;

  // To polar
  float r = length(centered);
  float theta = atan(centered.y, centered.x);

  // Fold angle
  float angle = 3.14159 / uFolds;
  float sector = floor(theta / angle);
  float folded = mod(theta, angle);
  if (mod(sector, 2.0) == 1.0) {
    folded = angle - folded;
  }

  // Sample source
  vec2 sourceUV = vec2(
    r * cos(folded) * 0.5 + 0.5,
    r * sin(folded) * 0.5 + 0.5
  );

  gl_FragColor = texture2D(uSource, sourceUV);
}
```

## Geometric Kaleidoscope

### Architecture

```
Geometry Source → Transform → Reflect → Render
       │
       ├── Shapes (circles, polygons)
       ├── Curves (Bezier, splines)
       ├── Particles
       ├── Paths (animated)
       └── Procedural (L-systems, fractals)
```

### Geometry Sources

```typescript
interface GeometrySource {
  // Generate geometry at given time
  generate(time: number): Geometry[]
}

interface Geometry {
  type: 'point' | 'line' | 'polygon' | 'curve' | 'circle'
  points: Point[]
  style: GeometryStyle
}

interface GeometryStyle {
  fill?: Color
  stroke?: Color
  strokeWidth?: number
  opacity?: number
}

// Sources
class ShapeSource implements GeometrySource {
  shapes: Shape[]
  animate(time: number): void {}
}

class ParticleSource implements GeometrySource {
  particles: Particle[]
  physics: ParticlePhysics
}

class CurveSource implements GeometrySource {
  curves: Curve[]
  animate(time: number): void {}
}

class LSystemSource implements GeometrySource {
  rules: LSystemRules
  iterations: number
}
```

### Geometric Kaleidoscope Class

```typescript
class GeometricKaleidoscope {
  private source: GeometrySource
  private config: MirrorConfig
  private geometry: Geometry

  constructor(
    source: GeometrySource,
    folds: number,
    geometry: Geometry,
  ) {
    this.source = source
    this.config = { folds, angle: Math.PI / folds }
    this.geometry = geometry
  }

  // Generate all reflected copies
  generate(time: number): Geometry[] {
    const sourceGeometry = this.source.generate(time)
    const reflected: Geometry[] = []

    // For each reflection (2 * folds copies for Dn symmetry)
    for (let i = 0; i < 2 * this.config.folds; i++) {
      const isReflected = i % 2 === 1
      const rotationAngle = Math.floor(i / 2) * this.config.angle * 2

      for (const geom of sourceGeometry) {
        const transformed = this.transformGeometry(
          geom,
          rotationAngle,
          isReflected,
        )
        reflected.push(transformed)
      }
    }

    return reflected
  }

  private transformGeometry(
    geom: Geometry,
    rotation: number,
    reflect: boolean,
  ): Geometry {
    let points = geom.points.map(p => this.rotate(p, rotation))

    if (reflect) {
      points = points.map(p => this.reflectAcrossX(p))
    }

    return { ...geom, points }
  }
}
```

### Hyperbolic Kaleidoscope

Kaleidoscopes in hyperbolic space have infinite-order symmetries:

```typescript
class HyperbolicKaleidoscope {
  private geometry: Hyperbolic2D
  private triangleGroup: TriangleGroup
  private source: GeometrySource

  constructor(p: number, q: number, r: number, source: GeometrySource) {
    this.geometry = new Hyperbolic2D()
    this.triangleGroup = new TriangleGroup(p, q, r)
    this.source = source
  }

  // Generate reflections up to given depth
  generate(time: number, depth: number): Geometry[] {
    const sourceGeometry = this.source.generate(time)
    const reflected: Geometry[] = [...sourceGeometry]

    // BFS through reflection words
    const visited = new Set<string>([''])
    const queue: string[] = ['']

    while (queue.length > 0) {
      const word = queue.shift()!
      if (word.length >= depth) continue

      for (let gen = 0; gen < 3; gen++) {
        const newWord = this.reduce(word + gen)
        if (!visited.has(newWord)) {
          visited.add(newWord)
          queue.push(newWord)

          // Transform source geometry by this word
          const transform = this.triangleGroup.wordToMatrix(newWord)
          for (const geom of sourceGeometry) {
            reflected.push(this.applyTransform(geom, transform))
          }
        }
      }
    }

    return reflected
  }
}
```

## 3D Kaleidoscope

### Mirror Planes in 3D

```typescript
interface Mirror3D {
  // Plane equation: ax + by + cz + d = 0
  normal: Point3D
  distance: number
}

interface KaleidoscopeConfig3D {
  // Mirror planes (3 or 4 for tetrahedral/cubic symmetry)
  mirrors: Mirror3D[]

  // Fundamental domain (tetrahedron, etc.)
  domain: Polyhedron
}

// Symmetry types
const tetrahedralSymmetry: KaleidoscopeConfig3D = {
  mirrors: [
    /* 4 planes of tetrahedron */
  ],
  domain: tetrahedron(),
}

const cubicSymmetry: KaleidoscopeConfig3D = {
  mirrors: [
    /* 9 planes for cubic symmetry */
  ],
  domain: orthoscheme(),
}

const icosahedralSymmetry: KaleidoscopeConfig3D = {
  mirrors: [
    /* 15 planes for icosahedral symmetry */
  ],
  domain: orthoscheme(),
}
```

### 3D Kaleidoscope Class

```typescript
class Kaleidoscope3D {
  private config: KaleidoscopeConfig3D
  private geometry: Geometry3D
  private source: GeometrySource3D

  constructor(symmetry: 'tetrahedral' | 'cubic' | 'icosahedral') {
    this.config = this.getSymmetryConfig(symmetry)
    this.geometry = new Euclidean3D()
  }

  generate(time: number, depth: number): Geometry3D[] {
    const sourceGeometry = this.source.generate(time)
    const reflected: Geometry3D[] = []

    // Generate all elements of symmetry group up to depth
    const transforms = this.generateGroupElements(depth)

    for (const transform of transforms) {
      for (const geom of sourceGeometry) {
        reflected.push(this.applyTransform(geom, transform))
      }
    }

    return reflected
  }

  // Reflect a point across all mirror planes recursively
  private reflectPoint(point: Point3D, depth: number): Point3D[] {
    if (depth === 0) return [point]

    const results: Point3D[] = [point]

    for (const mirror of this.config.mirrors) {
      const reflected = this.reflectAcrossPlane(point, mirror)
      results.push(...this.reflectPoint(reflected, depth - 1))
    }

    return this.removeDuplicates(results)
  }
}
```

## Audio-Reactive Features

### Audio Analysis

```typescript
interface AudioAnalyzer {
  // Frequency bands
  bass: number // 20-250 Hz
  mid: number // 250-2000 Hz
  treble: number // 2000-20000 Hz

  // Full spectrum
  frequencies: Float32Array

  // Beat detection
  isBeat: boolean
  beatIntensity: number
  bpm: number

  // Waveform
  waveform: Float32Array

  // Overall
  volume: number
  energy: number
}

class AudioReactiveAnalyzer implements AudioAnalyzer {
  private audioContext: AudioContext
  private analyser: AnalyserNode
  private source:
    | MediaElementAudioSourceNode
    | MediaStreamAudioSourceNode

  constructor(source: HTMLAudioElement | MediaStream) {
    this.audioContext = new AudioContext()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 2048

    if (source instanceof HTMLAudioElement) {
      this.source = this.audioContext.createMediaElementSource(source)
    } else {
      this.source = this.audioContext.createMediaStreamSource(source)
    }

    this.source.connect(this.analyser)
    this.analyser.connect(this.audioContext.destination)
  }

  update(): void {
    const bufferLength = this.analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    this.analyser.getByteFrequencyData(dataArray)

    // Compute bands
    this.bass = this.averageRange(dataArray, 0, 10)
    this.mid = this.averageRange(dataArray, 10, 100)
    this.treble = this.averageRange(dataArray, 100, bufferLength)

    // Beat detection
    this.detectBeat()
  }
}
```

### Audio-Reactive Parameters

```typescript
interface AudioMapping {
  // Which audio feature to use
  source: 'bass' | 'mid' | 'treble' | 'volume' | 'beat' | 'frequency'
  frequencyBand?: number // For specific frequency

  // How to map to parameter
  min: number
  max: number
  smoothing: number // 0-1, higher = smoother
  attack: number // How fast to respond to increases
  release: number // How fast to decay

  // Optional transformations
  curve?: 'linear' | 'exponential' | 'logarithmic'
  invert?: boolean
}

interface AudioReactiveKaleidoscope {
  // Map audio to visual parameters
  mappings: {
    folds?: AudioMapping
    rotation?: AudioMapping
    zoom?: AudioMapping
    hue?: AudioMapping
    saturation?: AudioMapping
    brightness?: AudioMapping
    distortion?: AudioMapping
    blur?: AudioMapping
  }
}

// Example: Bass controls zoom, treble controls rotation
const musicVisualizer: AudioReactiveKaleidoscope = {
  mappings: {
    zoom: {
      source: 'bass',
      min: 0.8,
      max: 1.5,
      smoothing: 0.3,
      attack: 0.9,
      release: 0.5,
    },
    rotation: {
      source: 'treble',
      min: 0,
      max: 0.1,
      smoothing: 0.5,
      attack: 0.8,
      release: 0.3,
    },
    hue: {
      source: 'mid',
      min: 0,
      max: 360,
      smoothing: 0.7,
      attack: 0.5,
      release: 0.5,
    },
    folds: {
      source: 'beat',
      min: 4,
      max: 12,
      smoothing: 0,
      attack: 1,
      release: 0.9,
    },
  },
}
```

### Audio-Reactive Animation Loop

```typescript
class AudioReactiveRenderer {
  private kaleidoscope: Kaleidoscope
  private analyzer: AudioAnalyzer
  private mappings: AudioReactiveKaleidoscope

  // Smoothed values
  private smoothed: Record<string, number> = {}

  animate(): void {
    requestAnimationFrame(() => this.animate())

    // Update audio analysis
    this.analyzer.update()

    // Apply mappings
    for (const [param, mapping] of Object.entries(
      this.mappings.mappings,
    )) {
      const rawValue = this.getAudioValue(mapping.source)
      const mapped = this.mapValue(rawValue, mapping)
      const smoothed = this.smooth(param, mapped, mapping)

      this.applyParameter(param, smoothed)
    }

    // Render
    this.kaleidoscope.render()
  }

  private smooth(
    param: string,
    value: number,
    mapping: AudioMapping,
  ): number {
    const prev = this.smoothed[param] ?? value

    // Different smoothing for attack vs release
    const isIncreasing = value > prev
    const factor = isIncreasing ? mapping.attack : mapping.release

    const smoothed =
      prev + (value - prev) * factor * (1 - mapping.smoothing)
    this.smoothed[param] = smoothed

    return smoothed
  }
}
```

## Hybrid Approaches

### Pixel + Geometry

```typescript
class HybridKaleidoscope {
  private pixelLayer: PixelKaleidoscope
  private geometryLayer: GeometricKaleidoscope
  private blendMode: BlendMode

  render(ctx: CanvasRenderingContext2D, time: number): void {
    // Render pixel layer
    this.pixelLayer.render(ctx, time)

    // Blend geometry on top
    ctx.globalCompositeOperation = this.blendMode
    this.geometryLayer.render(ctx, time)
  }
}

type BlendMode =
  | 'source-over' // Normal
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'add' // Additive (good for glows)
  | 'difference' // Psychedelic
```

### Multiple Layers

```typescript
interface KaleidoscopeLayer {
  type: 'pixel' | 'geometry'
  source: PixelSource | GeometrySource
  folds: number
  rotation: number
  scale: number
  opacity: number
  blendMode: BlendMode

  // Audio reactivity per layer
  audioMappings?: AudioReactiveKaleidoscope
}

class LayeredKaleidoscope {
  private layers: KaleidoscopeLayer[]

  render(ctx: CanvasRenderingContext2D, time: number): void {
    for (const layer of this.layers) {
      ctx.save()
      ctx.globalAlpha = layer.opacity
      ctx.globalCompositeOperation = layer.blendMode
      ctx.rotate(layer.rotation)
      ctx.scale(layer.scale, layer.scale)

      if (layer.type === 'pixel') {
        this.renderPixelLayer(ctx, layer, time)
      } else {
        this.renderGeometryLayer(ctx, layer, time)
      }

      ctx.restore()
    }
  }
}
```

## Effects and Post-Processing

### Built-in Effects

```typescript
interface KaleidoscopeEffects {
  // Color
  hueRotate?: number // degrees
  saturation?: number // multiplier
  brightness?: number // multiplier
  contrast?: number // multiplier
  colorize?: Color

  // Distortion
  twist?: number // Spiral distortion
  bulge?: number // Fisheye effect
  wave?: { amplitude: number; frequency: number }
  noise?: number // Perlin displacement

  // Blur/Glow
  blur?: number
  glow?: { radius: number; intensity: number; color: Color }
  bloom?: number

  // Edges
  edgeDetect?: boolean
  outline?: { width: number; color: Color }
}

class EffectsProcessor {
  apply(
    source: ImageData,
    effects: KaleidoscopeEffects,
    time: number,
  ): ImageData {
    let result = source

    if (effects.twist)
      result = this.applyTwist(result, effects.twist, time)
    if (effects.bulge) result = this.applyBulge(result, effects.bulge)
    if (effects.wave)
      result = this.applyWave(result, effects.wave, time)
    if (effects.blur) result = this.applyBlur(result, effects.blur)
    if (effects.glow) result = this.applyGlow(result, effects.glow)
    if (effects.hueRotate)
      result = this.applyHueRotate(result, effects.hueRotate)

    return result
  }
}
```

### Shader-Based Effects (WebGL)

```glsl
// Post-processing fragment shader
uniform sampler2D uKaleidoscope;
uniform float uTime;
uniform float uTwist;
uniform float uHueRotate;
uniform float uGlow;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 centered = uv - 0.5;

  // Twist effect
  float r = length(centered);
  float angle = atan(centered.y, centered.x);
  angle += uTwist * r * sin(uTime);
  centered = r * vec2(cos(angle), sin(angle));

  vec4 color = texture2D(uKaleidoscope, centered + 0.5);

  // Hue rotation
  color.rgb = hueRotate(color.rgb, uHueRotate);

  // Glow
  vec4 glow = blur(uKaleidoscope, centered + 0.5, uGlow);
  color.rgb += glow.rgb * 0.5;

  gl_FragColor = color;
}
```

## API Summary

```typescript
// Simple pixel kaleidoscope
const kaleido = new PixelKaleidoscope(imageSource, 6)
kaleido.render(ctx, time)

// Geometric kaleidoscope
const geomKaleido = new GeometricKaleidoscope(particleSource, 8)
const geometry = geomKaleido.generate(time)

// Audio-reactive
const visualizer = new AudioReactiveRenderer(kaleido, audioAnalyzer, {
  mappings: {
    zoom: { source: 'bass', min: 0.8, max: 1.5 },
    rotation: { source: 'treble', min: 0, max: 0.1 },
  },
})
visualizer.start()

// Layered
const layered = new LayeredKaleidoscope([
  { type: 'pixel', source: videoSource, folds: 6, opacity: 1 },
  {
    type: 'geometry',
    source: particles,
    folds: 12,
    opacity: 0.5,
    blendMode: 'add',
  },
])
layered.render(ctx, time)

// 3D
const kaleido3d = new Kaleidoscope3D('icosahedral')
const meshes = kaleido3d.generate(time, 3)

// Hyperbolic
const hyperKaleido = new HyperbolicKaleidoscope(3, 7, 2, curveSource)
const hyperGeometry = hyperKaleido.generate(time, 5)
```

## Directory Structure

```
code/
├── kaleidoscope/
│   ├── index.ts
│   ├── pixel/
│   │   ├── pixel-kaleidoscope.ts
│   │   ├── sources/
│   │   │   ├── image-source.ts
│   │   │   ├── video-source.ts
│   │   │   ├── webcam-source.ts
│   │   │   └── generator-source.ts
│   │   └── shader.glsl
│   ├── geometric/
│   │   ├── geometric-kaleidoscope.ts
│   │   ├── hyperbolic-kaleidoscope.ts
│   │   └── sources/
│   │       ├── shape-source.ts
│   │       ├── particle-source.ts
│   │       └── curve-source.ts
│   ├── 3d/
│   │   ├── kaleidoscope-3d.ts
│   │   └── symmetry-groups.ts
│   ├── audio/
│   │   ├── analyzer.ts
│   │   ├── beat-detector.ts
│   │   └── audio-reactive.ts
│   ├── effects/
│   │   ├── processor.ts
│   │   └── shaders/
│   └── layered-kaleidoscope.ts
```
