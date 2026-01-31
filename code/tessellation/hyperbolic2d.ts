/**
 * Address-based hyperbolic tessellation.
 *
 * Uses discrete tile addresses (group words) instead of floating-point
 * coordinates. This avoids coordinate explosion because:
 *
 * 1. Tile IDs are discrete strings (exact, no precision loss)
 * 2. Neighbor relationships are computed via group algebra (combinatorial)
 * 3. Geometry is computed at render time, not stored
 *
 * Inspired by HyperRogue's approach: tiles are identified by their
 * position in the symmetry group, not by floating-point coordinates.
 */

import type { Matrix } from '@/form/matrix'
import {
  VonDyckCoordinates,
  type GroupWord,
} from '@/coordinates/hyperbolic/von-dyck'

/**
 * Lightweight tile representation - only stores discrete address.
 */
export interface Tile {
  /** Discrete tile address (group word) */
  id: GroupWord

  /** Neighbor IDs (computed lazily) */
  neighbors: (GroupWord | null)[]

  /** Depth from origin in tile graph */
  depth: number

  /** Last frame this tile was visible */
  lastSeenFrame: number
}

/**
 * Visible tile with computed Poincaré disk vertices.
 */
export interface VisibleTile {
  id: GroupWord
  vertices: Array<[number, number]>
}

/**
 * Configuration for hyperbolic tessellation.
 */
export interface TessellationConfig {
  /** Polygon type (p sides) */
  p: number

  /** Vertex valence (q polygons meet at each vertex) */
  q: number

  /** Maximum tiles to keep in memory */
  maxTiles: number

  /** Maximum depth to explore from origin */
  maxDepth: number
}

const DEFAULT_CONFIG: TessellationConfig = {
  p: 7,
  q: 3,
  maxTiles: 3000,
  maxDepth: 50,
}

export { DEFAULT_CONFIG as DEFAULT_TESSELLATION_CONFIG }

/**
 * Hyperbolic tessellation manager using address-based tiles.
 *
 * Tiles are identified by group words, and geometry is computed
 * on-demand at render time. This completely avoids the floating-point
 * coordinate explosion problem.
 */
export class Hyperbolic2DTessellation {
  private config: TessellationConfig
  private coords: VonDyckCoordinates
  private tiles: Map<GroupWord, Tile> = new Map()
  private frameCount: number = 0

  // View transform (SU(1,1) format)
  private viewTransform: Matrix = [1, 0, 0, 0, 0, 0, 0, 0, 1]

  // Precomputed base vertices in Poincaré disk
  private baseVertices: Array<[number, number]> = []

  // Cache for tile transforms (SU(1,1) matrices)
  private transformCache: Map<GroupWord, Matrix> = new Map()

  // Precomputed edge crossing transforms
  private edgeTransforms: Matrix[] = []

  // Track the current "center tile" - the tile closest to view center
  // This is used as BFS start when view moves far from origin
  private centerTile: GroupWord = ''
  private lastVisibleTiles: Set<GroupWord> = new Set()

  constructor(config: Partial<TessellationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.coords = new VonDyckCoordinates(this.config.p, this.config.q)

    // Compute base polygon vertices in Poincaré disk
    this.baseVertices = this.computeBaseVertices()

    // Precompute edge crossing transforms
    this.edgeTransforms = this.computeEdgeTransforms()

    // Create origin tile with identity transform
    this.getOrCreateTile('')
    this.transformCache.set('', [1, 0, 0, 0, 0, 0, 0, 0, 1])
  }

  /**
   * Set the view transform (SU(1,1) format).
   */
  setViewTransform(transform: Matrix): void {
    this.viewTransform = transform

    // Walk from current center tile toward new view center
    // This keeps centerTile updated as the view moves
    this.updateCenterTile()

    // Limit cache size
    if (this.transformCache.size > 10000) {
      this.transformCache.clear()
      this.transformCache.set('', [1, 0, 0, 0, 0, 0, 0, 0, 1])
    }
  }

  /**
   * Update centerTile by walking toward the view center.
   * This is called when the view transform changes.
   */
  private updateCenterTile(): void {
    // Walk from current center toward view center (origin in view space)
    // We do this iteratively to track the view as it moves
    let current = this.centerTile
    const maxSteps = 20 // Limit iterations

    for (let step = 0; step < maxSteps; step++) {
      // Get current tile's center in view space
      const transform = this.getTileTransform(current, null, 0)
      const combined = this.composeSU11(this.viewTransform, transform)
      const center = this.applySU11Transform(combined, [0, 0])
      const currentDist = center[0] * center[0] + center[1] * center[1]

      // If we're already at center, done
      if (currentDist < 0.1) break

      // Check neighbors and move to one closer to view center
      const neighbors = this.getNeighbors(current)
      let bestNeighbor = current
      let bestDist = currentDist

      for (let dir = 0; dir < neighbors.length; dir++) {
        const neighborId = neighbors[dir]!
        const nTransform = this.getTileTransform(
          neighborId,
          current,
          dir,
        )
        const nCombined = this.composeSU11(
          this.viewTransform,
          nTransform,
        )
        const nCenter = this.applySU11Transform(nCombined, [0, 0])
        const nDist = nCenter[0] * nCenter[0] + nCenter[1] * nCenter[1]

        if (nDist < bestDist) {
          bestDist = nDist
          bestNeighbor = neighborId
        }
      }

      // No improvement - we're at a local minimum
      if (bestNeighbor === current) break

      current = bestNeighbor
    }

    this.centerTile = current
  }

  /**
   * Get the view transform.
   */
  getViewTransform(): Matrix {
    return this.viewTransform
  }

  /**
   * Get visible tiles and their Poincaré disk vertices.
   * Uses incremental transform computation for efficiency.
   */
  getVisibleTiles(): VisibleTile[] {
    this.frameCount++
    const visible: VisibleTile[] = []
    const visited = new Set<GroupWord>()

    // Start BFS from multiple seeds: centerTile + origin + last visible tiles
    // This ensures we can find tiles when view moves far from origin
    const queue: Array<{
      id: GroupWord
      parentId: GroupWord | null
      edgeDir: number
    }> = []

    // Start from center tile (most important - closest to view)
    queue.push({ id: this.centerTile, parentId: null, edgeDir: 0 })

    // Also include origin if different
    if (this.centerTile !== '') {
      queue.push({ id: '', parentId: null, edgeDir: 0 })
    }

    // Also start from previously visible tiles (for continuity when panning)
    for (const id of this.lastVisibleTiles) {
      if (id !== '' && id !== this.centerTile) {
        queue.push({ id, parentId: null, edgeDir: 0 })
      }
    }

    let closestTile = ''
    let closestDist = Infinity

    while (queue.length > 0 && visible.length < this.config.maxTiles) {
      const { id, parentId, edgeDir } = queue.shift()!

      if (visited.has(id)) continue
      visited.add(id)

      const tile = this.getOrCreateTile(id)
      if (tile.depth > this.config.maxDepth) continue

      // Get or compute transform incrementally
      const tileTransform = this.getTileTransform(id, parentId, edgeDir)

      // Apply view transform and check visibility
      const vertices = this.computeVerticesWithTransform(tileTransform)

      // Compute center for distance check
      let cx = 0,
        cy = 0
      for (const [u, v] of vertices) {
        cx += u
        cy += v
      }
      cx /= vertices.length
      cy /= vertices.length
      const centerDist = cx * cx + cy * cy

      // Track tile closest to view center
      if (centerDist < closestDist) {
        closestDist = centerDist
        closestTile = id
      }

      // Check visibility: any vertex inside disk radius 1.0
      const isVisible = vertices.some(([u, v]) => u * u + v * v < 1.0)

      if (isVisible) {
        visible.push({ id, vertices })
        tile.lastSeenFrame = this.frameCount

        // Explore neighbors
        const neighbors = this.getNeighbors(id)
        for (let dir = 0; dir < neighbors.length; dir++) {
          const neighborId = neighbors[dir]!
          if (!visited.has(neighborId)) {
            queue.push({ id: neighborId, parentId: id, edgeDir: dir })
          }
        }
      } else if (centerDist < 2.0) {
        // Explore tiles near view center even if not visible
        // This helps discover tiles when panning
        const neighbors = this.getNeighbors(id)
        for (let dir = 0; dir < neighbors.length; dir++) {
          const neighborId = neighbors[dir]!
          if (!visited.has(neighborId)) {
            queue.push({ id: neighborId, parentId: id, edgeDir: dir })
          }
        }
      }
    }

    // Update tracking for next frame
    this.centerTile = closestTile
    this.lastVisibleTiles = new Set(visible.map(t => t.id))

    return visible
  }

  /**
   * Get cached transform or compute incrementally from parent.
   */
  private getTileTransform(
    id: GroupWord,
    parentId: GroupWord | null,
    edgeDir: number,
  ): Matrix {
    // Check cache first
    let transform = this.transformCache.get(id)
    if (transform) return transform

    if (id === '') {
      // Origin is identity
      transform = [1, 0, 0, 0, 0, 0, 0, 0, 1]
    } else if (parentId !== null && this.transformCache.has(parentId)) {
      // Compute incrementally from parent
      const parentTransform = this.transformCache.get(parentId)!
      const edgeTransform = this.edgeTransforms[edgeDir]!
      transform = this.composeSU11(edgeTransform, parentTransform)
    } else {
      // Fallback: compute from scratch (slow path)
      transform = this.computeTileTransformSU11(id)
    }

    this.transformCache.set(id, transform)
    return transform
  }

  /**
   * Compute vertices using a precomputed tile transform.
   */
  private computeVerticesWithTransform(
    tileTransform: Matrix,
  ): Array<[number, number]> {
    // Compose tile transform with view transform once
    const combined = this.composeSU11(this.viewTransform, tileTransform)

    return this.baseVertices.map(v =>
      this.applySU11Transform(combined, v),
    )
  }

  /**
   * Get or create a tile by its address.
   */
  private getOrCreateTile(id: GroupWord): Tile {
    let tile = this.tiles.get(id)
    if (!tile) {
      tile = {
        id,
        neighbors: new Array(this.config.p).fill(null),
        depth: this.coords.depth(id),
        lastSeenFrame: 0,
      }
      this.tiles.set(id, tile)
    }
    return tile
  }

  /**
   * Get neighbor IDs for a tile.
   */
  private getNeighbors(id: GroupWord): GroupWord[] {
    const tile = this.getOrCreateTile(id)

    // Compute neighbors lazily
    for (let i = 0; i < this.config.p; i++) {
      if (tile.neighbors[i] === null) {
        tile.neighbors[i] = this.coords.neighbor(id, i)
      }
    }

    return tile.neighbors as GroupWord[]
  }

  /**
   * Compute base polygon vertices in Poincaré disk.
   * These are the vertices of the origin tile.
   */
  private computeBaseVertices(): Array<[number, number]> {
    // Use the formula from poincare-disk-tiling-technique.md:
    // d = sqrt((cot(π/q) - tan(π/p)) / (cot(π/q) + tan(π/p)))
    const { p, q } = this.config
    const cotQ = 1 / Math.tan(Math.PI / q)
    const tanP = Math.tan(Math.PI / p)

    const d = Math.sqrt((cotQ - tanP) / (cotQ + tanP))

    const vertices: Array<[number, number]> = []
    for (let i = 0; i < p; i++) {
      const angle = (2 * Math.PI * i) / p
      vertices.push([d * Math.cos(angle), d * Math.sin(angle)])
    }

    return vertices
  }

  /**
   * Precompute the SU(1,1) transforms for crossing each edge.
   * These are used for incremental transform computation.
   */
  private computeEdgeTransforms(): Matrix[] {
    const transforms: Matrix[] = []
    const { p } = this.config

    for (let dir = 0; dir < p; dir++) {
      // Edge crossing = rotate to edge, apply b generator, rotate back
      // This is: a^dir * b * a^(-dir)
      const rotToEdge = this.getRotationTransform(dir)
      const bTransform = this.getGeneratorTransform('b', false)
      const rotBack = this.getRotationTransform(-dir)

      const temp = this.composeSU11(bTransform, rotToEdge)
      transforms.push(this.composeSU11(rotBack, temp))
    }

    return transforms
  }

  /**
   * Get a pure rotation transform (a^power).
   */
  private getRotationTransform(power: number): Matrix {
    const angle = (power * 2 * Math.PI) / this.config.p
    const halfAngle = angle / 2
    return [
      Math.cos(halfAngle),
      Math.sin(halfAngle),
      0,
      0,
      0,
      0,
      0,
      0,
      1,
    ]
  }

  /**
   * Compute vertices of a tile in Poincaré disk, with view transform applied.
   *
   * This is computed fresh each time from the discrete tile address,
   * avoiding accumulated floating-point errors.
   */
  private computeTileVertices(id: GroupWord): Array<[number, number]> {
    if (id === '') {
      // Origin tile - just apply view transform to base vertices
      return this.baseVertices.map(v => this.applyViewTransform(v))
    }

    // For non-origin tiles, we need to transform the base vertices
    // by the tile's group element, then apply view transform

    // Get the transformation matrix for this tile's group word
    // This transforms origin tile to this tile's position
    const tileMatrix = this.computeTileTransformSU11(id)

    return this.baseVertices.map(v => {
      // First apply tile transform (moves vertex from origin tile to this tile)
      const transformed = this.applySU11Transform(tileMatrix, v)
      // Then apply view transform
      return this.applyViewTransform(transformed)
    })
  }

  /**
   * Compute the SU(1,1) transformation for a tile's group word.
   *
   * Instead of using Lorentz matrices (which can explode), we work
   * entirely in the Poincaré disk using Möbius transformations.
   */
  private computeTileTransformSU11(id: GroupWord): Matrix {
    // Parse the group word and compose transformations
    const parsed = this.parseWord(id)

    let transform: Matrix = [1, 0, 0, 0, 0, 0, 0, 0, 1] // Identity

    for (const gen of parsed) {
      const count = Math.abs(gen.power)
      const isInverse = gen.power < 0

      for (let i = 0; i < count; i++) {
        const genTransform = this.getGeneratorTransform(
          gen.symbol,
          isInverse,
        )
        transform = this.composeSU11(genTransform, transform)
      }
    }

    return transform
  }

  /**
   * Get the SU(1,1) transformation for a generator.
   *
   * Generator 'a' = rotation by 2π/p around origin
   * Generator 'b' = rotation by 2π/q around a vertex
   */
  private getGeneratorTransform(
    symbol: 'a' | 'b',
    inverse: boolean,
  ): Matrix {
    if (symbol === 'a') {
      // Rotation around origin: simple SU(1,1) rotation
      const angle = ((inverse ? -1 : 1) * (2 * Math.PI)) / this.config.p
      const halfAngle = angle / 2
      return [
        Math.cos(halfAngle),
        Math.sin(halfAngle),
        0,
        0,
        0,
        0,
        0,
        0,
        1,
      ]
    } else {
      // Rotation around a vertex: translate to vertex, rotate, translate back
      // In Poincaré disk, vertex is at distance d from origin
      const d = this.baseVertices[0]![0] // x-coord of first vertex

      // Translation to put vertex at origin: w = -d (move left by d)
      // SU(1,1) translation by w: a = 1/sqrt(1-|w|²), b = w/sqrt(1-|w|²)
      const factor = 1 / Math.sqrt(1 - d * d)
      const toVertex: Matrix = [
        factor,
        0,
        -d * factor,
        0,
        0,
        0,
        0,
        0,
        1,
      ]
      const fromVertex: Matrix = [
        factor,
        0,
        d * factor,
        0,
        0,
        0,
        0,
        0,
        1,
      ]

      // Rotation at vertex
      const angle = ((inverse ? -1 : 1) * (2 * Math.PI)) / this.config.q
      const halfAngle = angle / 2
      const rotation: Matrix = [
        Math.cos(halfAngle),
        Math.sin(halfAngle),
        0,
        0,
        0,
        0,
        0,
        0,
        1,
      ]

      // Compose: fromVertex * rotation * toVertex
      return this.composeSU11(
        fromVertex,
        this.composeSU11(rotation, toVertex),
      )
    }
  }

  /**
   * Apply an SU(1,1) transformation to a point in Poincaré disk.
   * f(z) = (a*z + b) / (conj(b)*z + conj(a))
   */
  private applySU11Transform(
    transform: Matrix,
    point: [number, number],
  ): [number, number] {
    const aRe = transform[0] ?? 1
    const aIm = transform[1] ?? 0
    const bRe = transform[2] ?? 0
    const bIm = transform[3] ?? 0

    const [u, v] = point

    // Numerator: a*z + b
    const numRe = aRe * u - aIm * v + bRe
    const numIm = aRe * v + aIm * u + bIm

    // Denominator: conj(b)*z + conj(a)
    const denRe = bRe * u + bIm * v + aRe
    const denIm = bRe * v - bIm * u - aIm

    // Complex division
    const denMagSq = denRe * denRe + denIm * denIm
    if (denMagSq < 1e-12) return point

    return [
      (numRe * denRe + numIm * denIm) / denMagSq,
      (numIm * denRe - numRe * denIm) / denMagSq,
    ]
  }

  /**
   * Apply the view transform to a point.
   */
  private applyViewTransform(
    point: [number, number],
  ): [number, number] {
    return this.applySU11Transform(this.viewTransform, point)
  }

  /**
   * Compose two SU(1,1) transformations.
   */
  private composeSU11(t1: Matrix, t2: Matrix): Matrix {
    const a1Re = t1[0] ?? 1
    const a1Im = t1[1] ?? 0
    const b1Re = t1[2] ?? 0
    const b1Im = t1[3] ?? 0

    const a2Re = t2[0] ?? 1
    const a2Im = t2[1] ?? 0
    const b2Re = t2[2] ?? 0
    const b2Im = t2[3] ?? 0

    // a = a1*a2 + b1*conj(b2)
    const aRe = a1Re * a2Re - a1Im * a2Im + (b1Re * b2Re + b1Im * b2Im)
    const aIm = a1Re * a2Im + a1Im * a2Re + (-b1Re * b2Im + b1Im * b2Re)

    // b = a1*b2 + b1*conj(a2)
    const bRe = a1Re * b2Re - a1Im * b2Im + (b1Re * a2Re + b1Im * a2Im)
    const bIm = a1Re * b2Im + a1Im * b2Re + (-b1Re * a2Im + b1Im * a2Re)

    // Renormalize: |a|² - |b|² = 1
    const aMagSq = aRe * aRe + aIm * aIm
    const bMagSq = bRe * bRe + bIm * bIm
    const det = aMagSq - bMagSq

    if (det <= 0.001) {
      return [1, 0, 0, 0, 0, 0, 0, 0, 1]
    }

    const s = 1 / Math.sqrt(det)
    return [aRe * s, aIm * s, bRe * s, bIm * s, 0, 0, 0, 0, 1]
  }

  /**
   * Parse a group word into generators.
   */
  private parseWord(
    word: GroupWord,
  ): Array<{ symbol: 'a' | 'b'; power: number }> {
    if (!word) return []

    const result: Array<{ symbol: 'a' | 'b'; power: number }> = []
    const regex = /([ab])(-?\d+)/g
    let match

    while ((match = regex.exec(word)) !== null) {
      result.push({
        symbol: match[1] as 'a' | 'b',
        power: parseInt(match[2]!, 10),
      })
    }

    return result
  }

  /**
   * Garbage collect old tiles.
   */
  collectGarbage(): void {
    if (this.tiles.size <= this.config.maxTiles) return

    // Remove tiles not seen recently
    const threshold = this.frameCount - 100
    const toRemove: GroupWord[] = []

    for (const [id, tile] of this.tiles) {
      if (id !== '' && tile.lastSeenFrame < threshold) {
        toRemove.push(id)
      }
    }

    for (const id of toRemove) {
      this.tiles.delete(id)
      if (this.tiles.size <= this.config.maxTiles * 0.8) break
    }
  }

  /**
   * Get total tile count.
   */
  getTileCount(): number {
    return this.tiles.size
  }

  /**
   * Get config.
   */
  getConfig(): TessellationConfig {
    return this.config
  }

  /**
   * Get p (polygon sides).
   */
  getP(): number {
    return this.config.p
  }

  /**
   * Get q (vertex valence).
   */
  getQ(): number {
    return this.config.q
  }
}
