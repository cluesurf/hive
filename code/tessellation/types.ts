import type { Point } from '@/form/point'
import type { Matrix } from '@/form/matrix'

/**
 * A tile in a tessellation.
 */
export interface Tile {
  /** Unique identifier for this tile */
  id: string

  /** Vertices of the tile in the geometry's native coordinate system */
  vertices: Point[]

  /** Center point of the tile */
  center: Point

  /** Transformation matrix from the central tile to this tile */
  transform: Matrix

  /** Depth from the central tile (0 = central tile) */
  depth: number

  /** IDs of adjacent tiles (one per edge) */
  neighbors: (string | null)[]
}

/**
 * Configuration for a {p,q} tessellation.
 * p = number of sides per polygon
 * q = number of polygons meeting at each vertex
 */
export interface TessellationConfig {
  /** Number of sides per polygon */
  p: number

  /** Number of polygons meeting at each vertex */
  q: number

  /** Maximum depth to generate (number of steps from center) */
  maxDepth: number

  /** Maximum number of tiles to generate (optional, overrides depth if reached first) */
  maxTiles?: number
}

/**
 * Result of tessellation generation.
 */
export interface Tessellation {
  /** Configuration used to generate this tessellation */
  config: TessellationConfig

  /** All generated tiles, keyed by ID */
  tiles: Map<string, Tile>

  /** The central tile (depth 0) */
  centralTile: Tile

  /** Curvature type: -1 (hyperbolic), 0 (Euclidean), 1 (spherical) */
  curvature: number

  /** Edge length in the geometry's native units */
  edgeLength: number
}

// Re-export utility functions
export {
  getCurvatureType,
  validateConfig,
  isHyperbolic,
  isEuclidean,
  isSpherical,
  getDefectAngle,
  getPolygonAngle,
  getVertexAngle,
} from './utils'
