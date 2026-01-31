/**
 * Tessellation Coordinate System Types
 *
 * Unified type definitions for addressing tiles across
 * spherical, Euclidean, and hyperbolic geometries.
 */

/**
 * Geometry type enumeration.
 */
export type GeometryType = 'spherical' | 'euclidean' | 'hyperbolic'

/**
 * A tile identifier. Opaque type that varies by implementation:
 * - Spherical: number (0 to tileCount-1)
 * - Euclidean: object with integer coordinates
 * - Hyperbolic: bigint (Fibonacci) or string (Von Dyck)
 */
export type TileId = string | number | bigint | EuclideanTileId

/**
 * Euclidean tile identifier with integer coordinates.
 */
export interface EuclideanTileId {
  readonly x: number
  readonly y: number
}

/**
 * Direction index for neighbor navigation.
 * For {p,q} tilings: 0 to p-1 for the p edges of each tile.
 * Directions are ordered clockwise from a canonical "north" edge.
 */
export type Direction = number

/**
 * A point in the native coordinate space.
 * - Spherical: [x, y, z] on unit sphere (x² + y² + z² = 1)
 * - Euclidean: [x, y] in R²
 * - Hyperbolic: [x, y, t] on hyperboloid (t² - x² - y² = 1)
 */
export type Point = Point2D | Point3D

export type Point2D = readonly [number, number]
export type Point3D = readonly [number, number, number]

/**
 * Abstract tessellation coordinate system.
 * Provides tile addressing and navigation for any geometry.
 */
export interface TessellationCoordinates<Id = TileId> {
  /**
   * Geometry type (spherical, euclidean, or hyperbolic).
   */
  readonly geometry: GeometryType

  /**
   * Number of polygon sides (p in Schläfli symbol {p,q}).
   */
  readonly p: number

  /**
   * Vertex degree - polygons meeting at each vertex (q in {p,q}).
   */
  readonly q: number

  /**
   * Total tile count.
   * Finite for spherical, Infinity for Euclidean and hyperbolic.
   */
  readonly tileCount: number

  /**
   * Get the origin tile (canonical starting point).
   * This is the "center" of the coordinate system.
   */
  origin(): Id

  /**
   * Get neighbor tile in given direction.
   * Direction is 0 to p-1, clockwise from "north" edge.
   */
  neighbor(tile: Id, direction: Direction): Id

  /**
   * Get all neighbors of a tile.
   * Returns array of length p in clockwise order.
   */
  neighbors(tile: Id): Id[]

  /**
   * Find which direction leads from one tile to an adjacent tile.
   * Returns -1 if tiles are not adjacent.
   */
  directionTo(from: Id, to: Id): Direction

  /**
   * Combinatorial distance between tiles.
   * This is the minimum number of edge traversals (graph distance).
   */
  distance(a: Id, b: Id): number

  /**
   * Find shortest path between tiles.
   * Returns array of tile IDs including start and end.
   * For adjacent tiles, returns [from, to].
   */
  path(from: Id, to: Id): Id[]

  /**
   * Get geometric center of tile.
   * Returns point in native coordinate space.
   */
  center(tile: Id): Point

  /**
   * Get vertices of tile polygon.
   * Returns p points in clockwise order.
   */
  vertices(tile: Id): Point[]

  /**
   * Find tile containing a point.
   * Returns null if point is outside tessellation (only possible for spherical).
   */
  tileAt(point: Point): Id | null

  /**
   * Get tiles within combinatorial distance r from a center tile.
   * For hyperbolic, count grows exponentially with r.
   */
  tilesWithinDistance(center: Id, radius: number): Id[]

  /**
   * Convert tile ID to canonical string representation.
   * Must be reversible via fromString().
   */
  toString(tile: Id): string

  /**
   * Parse tile ID from string representation.
   */
  fromString(s: string): Id

  /**
   * Iterate tiles in order of distance from origin.
   * For infinite tessellations, yields indefinitely.
   */
  [Symbol.iterator](): Iterator<Id>
}

/**
 * Extended interface for hyperbolic coordinate systems.
 * Adds tree structure operations specific to hyperbolic geometry.
 */
export interface HyperbolicCoordinates<Id = TileId>
  extends TessellationCoordinates<Id> {
  readonly geometry: 'hyperbolic'

  /**
   * Get parent tile in spanning tree (toward origin).
   * Returns null for the origin tile.
   */
  parent(tile: Id): Id | null

  /**
   * Get children tiles in spanning tree (away from origin).
   * Number of children depends on tree structure.
   */
  children(tile: Id): Id[]

  /**
   * Get depth in spanning tree (combinatorial distance from origin).
   */
  depth(tile: Id): number

  /**
   * Get the number of spanning trees covering the tiling.
   * e.g., 3 for {7,3}, 4 for {5,4}
   */
  treeCount(): number

  /**
   * Which spanning tree does this tile belong to?
   * Returns index 0 to treeCount()-1.
   */
  treeIndex(tile: Id): number

  /**
   * Convert tile ID to compact integer representation.
   * Only available for Fibonacci-encoded tilings.
   */
  toInteger(tile: Id): bigint

  /**
   * Parse tile ID from integer representation.
   */
  fromInteger(n: bigint): Id
}

/**
 * Growth metrics for hyperbolic tilings.
 */
export interface HyperbolicGrowth {
  /**
   * Number of tiles at exact combinatorial distance r from origin.
   * Grows exponentially with r.
   */
  tilesAtDistance(r: number): number

  /**
   * Total tiles within combinatorial distance r (inclusive).
   */
  tilesWithinDistanceCount(r: number): number

  /**
   * Growth rate (base of exponential growth).
   * For {7,3}: approximately φ = 1.618
   */
  growthRate(): number
}

/**
 * Sparse storage for infinite tilings.
 * Only stores tiles that have been "activated" or assigned values.
 */
export interface SparseTileStorage<Id, Value> {
  /**
   * Get value for a tile, or undefined if not stored.
   */
  get(tile: Id): Value | undefined

  /**
   * Set value for a tile.
   */
  set(tile: Id, value: Value): void

  /**
   * Check if a tile has a stored value.
   */
  has(tile: Id): boolean

  /**
   * Remove a tile's value.
   */
  delete(tile: Id): boolean

  /**
   * Number of stored tiles.
   */
  readonly size: number

  /**
   * Iterate over all stored tile-value pairs.
   */
  entries(): IterableIterator<[Id, Value]>

  /**
   * Remove tiles beyond a certain distance from a center point.
   * Essential for long-running simulations to prevent memory exhaustion.
   */
  collectGarbage(
    center: Id,
    keepRadius: number,
    coords: TessellationCoordinates<Id>,
  ): number
}

/**
 * Check if curvature indicates spherical geometry.
 * Curvature = (p-2)(q-2); spherical when < 4.
 */
export function isSpherical(p: number, q: number): boolean {
  return (p - 2) * (q - 2) < 4
}

/**
 * Check if curvature indicates Euclidean geometry.
 * Curvature = (p-2)(q-2); Euclidean when = 4.
 */
export function isEuclidean(p: number, q: number): boolean {
  return (p - 2) * (q - 2) === 4
}

/**
 * Check if curvature indicates hyperbolic geometry.
 * Curvature = (p-2)(q-2); hyperbolic when > 4.
 */
export function isHyperbolic(p: number, q: number): boolean {
  return (p - 2) * (q - 2) > 4
}

/**
 * Get the geometry type for a {p,q} tiling.
 */
export function geometryType(p: number, q: number): GeometryType {
  const curvature = (p - 2) * (q - 2)
  if (curvature < 4) return 'spherical'
  if (curvature === 4) return 'euclidean'
  return 'hyperbolic'
}

/**
 * Get the opposite direction (across a tile).
 * For a p-gon, opposite of direction d is (d + p/2) mod p.
 * Only meaningful for even p.
 */
export function oppositeDirection(direction: Direction, p: number): Direction {
  return (direction + Math.floor(p / 2)) % p
}
