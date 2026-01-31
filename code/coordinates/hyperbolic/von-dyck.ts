/**
 * Von Dyck Group Coordinates
 *
 * Generic coordinate system for any {p,q} hyperbolic tiling
 * using group theory. Works for all hyperbolic tilings but
 * may be slower than specialized implementations.
 *
 * Group presentation: <a, b | a^p = b^q = (ab)^2 = e>
 * - a = rotation by 2π/p around cell center
 * - b = rotation by 2π/q around vertex
 * - ab = rotation by π around edge midpoint
 */

import type {
  TessellationCoordinates,
  HyperbolicCoordinates,
  Direction,
  Point3D,
} from '../types'

/**
 * A group word is a sequence of generator symbols.
 * We use a compact string representation: "a2b1a-1" means a²ba⁻¹
 */
export type GroupWord = string

/**
 * Parsed generator with symbol and power.
 */
interface Generator {
  symbol: 'a' | 'b'
  power: number
}

/**
 * Von Dyck group coordinate system for hyperbolic tilings.
 * Tiles are identified by normalized group words.
 */
export class VonDyckCoordinates
  implements HyperbolicCoordinates<GroupWord>
{
  readonly geometry = 'hyperbolic' as const
  readonly tileCount = Infinity

  // Geometric constants
  private readonly cellAngle: number // 2π/p
  private readonly vertexAngle: number // 2π/q

  // Precomputed transformation matrices for generators
  private readonly aMatrix: number[] // Rotation around cell center
  private readonly bMatrix: number[] // Rotation around vertex
  private readonly aInvMatrix: number[]
  private readonly bInvMatrix: number[]

  // Cache for expensive computations
  private readonly centerCache = new Map<string, Point3D>()
  private readonly neighborCache = new Map<string, GroupWord[]>()

  constructor(readonly p: number, readonly q: number) {
    // Validate hyperbolic condition
    if ((p - 2) * (q - 2) <= 4) {
      throw new Error(
        `{${p},${q}} is not hyperbolic. Need (p-2)(q-2) > 4.`,
      )
    }

    this.cellAngle = (2 * Math.PI) / p
    this.vertexAngle = (2 * Math.PI) / q

    // Compute fundamental domain geometry
    const { aMatrix, bMatrix, aInvMatrix, bInvMatrix } =
      this.computeGeneratorMatrices()
    this.aMatrix = aMatrix
    this.bMatrix = bMatrix
    this.aInvMatrix = aInvMatrix
    this.bInvMatrix = bInvMatrix
  }

  /**
   * Origin is the identity element (empty word).
   */
  origin(): GroupWord {
    return ''
  }

  /**
   * Get neighbor in given direction.
   * Direction 0 to p-1 corresponds to the p edges of the tile.
   */
  neighbor(tile: GroupWord, direction: Direction): GroupWord {
    const dir = ((direction % this.p) + this.p) % this.p

    // Moving to neighbor through edge `dir`:
    // 1. Rotate to face that edge: a^dir
    // 2. Cross the edge: b (reflect/rotate around shared vertex)
    // 3. Rotate back in new tile to canonical orientation

    // The neighbor across edge dir is: tile * a^dir * b * a^(-dir-1)
    // This is because we rotate to the edge, cross via vertex rotation,
    // then adjust orientation in the new tile

    const neighborWord = this.multiply(tile, this.edgeCrossing(dir))
    return this.normalize(neighborWord)
  }

  /**
   * Get all p neighbors.
   */
  neighbors(tile: GroupWord): GroupWord[] {
    const cacheKey = tile
    const cached = this.neighborCache.get(cacheKey)
    if (cached) return cached

    const result: GroupWord[] = []
    for (let dir = 0; dir < this.p; dir++) {
      result.push(this.neighbor(tile, dir))
    }

    this.neighborCache.set(cacheKey, result)
    return result
  }

  /**
   * Find direction to adjacent tile.
   */
  directionTo(from: GroupWord, to: GroupWord): Direction {
    const neighbors = this.neighbors(from)
    for (let i = 0; i < neighbors.length; i++) {
      if (neighbors[i] === to) return i
    }
    return -1
  }

  /**
   * Compute distance via BFS.
   * This is expensive for large distances.
   */
  distance(a: GroupWord, b: GroupWord): number {
    if (a === b) return 0

    const visited = new Set<string>([a])
    const queue: Array<{ tile: GroupWord; dist: number }> = [
      { tile: a, dist: 0 },
    ]

    while (queue.length > 0) {
      const { tile, dist } = queue.shift()!

      for (const neighbor of this.neighbors(tile)) {
        if (neighbor === b) return dist + 1
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          queue.push({ tile: neighbor, dist: dist + 1 })
        }
      }

      // Limit search depth to prevent infinite loops
      if (dist > 100) {
        throw new Error('Distance computation exceeded maximum depth')
      }
    }

    return -1 // Should never reach for connected tiling
  }

  /**
   * Find shortest path via BFS.
   */
  path(from: GroupWord, to: GroupWord): GroupWord[] {
    if (from === to) return [from]

    const visited = new Map<string, GroupWord | null>()
    visited.set(from, null)
    const queue: GroupWord[] = [from]

    while (queue.length > 0) {
      const tile = queue.shift()!

      for (const neighbor of this.neighbors(tile)) {
        if (!visited.has(neighbor)) {
          visited.set(neighbor, tile)

          if (neighbor === to) {
            // Reconstruct path
            const result: GroupWord[] = []
            let current: GroupWord | null = to
            while (current !== null) {
              result.unshift(current)
              current = visited.get(current) ?? null
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
   * Get center of tile on hyperboloid.
   */
  center(tile: GroupWord): Point3D {
    const cached = this.centerCache.get(tile)
    if (cached) return cached

    // Apply transformation to origin
    const matrix = this.wordToMatrix(tile)
    const center = this.applyMatrix(matrix, [0, 0, 1])

    this.centerCache.set(tile, center)
    return center
  }

  /**
   * Get vertices of tile polygon.
   */
  vertices(tile: GroupWord): Point3D[] {
    const matrix = this.wordToMatrix(tile)
    const result: Point3D[] = []

    // Get vertices of fundamental polygon
    const baseVertices = this.computeFundamentalVertices()

    for (const v of baseVertices) {
      result.push(this.applyMatrix(matrix, v))
    }

    return result
  }

  /**
   * Find tile containing a point.
   * Uses iterative refinement.
   */
  tileAt(point: Point3D): GroupWord | null {
    // Normalize to hyperboloid
    const [x, y, t] = point
    const norm = Math.sqrt(t * t - x * x - y * y)
    if (norm <= 0) return null

    const normalized: Point3D = [x / norm, y / norm, t / norm]

    // Start at origin and walk toward point
    let current: GroupWord = ''
    let bestDist = this.hyperbolicDistance([0, 0, 1], normalized)

    for (let iter = 0; iter < 100; iter++) {
      const neighbors = this.neighbors(current)
      let improved = false

      for (const neighbor of neighbors) {
        const neighborCenter = this.center(neighbor)
        const dist = this.hyperbolicDistance(neighborCenter, normalized)

        if (dist < bestDist - 0.001) {
          bestDist = dist
          current = neighbor
          improved = true
          break
        }
      }

      if (!improved) break
    }

    return current
  }

  /**
   * Get tiles within distance r.
   */
  tilesWithinDistance(center: GroupWord, radius: number): GroupWord[] {
    const result: GroupWord[] = []
    const visited = new Set<string>()
    const queue: Array<{ tile: GroupWord; dist: number }> = [
      { tile: center, dist: 0 },
    ]
    visited.add(center)

    while (queue.length > 0) {
      const { tile, dist } = queue.shift()!
      result.push(tile)

      if (dist < radius) {
        for (const neighbor of this.neighbors(tile)) {
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
   * Parent in spanning tree (toward origin).
   */
  parent(tile: GroupWord): GroupWord | null {
    if (tile === '') return null

    // Find neighbor closest to origin
    const neighbors = this.neighbors(tile)
    let bestParent = neighbors[0]
    let bestDist = this.wordLength(bestParent)

    for (const neighbor of neighbors) {
      const dist = this.wordLength(neighbor)
      if (dist < bestDist) {
        bestDist = dist
        bestParent = neighbor
      }
    }

    return bestParent
  }

  /**
   * Children in spanning tree (away from origin).
   */
  children(tile: GroupWord): GroupWord[] {
    const myDepth = this.depth(tile)
    return this.neighbors(tile).filter(n => this.depth(n) > myDepth)
  }

  /**
   * Depth is word length (distance from origin).
   */
  depth(tile: GroupWord): number {
    return this.wordLength(tile)
  }

  /**
   * Number of spanning trees (sectors around origin).
   */
  treeCount(): number {
    return this.p
  }

  /**
   * Which tree/sector does this tile belong to?
   */
  treeIndex(tile: GroupWord): number {
    if (tile === '') return 0
    const parsed = this.parseWord(tile)
    if (parsed.length === 0) return 0

    // First generator determines sector
    const first = parsed[0]
    if (first.symbol === 'a') {
      return ((first.power % this.p) + this.p) % this.p
    }
    return 0
  }

  /**
   * Convert to bigint (word hash).
   */
  toInteger(tile: GroupWord): bigint {
    // Simple hash: treat word as base-p number
    let result = 0n
    const parsed = this.parseWord(tile)

    for (const gen of parsed) {
      const value = gen.symbol === 'a' ? gen.power : gen.power + this.p
      result = result * BigInt(this.p + this.q) + BigInt(value)
    }

    return result
  }

  /**
   * Convert from bigint (not fully reversible).
   */
  fromInteger(n: bigint): GroupWord {
    if (n === 0n) return ''

    const gens: Generator[] = []
    let remaining = n
    const base = BigInt(this.p + this.q)

    while (remaining > 0n) {
      const value = Number(remaining % base)
      remaining = remaining / base

      if (value < this.p) {
        gens.unshift({ symbol: 'a', power: value })
      } else {
        gens.unshift({ symbol: 'b', power: value - this.p })
      }
    }

    return this.formatWord(gens)
  }

  toString(tile: GroupWord): string {
    return tile || 'e' // 'e' for identity
  }

  fromString(s: string): GroupWord {
    if (s === 'e' || s === '') return ''
    return this.normalize(s)
  }

  *[Symbol.iterator](): Iterator<GroupWord> {
    yield ''

    const queue: GroupWord[] = ['']
    const seen = new Set<string>([''])

    while (queue.length > 0) {
      const tile = queue.shift()!

      for (const neighbor of this.neighbors(tile)) {
        if (!seen.has(neighbor)) {
          seen.add(neighbor)
          queue.push(neighbor)
          yield neighbor
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Word for crossing edge in direction dir.
   */
  private edgeCrossing(dir: number): string {
    // To cross edge dir: rotate to it, apply vertex rotation, rotate back
    if (dir === 0) {
      return 'b1'
    }
    return `a${dir}b1a${-dir}`
  }

  /**
   * Multiply two group words.
   */
  private multiply(a: GroupWord, b: GroupWord): GroupWord {
    if (a === '') return b
    if (b === '') return a
    return a + b
  }

  /**
   * Normalize a group word using group relations.
   */
  private normalize(word: GroupWord): GroupWord {
    let parsed = this.parseWord(word)
    let changed = true

    while (changed) {
      changed = false
      const newParsed: Generator[] = []

      for (const gen of parsed) {
        // Apply a^p = e and b^q = e
        let power = gen.power
        if (gen.symbol === 'a') {
          power = ((power % this.p) + this.p) % this.p
        } else {
          power = ((power % this.q) + this.q) % this.q
        }

        if (power === 0) {
          changed = true
          continue
        }

        // Combine with previous if same symbol
        if (
          newParsed.length > 0 &&
          newParsed[newParsed.length - 1].symbol === gen.symbol
        ) {
          const prev = newParsed[newParsed.length - 1]
          let combined = prev.power + power
          if (gen.symbol === 'a') {
            combined = ((combined % this.p) + this.p) % this.p
          } else {
            combined = ((combined % this.q) + this.q) % this.q
          }

          if (combined === 0) {
            newParsed.pop()
          } else {
            prev.power = combined
          }
          changed = true
        } else {
          newParsed.push({ symbol: gen.symbol, power })
        }
      }

      parsed = newParsed
    }

    return this.formatWord(parsed)
  }

  /**
   * Parse a word string into generators.
   */
  private parseWord(word: GroupWord): Generator[] {
    if (!word) return []

    const result: Generator[] = []
    const regex = /([ab])(-?\d+)/g
    let match

    while ((match = regex.exec(word)) !== null) {
      result.push({
        symbol: match[1] as 'a' | 'b',
        power: parseInt(match[2], 10),
      })
    }

    return result
  }

  /**
   * Format generators back to string.
   */
  private formatWord(gens: Generator[]): GroupWord {
    return gens.map(g => `${g.symbol}${g.power}`).join('')
  }

  /**
   * Get word length (number of generators).
   */
  private wordLength(word: GroupWord): number {
    const parsed = this.parseWord(word)
    let length = 0
    for (const gen of parsed) {
      length += Math.abs(gen.power)
    }
    return length
  }

  /**
   * Compute generator matrices on hyperboloid.
   */
  private computeGeneratorMatrices(): {
    aMatrix: number[]
    bMatrix: number[]
    aInvMatrix: number[]
    bInvMatrix: number[]
  } {
    // Rotation by cellAngle around origin (z-axis)
    const cosA = Math.cos(this.cellAngle)
    const sinA = Math.sin(this.cellAngle)

    const aMatrix = [cosA, -sinA, 0, sinA, cosA, 0, 0, 0, 1]
    const aInvMatrix = [cosA, sinA, 0, -sinA, cosA, 0, 0, 0, 1]

    // For b, we need rotation around a vertex
    // This requires computing vertex position first
    const vertexDist = this.computeVertexDistance()
    const cosV = Math.cos(this.vertexAngle)
    const sinV = Math.sin(this.vertexAngle)

    // Conjugate rotation by translation to vertex
    const coshD = Math.cosh(vertexDist)
    const sinhD = Math.sinh(vertexDist)

    // Translation to vertex along x-axis
    const toVertex = [coshD, 0, sinhD, 0, 1, 0, sinhD, 0, coshD]
    const fromVertex = [coshD, 0, -sinhD, 0, 1, 0, -sinhD, 0, coshD]

    // Rotation at vertex
    const rotAtVertex = [cosV, -sinV, 0, sinV, cosV, 0, 0, 0, 1]
    const rotAtVertexInv = [cosV, sinV, 0, -sinV, cosV, 0, 0, 0, 1]

    // b = toVertex * rotAtVertex * fromVertex
    const bMatrix = this.matMul(
      this.matMul(toVertex, rotAtVertex),
      fromVertex,
    )
    const bInvMatrix = this.matMul(
      this.matMul(toVertex, rotAtVertexInv),
      fromVertex,
    )

    return { aMatrix, bMatrix, aInvMatrix, bInvMatrix }
  }

  /**
   * Compute hyperbolic distance from center to vertex.
   */
  private computeVertexDistance(): number {
    // From hyperbolic trigonometry for regular p-gon with q meeting at vertex
    const angleA = Math.PI / this.p
    const angleB = Math.PI / this.q
    const angleC = Math.PI / 2

    // cosC = -cosA*cosB + sinA*sinB*coshc
    // coshc = (cosC + cosA*cosB) / (sinA*sinB)
    const coshc =
      (Math.cos(angleC) + Math.cos(angleA) * Math.cos(angleB)) /
      (Math.sin(angleA) * Math.sin(angleB))

    return Math.acosh(coshc)
  }

  /**
   * Compute fundamental polygon vertices.
   */
  private computeFundamentalVertices(): Point3D[] {
    const dist = this.computeVertexDistance()
    const coshD = Math.cosh(dist)
    const sinhD = Math.sinh(dist)

    const vertices: Point3D[] = []
    for (let i = 0; i < this.p; i++) {
      const angle = ((2 * Math.PI) / this.p) * i
      vertices.push([
        sinhD * Math.cos(angle),
        sinhD * Math.sin(angle),
        coshD,
      ])
    }

    return vertices
  }

  /**
   * Convert word to transformation matrix.
   */
  private wordToMatrix(word: GroupWord): number[] {
    let result = [1, 0, 0, 0, 1, 0, 0, 0, 1] // Identity

    const parsed = this.parseWord(word)
    for (const gen of parsed) {
      const base = gen.symbol === 'a' ? this.aMatrix : this.bMatrix
      const inv = gen.symbol === 'a' ? this.aInvMatrix : this.bInvMatrix

      const count = Math.abs(gen.power)
      const matrix = gen.power > 0 ? base : inv

      for (let i = 0; i < count; i++) {
        result = this.matMul(result, matrix)
      }
    }

    return result
  }

  /**
   * Apply 3x3 matrix to point.
   */
  private applyMatrix(m: number[], p: Point3D): Point3D {
    return [
      m[0] * p[0] + m[1] * p[1] + m[2] * p[2],
      m[3] * p[0] + m[4] * p[1] + m[5] * p[2],
      m[6] * p[0] + m[7] * p[1] + m[8] * p[2],
    ]
  }

  /**
   * Multiply two 3x3 matrices.
   */
  private matMul(a: number[], b: number[]): number[] {
    return [
      a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
      a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
      a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
      a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
      a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
      a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
      a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
      a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
      a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
    ]
  }

  /**
   * Hyperbolic distance between two points.
   */
  private hyperbolicDistance(a: Point3D, b: Point3D): number {
    // Minkowski inner product: <a,b> = ax*bx + ay*by - at*bt
    const inner = a[0] * b[0] + a[1] * b[1] - a[2] * b[2]
    // For points on hyperboloid: cosh(d) = -<a,b>
    return Math.acosh(Math.max(1, -inner))
  }
}
