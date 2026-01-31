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

  // Re-anchoring threshold: when t-coordinate exceeds this, reset tessellation
  // t grows as cosh(d) where d is hyperbolic distance, so t=100 means d≈5.3
  private readonly MAX_T_COORD = 100

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
   * Get all tiles visible from the current view.
   *
   * Uses Poincaré disk visibility checks which are numerically stable
   * (all coords bounded in [-1, 1]). Expands from origin via BFS,
   * using the SU(1,1) transform to determine visibility.
   */
  getVisibleTiles(): Tile[] {
    const visible: Tile[] = []
    const visited = new Set<string>()

    // Always start from origin - the SU(1,1) transform handles view position
    // This avoids walking to huge hyperboloid coordinates
    const queue: Tile[] = [this.origin]

    // Use depth limit instead of distance (avoids hyperboloid coord issues)
    const maxDepth = Math.min(50, this.config.maxTiles / 10)

    while (queue.length > 0 && visited.size < this.config.maxTiles * 2) {
      const tile = queue.shift()!

      if (visited.has(tile.id)) continue
      visited.add(tile.id)

      // Stop exploring if too deep (prevents exponential expansion)
      if (tile.depth > maxDepth) continue

      // Check if tile is visible using Poincaré disk visibility
      // This applies the SU(1,1) transform which is numerically stable
      const hasVisibleVertex = this.hasVertexInDisk(tile, 1.05)

      if (hasVisibleVertex) {
        visible.push(tile)
        tile.lastAccessTime = Date.now()

        // Stop collecting visible tiles if we have enough
        if (visible.length >= this.config.maxTiles) break

        // Only explore neighbors of visible tiles (adaptive expansion)
        for (let i = 0; i < tile.type; i++) {
          const neighbor = this.getNeighbor(tile, i)
          if (!visited.has(neighbor.id)) {
            queue.push(neighbor)
          }
        }
      } else {
        // For non-visible tiles at low depth, still explore neighbors
        // This helps find visible tiles that aren't directly connected to origin
        if (tile.depth < maxDepth / 2) {
          for (let i = 0; i < tile.type; i++) {
            const neighbor = this.getNeighbor(tile, i)
            if (!visited.has(neighbor.id)) {
              queue.push(neighbor)
            }
          }
        }
      }
    }

    return visible
  }

  /**
   * Find a tile near the given point by walking from origin.
   * Uses greedy descent - always moving to the neighbor closest to target.
   */
  private findTileNearPoint(target: Point): Tile {
    let current = this.origin
    let currentDist = this.hyperbolicDistance(target, current.center)

    // Walk toward target, generating tiles as needed
    for (let iter = 0; iter < 200; iter++) {
      let bestNeighbor: Tile | null = null
      let bestDist = currentDist

      // Check all neighbors
      for (let i = 0; i < current.type; i++) {
        const neighbor = this.getNeighbor(current, i)
        const dist = this.hyperbolicDistance(target, neighbor.center)

        if (dist < bestDist) {
          bestDist = dist
          bestNeighbor = neighbor
        }
      }

      // If no neighbor is closer, we've found the closest tile
      if (!bestNeighbor || bestDist >= currentDist - 0.001) {
        break
      }

      current = bestNeighbor
      currentDist = bestDist
    }

    return current
  }

  /**
   * Check if any vertex of a tile projects inside the Poincare disk
   * after applying the view transform.
   *
   * Uses Möbius transform (SU(1,1) format) for the view.
   */
  private hasVertexInDisk(tile: Tile, diskRadius: number): boolean {
    // Extract SU(1,1) parameters from view transform
    const aRe = this.viewTransform[0] ?? 1
    const aIm = this.viewTransform[1] ?? 0
    const bRe = this.viewTransform[2] ?? 0
    const bIm = this.viewTransform[3] ?? 0

    for (const v of tile.vertices) {
      // Project vertex to Poincaré disk
      const [u, vCoord] = this.hyperboloidToPoincare(v)

      // Apply Möbius transform: f(z) = (a*z + b) / (conj(b)*z + conj(a))
      // Numerator: a*z + b
      const numRe = (aRe * u - aIm * vCoord) + bRe
      const numIm = (aRe * vCoord + aIm * u) + bIm

      // Denominator: conj(b)*z + conj(a)
      const denRe = (bRe * u + bIm * vCoord) + aRe
      const denIm = (bRe * vCoord - bIm * u) - aIm

      // Complex division
      const denMagSq = denRe * denRe + denIm * denIm
      if (denMagSq < 1e-12) continue

      const resultU = (numRe * denRe + numIm * denIm) / denMagSq
      const resultV = (numIm * denRe - numRe * denIm) / denMagSq

      const r = Math.sqrt(resultU * resultU + resultV * resultV)
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
   * Set view center from an SU(1,1) transform matrix.
   *
   * The transform is stored as [a_re, a_im, b_re, b_im, 0, 0, 0, 0, 1]
   * representing the Möbius transformation:
   *   f(z) = (a*z + b) / (conj(b)*z + conj(a))
   *
   * The world point that appears at screen center is: z_center = -b/a
   * This is then converted to hyperboloid coordinates for tile generation.
   *
   * If the view has moved too far from the tessellation origin, the
   * tessellation is reset to avoid coordinate explosion.
   */
  setViewTransform(transform: Matrix): void {
    this.viewTransform = transform

    // Extract SU(1,1) parameters
    const aRe = transform[0] ?? 1
    const aIm = transform[1] ?? 0
    const bRe = transform[2] ?? 0
    const bIm = transform[3] ?? 0

    // Compute view center in Poincaré disk: z_center = -b/a
    // -b/a = -(b * conj(a)) / |a|²
    const aMagSq = aRe * aRe + aIm * aIm
    if (aMagSq < 1e-12) {
      this.viewCenter = [0, 0, 1]
      return
    }

    // -b * conj(a) = -(bRe + bIm*i)(aRe - aIm*i)
    // = -(bRe*aRe + bIm*aIm) + (bRe*aIm - bIm*aRe)*i
    let centerU = -(bRe * aRe + bIm * aIm) / aMagSq
    let centerV = (bRe * aIm - bIm * aRe) / aMagSq

    // Clamp to valid Poincaré disk
    const r2 = centerU * centerU + centerV * centerV
    if (r2 >= 0.9999) {
      const scale = 0.999 / Math.sqrt(r2)
      centerU *= scale
      centerV *= scale
    }

    // Convert Poincaré disk → Hyperboloid
    // x = 2u / (1 - r²), y = 2v / (1 - r²), t = (1 + r²) / (1 - r²)
    const r2Clamped = centerU * centerU + centerV * centerV
    const denom = 1 - r2Clamped
    this.viewCenter = [
      (2 * centerU) / denom,
      (2 * centerV) / denom,
      (1 + r2Clamped) / denom,
    ]

    // Check if we need to re-anchor the tessellation
    // When the view center's t-coordinate gets too large, hyperboloid coords
    // will explode and cause precision issues. Reset the tessellation in this case.
    const viewT = this.viewCenter[2] ?? 1
    if (viewT > this.MAX_T_COORD) {
      this.reanchorTessellation()
    }
  }

  /**
   * Reset the tessellation when view has moved too far from origin.
   * This clears all tiles and creates a fresh tessellation at the origin.
   * The SU(1,1) view transform handles moving the view, so we just need
   * tiles near the transformed origin.
   */
  private reanchorTessellation(): void {
    // Clear all tiles
    this.tiles.clear()

    // Create fresh origin tile
    this.origin = this.createOriginTile()
    this.tiles.set(this.origin.id, this.origin)

    // Reset view center to origin (the transform will handle the actual view position)
    this.viewCenter = [0, 0, 1]
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
