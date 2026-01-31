# Design TODOs

Documentation and design work still needed.

## High Priority

### Group Theory / Symmetry

The math behind tessellations.

- Triangle groups
- Reflection groups
- Coxeter diagrams
- Fundamental domains
- Generator matrices for each tiling type

### Projections

Display model projections (internal coords → screen).

- Poincare disk/ball
- Klein disk/ball
- Stereographic (for spherical)
- Upper half-plane (hyperbolic)
- Projection interface and implementations

## Medium Priority

### Cellular Automata

State management and rules on hyperbolic grids.

- Cell state representation
- Neighborhood definitions (varies by tiling)
- Rule specification format
- Update strategies (sync vs async)
- History/undo

### Animation System

Detailed animation spec.

- Keyframe interpolation
- Easing functions
- Animation timeline
- Chaining/sequencing
- Camera animations specifically

### Scene Graph

Object hierarchy and layers.

- Node types (tile, group, label, path, etc.)
- Parent-child relationships
- Layer ordering
- Visibility culling
- Transform inheritance

## Lower Priority

### Event System

User interaction beyond hit testing.

- Event types (click, hover, drag, pinch, etc.)
- Event bubbling/capturing
- Gesture recognition
- Keyboard shortcuts

### Shader / GPU

Rendering implementation details.

- Vertex format
- Shader programs
- Instancing setup
- Texture atlases for tiles
- Anti-aliasing for curves

### 4D Specifics

Higher dimensional geometry details.

- 4D tessellations (honeycombs)
- 4D rotations (double rotations)
- Projection to 3D for viewing
- Navigation in 4D

## Completed

- [x] Geometry implementations (`geometry-models.md`)
- [x] Coordinate systems (`coordinate-systems.md`)
- [x] Curves theory (`curves.md`)
- [x] Curve rendering (`curve-rendering.md`)
- [x] Visual features (`visual-features.md`)
- [x] Optimization strategies (`optimization.md`)
- [x] Layer separation (`layer-separation.md`)
- [x] Design principles (`principles.md`)
- [x] Tessellation generation (`tessellation.md`)
- [x] Kaleidoscope system (`kaleidoscope.md`)
- [x] Fractal system (`fractals.md`)
- [x] Hyperbolic honeycombs (`hyperbolic-honeycombs.md`)
