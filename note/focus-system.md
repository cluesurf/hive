# Focus and Selection System Architecture

How to implement focus/selection for scene graph objects, enabling
keyboard navigation, mouse selection, programmatic control, and
camera-to-object alignment.

## Core Concepts

### Scene Graph as a Tree

The scene graph forms a tree structure where:

- Root node represents the entire scene
- Interior nodes are groups/containers
- Leaf nodes are renderable objects (polygons, paths, points, text)
- Every node has exactly one parent (except root)
- Nodes can have zero or more children

```
Scene (root)
├── TessellationGroup
│   ├── Tile_0 (polygon)
│   ├── Tile_1 (polygon)
│   └── ...
├── AnnotationsGroup
│   ├── Label_A (text)
│   └── Arrow_B (path)
└── MarkersGroup
    ├── Point_1
    └── Point_2
```

### Focus vs Selection

Two related but distinct concepts:

**Focus** (single):

- Exactly one node can be focused at a time (or none)
- Focus determines keyboard navigation context
- Visual indicator: outline, glow, or highlight
- Like DOM `document.activeElement`

**Selection** (multiple):

- Zero or more nodes can be selected simultaneously
- Selection is a set of nodes for batch operations
- Visual indicator: different fill/stroke, selection handles
- Focus is typically within selection (but not required)

For simplicity, we start with single-focus only. Multi-selection can be
added later.

## Data Structures

### SceneNode (enhanced)

Each node in the scene graph needs:

```typescript
interface SceneNode {
  // Identity
  id: string // Unique identifier
  name?: string // Human-readable name (for search/voice)
  type: NodeType // 'group' | 'polygon' | 'path' | 'point' | 'text'

  // Hierarchy
  parent: SceneNode | null // Parent reference
  children: SceneNode[] // Child nodes (empty for leaf nodes)

  // Focus/Selection
  focusable: boolean // Can this node receive focus?
  tabIndex?: number // Optional explicit focus order

  // Geometry (for hit testing and camera alignment)
  bounds?: BoundingRegion // Bounding box/circle in geometry coords
  center?: Point // Center point for camera targeting

  // Callbacks
  onFocus?: () => void // Called when node receives focus
  onBlur?: () => void // Called when node loses focus
  onSelect?: () => void // Called when node is selected
}
```

### FocusManager

Central state management for focus:

```typescript
interface FocusManager {
  // State
  focusedNode: SceneNode | null
  focusHistory: SceneNode[] // For back/forward navigation

  // Core operations
  focus(node: SceneNode): void
  blur(): void
  getFocused(): SceneNode | null

  // Tree navigation
  focusParent(): void
  focusFirstChild(): void
  focusNextSibling(): void
  focusPreviousSibling(): void

  // Search/jump
  focusById(id: string): void
  focusByName(name: string): void
  focusNearest(point: Point): void // For mouse clicks

  // History
  focusBack(): void
  focusForward(): void

  // Events
  onFocusChange(callback: (node: SceneNode | null) => void): () => void
}
```

### FocusRing (visual indicator)

Renders the focus indicator:

```typescript
interface FocusRing {
  // Configuration
  style: FocusRingStyle // outline, glow, highlight, etc.
  color: string
  thickness: number
  animated: boolean // Pulse/breathe animation

  // Rendering
  render(
    ctx: CanvasRenderingContext2D,
    node: SceneNode,
    view: GeometryView,
  ): void
}
```

## Navigation Patterns

### Keyboard Navigation

Following DOM-like conventions:

| Key         | Action                                      |
| ----------- | ------------------------------------------- |
| Tab         | Focus next focusable node (depth-first)     |
| Shift+Tab   | Focus previous focusable node               |
| ↓ (Down)    | Focus first child (or next sibling if leaf) |
| ↑ (Up)      | Focus parent                                |
| → (Right)   | Focus next sibling                          |
| ← (Left)    | Focus previous sibling                      |
| Home        | Focus first sibling                         |
| End         | Focus last sibling                          |
| Enter/Space | Activate/select focused node                |
| Escape      | Blur (unfocus) / exit current context       |
| Backspace   | Focus back (history)                        |

### Mouse Navigation

- **Click on node**: Focus that node
- **Click on empty space**: Blur (unfocus all)
- **Double-click**: Focus + activate (e.g., zoom to fit)
- **Right-click**: Context menu for focused node

### Programmatic Navigation

```typescript
// Direct focus
focusManager.focus(someNode)
focusManager.focusById('tile-42')
focusManager.focusByName('Central Heptagon')

// Relative navigation
focusManager.focusParent()
focusManager.focusFirstChild()

// Query
const focused = focusManager.getFocused()
const isFocused = focusManager.getFocused() === myNode
```

### Voice/Command Navigation (future)

```
"Focus tile 42"
"Select the central polygon"
"Go to parent"
"Zoom to focused"
```

## Hit Testing

To enable mouse click focusing, we need hit testing:

### Approach 1: Geometry-based

Test if click point is inside each node's geometry:

```typescript
interface HitTestable {
  containsPoint(point: Point, geometry: Geometry): boolean
}
```

For hyperbolic polygons, this requires:

1. Transform click from screen to Poincare disk coordinates
2. Transform from Poincare disk to hyperboloid (if needed)
3. Apply inverse view transform
4. Test point-in-polygon in hyperbolic space

### Approach 2: Render-based (simpler)

Use a separate "pick buffer" canvas:

1. Render each node with a unique color (ID encoded as RGB)
2. On click, read pixel color from pick buffer
3. Decode color to node ID

This is simpler and works for any geometry, but requires extra render
pass.

### Recommended: Hybrid

- Use render-based for initial implementation (simpler)
- Add geometry-based for nodes that need precise hit testing

## Camera Integration

When a node is focused, optionally move camera to show it well:

### ZoomToFit

Center the view on the focused node:

```typescript
interface CameraController {
  // Instant jump
  zoomToFit(node: SceneNode): void

  // Animated transition
  animateToFit(node: SceneNode, duration: number): void

  // Alignment options
  zoomToFit(
    node: SceneNode,
    options: {
      padding?: number // Space around node (in disk units)
      maxZoom?: number // Don't zoom in too far
      animate?: boolean
      duration?: number
    },
  ): void
}
```

### Implementation for Hyperbolic

To center view on a node in hyperbolic space:

1. Get node's center point in hyperboloid coordinates
2. Compute Lorentz boost that moves that point to origin
3. Apply boost to view transform
4. Optionally adjust "zoom" (Poincare disk radius scaling)

```typescript
function zoomToFit(
  node: SceneNode,
  view: GeometryView,
  geometry: InteractiveGeometry,
): void {
  const center = node.center
  if (!center) return

  // Compute translation that moves center to origin
  const diskCenter = geometry.toDisplayCoordinates(center)
  const translation = geometry.buildTranslation(diskCenter, {
    u: 0,
    v: 0,
  })

  // Apply to view
  view.setTransform(translation)
}
```

## State Management

### Global Focus State

Options for where to store focus state:

**Option A: In FocusManager singleton**

```typescript
const focusManager = new FocusManager(scene)
focusManager.focus(node)
```

**Option B: In Scene object**

```typescript
scene.focus.current = node
scene.focus.focusById('tile-42')
```

**Option C: External state (React/signals)**

```typescript
const [focusedId, setFocusedId] = useState<string | null>(null)
// FocusManager reads/writes through callbacks
```

Recommendation: Option B (Scene owns focus state) with Option C adapter
for React integration.

### Focus Events

```typescript
interface FocusEvents {
  // Global events
  onFocusChange: (
    prev: SceneNode | null,
    next: SceneNode | null,
  ) => void

  // Per-node events
  onFocus: (node: SceneNode) => void
  onBlur: (node: SceneNode) => void
}
```

## Rendering Focus Indicators

### Focus Ring Styles

1. **Outline**: Stroke around node with contrasting color
2. **Glow**: Soft blur/shadow effect
3. **Highlight**: Semi-transparent overlay
4. **Pulse**: Animated breathing effect
5. **Brackets**: Corner markers

### Rendering Order

Focus indicator should render:

1. After all scene content (on top)
2. Respecting view transform (moves with content)
3. With consistent screen-space thickness (doesn't scale with zoom)

### Implementation

```typescript
function renderFocusRing(
  ctx: CanvasRenderingContext2D,
  node: SceneNode,
  view: GeometryView,
  renderer: Canvas2DRenderer,
): void {
  if (node.type === 'polygon') {
    // Get transformed vertices
    const vertices = view.transformPoints(node.vertices)

    // Project to screen
    const screenPoints = vertices.map(v =>
      renderer.toCanvas(v, 'hyperbolic'),
    )

    // Draw focus ring
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 3
    ctx.setLineDash([5, 3])
    ctx.beginPath()
    // ... draw path through screenPoints
    ctx.stroke()
    ctx.setLineDash([])
  }
}
```

## Integration Points

### With InteractionController

```typescript
// In InteractionController
handleClick(screen: ScreenPoint): void {
  const node = this.hitTest(screen)
  if (node) {
    this.focusManager.focus(node)
  } else {
    this.focusManager.blur()
  }
}

handleKeyDown(event: KeyboardEvent): void {
  switch (event.key) {
    case 'ArrowUp':
      this.focusManager.focusParent()
      break
    case 'ArrowDown':
      this.focusManager.focusFirstChild()
      break
    // ... etc
  }
}
```

### With Renderer

```typescript
// In Canvas2DRenderer
render(scene: Scene): void {
  // 1. Clear and draw boundary
  this.clear()
  this.drawDiskBoundary()

  // 2. Render all nodes
  for (const node of flattenScene(scene)) {
    this.renderNode(node)
  }

  // 3. Render focus indicator (on top)
  const focused = scene.focus.current
  if (focused) {
    this.renderFocusRing(focused)
  }
}
```

## File Structure

```
code/focus/
├── types.ts           # FocusableNode, FocusState, FocusEvents
├── manager.ts         # FocusManager class
├── navigation.ts      # Keyboard/tree navigation logic
├── hit-test.ts        # Hit testing utilities
├── focus-ring.ts      # Focus indicator rendering
└── index.ts           # Exports

code/camera/
├── types.ts           # CameraState, CameraAnimation
├── controller.ts      # CameraController (zoom, pan, animate)
├── zoom-to-fit.ts     # ZoomToFit logic per geometry
└── index.ts           # Exports
```

## Implementation Order

1. **Phase 1: Basic Focus**

   - Add `id`, `parent`, `children` to scene nodes
   - Create FocusManager with focus/blur
   - Render simple focus ring
   - Mouse click to focus

2. **Phase 2: Keyboard Navigation**

   - Arrow key navigation (up/down/left/right)
   - Tab/Shift+Tab cycling
   - Escape to blur

3. **Phase 3: Camera Integration**

   - ZoomToFit on double-click or Enter
   - Animated transitions
   - Keyboard shortcut (e.g., 'F' for fit)

4. **Phase 4: Advanced**
   - Focus history (back/forward)
   - Search by name
   - Multi-selection
   - Accessibility announcements

## Open Questions

1. **Should groups be focusable?** Probably yes, to enable tree
   navigation.

2. **What about nodes outside view?** Should focusing a far-away node
   auto-scroll to show it?

3. **Focus persistence across regeneration?** If tessellation
   regenerates, try to re-focus equivalent node?

4. **Touch devices?** Tap = click, long-press = right-click?

## References

- DOM Focus Management:
  https://developer.mozilla.org/en-US/docs/Web/API/Document/activeElement
- WAI-ARIA Tree Pattern:
  https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
- Three.js Raycaster: https://threejs.org/docs/#api/en/core/Raycaster
