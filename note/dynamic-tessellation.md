# Dynamic Tessellation Generation Architecture

How to implement on-demand tile generation for infinite hyperbolic
tessellations, enabling navigation through unbounded hyperbolic space
without pre-generating the entire (infinite) tessellation.

## The Core Problem

Hyperbolic space grows exponentially. A {7,3} tessellation has roughly
7 × 6^n tiles at depth n. At depth 10, that's ~362 million tiles. We
cannot pre-generate this. Instead, we need:

1. **Lazy generation** - Create tiles only when needed
2. **Spatial caching** - Keep nearby tiles, discard distant ones
3. **Stable identity** - Same tile always gets same ID when regenerated
4. **Neighbor linking** - Efficiently connect adjacent tiles

## Key Insights from HyperRogue

Based on the [HyperRogue programming documentation](https://roguetemple.com/z/hyper/dev.php)
and the HyperRogue book, several key patterns emerge:

### 1. Combinatorial Map (Tile Graph)

Each tile is an object with:
- `type` - Number of edges/neighbors (p for {p,q} tessellation)
- `move[i]` - Pointer to i-th neighbor (null if not yet generated)
- `spin[i]` - Which edge of neighbor[i] connects back to this tile
- `mirror[i]` - For non-orientable manifolds (orientation flip)

### 2. Walker Abstraction

A walker `(tile, direction)` represents a position and facing:
- `w + k` - Rotate clockwise by k edges
- `w - k` - Rotate counterclockwise by k edges
- `w + Step` - Move to adjacent tile through current edge

This abstraction works for ANY 2D tiling, making code geometry-agnostic.

### 3. Geodesic Regular Tree Structure (GRTS)

For regular {p,q} tessellations, tiles form a tree where:
- One edge per tile is the "parent edge" (toward origin)
- Other edges are "child edges" (away from origin)
- Non-tree edges connect siblings (tiles at same depth)

This gives every tile a unique path from the origin, enabling:
- Deterministic tile identity (path = ID)
- Lazy generation (follow path to create tiles)
- Efficient navigation (tree traversal)

### 4. Two Coordinate Systems

HyperRogue uses both discrete and continuous coordinates:

**Discrete (Combinatorial):**
- Each tile identified by path from origin
- Neighbors stored as pointers
- Used for game logic, pathfinding

**Continuous (Minkowski Hyperboloid):**
- Each tile has internal coordinate system
- `adj(c, i)` returns isometry mapping neighbor i's coords to tile c's coords
- Used for rendering, hit testing, physics

### 5. Distance-Based Memory Management

HyperRogue uses `mpdist` (minimum player distance):
- Tiles where player has been: mpdist = 0
- Adjacent tiles: mpdist = 1, 2, 3...
- Fully generated: mpdist ≤ 7 (visible radius)
- Partially generated: mpdist ≤ 10
- Beyond that: can be garbage collected

---

## Proposed Architecture for @cluesurf/hive

### Data Structures

```typescript
/**
 * A tile in the tessellation graph.
 * Tiles are generated lazily and linked to neighbors on demand.
 */
interface Tile {
  // Identity
  id: string                    // Deterministic ID (hash of path or center)

  // Combinatorial structure
  type: number                  // Number of edges (p for {p,q})
  neighbors: (Tile | null)[]    // Neighbor pointers (null = not yet generated)
  spins: number[]               // Which edge of neighbor connects back

  // Geometry
  center: Point                 // Center in hyperboloid coordinates
  vertices: Point[]             // Vertex positions
  transform: Matrix             // Transform from origin to this tile

  // Metadata
  depth: number                 // Distance from origin tile
  parentEdge: number            // Which edge leads to parent (-1 for origin)

  // Memory management
  lastAccessTime: number        // For LRU cache eviction
  generated: boolean            // Whether neighbors are fully generated
}

/**
 * Walker for navigating the tile graph.
 */
interface Walker {
  tile: Tile
  direction: number             // Current edge index (0 to tile.type-1)
  mirrored: boolean             // For non-orientable manifolds
}

/**
 * Dynamic tessellation manager.
 */
interface TessellationManager {
  // Configuration
  p: number                     // Polygon sides
  q: number                     // Polygons per vertex

  // State
  origin: Tile                  // Central tile (always exists)
  tiles: Map<string, Tile>      // All generated tiles by ID
  viewCenter: Point             // Current view center in hyperboloid

  // Cache management
  maxTiles: number              // Maximum tiles to keep in memory
  visibleRadius: number         // Radius of fully generated region

  // Methods
  getTileAt(point: Point): Tile | null
  getNeighbor(tile: Tile, edge: number): Tile
  getVisibleTiles(): Tile[]
  updateViewCenter(center: Point): void
  collectGarbage(): void
}
```

### Generation Strategy

#### Option A: Tree-Based (GRTS)

Every tile has a unique path from origin encoded as edge sequence:

```typescript
function generateTileByPath(path: number[]): Tile {
  let current = origin
  for (const edge of path) {
    current = getOrCreateNeighbor(current, edge)
  }
  return current
}

function getOrCreateNeighbor(tile: Tile, edge: number): Tile {
  if (tile.neighbors[edge]) {
    return tile.neighbors[edge]!
  }

  // Create new tile
  const neighbor = createTile(tile, edge)

  // Link bidirectionally
  tile.neighbors[edge] = neighbor
  neighbor.neighbors[neighbor.parentEdge] = tile
  neighbor.spins[neighbor.parentEdge] = edge
  tile.spins[edge] = neighbor.parentEdge

  // Link to siblings (other tiles sharing vertices)
  linkSiblings(neighbor)

  return neighbor
}
```

**Pros:**
- Deterministic tile IDs
- Simple parent/child relationship
- Works well for most regular tessellations

**Cons:**
- Siblings require extra linking logic
- Path encoding can be complex for non-regular tilings

#### Option B: Coordinate-Based Lookup

Identify tiles by their center's Minkowski coordinates:

```typescript
function getTileAt(point: Point): Tile {
  // Compute expected center position
  const center = snapToTileCenter(point)
  const id = hashCenter(center)

  // Check if already exists
  if (tiles.has(id)) {
    return tiles.get(id)!
  }

  // Create and link
  const tile = createTileAtCenter(center)
  tiles.set(id, tile)
  linkAllNeighbors(tile)

  return tile
}

function linkAllNeighbors(tile: Tile): void {
  for (let i = 0; i < tile.type; i++) {
    const neighborCenter = computeNeighborCenter(tile, i)
    const neighborId = hashCenter(neighborCenter)

    if (tiles.has(neighborId)) {
      const neighbor = tiles.get(neighborId)!
      tile.neighbors[i] = neighbor
      // Find which edge of neighbor this is
      const j = findMatchingEdge(neighbor, tile)
      neighbor.neighbors[j] = tile
      tile.spins[i] = j
      neighbor.spins[j] = i
    }
  }
}
```

**Pros:**
- Works for any tiling (including irregular)
- No path tracking needed
- Simple conceptually

**Cons:**
- Hash collisions possible
- Floating point precision issues
- Need to "snap" points to tile centers

#### Recommended: Hybrid Approach

Use tree-based for primary generation, coordinate-based for verification:

```typescript
function getNeighbor(tile: Tile, edge: number): Tile {
  if (tile.neighbors[edge]) {
    return tile.neighbors[edge]!
  }

  // Compute expected center of neighbor
  const neighborCenter = computeNeighborCenter(tile, edge)
  const id = hashCenter(neighborCenter)

  // Check if this tile already exists (reached from different path)
  if (tiles.has(id)) {
    const existing = tiles.get(id)!
    linkTiles(tile, edge, existing)
    return existing
  }

  // Create new tile
  const neighbor = createTileFromGeometry(neighborCenter, edge, tile)
  tiles.set(id, neighbor)
  linkTiles(tile, edge, neighbor)

  return neighbor
}
```

---

### Visible Region Management

#### BFS from View Center

```typescript
function getVisibleTiles(viewCenter: Point, viewRadius: number): Tile[] {
  const visible: Tile[] = []
  const visited = new Set<string>()

  // Find tile containing view center
  const centerTile = getTileAt(viewCenter)

  // BFS outward
  const queue: Array<{tile: Tile, dist: number}> = [
    { tile: centerTile, dist: 0 }
  ]

  while (queue.length > 0) {
    const { tile, dist } = queue.shift()!

    if (visited.has(tile.id)) continue
    visited.add(tile.id)

    // Check if tile is within view radius
    const diskDist = hyperbolicDistance(viewCenter, tile.center)
    if (diskDist > viewRadius) continue

    visible.push(tile)
    tile.lastAccessTime = Date.now()

    // Add neighbors to queue
    for (let i = 0; i < tile.type; i++) {
      const neighbor = getNeighbor(tile, i)
      if (!visited.has(neighbor.id)) {
        queue.push({ tile: neighbor, dist: dist + 1 })
      }
    }
  }

  return visible
}
```

#### Distance Metrics

Several ways to measure "distance" for cache management:

1. **Graph distance** - Number of edges from origin/player
2. **Hyperbolic distance** - Actual distance in hyperbolic space
3. **Disk distance** - Distance in Poincare disk projection (screen space)

Recommendation: Use disk distance for visibility, graph distance for cache.

---

### Cache Eviction Strategy

#### LRU with Distance Priority

```typescript
function collectGarbage(): void {
  if (tiles.size <= maxTiles) return

  // Score tiles by distance and recency
  const scored = Array.from(tiles.values())
    .filter(t => t !== origin) // Never evict origin
    .map(tile => ({
      tile,
      score: computeEvictionScore(tile)
    }))
    .sort((a, b) => b.score - a.score)

  // Evict highest-scored (most evictable) tiles
  const toEvict = scored.slice(0, tiles.size - maxTiles)

  for (const { tile } of toEvict) {
    // Unlink from neighbors
    for (let i = 0; i < tile.type; i++) {
      const neighbor = tile.neighbors[i]
      if (neighbor) {
        neighbor.neighbors[tile.spins[i]] = null
      }
    }
    tiles.delete(tile.id)
  }
}

function computeEvictionScore(tile: Tile): number {
  const age = Date.now() - tile.lastAccessTime
  const distFromView = hyperbolicDistance(viewCenter, tile.center)

  // Higher score = more likely to evict
  return age * 0.001 + distFromView * 10
}
```

---

### Stable ID Generation

Tiles must have stable IDs that survive eviction and regeneration.

#### Option A: Path-Based ID

```typescript
function computePathId(tile: Tile): string {
  const path: number[] = []
  let current = tile

  while (current !== origin) {
    path.unshift(current.parentEdge)
    current = current.neighbors[current.parentEdge]!
  }

  return path.join('-')
}
```

#### Option B: Center-Based ID

```typescript
function computeCenterId(center: Point): string {
  // Quantize to avoid floating point issues
  const precision = 1e6
  const x = Math.round(center[0] * precision)
  const y = Math.round(center[1] * precision)
  const t = Math.round(center[2] * precision)

  return `${x},${y},${t}`
}
```

#### Option C: Hash of Geometry

```typescript
function computeGeometryId(tile: Tile): string {
  // Hash the transform matrix (stable across regeneration)
  const m = tile.transform
  const data = [m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8]]
  return hashArray(data)
}
```

Recommendation: Use center-based ID with sufficient precision.

---

### Integration with Scene Graph

The dynamic tessellation feeds into the scene graph:

```typescript
function updateScene(
  manager: TessellationManager,
  scene: Scene,
  view: GeometryView
): void {
  // Get visible tiles based on current view
  const viewCenter = view.getViewCenter()
  const visibleTiles = manager.getVisibleTiles(viewCenter, visibleRadius)

  // Update scene nodes
  const existingNodes = new Set(scene.nodes.map(n => n.id))
  const visibleIds = new Set(visibleTiles.map(t => t.id))

  // Remove nodes for tiles no longer visible
  scene.nodes = scene.nodes.filter(n => visibleIds.has(n.id))

  // Add nodes for newly visible tiles
  for (const tile of visibleTiles) {
    if (!existingNodes.has(tile.id)) {
      const node = createNodeFromTile(tile)
      scene.nodes.push(node)
    }
  }

  // Garbage collect distant tiles
  manager.collectGarbage()
}
```

---

## Implementation Priority

### Phase 1: Basic Dynamic Generation
- Tile data structure with neighbor pointers
- Lazy neighbor generation
- BFS visible tile collection
- Simple center-based IDs

### Phase 2: Cache Management
- LRU eviction
- Distance-based scoring
- Tile unlinking on eviction

### Phase 3: Scene Integration
- Dynamic scene node creation/removal
- Focus persistence across regeneration
- Smooth transitions

### Phase 4: Optimization
- Spatial index for tile lookup
- Preemptive generation (ahead of navigation)
- Web worker for background generation

---

## References

- [HyperRogue Programming](https://roguetemple.com/z/hyper/dev.php) - Implementation details
- [HyperRogue Geometry Experiments](https://roguetemple.com/z/hyper/geoms.php) - Tessellation types
- HyperRogue Book - Detailed algorithms (especially Chapter 3)
- [HYPERTILING](https://arxiv.org/abs/2309.10844) - Python library for hyperbolic lattices

---

## Open Questions

1. **Web Worker Generation?** Should tile generation happen in a worker?

2. **Preemptive Generation?** Generate tiles ahead of navigation direction?

3. **Level of Detail?** Render distant tiles with less detail?

4. **Persistence?** Save/load generated tiles to IndexedDB?

5. **Multi-Scale?** Different tile sizes at different zoom levels?
