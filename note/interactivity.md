# Interactivity System

This document describes how mouse, keyboard, touch, and programmatic
interactions work while maintaining separation between core computation
and rendering.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application                                 │
│  (orchestrates everything, responds to events)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Input     │    │  Controller │    │   Renderer  │         │
│  │  Handlers   │───▶│   (State)   │───▶│  (Three.js) │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│        │                   │                   │                │
│        │                   ▼                   │                │
│        │            ┌─────────────┐            │                │
│        │            │    Core     │            │                │
│        └───────────▶│  (Tiling,   │◀───────────┘                │
│                     │   Camera)   │                             │
│                     └─────────────┘                             │
│                           │                                     │
│                           ▼                                     │
│                     ┌─────────────┐                             │
│                     │   Events    │                             │
│                     │  (Emitter)  │                             │
│                     └─────────────┘                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Core State (No DOM Dependencies)

The camera and selection state live in pure objects:

```typescript
// @geom/core

interface Camera2D {
  // Position in hyperbolic space (hyperboloid coords)
  center: HyperPoint
  // Zoom level (affects how much of hyperbolic space is visible)
  zoom: number
  // Rotation angle
  rotation: number
}

interface Camera3D {
  position: HyperPoint3D
  target: HyperPoint3D
  up: [number, number, number]
  fov: number
}

interface SelectionState {
  hoveredTile: Tile | null
  selectedTiles: Set<Tile>
  focusedTile: Tile | null
}

interface InteractionState {
  camera: Camera2D | Camera3D
  selection: SelectionState
  animation: AnimationState | null
}
```

## Camera Operations (Pure Functions)

Camera manipulation as pure functions that return new state:

```typescript
// @geom/camera

// Pan camera by hyperbolic displacement
function pan(
  camera: Camera2D,
  dx: number, // Screen-space delta
  dy: number,
  screenWidth: number,
  screenHeight: number,
): Camera2D {
  // Convert screen delta to hyperbolic displacement
  const scale = 2 / (camera.zoom * Math.min(screenWidth, screenHeight))
  const hyperbolicDx = dx * scale
  const hyperbolicDy = -dy * scale // Flip Y

  // Apply rotation
  const cos = Math.cos(-camera.rotation)
  const sin = Math.sin(-camera.rotation)
  const rotatedDx = hyperbolicDx * cos - hyperbolicDy * sin
  const rotatedDy = hyperbolicDx * sin + hyperbolicDy * cos

  // Translate in hyperbolic space
  const translation = translate(
    Math.sqrt(rotatedDx ** 2 + rotatedDy ** 2),
    Math.atan2(rotatedDy, rotatedDx),
  )
  const newCenter = applyMatrix(translation, camera.center)

  return { ...camera, center: newCenter }
}

// Zoom camera, optionally toward a point
function zoomAt(
  camera: Camera2D,
  factor: number,
  screenX: number,
  screenY: number,
  screenWidth: number,
  screenHeight: number,
): Camera2D {
  // Zoom toward the point under cursor
  const pointBefore = screenToHyperbolic(
    camera,
    screenX,
    screenY,
    screenWidth,
    screenHeight,
  )

  const newZoom = camera.zoom * factor

  // Adjust center so pointBefore stays under cursor
  const cameraAfterZoom = { ...camera, zoom: newZoom }
  const pointAfter = screenToHyperbolic(
    cameraAfterZoom,
    screenX,
    screenY,
    screenWidth,
    screenHeight,
  )

  // Translate to compensate
  const correction = translationBetween(pointAfter, pointBefore)
  const newCenter = applyMatrix(correction, camera.center)

  return { ...camera, zoom: newZoom, center: newCenter }
}

// Rotate camera around current center
function rotate(camera: Camera2D, angle: number): Camera2D {
  return { ...camera, rotation: camera.rotation + angle }
}

// Focus on a specific tile (center it)
function focusOn(camera: Camera2D, tile: Tile): Camera2D {
  return { ...camera, center: tile.center }
}
```

## Coordinate Conversion

Convert between screen, Poincare, and hyperbolic coordinates:

```typescript
// @geom/camera

function screenToHyperbolic(
  camera: Camera2D,
  screenX: number,
  screenY: number,
  screenWidth: number,
  screenHeight: number,
): HyperPoint {
  // Screen -> normalized device coords (-1 to 1)
  const ndcX = (2 * screenX) / screenWidth - 1
  const ndcY = 1 - (2 * screenY) / screenHeight

  // NDC -> Poincare disk (accounting for zoom and aspect ratio)
  const aspect = screenWidth / screenHeight
  const poincareX = (ndcX / camera.zoom) * (aspect > 1 ? aspect : 1)
  const poincareY = (ndcY / camera.zoom) * (aspect < 1 ? 1 / aspect : 1)

  // Apply inverse camera rotation
  const cos = Math.cos(-camera.rotation)
  const sin = Math.sin(-camera.rotation)
  const rotX = poincareX * cos - poincareY * sin
  const rotY = poincareX * sin + poincareY * cos

  // Poincare -> Hyperboloid (relative to camera center)
  const localPoint = fromPoincare(rotX, rotY)

  // Transform from camera-local to world coordinates
  const cameraTransform = translationToOrigin(camera.center)
  const worldPoint = applyMatrix(inverse(cameraTransform), localPoint)

  return worldPoint
}

function hyperbolicToScreen(
  camera: Camera2D,
  point: HyperPoint,
  screenWidth: number,
  screenHeight: number,
): [number, number] {
  // Inverse of above
  const cameraTransform = translationToOrigin(camera.center)
  const localPoint = applyMatrix(cameraTransform, point)

  const [poincareX, poincareY] = toPoincare(localPoint)

  // Apply camera rotation
  const cos = Math.cos(camera.rotation)
  const sin = Math.sin(camera.rotation)
  const rotX = poincareX * cos - poincareY * sin
  const rotY = poincareX * sin + poincareY * cos

  // Poincare -> NDC
  const aspect = screenWidth / screenHeight
  const ndcX = (rotX * camera.zoom) / (aspect > 1 ? aspect : 1)
  const ndcY = (rotY * camera.zoom) / (aspect < 1 ? 1 / aspect : 1)

  // NDC -> Screen
  const screenX = ((ndcX + 1) * screenWidth) / 2
  const screenY = ((1 - ndcY) * screenHeight) / 2

  return [screenX, screenY]
}
```

## Hit Testing

Find which tile is under a point:

```typescript
// @geom/tiling

function tileAtPoint(tiling: Tiling, point: HyperPoint): Tile | null {
  // Option 1: Check all tiles (simple, O(n))
  for (const tile of tiling.tiles.values()) {
    if (isPointInTile(point, tile)) {
      return tile
    }
  }
  return null
}

function isPointInTile(point: HyperPoint, tile: Tile): boolean {
  // Transform point to tile-local coordinates
  const localPoint = applyMatrix(inverse(tile.transform), point)

  // Check if inside base polygon
  // (Point-in-polygon test using winding number)
  return isPointInPolygon(localPoint, tile.polygon)
}

// Optimized: spatial index for large tilings
interface SpatialIndex {
  query(point: HyperPoint): Tile[]
  queryRadius(center: HyperPoint, radius: number): Tile[]
  insert(tile: Tile): void
  remove(tile: Tile): void
}
```

## Input Handlers (Browser Layer)

Thin layer that captures DOM events and converts to actions:

```typescript
// @geom/input (browser-specific)

interface InputHandlers {
  onPan: (dx: number, dy: number) => void
  onZoom: (factor: number, x: number, y: number) => void
  onRotate: (angle: number) => void
  onClick: (x: number, y: number, button: number) => void
  onHover: (x: number, y: number) => void
  onKeyDown: (key: string, modifiers: Modifiers) => void
  onKeyUp: (key: string) => void
}

interface Modifiers {
  shift: boolean
  ctrl: boolean
  alt: boolean
  meta: boolean
}

function attachInputHandlers(
  element: HTMLElement,
  handlers: InputHandlers,
): () => void {
  let isDragging = false
  let lastX = 0
  let lastY = 0
  let lastPinchDistance = 0

  function onMouseDown(e: MouseEvent) {
    isDragging = true
    lastX = e.clientX
    lastY = e.clientY
  }

  function onMouseMove(e: MouseEvent) {
    if (isDragging) {
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      handlers.onPan(dx, dy)
      lastX = e.clientX
      lastY = e.clientY
    } else {
      handlers.onHover(e.clientX, e.clientY)
    }
  }

  function onMouseUp(e: MouseEvent) {
    if (!isDragging) {
      handlers.onClick(e.clientX, e.clientY, e.button)
    }
    isDragging = false
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    handlers.onZoom(factor, e.clientX, e.clientY)
  }

  function onKeyDown(e: KeyboardEvent) {
    handlers.onKeyDown(e.key, {
      shift: e.shiftKey,
      ctrl: e.ctrlKey,
      alt: e.altKey,
      meta: e.metaKey,
    })
  }

  // Touch handling for mobile
  function onTouchStart(e: TouchEvent) {
    /* ... */
  }
  function onTouchMove(e: TouchEvent) {
    /* pinch zoom, pan */
  }
  function onTouchEnd(e: TouchEvent) {
    /* ... */
  }

  // Attach listeners
  element.addEventListener('mousedown', onMouseDown)
  element.addEventListener('mousemove', onMouseMove)
  element.addEventListener('mouseup', onMouseUp)
  element.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('keydown', onKeyDown)
  // ... touch events

  // Return cleanup function
  return () => {
    element.removeEventListener('mousedown', onMouseDown)
    // ... remove all
  }
}
```

## Controller (Connects Everything)

The controller mediates between input, state, and renderer:

```typescript
// @geom/controller

interface ControllerConfig {
  tiling: Tiling
  camera: Camera2D
  container: HTMLElement // Only needed for input binding
  renderer?: Renderer // Optional
}

class Controller {
  private state: InteractionState
  private tiling: Tiling
  private renderer?: Renderer
  private emitter: EventEmitter

  constructor(config: ControllerConfig) {
    this.tiling = config.tiling
    this.state = {
      camera: config.camera,
      selection: {
        hoveredTile: null,
        selectedTiles: new Set(),
        focusedTile: null,
      },
      animation: null,
    }
    this.renderer = config.renderer
    this.emitter = new EventEmitter()

    // Attach input handlers
    attachInputHandlers(config.container, {
      onPan: (dx, dy) => this.handlePan(dx, dy),
      onZoom: (factor, x, y) => this.handleZoom(factor, x, y),
      onRotate: angle => this.handleRotate(angle),
      onClick: (x, y, button) => this.handleClick(x, y, button),
      onHover: (x, y) => this.handleHover(x, y),
      onKeyDown: (key, mod) => this.handleKeyDown(key, mod),
      onKeyUp: key => this.handleKeyUp(key),
    })
  }

  // Event subscription
  on(event: string, callback: Function) {
    this.emitter.on(event, callback)
  }

  // Input handlers update state and notify
  private handlePan(dx: number, dy: number) {
    const { width, height } = this.getContainerSize()
    this.state.camera = pan(this.state.camera, dx, dy, width, height)
    this.emitter.emit('cameraChange', this.state.camera)
    this.requestRender()
  }

  private handleZoom(factor: number, x: number, y: number) {
    const { width, height } = this.getContainerSize()
    this.state.camera = zoomAt(
      this.state.camera,
      factor,
      x,
      y,
      width,
      height,
    )
    this.emitter.emit('cameraChange', this.state.camera)
    this.requestRender()
  }

  private handleClick(x: number, y: number, button: number) {
    const { width, height } = this.getContainerSize()
    const point = screenToHyperbolic(
      this.state.camera,
      x,
      y,
      width,
      height,
    )
    const tile = tileAtPoint(this.tiling, point)

    if (tile) {
      if (button === 0) {
        // Left click
        this.selectTile(tile)
      } else if (button === 2) {
        // Right click
        this.emitter.emit('tileContextMenu', tile, x, y)
      }
    } else {
      this.clearSelection()
    }
  }

  private handleHover(x: number, y: number) {
    const { width, height } = this.getContainerSize()
    const point = screenToHyperbolic(
      this.state.camera,
      x,
      y,
      width,
      height,
    )
    const tile = tileAtPoint(this.tiling, point)

    if (tile !== this.state.selection.hoveredTile) {
      const previous = this.state.selection.hoveredTile
      this.state.selection.hoveredTile = tile
      this.emitter.emit('hoverChange', tile, previous)
      this.requestRender()
    }
  }

  private handleKeyDown(key: string, mod: Modifiers) {
    // Keyboard shortcuts
    switch (key) {
      case 'Escape':
        this.clearSelection()
        break
      case 'f':
        if (this.state.selection.selectedTiles.size === 1) {
          const tile = [...this.state.selection.selectedTiles][0]
          this.focusOnTile(tile)
        }
        break
      case '/':
        this.emitter.emit('openSearch')
        break
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        this.handleArrowNavigation(key, mod)
        break
    }
  }

  // Programmatic API
  selectTile(tile: Tile, additive: boolean = false) {
    if (!additive) {
      this.state.selection.selectedTiles.clear()
    }
    this.state.selection.selectedTiles.add(tile)
    this.emitter.emit(
      'selectionChange',
      this.state.selection.selectedTiles,
    )
    this.requestRender()
  }

  clearSelection() {
    this.state.selection.selectedTiles.clear()
    this.emitter.emit(
      'selectionChange',
      this.state.selection.selectedTiles,
    )
    this.requestRender()
  }

  focusOnTile(tile: Tile, animate: boolean = true) {
    if (animate) {
      this.animateTo(tile.center)
    } else {
      this.state.camera = focusOn(this.state.camera, tile)
      this.emitter.emit('cameraChange', this.state.camera)
      this.requestRender()
    }
  }

  // Search and navigate
  async search(query: string): Promise<Tile[]> {
    // Application-defined search logic
    // Could search by tile ID, data, position, etc.
    return this.emitter.emit('search', query)
  }

  navigateToSearchResult(tile: Tile) {
    this.focusOnTile(tile, true)
    this.selectTile(tile)
  }

  // Animation
  animateTo(target: HyperPoint, duration: number = 500) {
    const start = this.state.camera.center
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(1, elapsed / duration)
      const eased = easeInOutCubic(t)

      this.state.camera = {
        ...this.state.camera,
        center: hlerp(start, target, eased),
      }

      this.emitter.emit('cameraChange', this.state.camera)
      this.requestRender()

      if (t < 1) {
        requestAnimationFrame(animate)
      } else {
        this.emitter.emit('animationComplete')
      }
    }

    requestAnimationFrame(animate)
  }

  // Render request (batched)
  private renderRequested = false
  private requestRender() {
    if (!this.renderRequested) {
      this.renderRequested = true
      requestAnimationFrame(() => {
        this.renderRequested = false
        this.render()
      })
    }
  }

  private render() {
    if (this.renderer) {
      this.renderer.render(this.tiling, this.state)
    }
  }

  // Getters
  getCamera(): Camera2D {
    return this.state.camera
  }
  getSelection(): SelectionState {
    return this.state.selection
  }
  getTiling(): Tiling {
    return this.tiling
  }
}
```

## Programmatic Interactivity

The controller exposes a clean API for programmatic control:

```typescript
// Application code

const controller = new Controller({
  tiling: myTiling,
  camera: initialCamera,
  container: document.getElementById('canvas'),
  renderer: myRenderer,
})

// Listen to events
controller.on('selectionChange', (tiles: Set<Tile>) => {
  updateSidebar(tiles)
})

controller.on('hoverChange', (tile: Tile | null) => {
  updateTooltip(tile)
})

controller.on('search', async (query: string) => {
  // Custom search logic
  return findTilesByLabel(controller.getTiling(), query)
})

// Programmatic control
async function searchAndNavigate(query: string) {
  const results = await controller.search(query)
  if (results.length > 0) {
    controller.navigateToSearchResult(results[0])
  }
}

// Navigate to specific tile
function goToTile(tileId: string) {
  const tile = controller.getTiling().tiles.get(tileId)
  if (tile) {
    controller.focusOnTile(tile, true) // Animated
    controller.selectTile(tile)
  }
}

// Zoom to fit all selected tiles
function zoomToSelection() {
  const selected = controller.getSelection().selectedTiles
  if (selected.size > 0) {
    const bounds = computeBounds([...selected])
    controller.fitToBounds(bounds, true)
  }
}

// Highlight a path
function highlightPath(path: Tile[]) {
  controller.setPath(path, { color: 'red', width: 2, animate: true })
}
```

## Keyboard Navigation

Navigate between tiles using arrow keys:

```typescript
// @geom/navigation

function getNeighborInDirection(
  tile: Tile,
  direction: 'up' | 'down' | 'left' | 'right',
  camera: Camera2D,
): Tile | null {
  // Compute direction vector in screen space
  const dirVectors = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0],
  }

  const [dx, dy] = dirVectors[direction]

  // Find neighbor whose center is most aligned with direction
  let bestNeighbor: Tile | null = null
  let bestScore = -Infinity

  for (const neighbor of tile.neighbors) {
    if (!neighbor) continue

    // Get neighbor center in screen space
    const [nx, ny] = hyperbolicToScreen(camera, neighbor.center, 1, 1)
    const [tx, ty] = hyperbolicToScreen(camera, tile.center, 1, 1)

    // Direction from tile to neighbor
    const ndx = nx - tx
    const ndy = ny - ty
    const len = Math.sqrt(ndx * ndx + ndy * ndy)

    // Dot product with desired direction
    const score = (ndx * dx + ndy * dy) / len

    if (score > bestScore && score > 0.5) {
      // Must be somewhat aligned
      bestScore = score
      bestNeighbor = neighbor
    }
  }

  return bestNeighbor
}
```

## Touch Gestures

Mobile-friendly interactions:

```typescript
// @geom/input

interface GestureState {
  type: 'none' | 'pan' | 'pinch' | 'rotate'
  startTouches: Touch[]
  lastTouches: Touch[]
}

function handleTouchGestures(
  element: HTMLElement,
  handlers: InputHandlers,
) {
  let gesture: GestureState = {
    type: 'none',
    startTouches: [],
    lastTouches: [],
  }

  function onTouchStart(e: TouchEvent) {
    e.preventDefault()
    gesture.startTouches = Array.from(e.touches)
    gesture.lastTouches = gesture.startTouches

    if (e.touches.length === 1) {
      gesture.type = 'pan'
    } else if (e.touches.length === 2) {
      gesture.type = 'pinch' // Could also be rotate
    }
  }

  function onTouchMove(e: TouchEvent) {
    e.preventDefault()
    const touches = Array.from(e.touches)

    if (gesture.type === 'pan' && touches.length === 1) {
      const dx = touches[0].clientX - gesture.lastTouches[0].clientX
      const dy = touches[0].clientY - gesture.lastTouches[0].clientY
      handlers.onPan(dx, dy)
    }

    if (gesture.type === 'pinch' && touches.length === 2) {
      // Pinch zoom
      const prevDist = touchDistance(
        gesture.lastTouches[0],
        gesture.lastTouches[1],
      )
      const currDist = touchDistance(touches[0], touches[1])
      const factor = currDist / prevDist
      const center = touchCenter(touches[0], touches[1])
      handlers.onZoom(factor, center.x, center.y)

      // Optional: detect rotation
      const prevAngle = touchAngle(
        gesture.lastTouches[0],
        gesture.lastTouches[1],
      )
      const currAngle = touchAngle(touches[0], touches[1])
      handlers.onRotate(currAngle - prevAngle)
    }

    gesture.lastTouches = touches
  }

  function onTouchEnd(e: TouchEvent) {
    if (gesture.type === 'pan' && e.changedTouches.length === 1) {
      // Detect tap
      const touch = e.changedTouches[0]
      const start = gesture.startTouches[0]
      const dist = Math.sqrt(
        (touch.clientX - start.clientX) ** 2 +
          (touch.clientY - start.clientY) ** 2,
      )
      if (dist < 10) {
        handlers.onClick(touch.clientX, touch.clientY, 0)
      }
    }
    gesture.type = 'none'
  }

  element.addEventListener('touchstart', onTouchStart, {
    passive: false,
  })
  element.addEventListener('touchmove', onTouchMove, { passive: false })
  element.addEventListener('touchend', onTouchEnd)
}
```

## Event Flow Summary

```
User Action
    │
    ▼
Input Handler (DOM events)
    │
    ▼
Controller.handleXxx()
    │
    ├──▶ Update state (camera, selection)
    │
    ├──▶ Emit events (for application to react)
    │
    └──▶ Request render
             │
             ▼
         Renderer.render(tiling, state)
             │
             ▼
         Display updated
```

## Separation Summary

| Layer       | Dependencies    | Responsibilities                     |
| ----------- | --------------- | ------------------------------------ |
| Core        | None            | Camera math, hit testing, navigation |
| Input       | DOM             | Capture events, detect gestures      |
| Controller  | Core + Input    | Mediate state, emit events           |
| Renderer    | Three.js/Canvas | Display current state                |
| Application | All             | Business logic, search, UI           |

The Controller can work without a Renderer (for testing or headless
use). The Core functions are pure and can run anywhere.
