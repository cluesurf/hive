import type { Point } from '@/form/point'
import type { Matrix } from '@/form/matrix'

/**
 * A tile in the dynamic tessellation graph.
 * Tiles are generated lazily and linked to neighbors on demand.
 */
export interface Tile {
  /** Unique identifier (hash of center position) */
  id: string

  /** Number of edges (p for {p,q} tessellation) */
  type: number

  /** Neighbor pointers (null = not yet generated) */
  neighbors: (Tile | null)[]

  /** Which edge of neighbor[i] connects back to this tile */
  spins: number[]

  /** Center in hyperboloid coordinates */
  center: Point

  /** Vertex positions in hyperboloid coordinates */
  vertices: Point[]

  /** Transform from origin to this tile's center */
  transform: Matrix

  /** Graph distance from origin tile */
  depth: number

  /** Which edge leads to parent (-1 for origin) */
  parentEdge: number

  /** Last time this tile was accessed (for LRU eviction) */
  lastAccessTime: number
}

/**
 * Walker for navigating the tile graph.
 * Represents a position (tile) and facing direction (edge index).
 */
export interface Walker {
  tile: Tile
  direction: number
}

/**
 * Configuration for dynamic tessellation.
 */
export interface DynamicTessellationConfig {
  /** Number of polygon sides */
  p: number

  /** Number of polygons meeting at each vertex */
  q: number

  /** Maximum tiles to keep in memory */
  maxTiles: number

  /** Radius (in hyperbolic distance) for visible tile generation */
  visibleRadius: number
}

/**
 * Default configuration values.
 */
export const DEFAULT_DYNAMIC_CONFIG: DynamicTessellationConfig = {
  p: 7,
  q: 3,
  maxTiles: 2000,
  visibleRadius: 3.0,
}
