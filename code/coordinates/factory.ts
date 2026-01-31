/**
 * Coordinate System Factory
 *
 * Creates the appropriate coordinate system for any {p,q} tiling
 * based on the geometry type (spherical, Euclidean, or hyperbolic).
 */

import type { TessellationCoordinates, GeometryType } from './types'
import { geometryType } from './types'
import { SphericalCoordinates } from './spherical'
import {
  SquareCoordinates,
  HexagonalCoordinates,
  TriangularCoordinates,
} from './euclidean'
import { VonDyckCoordinates, FibonacciCoordinates } from './hyperbolic'

/**
 * Options for creating coordinate systems.
 */
export interface CreateCoordinatesOptions {
  /**
   * For Euclidean tilings, the size of each tile.
   */
  size?: number

  /**
   * For hyperbolic tilings, prefer optimized Fibonacci encoding
   * when available (currently {7,3} only).
   */
  preferOptimized?: boolean
}

/**
 * Create a coordinate system for the {p,q} tiling.
 *
 * Automatically selects the appropriate implementation based on
 * the geometry type determined by (p-2)(q-2):
 * - < 4: Spherical (Platonic solids)
 * - = 4: Euclidean (square, triangular, hexagonal)
 * - > 4: Hyperbolic (Von Dyck or Fibonacci)
 *
 * @param p Number of polygon sides
 * @param q Number of polygons meeting at each vertex
 * @param options Configuration options
 * @returns Coordinate system for the specified tiling
 *
 * @example
 * // Cube tiling (spherical)
 * const cube = createCoordinates(4, 3)
 *
 * // Square grid (Euclidean)
 * const square = createCoordinates(4, 4)
 *
 * // Heptagrid (hyperbolic)
 * const heptagrid = createCoordinates(7, 3)
 */
export function createCoordinates(
  p: number,
  q: number,
  options: CreateCoordinatesOptions = {},
): TessellationCoordinates {
  const { size = 1, preferOptimized = true } = options
  const geom = geometryType(p, q)

  switch (geom) {
    case 'spherical':
      return createSpherical(p, q)

    case 'euclidean':
      return createEuclidean(p, q, size)

    case 'hyperbolic':
      return createHyperbolic(p, q, preferOptimized)
  }
}

/**
 * Create spherical coordinates for Platonic solids.
 */
function createSpherical(p: number, q: number): TessellationCoordinates {
  return new SphericalCoordinates(p, q)
}

/**
 * Create Euclidean coordinates for regular tilings.
 */
function createEuclidean(
  p: number,
  q: number,
  size: number,
): TessellationCoordinates {
  if (p === 4 && q === 4) {
    return new SquareCoordinates()
  }

  if (p === 6 && q === 3) {
    return new HexagonalCoordinates(size)
  }

  if (p === 3 && q === 6) {
    return new TriangularCoordinates(size)
  }

  throw new Error(
    `Unsupported Euclidean tiling {${p},${q}}. ` +
      `Supported: {4,4}, {6,3}, {3,6}`,
  )
}

/**
 * Create hyperbolic coordinates.
 * Uses optimized Fibonacci encoding for {7,3} when available.
 */
function createHyperbolic(
  p: number,
  q: number,
  preferOptimized: boolean,
): TessellationCoordinates {
  // Use optimized Fibonacci coordinates for {7,3}
  if (preferOptimized && p === 7 && q === 3) {
    return new FibonacciCoordinates()
  }

  // Fall back to generic Von Dyck group coordinates
  return new VonDyckCoordinates(p, q)
}

/**
 * Get the geometry type for a {p,q} tiling without creating coordinates.
 */
export function getGeometryType(p: number, q: number): GeometryType {
  return geometryType(p, q)
}

/**
 * Check if a {p,q} tiling is valid.
 */
export function isValidTiling(p: number, q: number): boolean {
  return p >= 3 && q >= 3
}

/**
 * Get a human-readable description of the tiling.
 */
export function describeTiling(p: number, q: number): string {
  const geom = geometryType(p, q)
  const polygonName = getPolygonName(p)
  const vertexDesc = q === 3 ? 'three' : q === 4 ? 'four' : q === 5 ? 'five' : `${q}`

  return `${polygonName} tiling with ${vertexDesc} polygons meeting at each vertex (${geom})`
}

/**
 * Get the name of a regular polygon.
 */
function getPolygonName(sides: number): string {
  const names: Record<number, string> = {
    3: 'Triangle',
    4: 'Square',
    5: 'Pentagon',
    6: 'Hexagon',
    7: 'Heptagon',
    8: 'Octagon',
    9: 'Nonagon',
    10: 'Decagon',
    12: 'Dodecagon',
  }
  return names[sides] ?? `${sides}-gon`
}
