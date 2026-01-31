/**
 * Square Grid Coordinates {4,4}
 *
 * Standard Cartesian integer grid where each tile is a square
 * with 4 neighbors (up, right, down, left).
 */

import type {
  TessellationCoordinates,
  EuclideanTileId,
  Direction,
  Point2D,
} from '../types'

/**
 * Direction vectors for square grid.
 * Order: up (0), right (1), down (2), left (3)
 */
const DIRECTIONS: readonly EuclideanTileId[] = [
  { x: 0, y: 1 }, // 0: up (+Y)
  { x: 1, y: 0 }, // 1: right (+X)
  { x: 0, y: -1 }, // 2: down (-Y)
  { x: -1, y: 0 }, // 3: left (-X)
]

/**
 * Square grid coordinate system.
 * Tiles are identified by (x, y) integer coordinates.
 */
export class SquareCoordinates
  implements TessellationCoordinates<EuclideanTileId>
{
  readonly geometry = 'euclidean' as const
  readonly p = 4
  readonly q = 4
  readonly tileCount = Infinity

  /**
   * Get the origin tile at (0, 0).
   */
  origin(): EuclideanTileId {
    return { x: 0, y: 0 }
  }

  /**
   * Get neighbor in given direction.
   * Directions: 0=up, 1=right, 2=down, 3=left
   */
  neighbor(tile: EuclideanTileId, direction: Direction): EuclideanTileId {
    const dir = ((direction % 4) + 4) % 4
    const d = DIRECTIONS[dir]
    return { x: tile.x + d.x, y: tile.y + d.y }
  }

  /**
   * Get all 4 neighbors.
   */
  neighbors(tile: EuclideanTileId): EuclideanTileId[] {
    return DIRECTIONS.map(d => ({ x: tile.x + d.x, y: tile.y + d.y }))
  }

  /**
   * Find direction from one tile to adjacent tile.
   */
  directionTo(from: EuclideanTileId, to: EuclideanTileId): Direction {
    const dx = to.x - from.x
    const dy = to.y - from.y

    for (let i = 0; i < DIRECTIONS.length; i++) {
      if (DIRECTIONS[i].x === dx && DIRECTIONS[i].y === dy) {
        return i
      }
    }
    return -1
  }

  /**
   * Manhattan distance between tiles.
   */
  distance(a: EuclideanTileId, b: EuclideanTileId): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
  }

  /**
   * Find shortest path (one of many possible).
   */
  path(from: EuclideanTileId, to: EuclideanTileId): EuclideanTileId[] {
    const result: EuclideanTileId[] = [{ x: from.x, y: from.y }]
    let { x, y } = from

    // Move in X direction first
    while (x !== to.x) {
      x += x < to.x ? 1 : -1
      result.push({ x, y })
    }

    // Then Y direction
    while (y !== to.y) {
      y += y < to.y ? 1 : -1
      result.push({ x, y })
    }

    return result
  }

  /**
   * Get center of tile in Euclidean coordinates.
   * Each tile is a unit square centered at (x, y).
   */
  center(tile: EuclideanTileId): Point2D {
    return [tile.x, tile.y]
  }

  /**
   * Get vertices of tile square.
   * Returns corners in clockwise order from top-left.
   */
  vertices(tile: EuclideanTileId): Point2D[] {
    const { x, y } = tile
    return [
      [x - 0.5, y + 0.5], // top-left
      [x + 0.5, y + 0.5], // top-right
      [x + 0.5, y - 0.5], // bottom-right
      [x - 0.5, y - 0.5], // bottom-left
    ]
  }

  /**
   * Find tile containing a point.
   */
  tileAt(point: Point2D): EuclideanTileId {
    return {
      x: Math.round(point[0]),
      y: Math.round(point[1]),
    }
  }

  /**
   * Get tiles within Manhattan distance r.
   */
  tilesWithinDistance(
    center: EuclideanTileId,
    radius: number,
  ): EuclideanTileId[] {
    const result: EuclideanTileId[] = []
    const r = Math.floor(radius)

    for (let dx = -r; dx <= r; dx++) {
      const maxDy = r - Math.abs(dx)
      for (let dy = -maxDy; dy <= maxDy; dy++) {
        result.push({ x: center.x + dx, y: center.y + dy })
      }
    }

    return result
  }

  /**
   * Convert to string "x,y".
   */
  toString(tile: EuclideanTileId): string {
    return `${tile.x},${tile.y}`
  }

  /**
   * Parse from string "x,y".
   */
  fromString(s: string): EuclideanTileId {
    const [x, y] = s.split(',').map(Number)
    if (isNaN(x) || isNaN(y)) {
      throw new Error(`Invalid tile string: ${s}`)
    }
    return { x, y }
  }

  /**
   * Iterate tiles in spiral order from origin.
   */
  *[Symbol.iterator](): Iterator<EuclideanTileId> {
    yield { x: 0, y: 0 }

    for (let r = 1; ; r++) {
      // Top edge (left to right)
      for (let x = -r; x <= r; x++) {
        yield { x, y: r }
      }
      // Right edge (top to bottom, excluding corners)
      for (let y = r - 1; y >= -r + 1; y--) {
        yield { x: r, y }
      }
      // Bottom edge (right to left)
      for (let x = r; x >= -r; x--) {
        yield { x, y: -r }
      }
      // Left edge (bottom to top, excluding corners)
      for (let y = -r + 1; y <= r - 1; y++) {
        yield { x: -r, y }
      }
    }
  }
}
