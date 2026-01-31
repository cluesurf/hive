# Hyperbolic Tessellation Interaction Features

Documentation of interaction and animation features for hyperbolic
tessellations.

## Current Features

### Navigation (Drag)

- **Click and drag**: Pan through hyperbolic space
- **Sensitivity**: Configurable via `sensitivity` multiplier
- **Invert drag**: Option to reverse drag direction
- **Drag threshold**: Minimum pixel movement before registering

### Momentum (Throw)

- **Momentum enabled**: Toggle for inertial scrolling after release
- **Momentum decay**: How quickly momentum fades (0-1)

### View Management

- **Reset view**: Return to identity transform (center)
- **View transform**: Current accumulated Lorentz transformation

## Planned Features

### Configuration System

Each tessellation should have an independent configuration object that
can be modified at runtime:

```typescript
interface TessellationInteractionConfig {
  // Navigation
  navigation: {
    enabled: boolean
    dragSensitivity: number      // Default: 1.5 (higher = faster)
    throwSensitivity: number     // Momentum multiplier
    momentumEnabled: boolean
    momentumDecay: number        // 0-1, higher = more momentum
    invertDrag: boolean
    dragThreshold: number        // Pixels before registering drag
  }

  // Selection
  selection: {
    enabled: boolean
    multiSelect: boolean         // Allow selecting multiple tiles
    deselectOnBackground: boolean
  }

  // Focus/Navigation Animation
  focusAnimation: {
    enabled: boolean             // Auto-navigate to selected tile
    duration: number             // Animation duration in ms (default: 300)
    easing: EasingFunction       // Easing curve
  }

  // Rotation
  rotation: {
    enabled: boolean             // Two-finger rotation
    sensitivity: number
  }

  // Zoom (future)
  zoom: {
    enabled: boolean
    minZoom: number
    maxZoom: number
    sensitivity: number
  }
}
```

### Tile Selection

- Click on tile to select it (when `selection.enabled = true`)
- Visual feedback for selected tiles (highlight, outline, etc.)
- Selection callbacks: `onSelect(tile)`, `onDeselect(tile)`
- Programmatic selection: `selectTile(id)`, `deselectTile(id)`

### Focus Animation

When a tile is selected (by any method), optionally animate the view so
that tile becomes centered:

1. Compute target transform that centers the tile
2. Interpolate from current transform to target
3. Use easing function for smooth animation
4. Complete in configurable duration (default 300ms)

Animation uses hyperbolic interpolation (geodesic path), not linear
interpolation in transform space.

### Two-Finger Rotation

- Detect two-finger touch gestures
- Compute rotation angle from finger positions
- Apply rotation around the disk center
- Works in combination with panning

### Gesture Priority

When multiple gestures are possible:

1. Two fingers: Rotation (+ optional pinch zoom)
2. One finger drag: Pan navigation
3. Single tap: Selection (if enabled)

## API Design

### Per-Tessellation Control

```typescript
// Get/set configuration
tessellation.getConfig(): TessellationInteractionConfig
tessellation.setConfig(partial: Partial<TessellationInteractionConfig>)

// Enable/disable features
tessellation.enableNavigation(enabled: boolean)
tessellation.enableSelection(enabled: boolean)
tessellation.enableFocusAnimation(enabled: boolean)
tessellation.enableRotation(enabled: boolean)

// Selection API
tessellation.selectTile(id: string): void
tessellation.deselectTile(id: string): void
tessellation.getSelectedTiles(): Tile[]
tessellation.clearSelection(): void

// Focus API
tessellation.focusOnTile(id: string, animate?: boolean): void
tessellation.focusOnPoint(point: Point, animate?: boolean): void

// Events
tessellation.on('select', (tile: Tile) => void)
tessellation.on('deselect', (tile: Tile) => void)
tessellation.on('focusStart', (tile: Tile) => void)
tessellation.on('focusEnd', (tile: Tile) => void)
tessellation.on('transformChange', (transform: Matrix) => void)
```

### Global Control

```typescript
// Apply config to multiple tessellations
function applyConfigToAll(
  tessellations: Tessellation[],
  config: Partial<TessellationInteractionConfig>
): void

// Batch operations
TessellationManager.setGlobalConfig(config)
TessellationManager.enableFeature('navigation', false) // all
```

## Implementation Files

| Feature | File |
|---------|------|
| Interaction controller | `code/interaction/controller.ts` |
| Hyperbolic geometry | `code/interaction/hyperbolic2d.ts` |
| View management | `code/interaction/view.ts` |
| Types/interfaces | `code/interaction/types.ts` |
| Animation (planned) | `code/interaction/animation.ts` |
| Selection (planned) | `code/interaction/selection.ts` |
| Gestures (planned) | `code/interaction/gestures.ts` |

## Configuration Defaults

```typescript
const DEFAULT_CONFIG: TessellationInteractionConfig = {
  navigation: {
    enabled: true,
    dragSensitivity: 1.5,
    throwSensitivity: 1.0,
    momentumEnabled: false,
    momentumDecay: 0.95,
    invertDrag: false,
    dragThreshold: 2,
  },
  selection: {
    enabled: false,
    multiSelect: false,
    deselectOnBackground: true,
  },
  focusAnimation: {
    enabled: false,
    duration: 300,
    easing: 'easeOutCubic',
  },
  rotation: {
    enabled: false,
    sensitivity: 1.0,
  },
  zoom: {
    enabled: false,
    minZoom: 0.5,
    maxZoom: 2.0,
    sensitivity: 1.0,
  },
}
```

## Easing Functions

Available easing functions for animations:

- `linear`
- `easeInQuad`, `easeOutQuad`, `easeInOutQuad`
- `easeInCubic`, `easeOutCubic`, `easeInOutCubic`
- `easeInExpo`, `easeOutExpo`, `easeInOutExpo`

## Future Considerations

- Keyboard navigation (arrow keys to move between tiles)
- Gamepad/controller support
- Accessibility features (screen reader tile descriptions)
- Touch gesture customization
- Recording/playback of navigation paths
