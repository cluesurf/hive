import { Hyperbolic2D } from '@/math/geometry/hyperbolic2d'
import { identity } from '@/form/matrix'
import type { Point } from '@/form/point'
import type { Matrix } from '@/form/matrix'
import type { Tile, TessellationConfig, Tessellation } from './types'
import { getCurvatureType, validateConfig } from './types'

/**
 * Generator for hyperbolic {p,q} tessellations using the hyperboloid model.
 */
export class Hyperbolic2DTessellation {
  private geometry: Hyperbolic2D
  private config: TessellationConfig
  private edgeLength: number
  private tiles: Map<string, Tile>
  private visited: Set<string>

  constructor(config: TessellationConfig) {
    if (!validateConfig(config.p, config.q)) {
      throw new Error(
        `Invalid tessellation: p=${config.p}, q=${config.q}`,
      )
    }

    const curvature = getCurvatureType(config.p, config.q)
    if (curvature !== -1) {
      throw new Error(
        `{${config.p},${config.q}} is not hyperbolic (curvature=${curvature})`,
      )
    }

    this.geometry = new Hyperbolic2D()
    this.config = config
    this.tiles = new Map()
    this.visited = new Set()

    // Calculate edge length using the hyperbolic law of cosines
    this.edgeLength = this.calculateEdgeLength()
  }

  /**
   * Calculate the edge length for a regular {p,q} polygon in hyperbolic space.
   * For a regular hyperbolic polygon with p sides meeting q at each vertex:
   * cosh(a/2) = cos(π/q) / sin(π/p)
   * where a is the edge length.
   */
  private calculateEdgeLength(): number {
    const { p, q } = this.config
    const angleP = Math.PI / p
    const angleQ = Math.PI / q

    const cosQ = Math.cos(angleQ)
    const sinP = Math.sin(angleP)

    // cosh(a/2) = cos(π/q) / sin(π/p)
    const coshHalfA = cosQ / sinP
    const halfA = Math.acosh(coshHalfA)

    return 2 * halfA
  }

  /**
   * Calculate the circumradius (distance from center to vertex) of a {p,q} polygon.
   */
  private calculateCircumradius(): number {
    const { p, q } = this.config
    const angleP = Math.PI / p
    const angleQ = Math.PI / q

    const cosP = Math.cos(angleP)
    const cosQ = Math.cos(angleQ)
    const sinP = Math.sin(angleP)
    const sinQ = Math.sin(angleQ)

    // cosh(R) = cos(π/p)cos(π/q) / (sin(π/p)sin(π/q))
    const coshR = (cosP * cosQ) / (sinP * sinQ)
    return Math.acosh(coshR)
  }

  /**
   * Generate the vertices of a regular p-gon centered at origin.
   */
  private generateCentralPolygonVertices(): Point[] {
    const { p } = this.config
    const vertices: Point[] = []
    const R = this.calculateCircumradius()
    const origin = this.geometry.origin()

    // Generate vertices at equal angles around center
    for (let i = 0; i < p; i++) {
      const angle = (2 * Math.PI * i) / p
      const direction: Point = [Math.cos(angle), Math.sin(angle)]
      const vertex = this.geometry.pointOnGeodesic(origin, direction, R)
      vertices.push(vertex)
    }

    return vertices
  }

  /**
   * Compute the center of a polygon from its vertices.
   */
  private computeCenter(vertices: Point[]): Point {
    // For a regular polygon on hyperboloid, we can average and normalize
    let x = 0,
      y = 0,
      t = 0
    for (const v of vertices) {
      x += v[0] ?? 0
      y += v[1] ?? 0
      t += v[2] ?? 1
    }
    const n = vertices.length
    return this.geometry.normalize([x / n, y / n, t / n])
  }

  /**
   * Create a hash for a tile based on its center position.
   */
  private hashTile(center: Point): string {
    const x = center[0] ?? 0
    const y = center[1] ?? 0
    const t = center[2] ?? 1
    // Round to avoid floating point issues
    const precision = 1e6
    const hx = Math.round(x * precision)
    const hy = Math.round(y * precision)
    const ht = Math.round(t * precision)
    return `${hx},${hy},${ht}`
  }

  /**
   * Generate the reflection matrix across an edge.
   */
  private getEdgeReflection(v1: Point, v2: Point): Matrix {
    const normal = this.geometry.geodesicThrough(v1, v2)
    return this.geometry.reflection(normal)
  }

  /**
   * Generate tiles recursively starting from the central tile.
   */
  generate(): Tessellation {
    this.tiles.clear()
    this.visited.clear()

    // Create central tile at origin
    const centralVertices = this.generateCentralPolygonVertices()
    const centralCenter = this.geometry.origin()

    const centralTile: Tile = {
      id: this.hashTile(centralCenter),
      vertices: centralVertices,
      center: centralCenter,
      transform: identity(3),
      depth: 0,
      neighbors: new Array(this.config.p).fill(null),
    }

    this.tiles.set(centralTile.id, centralTile)
    this.visited.add(centralTile.id)

    // Generate neighbors recursively
    this.generateNeighbors(centralTile)

    return {
      config: this.config,
      tiles: this.tiles,
      centralTile,
      curvature: -1,
      edgeLength: this.edgeLength,
    }
  }

  /**
   * Generate neighboring tiles by reflecting across each edge.
   */
  private generateNeighbors(tile: Tile): void {
    if (tile.depth >= this.config.maxDepth) return

    const { p } = this.config

    for (let i = 0; i < p; i++) {
      const v1 = tile.vertices[i]
      const v2 = tile.vertices[(i + 1) % p]

      // Get reflection across this edge
      const reflection = this.getEdgeReflection(v1, v2)

      // Reflect all vertices to get neighbor
      // Normalize after reflection to correct numerical drift
      const neighborVertices = tile.vertices.map(v => {
        const reflected = this.geometry.applyMatrix(reflection, v)
        return this.geometry.normalize(reflected)
      })

      const neighborCenter = this.computeCenter(neighborVertices)
      const neighborId = this.hashTile(neighborCenter)

      // Check if we've already visited this tile
      if (this.visited.has(neighborId)) {
        // Link to existing tile
        const existingTile = this.tiles.get(neighborId)
        if (existingTile) {
          tile.neighbors[i] = neighborId
          // Find the edge index in the neighbor that connects back
          for (let j = 0; j < p; j++) {
            if (existingTile.neighbors[j] === null) {
              const nv1 = existingTile.vertices[j]
              const nv2 = existingTile.vertices[(j + 1) % p]
              // Check if this edge matches (in reverse order)
              if (
                this.pointsClose(nv1, v2) &&
                this.pointsClose(nv2, v1)
              ) {
                existingTile.neighbors[j] = tile.id
                break
              }
            }
          }
        }
        continue
      }

      // Create new tile
      const neighborTransform = this.geometry.compose(
        reflection,
        tile.transform,
      )

      const neighborTile: Tile = {
        id: neighborId,
        vertices: neighborVertices,
        center: neighborCenter,
        transform: neighborTransform,
        depth: tile.depth + 1,
        neighbors: new Array(p).fill(null),
      }

      // Link tiles
      tile.neighbors[i] = neighborId

      // Find which edge of neighbor connects back to this tile
      for (let j = 0; j < p; j++) {
        const nv1 = neighborVertices[j]
        const nv2 = neighborVertices[(j + 1) % p]
        if (this.pointsClose(nv1, v2) && this.pointsClose(nv2, v1)) {
          neighborTile.neighbors[j] = tile.id
          break
        }
      }

      this.tiles.set(neighborId, neighborTile)
      this.visited.add(neighborId)

      // Recursively generate neighbors
      this.generateNeighbors(neighborTile)
    }
  }

  /**
   * Check if two points are approximately equal.
   */
  private pointsClose(
    a: Point,
    b: Point,
    epsilon: number = 1e-6,
  ): boolean {
    const dx = (a[0] ?? 0) - (b[0] ?? 0)
    const dy = (a[1] ?? 0) - (b[1] ?? 0)
    const dt = (a[2] ?? 1) - (b[2] ?? 1)
    return dx * dx + dy * dy + dt * dt < epsilon * epsilon
  }

  /**
   * Get the geometry instance.
   */
  getGeometry(): Hyperbolic2D {
    return this.geometry
  }

  /**
   * Get the computed edge length.
   */
  getEdgeLength(): number {
    return this.edgeLength
  }
}
