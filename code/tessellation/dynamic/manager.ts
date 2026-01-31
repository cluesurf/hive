import type { Point } from '@/form/point'
import type { Matrix } from '@/form/matrix'
import type { Tile, DynamicTessellationConfig } from './types'
import { DEFAULT_DYNAMIC_CONFIG } from './types'
import { Hyperbolic2D } from '@/math/geometry/hyperbolic2d'
import { identity } from '@/form/matrix'

/**
 * Dynamic tessellation manager.
 * Generates tiles lazily as the view moves through hyperbolic space.
 * Uses edge reflection (same as static tessellation) for correct geometry.
 */
export class DynamicTessellationManager {
  private config: DynamicTessellationConfig
  private geometry: Hyperbolic2D
  private tiles: Map<string, Tile> = new Map()
  private origin: Tile
  private viewCenter: Point = [0, 0, 1]
  private viewTransform: Matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1]

  // Precomputed geometry values
  private edgeLength: number
  private circumradius: number

  constructor(config: Partial<DynamicTessellationConfig> = {}) {
    this.config = { ...DEFAULT_DYNAMIC_CONFIG, ...config }
    this.geometry = new Hyperbolic2D()
    this.edgeLength = this.calculateEdgeLength()
    this.circumradius = this.calculateCircumradius()
    this.origin = this.createOriginTile()
    this.tiles.set(this.origin.id, this.origin)
  }

  /**
   * Calculate the edge length for a regular {p,q} polygon in hyperbolic space.
   * cosh(a/2) = cos(π/q) / sin(π/p)
   */
  private calculateEdgeLength(): number {
    const { p, q } = this.config
    const angleP = Math.PI / p
    const angleQ = Math.PI / q
    const coshHalfA = Math.cos(angleQ) / Math.sin(angleP)
    return 2 * Math.acosh(coshHalfA)
  }

  /**
   * Calculate the circumradius (distance from center to vertex).
   * cosh(R) = cos(π/p)cos(π/q) / (sin(π/p)sin(π/q))
   */
  private calculateCircumradius(): number {
    const { p, q } = this.config
    const angleP = Math.PI / p
    const angleQ = Math.PI / q
    const coshR =
      (Math.cos(angleP) * Math.cos(angleQ)) /
      (Math.sin(angleP) * Math.sin(angleQ))
    return Math.acosh(coshR)
  }

  /**
   * Create the origin (central) tile at the origin of hyperbolic space.
   */
  private createOriginTile(): Tile {
    const { p } = this.config
    const vertices: Point[] = []
    const origin = this.geometry.origin()

    // Generate vertices at equal angles around center
    for (let i = 0; i < p; i++) {
      const angle = (2 * Math.PI * i) / p
      const direction: Point = [Math.cos(angle), Math.sin(angle), 0]
      const vertex = this.geometry.pointOnGeodesic(
        origin,
        direction,
        this.circumradius,
      )
      vertices.push(vertex)
    }

    const center: Point = [0, 0, 1]
    const id = this.computeTileId(center)

    return {
      id,
      type: p,
      neighbors: new Array(p).fill(null),
      spins: new Array(p).fill(-1),
      center,
      vertices,
      transform: identity(3),
      depth: 0,
      parentEdge: -1,
      lastAccessTime: Date.now(),
    }
  }

  /**
   * Compute the center of a polygon from its vertices.
   */
  private computeCenter(vertices: Point[]): Point {
    let x = 0,
      y = 0,
      t = 0
    for (const v of vertices) {
      x += v[0] ?? 0
      y += v[1] ?? 0
      t += v[2] ?? 1
    }
    const n = vertices.length
    return this.geometry.normalize([x / n, y / n, t / n])
  }

  /**
   * Compute a stable ID for a tile based on its center position.
   */
  private computeTileId(center: Point): string {
    const precision = 1e6
    const x = Math.round((center[0] ?? 0) * precision)
    const y = Math.round((center[1] ?? 0) * precision)
    const t = Math.round((center[2] ?? 0) * precision)
    return `${x},${y},${t}`
  }

  /**
   * Generate the reflection matrix across an edge defined by two vertices.
   */
  private getEdgeReflection(v1: Point, v2: Point): Matrix {
    const normal = this.geometry.geodesicThrough(v1, v2)
    return this.geometry.reflection(normal)
  }

  /**
   * Check if two points are approximately equal.
   */
  private pointsClose(a: Point, b: Point, epsilon: number = 1e-6): boolean {
    const dx = (a[0] ?? 0) - (b[0] ?? 0)
    const dy = (a[1] ?? 0) - (b[1] ?? 0)
    const dt = (a[2] ?? 1) - (b[2] ?? 1)
    return dx * dx + dy * dy + dt * dt < epsilon * epsilon
  }

  /**
   * Get or create a neighbor tile across a given edge.
   * Uses reflection across the edge (same as static tessellation).
   */
  getNeighbor(tile: Tile, edge: number): Tile {
    // Return existing neighbor if already generated
    if (tile.neighbors[edge]) {
      const neighbor = tile.neighbors[edge]!
      neighbor.lastAccessTime = Date.now()
      return neighbor
    }

    const { p } = this.config
    const v1 = tile.vertices[edge]!
    const v2 = tile.vertices[(edge + 1) % p]!

    // Get reflection across this edge
    const reflection = this.getEdgeReflection(v1, v2)

    // Reflect all vertices to get neighbor tile
    const neighborVertices = tile.vertices.map(v => {
      const reflected = this.geometry.applyMatrix(reflection, v)
      return this.geometry.normalize(reflected)
    })

    const neighborCenter = this.computeCenter(neighborVertices)
    const neighborId = this.computeTileId(neighborCenter)

    // Check if this tile already exists (reached from different path)
    if (this.tiles.has(neighborId)) {
      const existing = this.tiles.get(neighborId)!
      this.linkTiles(tile, edge, existing, v1, v2)
      existing.lastAccessTime = Date.now()
      return existing
    }

    // Create new tile
    const neighborTransform = this.geometry.compose(reflection, tile.transform)

    const neighbor: Tile = {
      id: neighborId,
      type: p,
      neighbors: new Array(p).fill(null),
      spins: new Array(p).fill(-1),
      center: neighborCenter,
      vertices: neighborVertices,
      transform: neighborTransform,
      depth: tile.depth + 1,
      parentEdge: -1,
      lastAccessTime: Date.now(),
    }

    // Link the tiles
    this.linkTiles(tile, edge, neighbor, v1, v2)

    this.tiles.set(neighborId, neighbor)
    return neighbor
  }

  /**
   * Link two adjacent tiles by finding matching edges.
   */
  private linkTiles(
    tile1: Tile,
    edge1: number,
    tile2: Tile,
    sharedV1: Point,
    sharedV2: Point,
  ): void {
    const { p } = this.config

    tile1.neighbors[edge1] = tile2

    // Find which edge of tile2 connects to tile1
    // The shared edge vertices are in reverse order in the neighbor
    for (let j = 0; j < p; j++) {
      const nv1 = tile2.vertices[j]!
      const nv2 = tile2.vertices[(j + 1) % p]!

      // Check if this edge matches (vertices in reverse order)
      if (this.pointsClose(nv1, sharedV2) && this.pointsClose(nv2, sharedV1)) {
        tile2.neighbors[j] = tile1
        tile1.spins[edge1] = j
        tile2.spins[j] = edge1
        tile2.parentEdge = j
        break
      }
    }
  }

  /**
   * Get all tiles visible from the current view center.
   * Generates tiles until they fill the visible disk area.
   */
  getVisibleTiles(): Tile[] {
    const visible: Tile[] = []
    const visited = new Set<string>()

    // BFS from origin, expanding toward visible area
    // We explore all tiles within a hyperbolic distance limit,
    // but only return those that are actually visible on screen
    const queue: Tile[] = [this.origin]

    // Maximum hyperbolic distance to explore (larger than visible radius
    // to ensure we reach tiles that might be visible after transform)
    const maxExploreDistance = this.config.visibleRadius + 3.0

    while (queue.length > 0 && visited.size < this.config.maxTiles * 2) {
      const tile = queue.shift()!

      if (visited.has(tile.id)) continue
      visited.add(tile.id)

      // Check distance from view center for exploration limit
      const dist = this.hyperbolicDistance(this.viewCenter, tile.center)

      // Stop exploring if too far from view center
      if (dist > maxExploreDistance) continue

      // Check if tile is actually visible on screen
      const isCenterNear = dist <= this.config.visibleRadius
      const hasVisibleVertex = this.hasVertexInDisk(tile, 1.1)

      if (isCenterNear || hasVisibleVertex) {
        visible.push(tile)
        tile.lastAccessTime = Date.now()

        // Stop collecting visible tiles if we have enough
        if (visible.length >= this.config.maxTiles) break
      }

      // Always explore neighbors (within exploration distance)
      for (let i = 0; i < tile.type; i++) {
        const neighbor = this.getNeighbor(tile, i)
        if (!visited.has(neighbor.id)) {
          queue.push(neighbor)
        }
      }
    }

    return visible
  }

  /**
   * Check if any vertex of a tile projects inside the Poincare disk
   * after applying the view transform.
   */
  private hasVertexInDisk(tile: Tile, diskRadius: number): boolean {
    for (const v of tile.vertices) {
      // Apply view transform to vertex
      const transformed = this.geometry.applyMatrix(this.viewTransform, v)
      const normalized = this.geometry.normalize(transformed)
      const [u, vCoord] = this.hyperboloidToPoincare(normalized)
      const r = Math.sqrt(u * u + vCoord * vCoord)
      if (r < diskRadius) {
        return true
      }
    }
    return false
  }

  /**
   * Project hyperboloid point to Poincare disk.
   */
  private hyperboloidToPoincare(p: Point): [number, number] {
    const x = p[0] ?? 0
    const y = p[1] ?? 0
    const t = p[2] ?? 1
    const denom = 1 + t
    if (Math.abs(denom) < 1e-10) {
      return [0, 0]
    }
    return [x / denom, y / denom]
  }

  /**
   * Compute hyperbolic distance between two points using Minkowski inner product.
   */
  private hyperbolicDistance(a: Point, b: Point): number {
    const ax = a[0] ?? 0
    const ay = a[1] ?? 0
    const at = a[2] ?? 1
    const bx = b[0] ?? 0
    const by = b[1] ?? 0
    const bt = b[2] ?? 1

    // Minkowski inner product: <a,b> = a.x*b.x + a.y*b.y - a.t*b.t
    // For points on hyperboloid: cosh(d) = -<a,b>
    const innerProduct = ax * bx + ay * by - at * bt
    const clamped = Math.max(1, -innerProduct)
    return Math.acosh(clamped)
  }

  /**
   * Update the view center (for determining which tiles to generate).
   */
  updateViewCenter(center: Point): void {
    this.viewCenter = center
  }

  /**
   * Set view center from a transform matrix.
   * The view center is the point in original space that appears at the screen center.
   * For a Lorentz transform T, this is T^(-1) * origin.
   * For Lorentz transforms: T^(-1) = η * T^T * η, where η = diag(1,1,-1).
   * This simplifies to: viewCenter = (-T[6], -T[7], T[8]) for origin input.
   */
  setViewTransform(transform: Matrix): void {
    this.viewTransform = transform

    // Extract the inverse transform applied to origin
    // For Lorentz transform, the point that maps to origin is:
    // P = (-sinh*ux, -sinh*uy, cosh) = (-T[6], -T[7], T[8])
    const t6 = transform[6] ?? 0
    const t7 = transform[7] ?? 0
    const t8 = transform[8] ?? 1
    this.viewCenter = this.geometry.normalize([-t6, -t7, t8])
  }

  /**
   * Get the origin tile.
   */
  getOrigin(): Tile {
    return this.origin
  }

  /**
   * Get total number of generated tiles.
   */
  getTileCount(): number {
    return this.tiles.size
  }

  /**
   * Get the geometry instance.
   */
  getGeometry(): Hyperbolic2D {
    return this.geometry
  }

  /**
   * Collect garbage (remove distant tiles that haven't been accessed recently).
   */
  collectGarbage(): void {
    if (this.tiles.size <= this.config.maxTiles) return

    // Score tiles by distance and recency
    const scored = Array.from(this.tiles.values())
      .filter(t => t !== this.origin)
      .map(tile => ({
        tile,
        score: this.computeEvictionScore(tile),
      }))
      .sort((a, b) => b.score - a.score)

    // Evict highest-scored tiles (furthest and oldest)
    const toEvict = scored.slice(0, this.tiles.size - this.config.maxTiles)

    for (const { tile } of toEvict) {
      // Unlink from neighbors
      for (let i = 0; i < tile.type; i++) {
        const neighbor = tile.neighbors[i]
        if (neighbor && tile.spins[i] >= 0) {
          neighbor.neighbors[tile.spins[i]] = null
        }
      }
      this.tiles.delete(tile.id)
    }
  }

  /**
   * Compute eviction score (higher = more likely to evict).
   */
  private computeEvictionScore(tile: Tile): number {
    const age = Date.now() - tile.lastAccessTime
    const dist = this.hyperbolicDistance(this.viewCenter, tile.center)
    return age * 0.001 + dist * 10
  }

  /**
   * Get configuration.
   */
  getConfig(): DynamicTessellationConfig {
    return this.config
  }
}
