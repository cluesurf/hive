import type { Point } from '@/form/point'
import type { Matrix } from '@/form/matrix'
import type { Tile, DynamicTessellationConfig } from './types'
import { DEFAULT_DYNAMIC_CONFIG } from './types'
import { mat3 } from 'gl-matrix'

/**
 * Dynamic tessellation manager.
 * Generates tiles lazily as the view moves through hyperbolic space.
 */
export class DynamicTessellationManager {
  private config: DynamicTessellationConfig
  private tiles: Map<string, Tile> = new Map()
  private origin: Tile
  private viewCenter: Point = [0, 0, 1]

  // Precomputed geometry values
  private edgeLength!: number
  private centralAngle!: number
  private vertexAngle!: number
  private rotationMatrix!: Matrix
  private inverseRotationMatrix!: Matrix

  constructor(config: Partial<DynamicTessellationConfig> = {}) {
    this.config = { ...DEFAULT_DYNAMIC_CONFIG, ...config }
    this.computeGeometry()
    this.origin = this.createOriginTile()
    this.tiles.set(this.origin.id, this.origin)
  }

  /**
   * Compute tessellation geometry parameters.
   */
  private computeGeometry(): void {
    const { p, q } = this.config

    // Central angle of each edge from tile center
    this.centralAngle = (2 * Math.PI) / p

    // Interior angle at each vertex
    this.vertexAngle = (2 * Math.PI) / q

    // Edge length using hyperbolic law of cosines
    // For a regular {p,q} tiling, the edge length satisfies:
    // cosh(a) = cos(π/q) / sin(π/p)
    const cosVertexHalf = Math.cos(Math.PI / q)
    const sinCentralHalf = Math.sin(Math.PI / p)
    this.edgeLength = Math.acosh(cosVertexHalf / sinCentralHalf)

    // Rotation matrix for one edge (2π/p radians)
    this.rotationMatrix = this.createRotationMatrix(this.centralAngle)
    this.inverseRotationMatrix = this.createRotationMatrix(-this.centralAngle)
  }

  /**
   * Create a rotation matrix around the origin in hyperbolic space.
   */
  private createRotationMatrix(angle: number): Matrix {
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    // Rotation in the x-y plane (doesn't affect t coordinate)
    return [c, -s, 0, s, c, 0, 0, 0, 1]
  }

  /**
   * Create a Lorentz boost (translation) matrix.
   */
  private createBoostMatrix(distance: number, dirX: number, dirY: number): Matrix {
    const len = Math.sqrt(dirX * dirX + dirY * dirY)
    if (len < 1e-10) {
      return [1, 0, 0, 0, 1, 0, 0, 0, 1]
    }

    const ux = dirX / len
    const uy = dirY / len
    const c = Math.cosh(distance)
    const s = Math.sinh(distance)

    // Lorentz boost in direction (ux, uy)
    return [
      1 + (c - 1) * ux * ux,
      (c - 1) * ux * uy,
      s * ux,
      (c - 1) * ux * uy,
      1 + (c - 1) * uy * uy,
      s * uy,
      s * ux,
      s * uy,
      c,
    ]
  }

  /**
   * Multiply two 3x3 matrices.
   */
  private multiplyMatrices(a: Matrix, b: Matrix): Matrix {
    const result: Matrix = [0, 0, 0, 0, 0, 0, 0, 0, 0]
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let sum = 0
        for (let k = 0; k < 3; k++) {
          sum += (a[i * 3 + k] ?? 0) * (b[k * 3 + j] ?? 0)
        }
        result[i * 3 + j] = sum
      }
    }
    return result
  }

  /**
   * Apply a matrix to a point.
   */
  private applyMatrix(m: Matrix, p: Point): Point {
    const x = p[0] ?? 0
    const y = p[1] ?? 0
    const t = p[2] ?? 1
    return [
      (m[0] ?? 0) * x + (m[1] ?? 0) * y + (m[2] ?? 0) * t,
      (m[3] ?? 0) * x + (m[4] ?? 0) * y + (m[5] ?? 0) * t,
      (m[6] ?? 0) * x + (m[7] ?? 0) * y + (m[8] ?? 0) * t,
    ]
  }

  /**
   * Compute the center position for a neighbor tile.
   */
  private computeNeighborCenter(tile: Tile, edge: number): Point {
    // Direction from tile center to edge midpoint
    const angle = edge * this.centralAngle

    // Distance from center to edge midpoint (apothem)
    // For regular polygon: apothem = edgeLength / (2 * tan(π/p))
    // But we need the hyperbolic distance to neighbor's center
    // which is 2 * apothem in hyperbolic sense

    // Compute neighbor center using reflection across the edge
    // First, translate to edge midpoint, then reflect, then translate to neighbor center

    // Direction toward this edge
    const dirX = Math.cos(angle)
    const dirY = Math.sin(angle)

    // The neighbor's center is at distance 2*apothem from our center
    // in direction of the edge
    const neighborDist = this.computeCenterToCenterDistance()

    // Boost in that direction
    const boost = this.createBoostMatrix(neighborDist, dirX, dirY)
    const neighborTransform = this.multiplyMatrices(tile.transform, boost)

    return this.applyMatrix(neighborTransform, [0, 0, 1])
  }

  /**
   * Compute the hyperbolic distance between adjacent tile centers.
   */
  private computeCenterToCenterDistance(): number {
    const { p } = this.config
    // Distance from center to edge midpoint (apothem)
    // Using: cosh(apothem) = cos(π/p) / sin(π/q) * cosh(edgeLength/2)
    // Simplified for regular tiling: distance between centers = 2 * apothem
    // For {p,q}: this can be computed from the edge length

    // Alternative: use the reflection formula
    // The center-to-center distance d satisfies:
    // cosh(d/2) = cos(π/p) / sin(vertexAngle/2)

    const cosHalfCentral = Math.cos(Math.PI / p)
    const sinHalfVertex = Math.sin(this.vertexAngle / 2)

    const halfDist = Math.acosh(cosHalfCentral / sinHalfVertex)
    return 2 * halfDist
  }

  /**
   * Create the origin (central) tile.
   */
  private createOriginTile(): Tile {
    const { p } = this.config
    const vertices: Point[] = []

    // Distance from center to vertex
    const vertexDist = this.computeCenterToVertexDistance()

    for (let i = 0; i < p; i++) {
      const angle = i * this.centralAngle + this.centralAngle / 2
      const boost = this.createBoostMatrix(
        vertexDist,
        Math.cos(angle),
        Math.sin(angle),
      )
      vertices.push(this.applyMatrix(boost, [0, 0, 1]))
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
      transform: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      depth: 0,
      parentEdge: -1,
      lastAccessTime: Date.now(),
    }
  }

  /**
   * Compute distance from tile center to vertex.
   */
  private computeCenterToVertexDistance(): number {
    const { p, q } = this.config
    // Using hyperbolic law of cosines for right triangle
    // formed by center, edge midpoint, and vertex
    const cosCentral = Math.cos(Math.PI / p)
    const cosVertex = Math.cos(Math.PI / q)

    // cosh(vertex_dist) = cos(π/p) * cos(π/q) / sin(π/p) / sin(π/q)
    // Simplified: cosh(r) = cot(π/p) * cot(π/q)
    const cotP = 1 / Math.tan(Math.PI / p)
    const cotQ = 1 / Math.tan(Math.PI / q)

    return Math.acosh(cotP * cotQ)
  }

  /**
   * Compute a stable ID for a tile based on its center.
   */
  private computeTileId(center: Point): string {
    // Quantize to avoid floating point issues
    const precision = 1e8
    const x = Math.round((center[0] ?? 0) * precision)
    const y = Math.round((center[1] ?? 0) * precision)
    const t = Math.round((center[2] ?? 0) * precision)
    return `${x},${y},${t}`
  }

  /**
   * Get or create a neighbor tile.
   */
  getNeighbor(tile: Tile, edge: number): Tile {
    // Return existing neighbor if already generated
    if (tile.neighbors[edge]) {
      const neighbor = tile.neighbors[edge]!
      neighbor.lastAccessTime = Date.now()
      return neighbor
    }

    // Compute neighbor's center position
    const neighborCenter = this.computeNeighborCenter(tile, edge)
    const neighborId = this.computeTileId(neighborCenter)

    // Check if this tile already exists (reached from different path)
    if (this.tiles.has(neighborId)) {
      const existing = this.tiles.get(neighborId)!
      this.linkTiles(tile, edge, existing)
      existing.lastAccessTime = Date.now()
      return existing
    }

    // Create new tile
    const neighbor = this.createNeighborTile(tile, edge, neighborCenter)
    this.tiles.set(neighborId, neighbor)
    this.linkTiles(tile, edge, neighbor)

    return neighbor
  }

  /**
   * Create a new neighbor tile.
   */
  private createNeighborTile(
    parent: Tile,
    edge: number,
    center: Point,
  ): Tile {
    const { p } = this.config

    // Compute transform to neighbor's center
    const angle = edge * this.centralAngle
    const dirX = Math.cos(angle)
    const dirY = Math.sin(angle)
    const dist = this.computeCenterToCenterDistance()

    const boost = this.createBoostMatrix(dist, dirX, dirY)
    const transform = this.multiplyMatrices(parent.transform, boost)

    // Compute vertices
    const vertexDist = this.computeCenterToVertexDistance()
    const vertices: Point[] = []

    // Neighbor is rotated relative to parent
    // The edge connecting back to parent is at opposite side
    const parentEdge = (edge + p / 2) % p

    for (let i = 0; i < p; i++) {
      // Adjust angle so that parentEdge points back correctly
      const vertexAngle =
        i * this.centralAngle + this.centralAngle / 2 + Math.PI
      const vBoost = this.createBoostMatrix(
        vertexDist,
        Math.cos(vertexAngle),
        Math.sin(vertexAngle),
      )
      const vertexTransform = this.multiplyMatrices(transform, vBoost)
      vertices.push(this.applyMatrix(vertexTransform, [0, 0, 1]))
    }

    const id = this.computeTileId(center)

    return {
      id,
      type: p,
      neighbors: new Array(p).fill(null),
      spins: new Array(p).fill(-1),
      center,
      vertices,
      transform,
      depth: parent.depth + 1,
      parentEdge: Math.floor(p / 2), // Opposite edge leads back to parent
      lastAccessTime: Date.now(),
    }
  }

  /**
   * Link two adjacent tiles.
   */
  private linkTiles(tile1: Tile, edge1: number, tile2: Tile): void {
    tile1.neighbors[edge1] = tile2

    // Find which edge of tile2 connects to tile1
    const edge2 = this.findConnectingEdge(tile2, tile1)
    if (edge2 >= 0) {
      tile2.neighbors[edge2] = tile1
      tile1.spins[edge1] = edge2
      tile2.spins[edge2] = edge1
    }
  }

  /**
   * Find which edge of tile2 connects to tile1.
   */
  private findConnectingEdge(tile2: Tile, tile1: Tile): number {
    const dist = this.computeCenterToCenterDistance()

    for (let i = 0; i < tile2.type; i++) {
      // Check if edge i of tile2 points toward tile1
      const angle = i * this.centralAngle
      const dirX = Math.cos(angle)
      const dirY = Math.sin(angle)

      const boost = this.createBoostMatrix(dist, dirX, dirY)
      const expectedCenter = this.applyMatrix(
        this.multiplyMatrices(tile2.transform, boost),
        [0, 0, 1],
      )

      const expectedId = this.computeTileId(expectedCenter)
      if (expectedId === tile1.id) {
        return i
      }
    }

    // Fallback: use geometric comparison
    return Math.floor(tile2.type / 2)
  }

  /**
   * Get all tiles visible from the current view center.
   */
  getVisibleTiles(): Tile[] {
    const visible: Tile[] = []
    const visited = new Set<string>()

    // BFS from origin toward view center, then outward
    const queue: Tile[] = [this.origin]

    while (queue.length > 0 && visible.length < this.config.maxTiles) {
      const tile = queue.shift()!

      if (visited.has(tile.id)) continue
      visited.add(tile.id)

      // Check if tile is within visible radius
      const dist = this.hyperbolicDistance(this.viewCenter, tile.center)
      if (dist > this.config.visibleRadius) continue

      visible.push(tile)
      tile.lastAccessTime = Date.now()

      // Add neighbors to queue
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
   * Compute hyperbolic distance between two points.
   */
  private hyperbolicDistance(a: Point, b: Point): number {
    // Using Minkowski inner product: <a,b> = a.x*b.x + a.y*b.y - a.t*b.t
    // cosh(d) = -<a,b> for points on the hyperboloid
    const ax = a[0] ?? 0
    const ay = a[1] ?? 0
    const at = a[2] ?? 1
    const bx = b[0] ?? 0
    const by = b[1] ?? 0
    const bt = b[2] ?? 1

    const innerProduct = ax * bx + ay * by - at * bt
    // Clamp to avoid numerical issues with acosh
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
   */
  setViewTransform(transform: Matrix): void {
    // The view center is the origin transformed by the inverse of the view
    // For now, just extract where the origin maps to
    this.viewCenter = this.applyMatrix(transform, [0, 0, 1])
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
   * Collect garbage (remove distant tiles).
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

    // Evict highest-scored tiles
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
