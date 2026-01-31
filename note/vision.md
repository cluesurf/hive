# Geometric Visualization Library Vision

## Goal

Build a TypeScript library for rendering and interacting with geometric
structures across multiple space types. The library should support:

- **Hyperbolic spaces** (2D and 3D)
- **Euclidean spaces** (2D and 3D)
- **Spherical spaces** (2D and 3D)
- **Higher dimensions** (4D+ projections)

## Use Cases

1. **Tessellations and Tilings**

   - Regular tilings {p,q} in all geometries
   - Uniform tilings (Wythoff constructions)
   - 3D honeycombs {p,q,r}
   - Aperiodic tilings

2. **Cellular Automata**

   - Rule-based systems on hyperbolic grids
   - Maurice Margenstern-style CA
   - Infinite sparse world simulation

3. **Kaleidoscopes**

   - 2D reflection groups
   - 3D kaleidoscopic effects
   - Interactive mirror manipulation

4. **Fractals**

   - Iterated function systems
   - Limit sets of Kleinian groups
   - Apollonian gaskets
   - Hyperbolic fractals

5. **Graph Networks**

   - Mesh/lattice visualization
   - Tree structures in hyperbolic space
   - Node-link diagrams

6. **Composite Scenes**
   - Multiple geometric objects
   - Embedded structures (spheres in hyperbolic space)
   - Connected shapes via curved paths
   - Artistic compositions

## Design Principles

1. **Separation of Concerns**

   - Geometry (points, lines, polygons) separate from rendering
   - Topology (adjacency, connectivity) separate from coordinates
   - Transformations as composable operations

2. **Multiple Representations**

   - Internal: hyperboloid model (cleanest math)
   - Display: Poincaré disk (familiar), Klein, upper half-plane
   - Allow switching between models dynamically

3. **Scalability**

   - Finite explicit tilings for interaction
   - Infinite implicit tilings for rendering
   - Level-of-detail for performance

4. **Interactivity**

   - Camera navigation (pan, zoom, rotate)
   - Object selection and manipulation
   - Animation support
   - Touch and mouse input

5. **Rendering Flexibility**
   - WebGL for performance
   - Canvas 2D for simplicity
   - SVG for export
   - Server-side rendering option

## Repository Analysis Summary

| Source                  | Strengths                                    | Weaknesses            |
| ----------------------- | -------------------------------------------- | --------------------- |
| ht.js                   | Clean TypeScript geometry, Mobius transforms | No rendering          |
| MagicTile               | Complete 2D system, multiple models          | C#, puzzle-focused    |
| Honeycombs              | 3D honeycombs, R3.Core library               | C#, POV-Ray output    |
| hyperbolic-tiling       | Fast GPU rendering, Wythoff support          | No topology           |
| hyperbolic-ca-simulator | Infinite tilings, von Dyck groups            | CoffeeScript, complex |
| hyperboloid-model       | Clean hyperboloid math                       | Minimal, JS           |

## Recommended Approach

Hybrid architecture combining the best of each:

1. **Core Geometry** from ht.js-make (Mobius, Circle, Polygon, Segment)
2. **Hyperboloid Math** from hyperboloid-model (internal representation)
3. **Group Theory** from hyperbolic-ca-simulator (infinite tilings)
4. **GPU Rendering** from hyperbolic-tiling-main (shader approach)
5. **3D Support** from Honeycombs (extend to 3D)

## Package Structure (Proposed)

```
@geom/core      - Points, vectors, complex numbers
@geom/transform - Mobius, matrices, isometries
@geom/model     - Hyperboloid, Poincare, Klein, etc.
@geom/tiling    - Tessellation generation
@geom/group     - Triangle groups, von Dyck groups
@geom/render    - WebGL, Canvas, SVG renderers
@geom/interact  - Camera, selection, animation
@geom/scene     - Composite scene management
```

## Key Technical Decisions

1. **Coordinate System**: Hyperboloid model internally, convert for
   display
2. **Tile Storage**: Sparse map keyed by group elements for infinite
   worlds
3. **Rendering**: Shader-based for visualization, CPU-based for
   interaction
4. **Transformations**: Matrix-based (3x3 for 2D, 4x4 for 3D)
5. **Precision**: Use BigInt or arbitrary precision for deep zoom
