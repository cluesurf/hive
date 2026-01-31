/**
 * Address-based dynamic tessellation manager.
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
export interface AddressedTile {
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
 * Configuration for address-based tessellation.
 */
export interface AddressBasedConfig {
  /** Polygon type (p sides) */
  p: number

  /** Vertex valence (q polygons meet at each vertex) */
  q: number

  /** Maximum tiles to keep in memory */
  maxTiles: number

  /** Maximum depth to explore from origin */
  maxDepth: number
}

const DEFAULT_CONFIG: AddressBasedConfig = {
  p: 7,
  q: 3,
  maxTiles: 3000,
  maxDepth: 50,
}

/**
 * Address-based tessellation manager.
 *
 * Tiles are identified by group words, and geometry is computed
 * on-demand at render time. This completely avoids the floating-point
 * coordinate explosion problem.
 */
export class AddressBasedTessellation {
  private config: AddressBasedConfig
  private coords: VonDyckCoordinates
  private tiles: Map<GroupWord, AddressedTile> = new Map()
  private frameCount: number = 0

  // View transform (SU(1,1) format)
  private viewTransform: Matrix = [1, 0, 0, 0, 0, 0, 0, 0, 1]

  // Precomputed base vertices in Poincaré disk
  private baseVertices: Array<[number, number]> = []

  constructor(config: Partial<AddressBasedConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.coords = new VonDyckCoordinates(this.config.p, this.config.q)

    // Compute base polygon vertices in Poincaré disk
    this.baseVertices = this.computeBaseVertices()

    // Create origin tile
    this.getOrCreateTile('')
  }

  /**
   * Set the view transform (SU(1,1) format).
   */
  setViewTransform(transform: Matrix): void {
    this.viewTransform = transform
  }

  /**
   * Get visible tiles and their Poincaré disk vertices.
   * Geometry is computed fresh each call - no accumulated errors.
   */
  getVisibleTiles(): Array<{
    id: GroupWord
    vertices: Array<[number, number]>
  }> {
    this.frameCount++
    const visible: Array<{
      id: GroupWord
      vertices: Array<[number, number]>
    }> = []
    const visited = new Set<GroupWord>()
    const queue: GroupWord[] = ['']

    while (queue.length > 0 && visible.length < this.config.maxTiles) {
      const id = queue.shift()!
      if (visited.has(id)) continue
      visited.add(id)

      const tile = this.getOrCreateTile(id)
      if (tile.depth > this.config.maxDepth) continue

      // Compute vertices in Poincaré disk for this tile
      const vertices = this.computeTileVertices(id)

      // Check if any vertex is visible (inside unit disk after transform)
      const isVisible = vertices.some(([u, v]) => u * u + v * v < 1.1)

      if (isVisible) {
        visible.push({ id, vertices })
        tile.lastSeenFrame = this.frameCount

        // Explore neighbors of visible tiles
        const neighbors = this.getNeighbors(id)
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            queue.push(neighborId)
          }
        }
      } else if (tile.depth < this.config.maxDepth / 2) {
        // For non-visible tiles at low depth, still explore
        const neighbors = this.getNeighbors(id)
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            queue.push(neighborId)
          }
        }
      }
    }

    return visible
  }

  /**
   * Get or create a tile by its address.
   */
  private getOrCreateTile(id: GroupWord): AddressedTile {
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
  getConfig(): AddressBasedConfig {
    return this.config
  }
}
