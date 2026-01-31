# Focus System Architecture Analysis

Deep analysis of design decisions, tradeoffs, and approaches for
implementing focus/selection in a geometry visualization system.

## The Core Problem

We need a way to:
1. Track which object in the scene is currently "active"
2. Navigate between objects via multiple input methods
3. Visually indicate the focused object
4. Optionally move the camera to show focused objects

This is conceptually similar to DOM focus but with geometric complexity.

---

## Decision 1: Scene Graph Structure

### Option A: Flat List

Store all nodes in a flat array, no hierarchy.

```typescript
interface Scene {
  nodes: SceneNode[]
}
```

**Pros:**
- Simple iteration
- Easy serialization
- No parent/child bookkeeping

**Cons:**
- No logical grouping
- Navigation limited to prev/next
- Can't collapse/expand groups
- Loses semantic structure

### Option B: Tree with Parent References

Each node knows its parent and children.

```typescript
interface SceneNode {
  parent: SceneNode | null
  children: SceneNode[]
}
```

**Pros:**
- Natural hierarchical navigation
- Can traverse up/down
- Supports collapse/expand
- Matches mental model of nested objects

**Cons:**
- Must maintain bidirectional references
- Reparenting requires updating multiple references
- Potential for inconsistent state

### Option C: Tree with Child-Only References + Index

Parent stored separately in an index.

```typescript
interface SceneNode {
  children: SceneNode[]
}

interface Scene {
  root: SceneNode
  parentIndex: Map<string, SceneNode>  // nodeId -> parent
}
```

**Pros:**
- Nodes are simpler
- Index can be rebuilt from tree
- Single source of truth for hierarchy

**Cons:**
- Extra lookup for parent access
- Must keep index in sync

### Recommendation: Option B

Parent references are worth the complexity. Tree navigation is a core use
case, and looking up parent should be O(1). The bookkeeping burden is
manageable with helper functions.

---

## Decision 2: Focus State Location

### Option A: Global Singleton

```typescript
// Somewhere global
const focusState = {
  current: null as SceneNode | null
}

export function getFocused() { return focusState.current }
export function setFocused(node: SceneNode | null) { ... }
```

**Pros:**
- Simple access from anywhere
- No prop drilling
- Easy to debug

**Cons:**
- Global mutable state
- Hard to have multiple scenes
- Testing requires reset/mock
- Not reactive

### Option B: Scene-Owned State

```typescript
interface Scene {
  root: SceneNode
  focus: {
    current: SceneNode | null
    history: SceneNode[]
  }
}
```

**Pros:**
- Each scene has own focus
- State co-located with data
- Supports multiple scenes

**Cons:**
- Must pass scene around
- Deep nesting for access

### Option C: External State Manager

```typescript
class FocusManager {
  private scene: Scene
  private focused: SceneNode | null = null
  private listeners: Set<FocusChangeListener>

  focus(node: SceneNode) { ... }
  onFocusChange(listener: FocusChangeListener) { ... }
}
```

**Pros:**
- Encapsulated logic
- Event-driven updates
- Can add features (history, validation)
- Testable in isolation

**Cons:**
- Another object to manage
- Must coordinate with scene

### Option D: React/Signal State (for UI integration)

```typescript
// React
const [focusedId, setFocusedId] = useState<string | null>(null)

// Signals
const focusedId = signal<string | null>(null)
```

**Pros:**
- Reactive by design
- UI auto-updates
- Framework-native patterns

**Cons:**
- Ties to specific framework
- Core logic shouldn't depend on UI state

### Recommendation: Option C + Option D Adapter

Use a FocusManager class for core logic. Provide adapters for React
(useFocusManager hook) that sync with component state. This separates
concerns: core logic is framework-agnostic, UI integration is clean.

---

## Decision 3: Node Identification

How do we identify nodes for focusing?

### Option A: Object Reference

```typescript
focusManager.focus(someNode)  // Pass the actual object
```

**Pros:**
- Direct, no lookup needed
- Type-safe
- No ID generation

**Cons:**
- Doesn't survive serialization
- Can't focus by ID from external source
- Reference equality issues after clone/regenerate

### Option B: String ID

```typescript
interface SceneNode {
  id: string  // e.g., "tile-42", "annotation-label-1"
}

focusManager.focusById("tile-42")
```

**Pros:**
- Survives serialization
- Can reference from URLs, commands, logs
- Stable across regeneration (if IDs are deterministic)

**Cons:**
- Must ensure uniqueness
- Extra lookup step
- ID generation complexity

### Option C: Path-Based ID

```typescript
// ID is path from root: "root/tessellation/tiles/tile-42"
focusManager.focusByPath("tessellation/tiles/tile-42")
```

**Pros:**
- Encodes hierarchy
- Self-documenting
- Can pattern match ("tiles/*")

**Cons:**
- Changes when hierarchy changes
- Verbose
- Must keep paths in sync

### Recommendation: Option B with Conventions

Use string IDs. Generate deterministically where possible (e.g., tile IDs
based on position hash). Support both `focus(node)` and `focusById(id)`
for convenience.

---

## Decision 4: Hit Testing Approach

How to determine which node was clicked?

### Option A: Geometric Hit Testing

Transform click to geometry space, test each node's bounds/shape.

```typescript
function hitTest(screenPoint: ScreenPoint): SceneNode | null {
  const geometryPoint = screenToGeometry(screenPoint)
  for (const node of scene.nodes) {
    if (node.containsPoint(geometryPoint)) {
      return node
    }
  }
  return null
}
```

**Pros:**
- Mathematically precise
- Works at any zoom level
- No extra rendering

**Cons:**
- Complex for curved geometry (hyperbolic)
- Must implement for each node type
- Performance scales with node count
- Edge cases (overlapping nodes)

### Option B: Pick Buffer (Color Encoding)

Render scene to offscreen canvas with each node as unique color.

```typescript
function hitTest(screenPoint: ScreenPoint): SceneNode | null {
  const color = pickBuffer.getPixel(screenPoint.x, screenPoint.y)
  const id = colorToId(color)
  return scene.getNodeById(id)
}
```

**Pros:**
- Works for any geometry
- Constant time lookup
- Handles complex shapes automatically
- GPU accelerated

**Cons:**
- Extra render pass
- Memory for pick buffer
- Limited to ~16M nodes (24-bit color)
- Must keep pick buffer in sync

### Option C: Spatial Index (R-tree, Quadtree)

Build spatial index of node bounding boxes.

```typescript
const index = new RTree()
for (const node of scene.nodes) {
  index.insert(node.bounds, node)
}

function hitTest(point: Point): SceneNode | null {
  return index.query(point)[0]
}
```

**Pros:**
- Fast queries O(log n)
- Good for large scenes
- Can query regions

**Cons:**
- Must rebuild on changes
- Bounding boxes may overlap
- Complex for non-Euclidean geometries

### Recommendation: Option B for Now, Option C Later

Pick buffer is simpler to implement and works correctly for any geometry.
Add spatial indexing if performance becomes an issue with large scenes.

---

## Decision 5: Keyboard Navigation Model

### Option A: Linear (Tab Order)

Nodes have a linear order, Tab/Shift+Tab cycles through.

```typescript
interface SceneNode {
  tabIndex?: number  // Explicit order, or use tree order
}
```

**Pros:**
- Simple mental model
- Familiar from web
- Easy to implement

**Cons:**
- Doesn't leverage tree structure
- Long lists require many tabs
- No spatial relationship

### Option B: Tree Navigation (Arrow Keys)

Up/Down for parent/child, Left/Right for siblings.

**Pros:**
- Leverages hierarchy
- Faster navigation in deep trees
- Matches file browser pattern

**Cons:**
- Must maintain correct tree structure
- Less familiar to some users
- Needs visual tree indicator

### Option C: Spatial Navigation

Arrow keys move to nearest node in that direction.

```typescript
function focusInDirection(direction: 'up' | 'down' | 'left' | 'right') {
  const current = focusManager.getFocused()
  const candidates = scene.nodes.filter(n => isInDirection(current, n, direction))
  const nearest = findNearest(current, candidates)
  focusManager.focus(nearest)
}
```

**Pros:**
- Intuitive for visual layouts
- Works well for grids
- Matches spatial relationship

**Cons:**
- Complex for non-Euclidean geometries
- "Nearest" is ambiguous in hyperbolic space
- May not reach all nodes

### Recommendation: Option B Primary, Option A Fallback

Use tree navigation for arrow keys. Support Tab as linear fallback. Don't
try spatial navigation initially (hyperbolic space makes "direction"
tricky).

---

## Decision 6: Focus Persistence

What happens to focus when scene changes?

### Option A: Clear on Change

Any scene modification clears focus.

**Pros:**
- Simple
- No stale references

**Cons:**
- Frustrating user experience
- Loses context during updates

### Option B: Preserve by ID

Store focused ID, restore after change if node still exists.

```typescript
const focusedId = focusManager.getFocusedId()
scene.regenerate()
if (scene.hasNode(focusedId)) {
  focusManager.focusById(focusedId)
}
```

**Pros:**
- Better UX
- Works if IDs are stable

**Cons:**
- ID might not survive regeneration
- Node might be different (new vertices, position)

### Option C: Preserve by Semantic Key

For tessellations, identify tiles by geometric properties.

```typescript
interface TileNode {
  semanticKey: string  // e.g., hash of center position
}
```

**Pros:**
- Survives regeneration
- Based on meaningful identity

**Cons:**
- Domain-specific
- May be ambiguous

### Recommendation: Option B with Stable IDs

Design ID generation to be deterministic. For tiles, use hash of initial
center position. If node disappears, clear focus gracefully.

---

## Decision 7: Visual Feedback

How to show which node is focused?

### Option A: Overlay Ring

Draw stroke/outline around focused node.

**Pros:**
- Clear indication
- Works for any shape
- Familiar pattern

**Cons:**
- May obscure node details
- Ring thickness in screen vs geometry space?

### Option B: Color Change

Change fill/stroke color of focused node.

**Pros:**
- Integrated look
- Doesn't add visual clutter

**Cons:**
- May conflict with semantic coloring
- Less obvious

### Option C: Glow/Shadow

Add outer glow or drop shadow.

**Pros:**
- Visually appealing
- Doesn't obscure content

**Cons:**
- Performance (blur is expensive)
- May look odd at edges

### Option D: Animation

Pulse, breathe, or subtle movement.

**Pros:**
- Draws attention
- Distinctive

**Cons:**
- Can be distracting
- Accessibility concerns

### Recommendation: Option A with Option D

Dashed outline (like selection rectangles) with subtle pulse animation.
Make it configurable.

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                         Scene                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │                  SceneNode Tree                  │   │
│  │   - id: string                                   │   │
│  │   - parent: SceneNode | null                     │   │
│  │   - children: SceneNode[]                        │   │
│  │   - focusable: boolean                           │   │
│  │   - bounds: BoundingRegion                       │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                     FocusManager                        │
│  - focused: SceneNode | null                            │
│  - history: SceneNode[]                                 │
│  - focus(node) / blur() / focusById(id)                │
│  - focusParent() / focusFirstChild() / focusSibling()  │
│  - onFocusChange(callback)                              │
└─────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│ HitTestManager  │ │ FocusRing   │ │ CameraController│
│ - pickBuffer    │ │ - style     │ │ - zoomToFit()   │
│ - hitTest(pt)   │ │ - render()  │ │ - animateTo()   │
└─────────────────┘ └─────────────┘ └─────────────────┘
           │               │               │
           └───────────────┼───────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│                 InteractionController                   │
│  - handleClick() → hitTest → focus                      │
│  - handleKeyDown() → navigation                         │
│  - integrates mouse, keyboard, touch, voice             │
└─────────────────────────────────────────────────────────┘
```

## Implementation Priority

1. **Must Have (Phase 1):**
   - SceneNode with id, parent, children
   - FocusManager with focus/blur/getFocused
   - Basic focus ring rendering
   - Click to focus (simple hit test)

2. **Should Have (Phase 2):**
   - Keyboard navigation (arrows, tab)
   - Focus history (back/forward)
   - Pick buffer hit testing
   - FocusById

3. **Nice to Have (Phase 3):**
   - ZoomToFit camera integration
   - Animated transitions
   - Focus by name/search
   - Multi-selection

4. **Future (Phase 4):**
   - Voice commands
   - Accessibility announcements
   - Focus trapping for modals
   - Roving tabindex pattern
