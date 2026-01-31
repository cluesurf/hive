/**
 * Margenstern Coordinate System for Hyperbolic Tilings
 *
 * Generalized coordinate system based on Margenstern's work that handles
 * any {p,q} hyperbolic tiling using sector decomposition and tree-based
 * addressing with Pisot polynomial numeration.
 *
 * References:
 * - Margenstern (2011). "Coordinates for a new triangular tiling of the hyperbolic plane"
 * - Margenstern (2007/2008). "Cellular Automata in Hyperbolic Spaces" vol. 1 & 2
 */

import type { HyperbolicCoordinates, Point3D } from '../types'

/**
 * Node type in the spanning tree.
 * - 'ordinary': Standard branching
 * - 'special0': First special type (for odd q)
 * - 'special1': Second special type (for odd q)
 */
type NodeType = 'ordinary' | 'special0' | 'special1'

/**
 * Full tile address: sector number + tree coordinate.
 */
export interface MargensternAddress {
  /** Sector number: 0 = central tile, 1..numSectors for sectors */
  sector: number
  /** Tree coordinate within sector (0 for sector leader) */
  treeIndex: bigint
}

/**
 * Configuration derived from {p,q} parameters.
 */
interface TilingConfig {
  p: number
  q: number
  h: number // h = q/2 for even q, h = (q-1)/2 for odd q
  isEvenQ: boolean
  numSectors: number // p * (h - 1) for general, p for {p,4} and {p+2,3}
  ordinaryChildren: number
  specialChildren: number
  beta: number // Greatest real root of characteristic polynomial
}

/**
 * Margenstern coordinate system for general {p,q} hyperbolic tilings.
 */
export class MargensternCoordinates implements HyperbolicCoordinates<string> {
  readonly geometry = 'hyperbolic' as const
  readonly p: number
  readonly q: number
  readonly tileCount = Infinity

  private readonly config: TilingConfig
  private readonly levelCounts: bigint[] = [] // u_n sequence

  // Caches
  private readonly neighborCache = new Map<string, string[]>()
  private readonly depthCache = new Map<string, number>()
  private readonly nodeTypeCache = new Map<string, NodeType>()

  constructor(p: number, q: number) {
    if (p < 3 || q < 3) {
      throw new Error('p and q must be at least 3')
    }
    if ((p - 2) * (q - 2) <= 4) {
      throw new Error(`{${p},${q}} is not hyperbolic`)
    }

    this.p = p
    this.q = q
    this.config = this.computeConfig(p, q)

    // Precompute level counts
    this.initializeLevelCounts()
  }

  /**
   * Compute configuration parameters from {p,q}.
   */
  private computeConfig(p: number, q: number): TilingConfig {
    const isEvenQ = q % 2 === 0
    const h = isEvenQ ? q / 2 : Math.floor(q / 2)

    // Number of sectors depends on special cases
    let numSectors: number
    if (q === 4) {
      // {p, 4} tilings: p sectors
      numSectors = p
    } else if (q === 3) {
      // {p, 3} tilings: p sectors (shares structure with {p-2, 4})
      numSectors = p
    } else {
      // General case
      numSectors = p * (h - 1)
    }

    // Branching counts
    let ordinaryChildren: number
    let specialChildren: number

    if (isEvenQ) {
      ordinaryChildren = (p - 3) * (h - 1) + 1
      specialChildren = (p - 2) * (h - 1) - 1
    } else {
      ordinaryChildren = (p - 3) * (h - 1) + 2
      specialChildren = (p - 3) * (h - 1) + 1 // type 0
      // type 1 has (p-2)*(h-1)-1 children
    }

    // Compute beta (greatest real root)
    const beta = this.computeBeta(p, q, h, isEvenQ)

    return {
      p,
      q,
      h,
      isEvenQ,
      numSectors,
      ordinaryChildren,
      specialChildren,
      beta,
    }
  }

  /**
   * Compute the greatest real root of the characteristic polynomial.
   */
  private computeBeta(
    p: number,
    q: number,
    h: number,
    isEvenQ: boolean,
  ): number {
    // For even q: P(X) = X² - ((p-3)(h-1)+1)X - h + 3
    // For odd q: P(X) = X³ - ((p-3)(h-1)+1)X² - ((p-2)(h-1)-2)X - h+3

    if (isEvenQ) {
      const a = (p - 3) * (h - 1) + 1
      const b = h - 3
      // X² - aX - b = 0 => X = (a + sqrt(a² + 4b)) / 2
      return (a + Math.sqrt(a * a + 4 * b)) / 2
    } else {
      // For odd q, use Newton-Raphson to find root
      const a = (p - 3) * (h - 1) + 1
      const b = (p - 2) * (h - 1) - 2
      const c = h - 3

      // P(X) = X³ - aX² - bX - c
      let x = p - 2 // Initial guess
      for (let i = 0; i < 50; i++) {
        const fx = x * x * x - a * x * x - b * x - c
        const fpx = 3 * x * x - 2 * a * x - b
        if (Math.abs(fpx) < 1e-12) break
        const newX = x - fx / fpx
        if (Math.abs(newX - x) < 1e-10) break
        x = newX
      }
      return x
    }
  }

  /**
   * Initialize the level count sequence u_n.
   */
  private initializeLevelCounts(): void {
    const { h, isEvenQ, ordinaryChildren } = this.config
    const maxLevels = 200

    if (isEvenQ) {
      // u_{n+2} = ((p-3)(h-1)+1) * u_{n+1} + (h-3) * u_n
      this.levelCounts[0] = 1n
      this.levelCounts[1] = BigInt(ordinaryChildren)

      const coef1 = BigInt(ordinaryChildren)
      const coef0 = BigInt(h - 3)

      for (let n = 2; n < maxLevels; n++) {
        this.levelCounts[n] =
          coef1 * this.levelCounts[n - 1]! + coef0 * this.levelCounts[n - 2]!
      }
    } else {
      // u_{n+3} = ((p-3)(h-1)+1) * u_{n+2} + ((p-2)(h-1)-2) * u_{n+1} + (h-3) * u_n
      this.levelCounts[0] = 1n
      this.levelCounts[1] = BigInt(ordinaryChildren)

      const { p } = this.config
      const u2Value =
        ((p - 3) * (h - 1)) * ((p - 3) * (h - 1)) + (4 * p - 11) * (h - 1)
      this.levelCounts[2] = BigInt(u2Value)

      const coef2 = BigInt((p - 3) * (h - 1) + 1)
      const coef1 = BigInt((p - 2) * (h - 1) - 2)
      const coef0 = BigInt(h - 3)

      for (let n = 3; n < maxLevels; n++) {
        this.levelCounts[n] =
          coef2 * this.levelCounts[n - 1]! +
          coef1 * this.levelCounts[n - 2]! +
          coef0 * this.levelCounts[n - 3]!
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TessellationCoordinates Interface
  // ═══════════════════════════════════════════════════════════════

  origin(): string {
    return this.addressToString({ sector: 0, treeIndex: 0n })
  }

  neighbor(tile: string, direction: number): string {
    const cacheKey = `${tile}:${direction}`
    const cached = this.neighborCache.get(cacheKey)
    if (cached !== undefined) {
      const result = cached[0]
      if (result !== undefined) return result
    }

    const addr = this.parseAddress(tile)
    const neighbors = this.computeNeighbors(addr)
    const dir = ((direction % this.p) + this.p) % this.p

    // Cache all neighbors for this tile
    this.neighborCache.set(tile, neighbors)

    return neighbors[dir] ?? tile
  }

  neighbors(tile: string): string[] {
    const cached = this.neighborCache.get(tile)
    if (cached) return cached

    const addr = this.parseAddress(tile)
    const neighbors = this.computeNeighbors(addr)
    this.neighborCache.set(tile, neighbors)
    return neighbors
  }

  directionTo(from: string, to: string): number {
    const neighbors = this.neighbors(from)
    return neighbors.indexOf(to)
  }

  distance(a: string, b: string): number {
    if (a === b) return 0

    // BFS search
    const visited = new Set<string>([a])
    const queue: Array<{ tile: string; dist: number }> = [{ tile: a, dist: 0 }]

    while (queue.length > 0) {
      const { tile, dist } = queue.shift()!
      const neighbors = this.neighbors(tile)

      for (const neighbor of neighbors) {
        if (neighbor === b) return dist + 1
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          queue.push({ tile: neighbor, dist: dist + 1 })
        }
      }

      if (dist > 100) break // Limit search
    }

    return -1
  }

  path(from: string, to: string): string[] {
    if (from === to) return [from]

    // BFS with path tracking
    const visited = new Map<string, string>([[from, '']])
    const queue: string[] = [from]

    while (queue.length > 0) {
      const current = queue.shift()!
      const neighbors = this.neighbors(current)

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.set(neighbor, current)

          if (neighbor === to) {
            // Reconstruct path
            const path: string[] = [to]
            let node = to
            while (node !== from) {
              node = visited.get(node)!
              path.unshift(node)
            }
            return path
          }

          queue.push(neighbor)
        }
      }
    }

    return [from]
  }

  center(tile: string): Point3D {
    // Compute center on hyperboloid by following path from origin
    const addr = this.parseAddress(tile)

    if (addr.sector === 0) {
      return [0, 0, 1]
    }

    // Approximate position based on sector and depth
    const sectorAngle = (2 * Math.PI * (addr.sector - 1)) / this.config.numSectors
    const d = this.depth(tile)
    const dist = this.computeStepDistance() * d

    const sinhD = Math.sinh(dist)
    const coshD = Math.cosh(dist)

    const x = sinhD * Math.cos(sectorAngle)
    const y = sinhD * Math.sin(sectorAngle)
    const t = coshD

    return [x, y, t]
  }

  vertices(tile: string): Point3D[] {
    const [cx, cy, ct] = this.center(tile)
    const vertices: Point3D[] = []

    // Compute vertex distance
    const angleP = Math.PI / this.p
    const angleQ = Math.PI / this.q
    const coshR = (Math.cos(angleQ) + Math.cos(angleP) * Math.cos(angleP)) /
                  (Math.sin(angleP) * Math.sin(angleP))
    const r = Math.acosh(Math.max(1, coshR))

    for (let i = 0; i < this.p; i++) {
      const angle = (2 * Math.PI * i) / this.p
      // Approximate vertices
      const vx = cx + Math.tanh(r) * Math.cos(angle) * 0.3
      const vy = cy + Math.tanh(r) * Math.sin(angle) * 0.3
      const vt = Math.sqrt(1 + vx * vx + vy * vy)
      vertices.push([vx, vy, vt])
    }

    return vertices
  }

  tileAt(point: Point3D): string | null {
    // Start at origin and walk toward point
    let current = this.origin()
    const [px, py] = point

    for (let iter = 0; iter < 100; iter++) {
      const [cx, cy] = this.center(current)
      const currentDist = (px - cx) ** 2 + (py - cy) ** 2

      let bestNeighbor = current
      let bestDist = currentDist

      const neighbors = this.neighbors(current)
      for (const neighbor of neighbors) {
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

  tilesWithinDistance(center: string, radius: number): string[] {
    const result: string[] = []
    const visited = new Set<string>()
    const queue: Array<{ tile: string; dist: number }> = [
      { tile: center, dist: 0 },
    ]
    visited.add(center)

    while (queue.length > 0) {
      const { tile, dist } = queue.shift()!
      result.push(tile)

      if (dist < radius) {
        const neighbors = this.neighbors(tile)
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor)
            queue.push({ tile: neighbor, dist: dist + 1 })
          }
        }
      }
    }

    return result
  }

  toString(tile: string): string {
    return tile
  }

  fromString(s: string): string {
    // Validate
    this.parseAddress(s)
    return s
  }

  *[Symbol.iterator](): Iterator<string> {
    // BFS from origin
    const visited = new Set<string>()
    const queue: string[] = [this.origin()]
    visited.add(this.origin())

    while (queue.length > 0) {
      const tile = queue.shift()!
      yield tile

      const neighbors = this.neighbors(tile)
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          queue.push(neighbor)
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HyperbolicCoordinates Interface
  // ═══════════════════════════════════════════════════════════════

  parent(tile: string): string | null {
    const addr = this.parseAddress(tile)

    if (addr.sector === 0) {
      return null // Central tile has no parent
    }

    if (addr.treeIndex === 0n) {
      return this.origin() // Sector leader's parent is central
    }

    const parentIndex = this.computeFather(addr.treeIndex)
    return this.addressToString({ sector: addr.sector, treeIndex: parentIndex })
  }

  children(tile: string): string[] {
    const addr = this.parseAddress(tile)
    const result: string[] = []

    if (addr.sector === 0) {
      // Central tile's children are sector leaders
      for (let s = 1; s <= this.config.numSectors; s++) {
        result.push(this.addressToString({ sector: s, treeIndex: 0n }))
      }
    } else {
      const childIndices = this.computeChildren(addr.treeIndex)
      for (const childIndex of childIndices) {
        result.push(
          this.addressToString({ sector: addr.sector, treeIndex: childIndex }),
        )
      }
    }

    return result
  }

  depth(tile: string): number {
    const cached = this.depthCache.get(tile)
    if (cached !== undefined) return cached

    const addr = this.parseAddress(tile)

    if (addr.sector === 0) {
      this.depthCache.set(tile, 0)
      return 0
    }

    // Compute depth by counting parents
    let d = 1
    let current = addr.treeIndex

    while (current > 0n) {
      current = this.computeFather(current)
      d++
    }

    this.depthCache.set(tile, d)
    return d
  }

  treeCount(): number {
    return this.config.numSectors
  }

  treeIndex(tile: string): number {
    const addr = this.parseAddress(tile)
    return addr.sector === 0 ? 0 : addr.sector
  }

  toInteger(tile: string): bigint {
    const addr = this.parseAddress(tile)
    // Encode as sector * bigMultiplier + treeIndex
    const multiplier = 10n ** 50n
    return BigInt(addr.sector) * multiplier + addr.treeIndex
  }

  fromInteger(n: bigint): string {
    const multiplier = 10n ** 50n
    const sector = Number(n / multiplier)
    const treeIndex = n % multiplier
    return this.addressToString({ sector, treeIndex })
  }

  // ═══════════════════════════════════════════════════════════════
  // Core Margenstern Algorithms
  // ═══════════════════════════════════════════════════════════════

  /**
   * Parse address from string.
   */
  private parseAddress(tile: string): MargensternAddress {
    const parts = tile.split(':')
    if (parts.length !== 2) {
      throw new Error(`Invalid address format: ${tile}`)
    }
    return {
      sector: parseInt(parts[0]!, 10),
      treeIndex: BigInt(parts[1]!),
    }
  }

  /**
   * Convert address to string.
   */
  private addressToString(addr: MargensternAddress): string {
    return `${addr.sector}:${addr.treeIndex}`
  }

  /**
   * Determine node type from tree index.
   */
  private getNodeType(treeIndex: bigint): NodeType {
    const key = treeIndex.toString()
    const cached = this.nodeTypeCache.get(key)
    if (cached) return cached

    // For {7,3} (and similar), use Zeckendorf representation
    // Black node (2 children) vs White node (3 children)
    const zeck = this.toGreedyRepresentation(treeIndex)

    let nodeType: NodeType
    if (zeck.length === 0) {
      nodeType = 'ordinary'
    } else {
      // Check trailing pattern
      const lastIndex = zeck[zeck.length - 1]!
      if (this.config.isEvenQ) {
        // Even index → white (ordinary), odd index → black (special)
        nodeType = lastIndex % 2 === 0 ? 'ordinary' : 'special0'
      } else {
        // More complex for odd q
        const penultimate = zeck.length >= 2 ? zeck[zeck.length - 2] : -1
        if (lastIndex % 2 === 0) {
          nodeType = 'ordinary'
        } else if (penultimate >= 0 && (lastIndex - penultimate) === 1) {
          nodeType = 'special1'
        } else {
          nodeType = 'special0'
        }
      }
    }

    this.nodeTypeCache.set(key, nodeType)
    return nodeType
  }

  /**
   * Convert number to greedy representation in basis beta.
   * Returns array of indices where coefficient is 1.
   */
  private toGreedyRepresentation(n: bigint): number[] {
    if (n <= 0n) return []

    const result: number[] = []
    let remaining = n

    // Find largest level count ≤ n
    for (let i = this.levelCounts.length - 1; i >= 0 && remaining > 0n; i--) {
      const ui = this.levelCounts[i]!
      if (ui <= remaining) {
        result.push(i)
        remaining -= ui
        // For Pisot representations, skip adjacent index
        if (i > 0) i--
      }
    }

    return result.reverse()
  }

  /**
   * Convert greedy representation back to number.
   */
  private fromGreedyRepresentation(indices: number[]): bigint {
    let result = 0n
    for (const i of indices) {
      if (i >= 0 && i < this.levelCounts.length) {
        result += this.levelCounts[i]!
      }
    }
    return result
  }

  /**
   * Compute father (parent) in tree.
   */
  private computeFather(n: bigint): bigint {
    if (n <= 0n) return 0n

    const rep = this.toGreedyRepresentation(n)
    if (rep.length === 0) return 0n

    // Remove trailing indices (shift down by 2)
    const fatherRep = rep.map(i => i - 2).filter(i => i >= 0)
    if (fatherRep.length === 0) return 0n

    return this.fromGreedyRepresentation(fatherRep)
  }

  /**
   * Compute preferred son (σ function).
   */
  private computePreferredSon(n: bigint): bigint {
    if (n < 0n) return 0n

    const rep = this.toGreedyRepresentation(n)

    // Shift indices up by 2 (multiply by ~beta²)
    const sonRep = rep.map(i => i + 2)
    return this.fromGreedyRepresentation(sonRep)
  }

  /**
   * Compute all children of a node.
   */
  private computeChildren(treeIndex: bigint): bigint[] {
    const nodeType = this.getNodeType(treeIndex)
    const s = this.computePreferredSon(treeIndex)

    if (nodeType === 'ordinary') {
      // Ordinary node has ordinaryChildren children
      const children: bigint[] = []
      const count = this.config.isEvenQ
        ? this.config.ordinaryChildren
        : this.config.ordinaryChildren
      for (let i = 0; i < count; i++) {
        const child = s + BigInt(i)
        if (child >= 0n) children.push(child)
      }
      return children
    } else if (nodeType === 'special0') {
      // Special type 0
      const children: bigint[] = []
      const count = this.config.specialChildren
      for (let i = 0; i < count; i++) {
        const child = s + BigInt(i)
        if (child >= 0n) children.push(child)
      }
      return children
    } else {
      // Special type 1 (odd q only)
      const count = (this.p - 2) * (this.config.h - 1) - 1
      const children: bigint[] = []
      for (let i = 0; i < count; i++) {
        const child = s + BigInt(i)
        if (child >= 0n) children.push(child)
      }
      return children
    }
  }

  /**
   * Compute neighbors of a tile using Margenstern's formulas.
   */
  private computeNeighbors(addr: MargensternAddress): string[] {
    const { sector, treeIndex } = addr
    const { p, numSectors } = this.config

    if (sector === 0) {
      // Central tile: neighbors are sector leaders and their neighbors
      const neighbors: string[] = []
      for (let i = 0; i < p; i++) {
        const s = (i % numSectors) + 1
        neighbors.push(this.addressToString({ sector: s, treeIndex: 0n }))
      }
      return neighbors
    }

    const f = this.computeFather(treeIndex)
    const s = this.computePreferredSon(treeIndex)
    const nodeType = this.getNodeType(treeIndex)

    // Helper for modular sector arithmetic
    const sectorPlus = (sec: number, delta: number): number => {
      const result = ((sec - 1 + delta) % numSectors + numSectors) % numSectors + 1
      return result
    }

    const neighbors: string[] = []

    if (treeIndex === 0n) {
      // Sector leader: neighbor 0 is central, rest depend on tree structure
      neighbors.push(this.origin()) // 0: central/father

      // Other neighbors based on {p,q} specific rules
      for (let i = 1; i < p; i++) {
        if (i === 1) {
          // Left boundary -> previous sector
          neighbors.push(
            this.addressToString({
              sector: sectorPlus(sector, -1),
              treeIndex: 0n,
            }),
          )
        } else if (i === p - 1) {
          // Right boundary -> next sector
          neighbors.push(
            this.addressToString({
              sector: sectorPlus(sector, 1),
              treeIndex: 0n,
            }),
          )
        } else {
          // Children
          const childIdx = BigInt(i - 2)
          if (childIdx < BigInt(this.config.ordinaryChildren)) {
            neighbors.push(
              this.addressToString({ sector, treeIndex: s + childIdx }),
            )
          } else {
            neighbors.push(
              this.addressToString({ sector, treeIndex: s }),
            )
          }
        }
      }
    } else {
      // General tile using Margenstern's Table 2 (adapted)
      if (nodeType === 'ordinary' || nodeType === 'special0') {
        // Standard neighbor computation
        neighbors.push(
          this.addressToString({ sector, treeIndex: f }), // 0: father
        )

        // Siblings and children
        for (let i = 1; i < p; i++) {
          if (i === 1) {
            // Left sibling
            const left = treeIndex - 1n
            if (left >= 0n) {
              neighbors.push(
                this.addressToString({ sector, treeIndex: left }),
              )
            } else {
              neighbors.push(
                this.addressToString({
                  sector: sectorPlus(sector, -1),
                  treeIndex: 0n,
                }),
              )
            }
          } else if (i === p - 1) {
            // Right sibling
            neighbors.push(
              this.addressToString({ sector, treeIndex: treeIndex + 1n }),
            )
          } else {
            // Children
            const childOffset = BigInt(i - 2)
            const numChildren = nodeType === 'ordinary'
              ? this.config.ordinaryChildren
              : this.config.specialChildren

            if (childOffset < BigInt(numChildren)) {
              neighbors.push(
                this.addressToString({ sector, treeIndex: s + childOffset }),
              )
            } else {
              // Neighbor's child (nephew)
              const nephew = this.computePreferredSon(treeIndex + 1n)
              neighbors.push(
                this.addressToString({ sector, treeIndex: nephew }),
              )
            }
          }
        }
      } else {
        // Special type 1 (odd q)
        neighbors.push(
          this.addressToString({ sector, treeIndex: f }), // father
        )

        for (let i = 1; i < p; i++) {
          if (i === 1) {
            neighbors.push(
              this.addressToString({ sector, treeIndex: treeIndex - 1n }),
            )
          } else if (i === p - 1) {
            neighbors.push(
              this.addressToString({ sector, treeIndex: treeIndex + 1n }),
            )
          } else {
            const childOffset = BigInt(i - 2)
            const numChildren = (this.p - 2) * (this.config.h - 1) - 1
            if (childOffset < BigInt(numChildren)) {
              neighbors.push(
                this.addressToString({ sector, treeIndex: s + childOffset }),
              )
            } else {
              neighbors.push(
                this.addressToString({ sector, treeIndex: s }),
              )
            }
          }
        }
      }
    }

    // Pad to p neighbors if needed
    while (neighbors.length < p) {
      neighbors.push(neighbors[neighbors.length - 1] ?? this.origin())
    }

    return neighbors.slice(0, p)
  }

  /**
   * Compute step distance for center approximation.
   */
  private computeStepDistance(): number {
    const angleP = Math.PI / this.p
    const angleQ = Math.PI / this.q
    const coshApothem = Math.cos(angleQ) / Math.sin(angleP)
    return 2 * Math.acosh(Math.max(1, coshApothem))
  }

  // ═══════════════════════════════════════════════════════════════
  // Public Utilities
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get configuration info.
   */
  getConfig(): TilingConfig {
    return { ...this.config }
  }

  /**
   * Get level count u_n (nodes at level n).
   */
  getLevelCount(n: number): bigint {
    return this.levelCounts[n] ?? 0n
  }

  /**
   * Check if this is the special case {7,3} heptagrid.
   */
  isHeptagrid(): boolean {
    return this.p === 7 && this.q === 3
  }

  /**
   * Check if this is the special case {5,4} pentagrid.
   */
  isPentagrid(): boolean {
    return this.p === 5 && this.q === 4
  }
}

/**
 * Create Margenstern coordinates for a {p,q} tiling.
 */
export function createMargensternCoordinates(
  p: number,
  q: number,
): MargensternCoordinates {
  return new MargensternCoordinates(p, q)
}
