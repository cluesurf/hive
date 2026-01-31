# Coordinate Systems

How to represent and address positions in each geometry for tiles,
objects, camera, and interaction.

## Requirements

- Camera can animate to any addressable entity
- Mouse can hover/click entities
- Entities have stable IDs that persist across sessions
- Fast lookup: ID → position
- Fast query: position → nearby entities
- Serializable for save/load

## Three Levels of Addressing

### 1. Geometric Coordinates (Continuous)

Raw position in the geometry. Used for rendering and math.

| Geometry | 2D               | 3D                  |
| -------- | ---------------- | ------------------- |
| H²/H³    | `[x, y, t]` ℝ²'¹ | `[x, y, z, w]` ℝ³'¹ |
| E²/E³    | `[x, y]` ℝ²      | `[x, y, z]` ℝ³      |
| S²/S³    | `[x, y, z]` ℝ³   | `[x, y, z, w]` ℝ⁴   |

**Pros**: Exact position, works for arbitrary points. **Cons**: Not
human-readable, not stable for tiles (floating point drift).

### 2. Discrete Tile Coordinates (Grid-based)

Integer or path-based address for tiles in tessellations.

```typescript
// Option A: Word-based (like HyperRogue)
type TileAddress = string // e.g., "RRLRLLR" for reflection sequence

// Option B: Multi-index
type TileAddress = number[] // e.g., [3, 1, 2] for hierarchical index

// Option C: Axial/cube coordinates (for regular tilings)
type TileAddress = { q: number; r: number } // hex-like
```

- **Pros**: Stable, compact, human-readable.
- **Cons**: Only works for tessellations, not arbitrary points.

### 3. Entity IDs (Application-level)

Unique IDs for objects in the scene.

```typescript
interface Entity {
  id: string // UUID or user-defined
  type: 'tile' | 'node' | 'edge' | 'label' | 'marker'
  position: Point // Geometric coordinates
  tileAddress?: TileAddress // If on a tile
}
```

## Coordinate Systems by Geometry

### Hyperbolic (H²/H³)

**Intrinsic options:**

1. **Geodesic Polar** `(r, θ)` - distance r from origin, angle θ

   - Works well near origin
   - Degenerates far from origin

2. **Horocyclic** `(x, h)` - position on horocycle at height h

   - Good for parallel structures
   - Asymmetric

3. **Hyperboloid** `[x, y, t]` - embedding coordinates
   - Best for computation
   - Consistent everywhere

**For tessellations:** Use reflection word or path from center tile.

```typescript
class HyperbolicTileAddress {
  // Sequence of generator indices (which reflection/rotation)
  path: number[]

  // Convert to geometric coordinates
  toPoint(geom: Hyperbolic2D, generators: Matrix[]): Point {
    let p = geom.origin()
    for (const g of this.path) {
      p = geom.applyMatrix(generators[g], p)
    }
    return p
  }
}
```

### Euclidean (E²/E³)

**Standard options:**

1. **Cartesian** `(x, y)` or `(x, y, z)` - the obvious choice
2. **Polar/Spherical** `(r, θ)` or `(r, θ, φ)` - for radial patterns

**For regular tilings:**

```typescript
// Square grid
type SquareAddress = { x: number; y: number }

// Hex grid (axial coordinates)
type HexAddress = { q: number; r: number }

// Triangular grid
type TriAddress = { x: number; y: number; up: boolean }
```

### Spherical (S²/S³)

**Intrinsic options:**

1. **Spherical coordinates** `(θ, φ)` - latitude/longitude

   - Familiar, but has pole singularities

2. **Stereographic** `(x, y)` - projected from pole

   - Conformal, good for local work
   - Infinite at antipode

3. **Unit vector** `[x, y, z]` - embedding
   - No singularities
   - Best for computation

**For spherical tilings:** Use face index + position within face.

```typescript
class SphericalTileAddress {
  faceIndex: number // Which face of base polyhedron
  subdivision: number[] // Path within subdivided face

  toPoint(geom: Spherical2D): Point {
    // Map face to spherical triangle, subdivide
  }
}
```

## Addressing Scheme: Recommendation

Use a **three-tier system**:

```typescript
// Level 1: Geometric (for math/rendering)
type Position = Point

// Level 2: Tile-relative (for tessellations)
interface TilePosition {
  tile: TileAddress
  local: [number, number] // barycentric within tile [0-1, 0-1]
}

// Level 3: Entity (for application)
interface EntityRef {
  id: string
  cached?: {
    position: Position
    tile?: TileAddress
  }
}
```

## Entity Registry

Central registry for looking up entities.

```typescript
class EntityRegistry {
  private byId: Map<string, Entity> = new Map()
  private spatial: SpatialIndex<Entity> // R-tree or quadtree

  // Core operations
  add(entity: Entity): void
  remove(id: string): void
  get(id: string): Entity | undefined

  // Spatial queries
  at(position: Point, radius: number): Entity[]
  inView(camera: Camera): Entity[]

  // For camera/interaction
  resolve(ref: EntityRef): Position | undefined
  nearest(position: Point): Entity | undefined
}
```

## Spatial Indexing Options

### For Euclidean

- **Quadtree** (2D) / **Octree** (3D): Classic, well-understood
- **R-tree**: Good for rectangles, variable-size objects
- **Grid hash**: Simple, fast for uniform distribution

### For Hyperbolic

- **Tile-based index**: Store entities by their containing tile
- **Hierarchical by distance**: Shells at increasing distance from
  origin
- **Project to Poincare, use standard 2D index**: Works but distorts at
  edges

### For Spherical

- **Face-based index**: Divide sphere into faces, index within each
- **Hierarchical triangulation** (like S2 geometry library)
- **3D spatial index on embedding**: Simple, works well

## Camera Navigation

```typescript
interface CameraTarget {
  // Option 1: Direct position
  position?: Point

  // Option 2: Entity reference
  entity?: EntityRef

  // Option 3: Tile address
  tile?: TileAddress

  // Animation parameters
  duration?: number
  easing?: EasingFunction
}

class Camera {
  current: Point
  orientation: Matrix

  // Navigate to target
  goTo(target: CameraTarget): Animation {
    const destination = this.resolveTarget(target)
    return this.animateTo(destination)
  }

  private resolveTarget(target: CameraTarget): Point {
    if (target.position) return target.position
    if (target.entity) return registry.resolve(target.entity)
    if (target.tile) return target.tile.toPoint(this.geometry)
  }
}
```

## Hit Testing (Mouse Interaction)

```typescript
interface HitTestResult {
  entity?: Entity
  position: Point // Where in geometry
  screenPosition: [number, number] // Pixel coordinates
  distance: number // From camera
}

class HitTester {
  constructor(
    private geometry: Geometry,
    private projection: Projection,
    private registry: EntityRegistry,
  ) {}

  // Screen coordinates → entity
  pick(screenX: number, screenY: number): HitTestResult | null {
    // 1. Unproject screen to geometry
    const ray = this.projection.unprojectRay(screenX, screenY)

    // 2. Find intersections with entities
    const candidates = this.registry.inView(camera)

    // 3. Sort by distance, return closest
    return this.closestIntersection(ray, candidates)
  }

  // For hover/tooltip
  hover(screenX: number, screenY: number): Entity | null {
    const hit = this.pick(screenX, screenY)
    return hit?.entity ?? null
  }
}
```

## Serialization

```typescript
// Save format for positions
interface SavedPosition {
  // Always include geometric coords (canonical)
  coords: number[]

  // Optional: tile address for stability
  tile?: {
    type: 'word' | 'multiindex' | 'axial'
    value: string | number[]
  }
}

// Reconstruct after load
function loadPosition(saved: SavedPosition, geom: Geometry): Point {
  // If tile address present, recompute from it (more stable)
  if (saved.tile) {
    return TileAddress.fromSaved(saved.tile).toPoint(geom)
  }
  // Fall back to raw coords
  return saved.coords
}
```

## Summary: Recommended Approach

| Use Case        | Coordinate Type          |
| --------------- | ------------------------ |
| Rendering       | Geometric (`Point`)      |
| Tile lookup     | Discrete (`TileAddress`) |
| Object identity | Entity ID (`string`)     |
| Camera target   | Any (resolved to Point)  |
| Save/load       | Tile + fallback coords   |
| Hit testing     | Screen → Point → Entity  |
| Spatial queries | Geometry-specific index  |

## Pros and Cons Summary

| Approach              | Pros                        | Cons                          |
| --------------------- | --------------------------- | ----------------------------- |
| Pure geometric coords | Exact, universal            | Floating point drift, verbose |
| Tile addresses        | Stable, compact, meaningful | Only for tessellations        |
| Entity IDs + registry | Decoupled, flexible         | Lookup overhead, memory       |
| Hybrid (all three)    | Best of all worlds          | Complexity                    |
