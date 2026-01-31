/**
 * Hexagonal Grid Coordinates
 *
 * Supports both {6,3} (hexagons, 3 at each vertex) and
 * {3,6} (triangles, 6 at each vertex) tilings using axial coordinates.
 *
 * Axial coordinates (q, r) with implicit s = -q - r for cube coordinates.
 */

import type {
  TessellationCoordinates,
  EuclideanTileId,
  Direction,
  Point2D,
} from '../types'

/**
 * Direction vectors for hexagonal grid (pointy-top hexagons).
 * Order: NE (0), E (1), SE (2), SW (3), W (4), NW (5)
 */
const HEX_DIRECTIONS: readonly EuclideanTileId[] = [
  { x: 1, y: 0 }, // 0: E
  { x: 0, y: 1 }, // 1: SE
  { x: -1, y: 1 }, // 2: SW
  { x: -1, y: 0 }, // 3: W
  { x: 0, y: -1 }, // 4: NW
  { x: 1, y: -1 }, // 5: NE
]

/**
 * Direction vectors for triangular grid.
 * Triangles have 3 neighbors (sharing edges).
 */
const TRI_DIRECTIONS_UP: readonly EuclideanTileId[] = [
  { x: 1, y: 0 }, // 0: right
  { x: 0, y: 1 }, // 1: bottom-left
  { x: -1, y: 0 }, // 2: left (actually down-pointing neighbor)
]

const TRI_DIRECTIONS_DOWN: readonly EuclideanTileId[] = [
  { x: 1, y: 0 }, // 0: right (actually up-pointing neighbor)
  { x: 0, y: -1 }, // 1: top-right
  { x: -1, y: 0 }, // 2: left
]

/**
 * Hexagonal grid coordinate system {6,3}.
 * Tiles are hexagons identified by axial coordinates (q, r).
 */
export class HexagonalCoordinates
  implements TessellationCoordinates<EuclideanTileId>
{
  readonly geometry = 'euclidean' as const
  readonly p = 6
  readonly q = 3
  readonly tileCount = Infinity

  /** Size of hexagon (distance from center to vertex) */
  readonly size: number

  constructor(size: number = 1) {
    this.size = size
  }

  origin(): EuclideanTileId {
    return { x: 0, y: 0 }
  }

  neighbor(tile: EuclideanTileId, direction: Direction): EuclideanTileId {
    const dir = ((direction % 6) + 6) % 6
    const d = HEX_DIRECTIONS[dir]
    return { x: tile.x + d.x, y: tile.y + d.y }
  }

  neighbors(tile: EuclideanTileId): EuclideanTileId[] {
    return HEX_DIRECTIONS.map(d => ({ x: tile.x + d.x, y: tile.y + d.y }))
  }

  directionTo(from: EuclideanTileId, to: EuclideanTileId): Direction {
    const dx = to.x - from.x
    const dy = to.y - from.y

    for (let i = 0; i < HEX_DIRECTIONS.length; i++) {
      if (HEX_DIRECTIONS[i].x === dx && HEX_DIRECTIONS[i].y === dy) {
        return i
      }
    }
    return -1
  }

  /**
   * Hex distance using cube coordinates.
   */
  distance(a: EuclideanTileId, b: EuclideanTileId): number {
    // Convert axial to cube: s = -q - r
    const dq = b.x - a.x
    const dr = b.y - a.y
    const ds = -dq - dr
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2
  }

  path(from: EuclideanTileId, to: EuclideanTileId): EuclideanTileId[] {
    const dist = this.distance(from, to)
    if (dist === 0) return [from]

    const result: EuclideanTileId[] = []

    // Linear interpolation in cube space
    for (let i = 0; i <= dist; i++) {
      const t = i / dist
      const q = from.x + (to.x - from.x) * t
      const r = from.y + (to.y - from.y) * t
      result.push(this.roundAxial(q, r))
    }

    return result
  }

  /**
   * Convert axial to pixel coordinates (pointy-top).
   */
  center(tile: EuclideanTileId): Point2D {
    const x = this.size * (Math.sqrt(3) * tile.x + (Math.sqrt(3) / 2) * tile.y)
    const y = this.size * ((3 / 2) * tile.y)
    return [x, y]
  }

  /**
   * Get hexagon vertices (pointy-top orientation).
   */
  vertices(tile: EuclideanTileId): Point2D[] {
    const [cx, cy] = this.center(tile)
    const result: Point2D[] = []

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6
      result.push([
        cx + this.size * Math.cos(angle),
        cy + this.size * Math.sin(angle),
      ])
    }

    return result
  }

  /**
   * Find hex containing a pixel point.
   */
  tileAt(point: Point2D): EuclideanTileId {
    const [px, py] = point
    // Pixel to axial (inverse of center)
    const q = ((Math.sqrt(3) / 3) * px - (1 / 3) * py) / this.size
    const r = ((2 / 3) * py) / this.size
    return this.roundAxial(q, r)
  }

  tilesWithinDistance(
    center: EuclideanTileId,
    radius: number,
  ): EuclideanTileId[] {
    const result: EuclideanTileId[] = []
    const r = Math.floor(radius)

    for (let dq = -r; dq <= r; dq++) {
      const minR = Math.max(-r, -dq - r)
      const maxR = Math.min(r, -dq + r)
      for (let dr = minR; dr <= maxR; dr++) {
        result.push({ x: center.x + dq, y: center.y + dr })
      }
    }

    return result
  }

  toString(tile: EuclideanTileId): string {
    return `${tile.x},${tile.y}`
  }

  fromString(s: string): EuclideanTileId {
    const [x, y] = s.split(',').map(Number)
    if (isNaN(x) || isNaN(y)) {
      throw new Error(`Invalid tile string: ${s}`)
    }
    return { x, y }
  }

  *[Symbol.iterator](): Iterator<EuclideanTileId> {
    yield { x: 0, y: 0 }

    for (let r = 1; ; r++) {
      let tile = { x: r, y: -r }

      for (let dir = 2; dir < 8; dir++) {
        const d = HEX_DIRECTIONS[dir % 6]
        for (let i = 0; i < r; i++) {
          yield tile
          tile = { x: tile.x + d.x, y: tile.y + d.y }
        }
      }
    }
  }

  /**
   * Round fractional axial coordinates to nearest hex.
   */
  private roundAxial(q: number, r: number): EuclideanTileId {
    const s = -q - r
    let rq = Math.round(q)
    let rr = Math.round(r)
    let rs = Math.round(s)

    const dq = Math.abs(rq - q)
    const dr = Math.abs(rr - r)
    const ds = Math.abs(rs - s)

    if (dq > dr && dq > ds) {
      rq = -rr - rs
    } else if (dr > ds) {
      rr = -rq - rs
    }

    return { x: rq, y: rr }
  }
}

/**
 * Triangular grid coordinate system {3,6}.
 * Tiles are triangles with 6 meeting at each vertex.
 * Uses offset coordinates where (x + y) parity determines orientation.
 */
export class TriangularCoordinates
  implements TessellationCoordinates<EuclideanTileId>
{
  readonly geometry = 'euclidean' as const
  readonly p = 3
  readonly q = 6
  readonly tileCount = Infinity

  /** Size of triangle (edge length) */
  readonly size: number

  constructor(size: number = 1) {
    this.size = size
  }

  origin(): EuclideanTileId {
    return { x: 0, y: 0 }
  }

  /**
   * Check if triangle points up (even parity) or down (odd parity).
   */
  isUpward(tile: EuclideanTileId): boolean {
    return (tile.x + tile.y) % 2 === 0
  }

  neighbor(tile: EuclideanTileId, direction: Direction): EuclideanTileId {
    const dirs = this.isUpward(tile) ? TRI_DIRECTIONS_UP : TRI_DIRECTIONS_DOWN
    const dir = ((direction % 3) + 3) % 3
    const d = dirs[dir]
    return { x: tile.x + d.x, y: tile.y + d.y }
  }

  neighbors(tile: EuclideanTileId): EuclideanTileId[] {
    const dirs = this.isUpward(tile) ? TRI_DIRECTIONS_UP : TRI_DIRECTIONS_DOWN
    return dirs.map(d => ({ x: tile.x + d.x, y: tile.y + d.y }))
  }

  directionTo(from: EuclideanTileId, to: EuclideanTileId): Direction {
    const dirs = this.isUpward(from) ? TRI_DIRECTIONS_UP : TRI_DIRECTIONS_DOWN
    const dx = to.x - from.x
    const dy = to.y - from.y

    for (let i = 0; i < dirs.length; i++) {
      if (dirs[i].x === dx && dirs[i].y === dy) {
        return i
      }
    }
    return -1
  }

  distance(a: EuclideanTileId, b: EuclideanTileId): number {
    // BFS for accurate triangle distance
    if (a.x === b.x && a.y === b.y) return 0

    const visited = new Set<string>()
    const queue: Array<{ tile: EuclideanTileId; dist: number }> = [
      { tile: a, dist: 0 },
    ]
    visited.add(`${a.x},${a.y}`)

    while (queue.length > 0) {
      const { tile, dist } = queue.shift()!

      for (const neighbor of this.neighbors(tile)) {
        const key = `${neighbor.x},${neighbor.y}`
        if (neighbor.x === b.x && neighbor.y === b.y) {
          return dist + 1
        }
        if (!visited.has(key)) {
          visited.add(key)
          queue.push({ tile: neighbor, dist: dist + 1 })
        }
      }
    }

    return -1
  }

  path(from: EuclideanTileId, to: EuclideanTileId): EuclideanTileId[] {
    if (from.x === to.x && from.y === to.y) return [from]

    const visited = new Map<string, EuclideanTileId | null>()
    const queue: EuclideanTileId[] = [from]
    visited.set(`${from.x},${from.y}`, null)

    while (queue.length > 0) {
      const tile = queue.shift()!

      for (const neighbor of this.neighbors(tile)) {
        const key = `${neighbor.x},${neighbor.y}`
        if (!visited.has(key)) {
          visited.set(key, tile)

          if (neighbor.x === to.x && neighbor.y === to.y) {
            const result: EuclideanTileId[] = []
            let current: EuclideanTileId | null = to
            while (current) {
              result.unshift(current)
              current = visited.get(`${current.x},${current.y}`) ?? null
            }
            return result
          }

          queue.push(neighbor)
        }
      }
    }

    return []
  }

  /**
   * Get center of triangle in Euclidean coordinates.
   */
  center(tile: EuclideanTileId): Point2D {
    const h = (this.size * Math.sqrt(3)) / 2

    const x = tile.x * (this.size / 2)
    const baseY = tile.y * h

    // Adjust y based on orientation
    const y = this.isUpward(tile) ? baseY + h / 3 : baseY + (2 * h) / 3

    return [x, y]
  }

  /**
   * Get vertices of triangle.
   */
  vertices(tile: EuclideanTileId): Point2D[] {
    const [cx, cy] = this.center(tile)
    const h = (this.size * Math.sqrt(3)) / 2

    if (this.isUpward(tile)) {
      return [
        [cx, cy + (2 * h) / 3], // top
        [cx - this.size / 2, cy - h / 3], // bottom-left
        [cx + this.size / 2, cy - h / 3], // bottom-right
      ]
    } else {
      return [
        [cx, cy - (2 * h) / 3], // bottom
        [cx + this.size / 2, cy + h / 3], // top-right
        [cx - this.size / 2, cy + h / 3], // top-left
      ]
    }
  }

  tileAt(point: Point2D): EuclideanTileId {
    const [px, py] = point
    const h = (this.size * Math.sqrt(3)) / 2

    // Approximate grid position
    const col = Math.floor(px / (this.size / 2))
    const row = Math.floor(py / h)

    // Check which of the nearby triangles contains the point
    const candidates = [
      { x: col, y: row },
      { x: col + 1, y: row },
      { x: col - 1, y: row },
      { x: col, y: row + 1 },
      { x: col, y: row - 1 },
    ]

    let bestTile = candidates[0]
    let bestDist = Infinity

    for (const tile of candidates) {
      const [cx, cy] = this.center(tile)
      const dist = (px - cx) * (px - cx) + (py - cy) * (py - cy)
      if (dist < bestDist) {
        bestDist = dist
        bestTile = tile
      }
    }

    return bestTile
  }

  tilesWithinDistance(
    center: EuclideanTileId,
    radius: number,
  ): EuclideanTileId[] {
    const result: EuclideanTileId[] = []
    const visited = new Set<string>()
    const queue: Array<{ tile: EuclideanTileId; dist: number }> = [
      { tile: center, dist: 0 },
    ]
    visited.add(`${center.x},${center.y}`)

    while (queue.length > 0) {
      const { tile, dist } = queue.shift()!
      result.push(tile)

      if (dist < radius) {
        for (const neighbor of this.neighbors(tile)) {
          const key = `${neighbor.x},${neighbor.y}`
          if (!visited.has(key)) {
            visited.add(key)
            queue.push({ tile: neighbor, dist: dist + 1 })
          }
        }
      }
    }

    return result
  }

  toString(tile: EuclideanTileId): string {
    return `${tile.x},${tile.y}`
  }

  fromString(s: string): EuclideanTileId {
    const [x, y] = s.split(',').map(Number)
    if (isNaN(x) || isNaN(y)) {
      throw new Error(`Invalid tile string: ${s}`)
    }
    return { x, y }
  }

  *[Symbol.iterator](): Iterator<EuclideanTileId> {
    yield { x: 0, y: 0 }

    for (let r = 1; ; r++) {
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          if (Math.abs(x) === r || Math.abs(y) === r) {
            yield { x, y }
          }
        }
      }
    }
  }
}
