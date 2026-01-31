/**
 * Spherical Tessellation Coordinates
 *
 * Coordinate system for Platonic solid tessellations on the sphere.
 * All operations are O(1) using precomputed tables.
 */

import type { TessellationCoordinates, Direction, Point3D } from '../types'
import { type PlatonicSolid, getPlatonicSolid } from './platonic'

/**
 * Spherical coordinate system for Platonic solid tessellations.
 * Tiles are identified by face index (0 to faceCount-1).
 */
export class SphericalCoordinates implements TessellationCoordinates<number> {
  readonly geometry = 'spherical' as const
  readonly p: number
  readonly q: number
  readonly tileCount: number

  private readonly solid: PlatonicSolid

  constructor(p: number, q: number) {
    const solid = getPlatonicSolid(p, q)
    if (!solid) {
      throw new Error(
        `No Platonic solid exists for {${p},${q}}. ` +
          `Valid combinations: {3,3}, {4,3}, {3,4}, {5,3}, {3,5}`,
      )
    }

    this.p = p
    this.q = q
    this.solid = solid
    this.tileCount = solid.faceCount
  }

  /**
   * Get the origin tile (face 0).
   */
  origin(): number {
    return 0
  }

  /**
   * Get neighbor in given direction.
   * O(1) table lookup.
   */
  neighbor(tile: number, direction: Direction): number {
    this.validateTile(tile)
    const dir = ((direction % this.p) + this.p) % this.p
    return this.solid.adjacency[tile][dir]
  }

  /**
   * Get all neighbors of a tile.
   */
  neighbors(tile: number): number[] {
    this.validateTile(tile)
    return [...this.solid.adjacency[tile]]
  }

  /**
   * Find which direction leads from one tile to another.
   * Returns -1 if not adjacent.
   */
  directionTo(from: number, to: number): Direction {
    this.validateTile(from)
    this.validateTile(to)

    const adj = this.solid.adjacency[from]
    for (let i = 0; i < adj.length; i++) {
      if (adj[i] === to) return i
    }
    return -1
  }

  /**
   * Combinatorial distance between tiles.
   * Uses BFS for small finite graph.
   */
  distance(a: number, b: number): number {
    this.validateTile(a)
    this.validateTile(b)

    if (a === b) return 0

    // BFS on small graph
    const visited = new Set<number>([a])
    const queue: Array<{ tile: number; dist: number }> = [{ tile: a, dist: 0 }]

    while (queue.length > 0) {
      const { tile, dist } = queue.shift()!
      for (const neighbor of this.solid.adjacency[tile]) {
        if (neighbor === b) return dist + 1
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          queue.push({ tile: neighbor, dist: dist + 1 })
        }
      }
    }

    // Should never reach here for connected graph
    return -1
  }

  /**
   * Find shortest path between tiles.
   */
  path(from: number, to: number): number[] {
    this.validateTile(from)
    this.validateTile(to)

    if (from === to) return [from]

    // BFS with path tracking
    const visited = new Map<number, number>() // tile -> previous tile
    visited.set(from, -1)
    const queue: number[] = [from]

    while (queue.length > 0) {
      const tile = queue.shift()!
      for (const neighbor of this.solid.adjacency[tile]) {
        if (!visited.has(neighbor)) {
          visited.set(neighbor, tile)
          if (neighbor === to) {
            // Reconstruct path
            const result: number[] = []
            let current: number | undefined = to
            while (current !== undefined && current !== -1) {
              result.unshift(current)
              current = visited.get(current)
            }
            return result
          }
          queue.push(neighbor)
        }
      }
    }

    return [] // Should never reach for connected graph
  }

  /**
   * Get geometric center of tile on unit sphere.
   */
  center(tile: number): Point3D {
    this.validateTile(tile)
    return this.solid.centers[tile]
  }

  /**
   * Get vertices of tile polygon on unit sphere.
   */
  vertices(tile: number): Point3D[] {
    this.validateTile(tile)
    return [...this.solid.faceVertices[tile]]
  }

  /**
   * Find tile containing a point on the unit sphere.
   * Uses dot product to find closest face center.
   */
  tileAt(point: Point3D): number | null {
    // Normalize point to unit sphere
    const [x, y, z] = point
    const len = Math.sqrt(x * x + y * y + z * z)
    if (len === 0) return null

    const nx = x / len
    const ny = y / len
    const nz = z / len

    // Find face with maximum dot product (closest center)
    let bestTile = 0
    let bestDot = -Infinity

    for (let i = 0; i < this.tileCount; i++) {
      const [cx, cy, cz] = this.solid.centers[i]
      const dot = nx * cx + ny * cy + nz * cz
      if (dot > bestDot) {
        bestDot = dot
        bestTile = i
      }
    }

    return bestTile
  }

  /**
   * Get all tiles within distance r from center.
   * For finite spherical tessellations, may return all tiles.
   */
  tilesWithinDistance(center: number, radius: number): number[] {
    this.validateTile(center)

    if (radius < 0) return []
    if (radius === 0) return [center]

    const result: number[] = []
    const visited = new Set<number>()
    const queue: Array<{ tile: number; dist: number }> = [
      { tile: center, dist: 0 },
    ]
    visited.add(center)

    while (queue.length > 0) {
      const { tile, dist } = queue.shift()!
      result.push(tile)

      if (dist < radius) {
        for (const neighbor of this.solid.adjacency[tile]) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor)
            queue.push({ tile: neighbor, dist: dist + 1 })
          }
        }
      }
    }

    return result
  }

  /**
   * Convert tile to string.
   */
  toString(tile: number): string {
    this.validateTile(tile)
    return tile.toString()
  }

  /**
   * Parse tile from string.
   */
  fromString(s: string): number {
    const tile = parseInt(s, 10)
    this.validateTile(tile)
    return tile
  }

  /**
   * Iterate all tiles in order.
   */
  *[Symbol.iterator](): Iterator<number> {
    for (let i = 0; i < this.tileCount; i++) {
      yield i
    }
  }

  /**
   * Get the name of this Platonic solid.
   */
  get name(): string {
    return this.solid.name
  }

  private validateTile(tile: number): void {
    if (!Number.isInteger(tile) || tile < 0 || tile >= this.tileCount) {
      throw new Error(
        `Invalid tile ${tile}. Must be integer in [0, ${this.tileCount - 1}]`,
      )
    }
  }
}
