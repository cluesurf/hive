/**
 * HyperRogue-style hyperbolic tessellation with Margenstern coordinates.
 *
 * Combines two addressing approaches:
 * 1. Graph-based pointers (HyperRogue style) for efficient navigation
 * 2. Algebraic addresses (Margenstern style) for stable tile identity
 *
 * Key principles:
 * - Cells are graph nodes with direct neighbor pointers
 * - Neighbors created lazily on first access via move()
 * - Each cell has an algebraic address (sector, treeIndex)
 * - Addresses enable O(1) neighbor computation via Margenstern formulas
 * - Transforms computed only for rendering, not for navigation
 *
 * References:
 * - Margenstern (2011). "Coordinates for a new triangular tiling"
 * - Margenstern (2007/2008). "Cellular Automata in Hyperbolic Spaces"
 */

import type { Matrix } from '@/form/matrix'

/**
 * Margenstern address: sector + tree index.
 */
export interface MargensternAddress {
  /** Sector number: 0 = central tile, 1..numSectors for sectors */
  sector: number
  /** Tree coordinate within sector (0n for sector leader) */
  treeIndex: bigint
}

/**
 * Node type in spanning tree (for branching rules).
 */
type NodeType = 'white' | 'black'

/**
 * A cell in the tessellation - hybrid HyperRogue + Margenstern style.
 */
export interface Cell {
  /** Unique numeric ID (for fast lookup) */
  id: number

  /** Margenstern address (sector, treeIndex) */
  address: MargensternAddress

  /** Direct pointers to neighbors (created lazily) */
  neighbors: (Cell | null)[]

  /** Which edge of each neighbor connects back to us */
  neighborSpins: number[]

  /** Distance from origin cell */
  distance: number

  /** Cached SU(1,1) transform (computed lazily for rendering) */
  transform: Matrix | null

  /** Last frame this cell was visible */
  lastSeenFrame: number
}

/**
 * Visible cell with computed vertices for rendering.
 */
export interface VisibleTile {
  id: string
  address: string // Margenstern address string "sector:treeIndex"
  vertices: Array<[number, number]>
  depth: number
}

/**
 * Configuration for hyperbolic tessellation.
 */
export interface TessellationConfig {
  p: number
  q: number
  maxTiles: number
  maxDepth: number
}

/**
 * Derived configuration from {p,q} for Margenstern system.
 */
interface MargensternConfig {
  h: number // h = q/2 for even q, h = (q-1)/2 for odd q
  isEvenQ: boolean
  numSectors: number // Number of sectors around central tile
  ordinaryChildren: number // Children for ordinary nodes
  specialChildren: number // Children for special nodes
}

const DEFAULT_CONFIG: TessellationConfig = {
  p: 7,
  q: 3,
  maxTiles: 2000,
  maxDepth: 100,
}

export { DEFAULT_CONFIG as DEFAULT_TESSELLATION_CONFIG }

// Re-export for compatibility
export type { Cell as Tile }

/**
 * Precomputed Fibonacci numbers for efficient Zeckendorf representation.
 */
const MAX_FIB_INDEX = 150
const FIB: bigint[] = []
;(() => {
  FIB[0] = 1n
  FIB[1] = 1n
  for (let i = 2; i <= MAX_FIB_INDEX; i++) {
    FIB[i] = FIB[i - 1]! + FIB[i - 2]!
  }
})()

/**
 * Hyperbolic tessellation manager with Margenstern coordinates.
 *
 * Combines HyperRogue-style graph navigation with Margenstern's
 * algebraic addressing for stable tile identity.
 */
export class Hyperbolic2DTessellation {
  private config: TessellationConfig
  private margensternConfig: MargensternConfig
  private nextId: number = 0
  private origin: Cell
  private centerCell: Cell

  // View transform (SU(1,1) format)
  private viewTransform: Matrix = [1, 0, 0, 0, 0, 0, 0, 0, 1]

  // Precomputed geometry
  private baseVertices: Array<[number, number]> = []
  private edgeTransforms: Matrix[] = []

  // Cell lookups
  private cellByHash: Map<string, Cell> = new Map() // By transform hash
  private cellByAddress: Map<string, Cell> = new Map() // By Margenstern address

  // Caches for Margenstern computations
  private nodeTypeCache: Map<string, NodeType> = new Map()
  private fatherCache: Map<string, bigint> = new Map()
  private preferredSonCache: Map<string, bigint> = new Map()

  // Frame counter for visibility tracking
  private frameCount: number = 0

  constructor(config: Partial<TessellationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.margensternConfig = this.computeMargensternConfig()

    // Compute base polygon vertices
    this.baseVertices = this.computeBaseVertices()

    // Precompute edge crossing transforms
    this.edgeTransforms = this.computeEdgeTransforms()

    // Create origin cell (central tile)
    const originTransform: Matrix = [1, 0, 0, 0, 0, 0, 0, 0, 1]
    const originAddress: MargensternAddress = { sector: 0, treeIndex: 0n }
    this.origin = this.createCell(0, originTransform, originAddress)
    this.cellByHash.set(this.hashTransform(originTransform), this.origin)
    this.cellByAddress.set(this.addressToString(originAddress), this.origin)
    this.centerCell = this.origin
  }

  /**
   * Compute Margenstern configuration from {p,q}.
   */
  private computeMargensternConfig(): MargensternConfig {
    const { p, q } = this.config
    const isEvenQ = q % 2 === 0
    const h = isEvenQ ? q / 2 : Math.floor(q / 2)

    // Number of sectors: for {7,3} and {5,4}, it's p
    // For general case, it's p * (h - 1)
    let numSectors: number
    if (q === 3 || q === 4) {
      numSectors = p
    } else {
      numSectors = p * (h - 1)
    }

    // Branching counts based on Margenstern formulas
    let ordinaryChildren: number
    let specialChildren: number

    if (isEvenQ) {
      // For even q: ordinary = (p-3)(h-1)+1, special = (p-2)(h-1)-1
      ordinaryChildren = (p - 3) * (h - 1) + 1
      specialChildren = (p - 2) * (h - 1) - 1
    } else {
      // For odd q (including q=3): different formulas
      ordinaryChildren = (p - 3) * (h - 1) + 2
      specialChildren = (p - 3) * (h - 1) + 1
    }

    // For {7,3}: h=1, ordinary=3, special=2 (white/black nodes)
    // For {5,4}: h=2, ordinary=3, special=2
    if (q === 3) {
      ordinaryChildren = 3
      specialChildren = 2
    } else if (q === 4) {
      ordinaryChildren = 3
      specialChildren = 2
    }

    return {
      h,
      isEvenQ,
      numSectors,
      ordinaryChildren,
      specialChildren,
    }
  }

  /**
   * Create a new cell with Margenstern address.
   */
  private createCell(
    distance: number,
    transform: Matrix | null,
    address: MargensternAddress,
  ): Cell {
    return {
      id: this.nextId++,
      address,
      neighbors: new Array(this.config.p).fill(null),
      neighborSpins: new Array(this.config.p).fill(-1),
      distance,
      transform,
      lastSeenFrame: 0,
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MARGENSTERN COORDINATE SYSTEM
  // ═══════════════════════════════════════════════════════════════

  /**
   * Convert address to string key.
   */
  addressToString(addr: MargensternAddress): string {
    return `${addr.sector}:${addr.treeIndex}`
  }

  /**
   * Parse address from string.
   */
  parseAddress(s: string): MargensternAddress {
    const parts = s.split(':')
    return {
      sector: parseInt(parts[0]!, 10),
      treeIndex: BigInt(parts[1] ?? '0'),
    }
  }

  /**
   * Determine node type (white=3 children, black=2 children).
   * Based on Zeckendorf representation trailing pattern.
   */
  private getNodeType(treeIndex: bigint): NodeType {
    const key = treeIndex.toString()
    const cached = this.nodeTypeCache.get(key)
    if (cached) return cached

    const zeck = this.toZeckendorf(treeIndex)
    let nodeType: NodeType

    if (zeck.length === 0) {
      nodeType = 'white'
    } else {
      // Last index parity determines type
      const lastIndex = zeck[zeck.length - 1]!
      nodeType = lastIndex % 2 === 0 ? 'white' : 'black'
    }

    this.nodeTypeCache.set(key, nodeType)
    return nodeType
  }

  /**
   * Convert number to Zeckendorf (Fibonacci) representation.
   * Returns array of indices where coefficient is 1.
   */
  private toZeckendorf(n: bigint): number[] {
    if (n <= 0n) return []
    if (n === 1n) return [0]

    const result: number[] = []
    let remaining = n

    for (let i = MAX_FIB_INDEX; i >= 0 && remaining > 0n; i--) {
      const fibI = FIB[i]!
      if (fibI <= remaining) {
        result.push(i)
        remaining -= fibI
        i-- // Skip next to maintain non-consecutive property
      }
    }

    return result.reverse()
  }

  /**
   * Convert Zeckendorf indices back to number.
   */
  private fromZeckendorf(indices: number[]): bigint {
    let result = 0n
    for (const i of indices) {
      if (i >= 0 && i <= MAX_FIB_INDEX) {
        result += FIB[i]!
      }
    }
    return result
  }

  /**
   * Compute father (parent in tree) using Margenstern formula.
   * f(n) ≈ n / φ²
   */
  private computeFather(n: bigint): bigint {
    if (n <= 0n) return 0n

    const key = n.toString()
    const cached = this.fatherCache.get(key)
    if (cached !== undefined) return cached

    const zeck = this.toZeckendorf(n)
    if (zeck.length === 0) {
      this.fatherCache.set(key, 0n)
      return 0n
    }

    // Shift indices down by 2 (divide by φ²)
    const fatherZeck = zeck.map(i => i - 2).filter(i => i >= 0)
    const result = fatherZeck.length === 0 ? 0n : this.fromZeckendorf(fatherZeck)

    this.fatherCache.set(key, result)
    return result
  }

  /**
   * Compute preferred son (σ function) using Margenstern formula.
   * σ(n) ≈ n × φ²
   */
  private computePreferredSon(n: bigint): bigint {
    if (n < 0n) return 0n

    const key = n.toString()
    const cached = this.preferredSonCache.get(key)
    if (cached !== undefined) return cached

    const zeck = this.toZeckendorf(n)
    // Shift indices up by 2 (multiply by φ²)
    const sonZeck = zeck.map(i => i + 2)
    const result = sonZeck.length === 0 ? 2n : this.fromZeckendorf(sonZeck)

    this.preferredSonCache.set(key, result)
    return result
  }

  /**
   * Compute neighbor address using Margenstern's neighbor formulas.
   * This is the core algorithmic contribution from the paper.
   */
  private computeNeighborAddress(
    addr: MargensternAddress,
    direction: number,
  ): MargensternAddress {
    const { sector, treeIndex } = addr
    const { p } = this.config
    const { numSectors } = this.margensternConfig
    const dir = ((direction % p) + p) % p

    // Modular sector arithmetic
    const sectorPlus = (s: number, delta: number): number => {
      if (s === 0) return 0
      const result = ((s - 1 + delta) % numSectors + numSectors) % numSectors + 1
      return result
    }

    // Central tile case
    if (sector === 0) {
      // Neighbors of central tile are sector leaders
      const neighborSector = (dir % numSectors) + 1
      return { sector: neighborSector, treeIndex: 0n }
    }

    // Sector leader case
    if (treeIndex === 0n) {
      if (dir === 0) {
        // Direction 0: back to central tile
        return { sector: 0, treeIndex: 0n }
      } else if (dir === 1) {
        // Left boundary: adjacent sector
        return { sector: sectorPlus(sector, -1), treeIndex: 0n }
      } else if (dir === p - 1) {
        // Right boundary: adjacent sector
        return { sector: sectorPlus(sector, 1), treeIndex: 0n }
      } else {
        // Children
        const s = this.computePreferredSon(0n)
        const childOffset = BigInt(dir - 2)
        return { sector, treeIndex: s + childOffset }
      }
    }

    // General tile case using Margenstern Table 2
    const f = this.computeFather(treeIndex)
    const s = this.computePreferredSon(treeIndex)
    const nodeType = this.getNodeType(treeIndex)

    // For {7,3} heptagrid, directions are:
    // 0: father, 1-2: siblings/uncles, 3-5: children, 6: sibling
    if (nodeType === 'white') {
      // White node (3 children)
      switch (dir) {
        case 0: return { sector, treeIndex: f } // father
        case 1: return { sector, treeIndex: treeIndex - 1n > 0n ? treeIndex - 1n : 0n } // left sibling
        case 2: return { sector, treeIndex: s - 1n > 0n ? s - 1n : s } // before preferred son
        case 3: return { sector, treeIndex: s } // preferred son
        case 4: return { sector, treeIndex: s + 1n } // after preferred son
        case 5: return { sector, treeIndex: s + 2n } // rightmost child
        case 6: return { sector, treeIndex: treeIndex + 1n } // right sibling
        default: return { sector, treeIndex: s + BigInt(dir - 3) }
      }
    } else {
      // Black node (2 children)
      switch (dir) {
        case 0: return { sector, treeIndex: f } // father
        case 1: return { sector, treeIndex: f > 0n ? f - 1n : 0n } // father's sibling
        case 2: return { sector, treeIndex: treeIndex - 1n > 0n ? treeIndex - 1n : 0n } // left sibling
        case 3: return { sector, treeIndex: s } // preferred son
        case 4: return { sector, treeIndex: s + 1n } // other child
        case 5: return { sector, treeIndex: s + 2n } // nephew
        case 6: return { sector, treeIndex: treeIndex + 1n } // right sibling
        default: return { sector, treeIndex: s + BigInt(dir - 3) }
      }
    }
  }

  /**
   * Get cell by Margenstern address, creating if needed.
   */
  getCellByAddress(addr: MargensternAddress): Cell | null {
    const key = this.addressToString(addr)
    return this.cellByAddress.get(key) ?? null
  }

  /**
   * Get or create neighbor in direction d (HyperRogue's cmove).
   * Combines graph-based navigation with Margenstern address computation.
   */
  private move(cell: Cell, d: number): Cell {
    const dir = ((d % this.config.p) + this.config.p) % this.config.p

    // Return existing neighbor if already created
    if (cell.neighbors[dir]) {
      return cell.neighbors[dir]!
    }

    // Compute the neighbor's Margenstern address
    const neighborAddress = this.computeNeighborAddress(cell.address, dir)
    const addressKey = this.addressToString(neighborAddress)

    // Check if this cell already exists by address
    let neighbor = this.cellByAddress.get(addressKey)

    if (!neighbor) {
      // Compute the neighbor's transform
      const cellTransform = cell.transform
      if (!cellTransform) {
        return cell
      }
      const neighborTransform = this.composeSU11(
        this.edgeTransforms[dir]!,
        cellTransform,
      )

      // Also check by transform hash (for consistency)
      const hash = this.hashTransform(neighborTransform)
      neighbor = this.cellByHash.get(hash)

      if (!neighbor) {
        // Create new cell with both address and transform
        neighbor = this.createCell(
          cell.distance + 1,
          neighborTransform,
          neighborAddress,
        )
        this.cellByHash.set(hash, neighbor)
        this.cellByAddress.set(addressKey, neighbor)
      } else {
        // Cell exists by hash but not address - update address mapping
        this.cellByAddress.set(addressKey, neighbor)
      }
    }

    // Find which edge of the neighbor connects back to us
    const backDir = this.findBackDirection(dir)

    // Connect them bidirectionally
    cell.neighbors[dir] = neighbor
    cell.neighborSpins[dir] = backDir
    neighbor.neighbors[backDir] = cell
    neighbor.neighborSpins[backDir] = dir

    return neighbor
  }

  /**
   * Find which edge of neighbor connects back when crossing edge dir.
   * For regular {p,q} tilings, the neighbor is rotated by π, so the back edge
   * is approximately opposite: (dir + p/2) mod p.
   */
  private findBackDirection(dir: number): number {
    const { p } = this.config
    // The neighbor tile is rotated by π, so back edge is offset by p/2
    return (dir + Math.floor(p / 2)) % p
  }

  /**
   * Hash a transform for cell identification.
   */
  private hashTransform(t: Matrix): string {
    // Use the center point of the cell as identifier
    const center = this.applySU11Transform(t, [0, 0])
    // Round to avoid floating point issues
    const precision = 10000
    const x = Math.round(center[0] * precision)
    const y = Math.round(center[1] * precision)
    return `${x},${y}`
  }

  /**
   * Set view transform and update center cell.
   */
  setViewTransform(transform: Matrix): void {
    this.viewTransform = transform
    this.updateCenterCell()
  }

  /**
   * Walk from current center toward view center.
   * Just a few steps - getVisibleTiles will update centerCell when it finds visible tiles.
   */
  private updateCenterCell(): void {
    // getVisibleTiles handles the main center tracking now
    // This just does a quick step toward view center as a hint
    let current = this.centerCell

    for (let step = 0; step < 3; step++) {
      const currentTransform = current.transform
      if (!currentTransform) break

      const combined = this.composeSU11(this.viewTransform, currentTransform)
      const center = this.applySU11Transform(combined, [0, 0])
      const currentDist = center[0] * center[0] + center[1] * center[1]

      if (currentDist < 0.1) break

      let bestNeighbor = current
      let bestDist = currentDist

      for (let d = 0; d < this.config.p; d++) {
        const neighbor = this.move(current, d)
        const neighborTransform = neighbor.transform
        if (!neighborTransform) continue

        const neighborCombined = this.composeSU11(this.viewTransform, neighborTransform)
        const neighborCenter = this.applySU11Transform(neighborCombined, [0, 0])
        const neighborDist = neighborCenter[0] * neighborCenter[0] + neighborCenter[1] * neighborCenter[1]

        if (neighborDist < bestDist) {
          bestDist = neighborDist
          bestNeighbor = neighbor
        }
      }

      if (bestNeighbor === current) break
      current = bestNeighbor
    }

    this.centerCell = current
  }

  /**
   * Get visible tiles - BFS from center cell.
   * Two-phase approach: first find any visible cell, then expand from there.
   */
  getVisibleTiles(): VisibleTile[] {
    this.frameCount++
    const visible: VisibleTile[] = []
    const visited = new Set<Cell>()
    const visibleCells: Cell[] = []

    const queue: Cell[] = [this.centerCell]
    let queueIndex = 0

    // Phase 1: Explore outward until we find at least one visible tile
    const maxSearchForVisible = 300
    while (queueIndex < queue.length && visibleCells.length === 0 && queueIndex < maxSearchForVisible) {
      const cell = queue[queueIndex++]!

      if (visited.has(cell)) continue
      visited.add(cell)

      const transform = cell.transform
      if (!transform) continue

      const combined = this.composeSU11(this.viewTransform, transform)
      const vertices = this.baseVertices.map(v =>
        this.applySU11Transform(combined, v),
      )

      const isVisible = vertices.some(([u, v]) => u * u + v * v < 0.98)

      if (isVisible) {
        visible.push({
          id: String(cell.id),
          address: this.addressToString(cell.address),
          vertices,
          depth: cell.distance,
        })
        visibleCells.push(cell)
        cell.lastSeenFrame = this.frameCount
        // Update center cell to this visible cell for next frame
        this.centerCell = cell
      }

      // Always explore all neighbors during search phase
      for (let d = 0; d < this.config.p; d++) {
        const neighbor = this.move(cell, d)
        if (!visited.has(neighbor)) {
          queue.push(neighbor)
        }
      }
    }

    // Phase 2: Expand from visible cells to find all visible tiles
    let visibleIndex = 0
    while (visibleIndex < visibleCells.length && visible.length < this.config.maxTiles) {
      const cell = visibleCells[visibleIndex++]!

      for (let d = 0; d < this.config.p; d++) {
        const neighbor = this.move(cell, d)
        if (visited.has(neighbor)) continue
        visited.add(neighbor)

        const transform = neighbor.transform
        if (!transform) continue

        const combined = this.composeSU11(this.viewTransform, transform)
        const vertices = this.baseVertices.map(v =>
          this.applySU11Transform(combined, v),
        )

        const isVisible = vertices.some(([u, v]) => u * u + v * v < 0.98)

        if (isVisible) {
          visible.push({
            id: String(neighbor.id),
            address: this.addressToString(neighbor.address),
            vertices,
            depth: neighbor.distance,
          })
          visibleCells.push(neighbor)
          neighbor.lastSeenFrame = this.frameCount
        }
      }
    }

    return visible
  }

  /**
   * Compute base polygon vertices in Poincaré disk.
   */
  private computeBaseVertices(): Array<[number, number]> {
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
   * Precompute edge crossing transforms.
   * For each edge, compute the transform that takes this tile to its neighbor.
   */
  private computeEdgeTransforms(): Matrix[] {
    const transforms: Matrix[] = []
    const { p, q } = this.config

    // For {p,q} tiling, compute the distance between adjacent tile centers
    // Using hyperbolic trigonometry
    const angleP = Math.PI / p
    const angleQ = Math.PI / q

    // The distance from tile center to edge midpoint (apothem) in hyperbolic space
    // cosh(apothem) = cos(π/q) / sin(π/p)
    const coshApothem = Math.cos(angleQ) / Math.sin(angleP)
    const apothem = Math.acosh(coshApothem)

    // Distance between adjacent tile centers = 2 * apothem
    const centerDist = 2 * apothem

    // Convert hyperbolic distance to Poincaré disk distance
    // In Poincaré disk: tanh(d/2) gives the Euclidean distance from origin
    const poincareNeighborDist = Math.tanh(centerDist / 2)

    for (let dir = 0; dir < p; dir++) {
      // Direction to neighbor center (perpendicular to edge, pointing outward)
      const edgeAngle = (2 * Math.PI * (dir + 0.5)) / p
      const neighborX = poincareNeighborDist * Math.cos(edgeAngle)
      const neighborY = poincareNeighborDist * Math.sin(edgeAngle)

      // Create translation from origin to neighbor center
      // Then rotate so the tile has correct orientation
      const translation = this.createTranslation(neighborX, neighborY)

      // The neighbor tile is rotated by π relative to us (sharing an edge)
      const rotation = this.createRotation(Math.PI)

      transforms.push(this.composeSU11(translation, rotation))
    }

    return transforms
  }

  /**
   * Create SU(1,1) translation that moves origin to point (x, y).
   */
  private createTranslation(x: number, y: number): Matrix {
    const magSq = x * x + y * y
    if (magSq >= 1) {
      return [1, 0, 0, 0, 0, 0, 0, 0, 1]
    }
    if (magSq < 1e-12) {
      return [1, 0, 0, 0, 0, 0, 0, 0, 1]
    }

    const factor = 1 / Math.sqrt(1 - magSq)
    return [factor, 0, x * factor, y * factor, 0, 0, 0, 0, 1]
  }

  /**
   * Create SU(1,1) rotation by angle theta around origin.
   */
  private createRotation(theta: number): Matrix {
    const half = theta / 2
    return [Math.cos(half), Math.sin(half), 0, 0, 0, 0, 0, 0, 1]
  }

  /**
   * Apply SU(1,1) transform to a point.
   */
  private applySU11Transform(
    t: Matrix,
    p: [number, number],
  ): [number, number] {
    const aRe = t[0] ?? 1
    const aIm = t[1] ?? 0
    const bRe = t[2] ?? 0
    const bIm = t[3] ?? 0
    const [u, v] = p

    const numRe = aRe * u - aIm * v + bRe
    const numIm = aRe * v + aIm * u + bIm
    const denRe = bRe * u + bIm * v + aRe
    const denIm = bRe * v - bIm * u - aIm
    const denMagSq = denRe * denRe + denIm * denIm

    if (denMagSq < 1e-12) return p

    return [
      (numRe * denRe + numIm * denIm) / denMagSq,
      (numIm * denRe - numRe * denIm) / denMagSq,
    ]
  }

  /**
   * Compose two SU(1,1) transforms.
   */
  private composeSU11(t1: Matrix, t2: Matrix): Matrix {
    const a1Re = t1[0] ?? 1,
      a1Im = t1[1] ?? 0,
      b1Re = t1[2] ?? 0,
      b1Im = t1[3] ?? 0
    const a2Re = t2[0] ?? 1,
      a2Im = t2[1] ?? 0,
      b2Re = t2[2] ?? 0,
      b2Im = t2[3] ?? 0

    const aRe = a1Re * a2Re - a1Im * a2Im + b1Re * b2Re + b1Im * b2Im
    const aIm = a1Re * a2Im + a1Im * a2Re - b1Re * b2Im + b1Im * b2Re
    const bRe = a1Re * b2Re - a1Im * b2Im + b1Re * a2Re + b1Im * a2Im
    const bIm = a1Re * b2Im + a1Im * b2Re - b1Re * a2Im + b1Im * a2Re

    const aMagSq = aRe * aRe + aIm * aIm
    const bMagSq = bRe * bRe + bIm * bIm
    const det = aMagSq - bMagSq

    if (det <= 0.001) return [1, 0, 0, 0, 0, 0, 0, 0, 1]

    const s = 1 / Math.sqrt(det)
    return [aRe * s, aIm * s, bRe * s, bIm * s, 0, 0, 0, 0, 1]
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════

  getViewTransform(): Matrix {
    return this.viewTransform
  }

  getTileCount(): number {
    return this.nextId
  }

  getConfig(): TessellationConfig {
    return this.config
  }

  getP(): number {
    return this.config.p
  }

  getQ(): number {
    return this.config.q
  }

  /**
   * Get the current center cell ID.
   */
  getCenterCellId(): string {
    return String(this.centerCell.id)
  }

  /**
   * Navigate to a cell by ID (from a click).
   * Returns the transform needed to center the view on that cell.
   */
  navigateToCell(cellId: string): Matrix | null {
    const targetId = parseInt(cellId, 10)

    // Find the cell by BFS from center (it should be nearby since it was visible)
    const target = this.findCellById(targetId)
    if (!target) return null

    // Set as new center
    this.centerCell = target

    // Compute transform to center view on this cell
    const cellTransform = target.transform
    if (!cellTransform) return null

    // To center on this cell, we need the inverse transform
    // In SU(1,1), inverse of [a, b] is [conj(a), -b] / det
    return this.invertSU11(cellTransform)
  }

  /**
   * Find a cell by ID via BFS from center.
   */
  private findCellById(targetId: number): Cell | null {
    if (this.centerCell.id === targetId) return this.centerCell

    const visited = new Set<Cell>()
    const queue: Cell[] = [this.centerCell]
    let queueIndex = 0

    // Search within reasonable radius (visible cells are nearby)
    const maxSearch = 1000

    while (queueIndex < queue.length && visited.size < maxSearch) {
      const cell = queue[queueIndex++]!

      if (visited.has(cell)) continue
      visited.add(cell)

      if (cell.id === targetId) return cell

      // Check existing neighbors (don't create new ones)
      for (let d = 0; d < this.config.p; d++) {
        const neighbor = cell.neighbors[d]
        if (neighbor && !visited.has(neighbor)) {
          queue.push(neighbor)
        }
      }
    }

    return null
  }

  /**
   * Invert an SU(1,1) transform.
   * For SU(1,1) matrix [a, b], inverse is [conj(a), -b].
   */
  private invertSU11(t: Matrix): Matrix {
    const aRe = t[0] ?? 1
    const aIm = t[1] ?? 0
    const bRe = t[2] ?? 0
    const bIm = t[3] ?? 0

    // Inverse: [conj(a), -b] = [aRe, -aIm, -bRe, -bIm]
    return [aRe, -aIm, -bRe, -bIm, 0, 0, 0, 0, 1]
  }

  /**
   * Get the transform needed to smoothly animate toward a cell.
   * Returns a small step toward the target.
   */
  getStepTowardCell(cellId: string, speed: number = 0.1): Matrix | null {
    const targetId = parseInt(cellId, 10)
    const target = this.findCellById(targetId)
    if (!target) return null

    const cellTransform = target.transform
    if (!cellTransform) return null
    const targetView = this.invertSU11(cellTransform)

    // Interpolate between current view and target
    return this.interpolateSU11(this.viewTransform, targetView, speed)
  }

  /**
   * Interpolate between two SU(1,1) transforms.
   */
  private interpolateSU11(from: Matrix, to: Matrix, t: number): Matrix {
    const a1Re = from[0] ?? 1, a1Im = from[1] ?? 0
    const b1Re = from[2] ?? 0, b1Im = from[3] ?? 0
    const a2Re = to[0] ?? 1, a2Im = to[1] ?? 0
    const b2Re = to[2] ?? 0, b2Im = to[3] ?? 0

    // Linear interpolation (not geodesic, but good enough for small steps)
    const aRe = a1Re + (a2Re - a1Re) * t
    const aIm = a1Im + (a2Im - a1Im) * t
    const bRe = b1Re + (b2Re - b1Re) * t
    const bIm = b1Im + (b2Im - b1Im) * t

    // Renormalize
    const aMagSq = aRe * aRe + aIm * aIm
    const bMagSq = bRe * bRe + bIm * bIm
    const det = aMagSq - bMagSq

    if (det <= 0.001) return from

    const s = 1 / Math.sqrt(det)
    return [aRe * s, aIm * s, bRe * s, bIm * s, 0, 0, 0, 0, 1]
  }

  collectGarbage(): void {
    // Could implement cell cleanup here based on lastSeenFrame
  }
}
