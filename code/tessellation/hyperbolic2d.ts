/**
 * HyperRogue-style hyperbolic tessellation.
 *
 * Key principles (from HyperRogue):
 * 1. Cells are graph nodes with direct neighbor pointers - no coordinates
 * 2. Neighbors created lazily on first access via move()
 * 3. BFS from current position each frame to find visible cells
 * 4. Transforms computed only for rendering, not for navigation
 */

import type { Matrix } from '@/form/matrix'

/**
 * A cell in the tessellation - HyperRogue style.
 * No coordinates stored - just neighbor pointers.
 */
export interface Cell {
  /** Unique ID (for debugging/display) */
  id: number

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
  vertices: Array<[number, number]>
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
 * HyperRogue-style tessellation manager.
 */
export class Hyperbolic2DTessellation {
  private config: TessellationConfig
  private nextId: number = 0
  private origin: Cell
  private centerCell: Cell

  // View transform (SU(1,1) format)
  private viewTransform: Matrix = [1, 0, 0, 0, 0, 0, 0, 0, 1]

  // Precomputed geometry
  private baseVertices: Array<[number, number]> = []
  private edgeTransforms: Matrix[] = []

  // Cell lookup by transform hash (to detect duplicates)
  private cellByHash: Map<string, Cell> = new Map()

  // Frame counter for visibility tracking
  private frameCount: number = 0

  constructor(config: Partial<TessellationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // Compute base polygon vertices
    this.baseVertices = this.computeBaseVertices()

    // Precompute edge crossing transforms
    this.edgeTransforms = this.computeEdgeTransforms()

    // Create origin cell
    const originTransform: Matrix = [1, 0, 0, 0, 0, 0, 0, 0, 1]
    this.origin = this.createCell(0, originTransform)
    this.cellByHash.set(this.hashTransform(originTransform), this.origin)
    this.centerCell = this.origin
  }

  /**
   * Create a new cell.
   */
  private createCell(distance: number, transform: Matrix | null): Cell {
    return {
      id: this.nextId++,
      neighbors: new Array(this.config.p).fill(null),
      neighborSpins: new Array(this.config.p).fill(-1),
      distance,
      transform,
      lastSeenFrame: 0,
    }
  }

  /**
   * Get or create neighbor in direction d (HyperRogue's cmove).
   */
  private move(cell: Cell, d: number): Cell {
    const dir = ((d % this.config.p) + this.config.p) % this.config.p

    // Return existing neighbor if already created
    if (cell.neighbors[dir]) {
      return cell.neighbors[dir]!
    }

    // Compute the neighbor's transform
    const cellTransform = this.getCellTransform(cell)
    const neighborTransform = this.composeSU11(
      this.edgeTransforms[dir]!,
      cellTransform,
    )

    // Check if this cell already exists (via transform hash)
    const hash = this.hashTransform(neighborTransform)
    let neighbor = this.cellByHash.get(hash)

    if (!neighbor) {
      // Create new cell
      neighbor = this.createCell(cell.distance + 1, neighborTransform)
      this.cellByHash.set(hash, neighbor)
    }

    // Find which edge of the neighbor connects back to us
    const backDir = this.findBackDirection(neighbor, cell)

    // Connect them
    cell.neighbors[dir] = neighbor
    cell.neighborSpins[dir] = backDir

    if (backDir >= 0) {
      neighbor.neighbors[backDir] = cell
      neighbor.neighborSpins[backDir] = dir
    }

    return neighbor
  }

  /**
   * Find which edge of neighborCell connects back to parentCell.
   */
  private findBackDirection(neighborCell: Cell, parentCell: Cell): number {
    const neighborTransform = this.getCellTransform(neighborCell)
    const parentTransform = this.getCellTransform(parentCell)
    const parentHash = this.hashTransform(parentTransform)

    // Check each edge of neighbor to find one that leads back to parent
    for (let d = 0; d < this.config.p; d++) {
      if (neighborCell.neighbors[d] === parentCell) {
        return d
      }

      // Compute where this edge would lead
      const testTransform = this.composeSU11(
        this.edgeTransforms[d]!,
        neighborTransform,
      )
      if (this.hashTransform(testTransform) === parentHash) {
        return d
      }
    }

    // Fallback: use geometric approximation
    return Math.floor(this.config.p / 2)
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
   */
  private updateCenterCell(): void {
    let current = this.centerCell
    const maxSteps = 50

    for (let step = 0; step < maxSteps; step++) {
      const currentDist = this.cellDistanceFromViewCenter(current)

      // Close enough to center
      if (currentDist < 0.1) break

      // Find neighbor closer to view center
      let bestNeighbor = current
      let bestDist = currentDist

      for (let d = 0; d < this.config.p; d++) {
        const neighbor = this.move(current, d)
        const neighborDist = this.cellDistanceFromViewCenter(neighbor)

        if (neighborDist < bestDist) {
          bestDist = neighborDist
          bestNeighbor = neighbor
        }
      }

      // No improvement - at local minimum
      if (bestNeighbor === current) break

      current = bestNeighbor
    }

    this.centerCell = current
  }

  /**
   * Compute how far a cell's center is from the view center.
   */
  private cellDistanceFromViewCenter(cell: Cell): number {
    const transform = this.getCellTransform(cell)
    const combined = this.composeSU11(this.viewTransform, transform)
    const center = this.applySU11Transform(combined, [0, 0])
    return center[0] * center[0] + center[1] * center[1]
  }

  /**
   * Get or compute cell's transform (lazy).
   */
  private getCellTransform(cell: Cell): Matrix {
    if (cell.transform) return cell.transform

    // Origin has identity transform
    if (cell === this.origin) {
      cell.transform = [1, 0, 0, 0, 0, 0, 0, 0, 1]
      return cell.transform
    }

    // Find a neighbor that has a transform and compute from it
    for (let d = 0; d < this.config.p; d++) {
      const neighbor = cell.neighbors[d]
      if (neighbor && neighbor.transform) {
        const backDir = cell.neighborSpins[d]
        const edgeTransform = this.edgeTransforms[backDir]!
        cell.transform = this.composeSU11(edgeTransform, neighbor.transform)
        return cell.transform
      }
    }

    // Fallback: BFS from origin to compute transform
    cell.transform = this.computeTransformFromOrigin(cell)
    return cell.transform
  }

  /**
   * Compute transform by BFS from origin.
   */
  private computeTransformFromOrigin(target: Cell): Matrix {
    // BFS to find path from origin to target
    const visited = new Map<Cell, { parent: Cell; dir: number } | null>()
    const queue: Cell[] = [this.origin]
    visited.set(this.origin, null)

    while (queue.length > 0) {
      const cell = queue.shift()!

      if (cell === target) {
        // Reconstruct path and compute transform
        const path: { cell: Cell; dir: number }[] = []
        let current = target
        while (visited.get(current)) {
          const info = visited.get(current)!
          path.unshift({ cell: info.parent, dir: info.dir })
          current = info.parent
        }

        let transform: Matrix = [1, 0, 0, 0, 0, 0, 0, 0, 1]
        for (const step of path) {
          transform = this.composeSU11(
            this.edgeTransforms[step.dir]!,
            transform,
          )
        }
        return transform
      }

      for (let d = 0; d < this.config.p; d++) {
        const neighbor = cell.neighbors[d]
        if (neighbor && !visited.has(neighbor)) {
          visited.set(neighbor, { parent: cell, dir: d })
          queue.push(neighbor)
        }
      }
    }

    // Should never reach here
    return [1, 0, 0, 0, 0, 0, 0, 0, 1]
  }

  /**
   * Get visible tiles - BFS from center cell.
   */
  getVisibleTiles(): VisibleTile[] {
    this.frameCount++
    const visible: VisibleTile[] = []
    const visited = new Set<Cell>()
    const queue: Cell[] = [this.centerCell]

    while (queue.length > 0 && visible.length < this.config.maxTiles) {
      const cell = queue.shift()!

      if (visited.has(cell)) continue
      visited.add(cell)

      if (cell.distance > this.config.maxDepth) continue

      // Compute vertices for this cell
      const transform = this.getCellTransform(cell)
      const combined = this.composeSU11(this.viewTransform, transform)
      const vertices = this.baseVertices.map(v =>
        this.applySU11Transform(combined, v),
      )

      // Check visibility
      const isVisible = vertices.some(([u, v]) => u * u + v * v < 1.0)

      if (isVisible) {
        visible.push({ id: String(cell.id), vertices })
        cell.lastSeenFrame = this.frameCount

        // Explore all neighbors
        for (let d = 0; d < this.config.p; d++) {
          const neighbor = this.move(cell, d)
          if (!visited.has(neighbor)) {
            queue.push(neighbor)
          }
        }
      } else {
        // Compute center distance
        let cx = 0,
          cy = 0
        for (const [u, v] of vertices) {
          cx += u
          cy += v
        }
        cx /= vertices.length
        cy /= vertices.length
        const centerDist = cx * cx + cy * cy

        // Explore if close to view center (helps find visible tiles)
        if (centerDist < 4.0) {
          for (let d = 0; d < this.config.p; d++) {
            const neighbor = this.move(cell, d)
            if (!visited.has(neighbor)) {
              queue.push(neighbor)
            }
          }
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
    const cellTransform = this.getCellTransform(target)

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

    // Search within reasonable radius (visible cells are nearby)
    const maxSearch = 5000

    while (queue.length > 0 && visited.size < maxSearch) {
      const cell = queue.shift()!

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

    const cellTransform = this.getCellTransform(target)
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
