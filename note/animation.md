# Animation System Architecture

A complete animation system for hyperbolic geometry visualization,
supporting camera movement, shape transformations, and complex
choreographed sequences.

## Core Concepts

### Animation as Data

Animations are described as pure data, not imperative code:

```typescript
interface Animation<T> {
  id: string
  target: T // What to animate
  property: keyof T | string // Which property
  from: number | number[] // Start value
  to: number | number[] // End value
  duration: number // Milliseconds
  delay?: number // Start delay
  easing?: EasingFunction // Timing function
  loop?: LoopMode // Repeat behavior
  onStart?: () => void
  onUpdate?: (progress: number) => void
  onComplete?: () => void
}

type LoopMode =
  | 'none' // Play once
  | 'repeat' // Loop from start
  | 'pingpong' // Reverse at end
  | { count: number } // Repeat N times
```

### Easing Functions

Standard easing library:

```typescript
type EasingFunction = (t: number) => number

const Easing = {
  // Linear
  linear: (t: number) => t,

  // Quadratic
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) =>
    t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  // Cubic
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  // Exponential
  easeInExpo: (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),

  // Elastic
  easeOutElastic: (t: number) => {
    const p = 0.3
    return (
      Math.pow(2, -10 * t) *
        Math.sin(((t - p / 4) * (2 * Math.PI)) / p) +
      1
    )
  },

  // Bounce
  easeOutBounce: (t: number) => {
    if (t < 1 / 2.75) return 7.5625 * t * t
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375
  },

  // Custom bezier
  bezier: (x1: number, y1: number, x2: number, y2: number) => {
    // Returns easing function from cubic bezier control points
    return (t: number) => {
      // Bezier calculation...
    }
  },
}
```

## Camera Animations

### Pan/Translate

Move camera through hyperbolic space along a geodesic:

```typescript
interface CameraPanAnimation {
  type: 'pan'
  from: HyperPoint
  to: HyperPoint
  duration: number
  easing?: EasingFunction
}

function interpolateCameraPan(
  animation: CameraPanAnimation,
  t: number,
): HyperPoint {
  const eased = (animation.easing ?? Easing.easeInOutCubic)(t)
  return hlerp(animation.from, animation.to, eased)
}
```

### Zoom

Animate zoom level:

```typescript
interface CameraZoomAnimation {
  type: 'zoom'
  from: number
  to: number
  pivot?: HyperPoint // Zoom toward this point
  duration: number
  easing?: EasingFunction
}

function interpolateCameraZoom(
  camera: Camera2D,
  animation: CameraZoomAnimation,
  t: number,
): Camera2D {
  const eased = (animation.easing ?? Easing.easeInOutQuad)(t)
  const zoom = lerp(animation.from, animation.to, eased)

  if (animation.pivot) {
    // Adjust center to keep pivot point stationary
    // ... pivot calculation
  }

  return { ...camera, zoom }
}
```

### Rotation

Rotate view around center:

```typescript
interface CameraRotateAnimation {
  type: 'rotate'
  from: number // Radians
  to: number
  duration: number
  easing?: EasingFunction
}
```

### Focus on Tile

Combined pan + zoom to frame a tile:

```typescript
interface FocusAnimation {
  type: 'focus'
  target: Tile | HyperPoint
  padding?: number // Extra space around target
  duration: number
  easing?: EasingFunction
}

function createFocusAnimation(
  camera: Camera2D,
  target: Tile,
  duration: number,
): Animation<Camera2D>[] {
  return [
    {
      id: 'focus-pan',
      target: camera,
      property: 'center',
      from: camera.center,
      to: target.center,
      duration,
      easing: Easing.easeInOutCubic,
    },
    {
      id: 'focus-zoom',
      target: camera,
      property: 'zoom',
      from: camera.zoom,
      to: calculateZoomForTile(target),
      duration,
      easing: Easing.easeInOutQuad,
    },
  ]
}
```

### Orbit (3D)

For 3D hyperbolic space, orbit around a point:

```typescript
interface OrbitAnimation {
  type: 'orbit'
  center: HyperPoint3D
  startAngle: number
  endAngle: number
  elevation?: number
  duration: number
}
```

### Camera Path

Follow a predefined path through space:

```typescript
interface CameraPathAnimation {
  type: 'path'
  waypoints: HyperPoint[]
  durations: number[] // Time between waypoints
  smoothing?: 'linear' | 'catmull-rom' | 'bezier'
}

function interpolateCameraPath(
  animation: CameraPathAnimation,
  totalTime: number,
): HyperPoint {
  // Find which segment we're in
  let accumulated = 0
  for (let i = 0; i < animation.durations.length; i++) {
    if (accumulated + animation.durations[i] > totalTime) {
      const segmentT =
        (totalTime - accumulated) / animation.durations[i]
      return interpolateSegment(
        animation.waypoints[i],
        animation.waypoints[i + 1],
        segmentT,
        animation.smoothing,
      )
    }
    accumulated += animation.durations[i]
  }
  return animation.waypoints[animation.waypoints.length - 1]
}
```

## Shape Animations

### Tile Shrink/Grow

Animate the shrink factor of tiles:

```typescript
interface TileShrinkAnimation {
  type: 'shrink'
  tiles: Tile[] | 'all'
  from: number
  to: number
  duration: number
  stagger?: number // Delay between tiles
  staggerOrder?: 'distance' | 'random' | 'index'
}
```

### Tile Color/Opacity

Animate visual properties:

```typescript
interface TileStyleAnimation {
  type: 'style'
  tiles: Tile[]
  property: 'fillColor' | 'strokeColor' | 'opacity' | 'strokeWidth'
  from: string | number
  to: string | number
  duration: number
  stagger?: number
}
```

### Tile Transform

Animate a tile's position/rotation:

```typescript
interface TileTransformAnimation {
  type: 'transform'
  tile: Tile
  from: Matrix3
  to: Matrix3
  duration: number
  easing?: EasingFunction
}

function interpolateMatrix(
  from: Matrix3,
  to: Matrix3,
  t: number,
): Matrix3 {
  // Decompose, interpolate, recompose
  const fromDecomp = decomposeMatrix(from)
  const toDecomp = decomposeMatrix(to)

  return composeMatrix({
    translation: hlerp(fromDecomp.translation, toDecomp.translation, t),
    rotation: lerpAngle(fromDecomp.rotation, toDecomp.rotation, t),
    scale: lerp(fromDecomp.scale, toDecomp.scale, t),
  })
}
```

### Morphing Polygons

Animate between polygon shapes:

```typescript
interface MorphAnimation {
  type: 'morph'
  from: Polygon
  to: Polygon
  duration: number
}

function interpolatePolygon(
  from: Polygon,
  to: Polygon,
  t: number,
): Polygon {
  // Vertices must have same count
  if (from.vertices.length !== to.vertices.length) {
    throw new Error('Polygon vertex counts must match')
  }

  return {
    vertices: from.vertices.map((v, i) => hlerp(v, to.vertices[i], t)),
    center: hlerp(from.center, to.center, t),
  }
}
```

## Path Animations

### Draw Path

Animate a path being drawn:

```typescript
interface DrawPathAnimation {
  type: 'draw'
  path: TilePath
  duration: number
  easing?: EasingFunction
}

function getPartialPath(path: TilePath, progress: number): TilePath {
  const totalLength = calculatePathLength(path)
  const targetLength = totalLength * progress

  // Return path up to targetLength
  return truncatePath(path, targetLength)
}
```

### Trace Path

Animate a marker moving along a path:

```typescript
interface TracePathAnimation {
  type: 'trace'
  path: TilePath
  marker: Marker
  duration: number
  easing?: EasingFunction
  trail?: {
    length: number // How much trail to show
    fade: boolean // Fade out trail
  }
}
```

### Pulse Path

Animate a pulse traveling along a path:

```typescript
interface PulsePathAnimation {
  type: 'pulse'
  path: TilePath
  pulseWidth: number // In hyperbolic units
  pulseColor: string
  duration: number
  repeat?: number
}
```

## Choreography

### Sequences

Play animations one after another:

```typescript
interface Sequence {
  type: 'sequence'
  animations: (Animation<any> | Sequence | Parallel)[]
}

function createSequence(...animations: Animation<any>[]): Sequence {
  return { type: 'sequence', animations }
}

// Usage
const intro = createSequence(
  fadeIn(allTiles, 500),
  zoomTo(centerTile, 1000),
  highlightPath(mainPath, 800),
)
```

### Parallel

Play animations simultaneously:

```typescript
interface Parallel {
  type: 'parallel'
  animations: (Animation<any> | Sequence | Parallel)[]
}

function createParallel(...animations: Animation<any>[]): Parallel {
  return { type: 'parallel', animations }
}

// Usage
const transition = createParallel(
  panTo(newCenter, 500),
  zoomTo(2.0, 500),
  fadeOut(oldTiles, 300),
)
```

### Stagger

Apply same animation to multiple targets with delay:

```typescript
interface Stagger<T> {
  type: 'stagger'
  targets: T[]
  animation: Omit<Animation<T>, 'target'>
  staggerDelay: number
  order?: 'sequential' | 'reverse' | 'random' | 'distance-from-center'
}

function stagger<T>(
  targets: T[],
  animation: Omit<Animation<T>, 'target'>,
  delay: number,
): Stagger<T> {
  return {
    type: 'stagger',
    targets,
    animation,
    staggerDelay: delay,
  }
}

// Usage: Ripple effect from center
const ripple = stagger(
  sortByDistanceFromCenter(tiles),
  { property: 'opacity', from: 0, to: 1, duration: 300 },
  50,
)
```

## Timeline

### Timeline Controller

Manage complex animation timelines:

```typescript
class Timeline {
  private animations: Map<string, AnimationState> = new Map()
  private time: number = 0
  private playing: boolean = false
  private speed: number = 1.0

  // Add animations
  add(animation: Animation<any> | Sequence | Parallel): this

  // Playback control
  play(): void
  pause(): void
  stop(): void
  seek(time: number): void
  reverse(): void

  // Speed control
  setSpeed(speed: number): void

  // Events
  onUpdate: (time: number) => void
  onComplete: () => void

  // Frame update
  tick(deltaTime: number): void {
    if (!this.playing) return

    this.time += deltaTime * this.speed
    this.updateAnimations(this.time)

    if (this.isComplete()) {
      this.playing = false
      this.onComplete?.()
    }
  }
}
```

### Keyframe Animation

Define animation as keyframes:

```typescript
interface Keyframe<T> {
  time: number // Milliseconds from start
  value: T
  easing?: EasingFunction
}

interface KeyframeAnimation<T> {
  type: 'keyframes'
  target: any
  property: string
  keyframes: Keyframe<T>[]
}

// Usage
const cameraKeyframes: KeyframeAnimation<HyperPoint> = {
  type: 'keyframes',
  target: camera,
  property: 'center',
  keyframes: [
    { time: 0, value: origin },
    { time: 1000, value: pointA, easing: Easing.easeInQuad },
    { time: 2000, value: pointB },
    { time: 4000, value: origin, easing: Easing.easeOutQuad },
  ],
}
```

## Spring Physics

For natural-feeling motion:

```typescript
interface SpringConfig {
  stiffness: number // Higher = faster
  damping: number // Higher = less oscillation
  mass: number
}

interface SpringAnimation<T> {
  type: 'spring'
  target: any
  property: string
  from: T
  to: T
  config: SpringConfig
}

class Spring {
  position: number
  velocity: number
  target: number
  config: SpringConfig

  update(dt: number): boolean {
    const { stiffness, damping, mass } = this.config

    // Spring physics
    const displacement = this.position - this.target
    const springForce = -stiffness * displacement
    const dampingForce = -damping * this.velocity
    const acceleration = (springForce + dampingForce) / mass

    this.velocity += acceleration * dt
    this.position += this.velocity * dt

    // Check if settled
    return (
      Math.abs(displacement) > 0.001 || Math.abs(this.velocity) > 0.001
    )
  }
}
```

For hyperbolic space, adapt springs to work with hyperboloid
coordinates:

```typescript
class HyperbolicSpring {
  position: HyperPoint
  velocity: HyperPoint // Tangent vector
  target: HyperPoint
  config: SpringConfig

  update(dt: number): boolean {
    // Project spring physics onto hyperboloid
    // Use exponential map for velocity integration
  }
}
```

## Animator

Central animation manager:

```typescript
class Animator {
  private active: Map<string, AnimationState> = new Map()
  private lastTime: number = 0

  // Start an animation
  start(animation: Animation<any>): string {
    const id = animation.id ?? generateId()
    this.active.set(id, {
      animation,
      startTime: performance.now(),
      progress: 0,
    })
    return id
  }

  // Cancel an animation
  cancel(id: string): void {
    this.active.delete(id)
  }

  // Cancel all animations
  cancelAll(): void {
    this.active.clear()
  }

  // Check if any animations running
  isAnimating(): boolean {
    return this.active.size > 0
  }

  // Frame update
  tick(time: number): void {
    const dt = time - this.lastTime
    this.lastTime = time

    for (const [id, state] of this.active) {
      const elapsed =
        time - state.startTime - (state.animation.delay ?? 0)

      if (elapsed < 0) continue // Still in delay

      const progress = Math.min(1, elapsed / state.animation.duration)
      const eased = (state.animation.easing ?? Easing.linear)(progress)

      // Apply animation
      this.applyAnimation(state.animation, eased)

      // Handle completion
      if (progress >= 1) {
        state.animation.onComplete?.()

        if (state.animation.loop === 'repeat') {
          state.startTime = time
        } else if (state.animation.loop === 'pingpong') {
          // Swap from/to and restart
          const temp = state.animation.from
          state.animation.from = state.animation.to
          state.animation.to = temp
          state.startTime = time
        } else {
          this.active.delete(id)
        }
      }
    }
  }

  private applyAnimation(animation: Animation<any>, t: number): void {
    const value = this.interpolate(animation.from, animation.to, t)
    setProperty(animation.target, animation.property, value)
    animation.onUpdate?.(t)
  }

  private interpolate(from: any, to: any, t: number): any {
    if (typeof from === 'number') {
      return lerp(from, to, t)
    }
    if (isHyperPoint(from)) {
      return hlerp(from, to, t)
    }
    if (isColor(from)) {
      return lerpColor(from, to, t)
    }
    if (Array.isArray(from)) {
      return from.map((v, i) => this.interpolate(v, to[i], t))
    }
    return t < 0.5 ? from : to
  }
}
```

## Integration with Controller

```typescript
class Controller {
  private animator: Animator

  constructor(config: ControllerConfig) {
    this.animator = new Animator()
    // ...
  }

  // Animated camera movements
  panTo(target: HyperPoint, duration: number = 500): Promise<void> {
    return new Promise(resolve => {
      this.animator.start({
        id: 'camera-pan',
        target: this.state.camera,
        property: 'center',
        from: this.state.camera.center,
        to: target,
        duration,
        easing: Easing.easeInOutCubic,
        onUpdate: () => this.requestRender(),
        onComplete: resolve,
      })
    })
  }

  zoomTo(zoom: number, duration: number = 300): Promise<void> {
    return new Promise(resolve => {
      this.animator.start({
        id: 'camera-zoom',
        target: this.state.camera,
        property: 'zoom',
        from: this.state.camera.zoom,
        to: zoom,
        duration,
        easing: Easing.easeInOutQuad,
        onUpdate: () => this.requestRender(),
        onComplete: resolve,
      })
    })
  }

  // Choreographed sequences
  async flyTo(tile: Tile): Promise<void> {
    await Promise.all([
      this.panTo(tile.center, 800),
      this.zoomTo(calculateZoomForTile(tile), 800),
    ])
  }

  async highlightPath(
    path: Tile[],
    duration: number = 1000,
  ): Promise<void> {
    // Staggered highlight animation
  }

  // Frame loop integration
  private frameLoop = (time: number) => {
    this.animator.tick(time)
    if (this.animator.isAnimating()) {
      requestAnimationFrame(this.frameLoop)
    }
  }
}
```

## Declarative Animation DSL

For complex choreography, a declarative syntax:

```typescript
const animation = timeline()
  .at(0)
  .animate(camera, 'zoom')
  .from(1)
  .to(2)
  .duration(500)
  .animate(tiles[0], 'opacity')
  .from(0)
  .to(1)
  .duration(300)
  .at(500)
  .parallel(
    animate(camera, 'center').to(targetPoint).duration(800),
    stagger(tiles, 'shrink').from(1).to(0.8).delay(20).duration(300),
  )
  .at(1300)
  .sequence(
    animate(path, 'draw').from(0).to(1).duration(600),
    animate(marker, 'position').along(path).duration(1000),
  )
  .build()

// Play it
animation.play()
```

## Summary

| Animation Type | Use Case                      |
| -------------- | ----------------------------- |
| Tween          | Simple A→B transitions        |
| Spring         | Natural, physics-based motion |
| Keyframes      | Complex multi-point paths     |
| Sequence       | One-after-another             |
| Parallel       | Simultaneous animations       |
| Stagger        | Ripple/wave effects           |
| Timeline       | Orchestrated sequences        |

All animation primitives work with hyperbolic interpolation (hlerp) for
proper geodesic motion in curved space.
