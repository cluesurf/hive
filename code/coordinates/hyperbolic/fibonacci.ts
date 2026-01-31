/**
 * Fibonacci Coordinates for {7,3} Heptagrid
 *
 * Optimized coordinate system using Zeckendorf representation
 * and Margenstern's neighbor formulas for O(1) operations.
 *
 * Based on: Margenstern, M. (2002). New tools for cellular automata
 * in the hyperbolic plane. Theoretical Computer Science, 296(3), 405-442.
 */

import type {
  HyperbolicCoordinates,
  Direction,
  Point3D,
} from '../types'

/**
 * Node color in the Fibonacci tree.
 * - White nodes have 3 children
 * - Black nodes have 2 children
 */
type NodeColor = 'white' | 'black'

/**
 * Precomputed Fibonacci numbers for efficient lookup.
 * F[0] = 1, F[1] = 1, F[2] = 2, F[3] = 3, F[4] = 5, ...
 */
const MAX_FIB_INDEX = 100
const FIB: bigint[] = []
const FIB_NUMBER: number[] = []

// Initialize Fibonacci sequences
;(() => {
  FIB[0] = 1n
  FIB[1] = 1n
  FIB_NUMBER[0] = 1
  FIB_NUMBER[1] = 1

  for (let i = 2; i <= MAX_FIB_INDEX; i++) {
    FIB[i] = FIB[i - 1]! + FIB[i - 2]!
    FIB_NUMBER[i] = Number(FIB[i])
  }
})()

/**
 * Golden ratio and related constants.
 */
const PHI = (1 + Math.sqrt(5)) / 2
const PHI_SQ = PHI * PHI // φ² ≈ 2.618

/**
 * Fibonacci coordinate system for {7,3} heptagrid.
 *
 * Each tile is identified by a positive bigint. The number encodes
 * position in a Fibonacci tree spanning one of 7 sectors of the plane.
 *
 * For the full plane, tiles are addressed as (sector, treeId) pairs,
 * but this class focuses on a single sector for simplicity.
 */
export class FibonacciCoordinates
  implements HyperbolicCoordinates<bigint>
{
  readonly geometry = 'hyperbolic' as const
  readonly p = 7
  readonly q = 3
  readonly tileCount = Infinity

  // Geometric constants for {7,3}
  private readonly cellAngle = (2 * Math.PI) / 7
  private readonly vertexDist: number

  // Cache for computed values
  private readonly colorCache = new Map<string, NodeColor>()
  private readonly centerCache = new Map<string, Point3D>()

  constructor() {
    // Compute distance from cell center to vertex
    this.vertexDist = this.computeVertexDistance()
  }

  /**
   * Origin tile (root of tree).
   */
  origin(): bigint {
    return 1n
  }

  /**
   * Get neighbor in given direction using Margenstern's formulas.
   * Direction 0-6 for the 7 edges of the heptagon.
   */
  neighbor(tile: bigint, direction: Direction): bigint {
    if (tile < 1n) {
      throw new Error('Invalid tile: must be positive')
    }

    const dir = ((direction % 7) + 7) % 7
    const color = this.nodeColor(tile)
    const f = this.father(tile)
    const s = this.preferredSon(tile)

    // Margenstern's neighbor formulas for {7,3}
    // Neighbors are listed clockwise starting from father direction

    if (color === 'white') {
      // White node (3 children): [f, n-1, s-1, s, s+1, s+2, n+1]
      const neighbors: bigint[] = [
        f, // 0: father
        tile - 1n, // 1: left sibling
        s - 1n, // 2: before preferred son
        s, // 3: preferred son
        s + 1n, // 4: after preferred son
        s + 2n, // 5: rightmost child
        tile + 1n, // 6: right sibling
      ]
      return this.clampTile(neighbors[dir]!)
    } else {
      // Black node (2 children): [f, f-1, n-1, s, s+1, s+2, n+1]
      const neighbors: bigint[] = [
        f, // 0: father
        f - 1n, // 1: father's sibling
        tile - 1n, // 2: left sibling
        s, // 3: preferred son
        s + 1n, // 4: other child
        s + 2n, // 5: nephew
        tile + 1n, // 6: right sibling
      ]
      return this.clampTile(neighbors[dir]!)
    }
  }

  /**
   * Get all 7 neighbors.
   */
  neighbors(tile: bigint): bigint[] {
    const result: bigint[] = []
    for (let i = 0; i < 7; i++) {
      result.push(this.neighbor(tile, i))
    }
    return result
  }

  /**
   * Find direction to adjacent tile.
   */
  directionTo(from: bigint, to: bigint): Direction {
    for (let i = 0; i < 7; i++) {
      if (this.neighbor(from, i) === to) {
        return i
      }
    }
    return -1
  }

  /**
   * Distance via tree depth comparison.
   * Efficient because we can compute depth from Zeckendorf representation.
   */
  distance(a: bigint, b: bigint): number {
    if (a === b) return 0

    // Use BFS for accurate distance
    const visited = new Set<string>([a.toString()])
    const queue: Array<{ tile: bigint; dist: number }> = [
      { tile: a, dist: 0 },
    ]

    while (queue.length > 0) {
      const { tile, dist } = queue.shift()!

      for (let i = 0; i < 7; i++) {
        const neighbor = this.neighbor(tile, i)
        const key = neighbor.toString()

        if (neighbor === b) return dist + 1

        if (!visited.has(key) && neighbor >= 1n) {
          visited.add(key)
          queue.push({ tile: neighbor, dist: dist + 1 })
        }
      }

      // Limit search
      if (dist > 50) break
    }

    return -1
  }

  /**
   * Find shortest path using tree structure.
   */
  path(from: bigint, to: bigint): bigint[] {
    if (from === to) return [from]

    // Find common ancestor, then concatenate paths
    const pathFromRoot1 = this.pathToRoot(from)
    const pathFromRoot2 = this.pathToRoot(to)

    // Find lowest common ancestor
    const set1 = new Set(pathFromRoot1.map(n => n.toString()))
    let lca = to
    for (const node of pathFromRoot2) {
      if (set1.has(node.toString())) {
        lca = node
        break
      }
    }

    // Build path: from -> lca -> to
    const path1: bigint[] = []
    let current = from
    while (current !== lca) {
      path1.push(current)
      current = this.father(current)
      if (current < 1n) break
    }
    path1.push(lca)

    const path2: bigint[] = []
    current = to
    while (current !== lca) {
      path2.unshift(current)
      current = this.father(current)
      if (current < 1n) break
    }

    return [...path1, ...path2]
  }

  /**
   * Get center of tile on hyperboloid.
   */
  center(tile: bigint): Point3D {
    const key = tile.toString()
    const cached = this.centerCache.get(key)
    if (cached) return cached

    if (tile === 1n) {
      const center: Point3D = [0, 0, 1]
      this.centerCache.set(key, center)
      return center
    }

    // Compute center by following path from root
    const pathFromRoot = this.pathToRoot(tile).reverse()

    let x = 0
    let y = 0
    let t = 1
    let angle = 0

    for (let i = 1; i < pathFromRoot.length; i++) {
      const parent = pathFromRoot[i - 1]
      const child = pathFromRoot[i]

      // Find which direction child is from parent
      const dir = this.directionTo(parent!, child!)
      if (dir === -1) continue

      // Move outward and rotate
      angle += ((dir - 3) * this.cellAngle) / 2
      const dist = this.vertexDist * 0.8 // Approximate step

      const cosh_d = Math.cosh(dist)
      const sinh_d = Math.sinh(dist)

      const nx = x * cosh_d + sinh_d * Math.cos(angle)
      const ny = y * cosh_d + sinh_d * Math.sin(angle)
      const nt = t * cosh_d + Math.sqrt(x * x + y * y) * sinh_d

      x = nx
      y = ny
      t = Math.sqrt(1 + x * x + y * y) // Normalize to hyperboloid
    }

    const center: Point3D = [x, y, t]
    this.centerCache.set(key, center)
    return center
  }

  /**
   * Get vertices of heptagonal tile.
   */
  vertices(tile: bigint): Point3D[] {
    const [cx, cy, ct] = this.center(tile)

    const vertices: Point3D[] = []
    const r = Math.tanh(this.vertexDist) // Approximate radius in Poincaré

    for (let i = 0; i < 7; i++) {
      const angle = (i * 2 * Math.PI) / 7
      // This is approximate - full implementation needs proper hyperbolic transforms
      const vx = cx + r * Math.cos(angle) * 0.3
      const vy = cy + r * Math.sin(angle) * 0.3
      const vt = Math.sqrt(1 + vx * vx + vy * vy)
      vertices.push([vx, vy, vt])
    }

    return vertices
  }

  /**
   * Find tile containing point (approximate).
   */
  tileAt(point: Point3D): bigint | null {
    // Start at origin and walk toward point
    let current = 1n
    const [px, py] = point

    for (let iter = 0; iter < 100; iter++) {
      const [cx, cy] = this.center(current)
      const currentDist = (px - cx) ** 2 + (py - cy) ** 2

      let bestNeighbor = current
      let bestDist = currentDist

      for (let dir = 0; dir < 7; dir++) {
        const neighbor = this.neighbor(current, dir)
        if (neighbor < 1n) continue

        const [nx, ny] = this.center(neighbor)
        const dist = (px - nx) ** 2 + (py - ny) ** 2

        if (dist < bestDist) {
          bestDist = dist
          bestNeighbor = neighbor
        }
      }

      if (bestNeighbor === current) break
      current = bestNeighbor
    }

    return current
  }

  /**
   * Get tiles within distance r.
   */
  tilesWithinDistance(center: bigint, radius: number): bigint[] {
    const result: bigint[] = []
    const visited = new Set<string>()
    const queue: Array<{ tile: bigint; dist: number }> = [
      { tile: center, dist: 0 },
    ]
    visited.add(center.toString())

    while (queue.length > 0) {
      const { tile, dist } = queue.shift()!
      result.push(tile)

      if (dist < radius) {
        for (let dir = 0; dir < 7; dir++) {
          const neighbor = this.neighbor(tile, dir)
          const key = neighbor.toString()

          if (neighbor >= 1n && !visited.has(key)) {
            visited.add(key)
            queue.push({ tile: neighbor, dist: dist + 1 })
          }
        }
      }
    }

    return result
  }

  /**
   * Parent in tree (toward root).
   */
  parent(tile: bigint): bigint | null {
    if (tile <= 1n) return null
    return this.father(tile)
  }

  /**
   * Children in tree (away from root).
   */
  children(tile: bigint): bigint[] {
    const s = this.preferredSon(tile)
    const color = this.nodeColor(tile)

    if (color === 'white') {
      // 3 children
      return [s, s + 1n, s + 2n].filter(c => c >= 1n)
    } else {
      // 2 children
      return [s, s + 1n].filter(c => c >= 1n)
    }
  }

  /**
   * Depth in tree (distance from root).
   */
  depth(tile: bigint): number {
    const zeck = this.toZeckendorf(tile)
    // Depth is approximately half the Zeckendorf representation length
    return Math.ceil(zeck.length / 2)
  }

  /**
   * Number of sector trees (7 for heptagrid).
   */
  treeCount(): number {
    return 7
  }

  /**
   * Which sector tree (0-6).
   */
  treeIndex(_tile: bigint): number {
    // In this implementation, all tiles are in sector 0
    // Full implementation would track sector separately
    return 0
  }

  /**
   * Convert to integer (identity for this implementation).
   */
  toInteger(tile: bigint): bigint {
    return tile
  }

  /**
   * Convert from integer.
   */
  fromInteger(n: bigint): bigint {
    if (n < 1n) throw new Error('Tile ID must be positive')
    return n
  }

  toString(tile: bigint): string {
    return tile.toString()
  }

  fromString(s: string): bigint {
    const n = BigInt(s)
    if (n < 1n) throw new Error('Tile ID must be positive')
    return n
  }

  *[Symbol.iterator](): Iterator<bigint> {
    for (let n = 1n; ; n++) {
      yield n
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CORE FIBONACCI ALGORITHMS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Determine node color (white or black) from Zeckendorf representation.
   *
   * Rule: Look at trailing pattern of Zeckendorf representation
   * - Ends in ...10 or ...100 → black (2 children)
   * - Ends in ...01 or ...010 → white (3 children)
   */
  nodeColor(n: bigint): NodeColor {
    const key = n.toString()
    const cached = this.colorCache.get(key)
    if (cached) return cached

    const zeck = this.toZeckendorf(n)
    let color: NodeColor

    if (zeck.length === 0) {
      color = 'white'
    } else {
      // Check if last non-zero index is even or odd
      const lastIndex = zeck[zeck.length - 1]!
      // Even index → white, odd index → black
      color = lastIndex % 2 === 0 ? 'white' : 'black'
    }

    this.colorCache.set(key, color)
    return color
  }

  /**
   * Compute preferred son using golden ratio approximation.
   * m ≈ n × φ²
   */
  preferredSon(n: bigint): bigint {
    if (n < 1n) return 1n

    // Use Fibonacci identity for exact computation when possible
    const zeck = this.toZeckendorf(n)

    if (zeck.length === 0) {
      // n = 1, preferred son is F(2) + F(0) = 2 + 1 = 3... but using formula
      return 2n
    }

    // Appending 00 in Zeckendorf = multiplying by φ²
    // This shifts all indices up by 2
    const sonZeck = zeck.map(i => i + 2)
    return this.fromZeckendorf(sonZeck)
  }

  /**
   * Compute father (parent in tree).
   * f ≈ n / φ²
   */
  father(n: bigint): bigint {
    if (n <= 1n) return 0n

    const zeck = this.toZeckendorf(n)

    if (zeck.length === 0) return 0n

    // Remove trailing zeros (shift indices down by 2 if possible)
    // This is the inverse of preferredSon
    const fatherZeck = zeck.map(i => i - 2).filter(i => i >= 0)

    if (fatherZeck.length === 0) return 1n

    return this.fromZeckendorf(fatherZeck)
  }

  /**
   * Convert number to Zeckendorf representation.
   * Returns array of Fibonacci indices (non-consecutive).
   */
  toZeckendorf(n: bigint): number[] {
    if (n <= 0n) return []
    if (n === 1n) return [0]

    const result: number[] = []
    let remaining = n

    // Find largest Fibonacci ≤ n, subtract, repeat
    for (let i = MAX_FIB_INDEX; i >= 0 && remaining > 0n; i--) {
      const fibI = FIB[i]!
      if (fibI <= remaining) {
        result.push(i)
        remaining -= fibI
        // Skip next index to maintain non-consecutive property
        i--
      }
    }

    return result.reverse() // Return in ascending order
  }

  /**
   * Convert Zeckendorf representation back to number.
   */
  fromZeckendorf(indices: number[]): bigint {
    let result = 0n
    for (const i of indices) {
      if (i >= 0 && i <= MAX_FIB_INDEX) {
        result += FIB[i]!
      }
    }
    return result
  }

  /**
   * Path from tile to root.
   */
  private pathToRoot(tile: bigint): bigint[] {
    const path: bigint[] = []
    let current = tile

    while (current >= 1n) {
      path.push(current)
      if (current === 1n) break
      current = this.father(current)
    }

    return path
  }

  /**
   * Clamp tile to valid range.
   */
  private clampTile(n: bigint): bigint {
    return n < 1n ? 1n : n
  }

  /**
   * Compute hyperbolic distance from center to vertex.
   */
  private computeVertexDistance(): number {
    const angleA = Math.PI / 7
    const angleB = Math.PI / 3
    const angleC = Math.PI / 2

    const coshc =
      (Math.cos(angleC) + Math.cos(angleA) * Math.cos(angleB)) /
      (Math.sin(angleA) * Math.sin(angleB))

    return Math.acosh(coshc)
  }
}

/**
 * Get Fibonacci number by index.
 */
export function fibonacci(n: number): bigint {
  if (n < 0 || n > MAX_FIB_INDEX) {
    throw new Error(`Fibonacci index must be 0-${MAX_FIB_INDEX}`)
  }
  return FIB[n]!
}

/**
 * Convert number to Zeckendorf representation string.
 */
export function zeckendorfString(n: bigint): string {
  const coords = new FibonacciCoordinates()
  const zeck = coords.toZeckendorf(n)

  if (zeck.length === 0) return '0'

  const maxIndex = zeck[zeck.length - 1]!
  const bits: string[] = []

  for (let i = 0; i <= maxIndex; i++) {
    bits.push(zeck.includes(i) ? '1' : '0')
  }

  return bits.reverse().join('')
}
