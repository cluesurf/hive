/**
 * Tessellation Coordinate Systems
 *
 * Unified coordinate system framework for addressing tiles in
 * spherical, Euclidean, and hyperbolic tessellations.
 *
 * @example
 * ```typescript
 * import { createCoordinates } from '@cluesurf/hive/coordinates'
 *
 * // Create coordinate system for {7,3} heptagrid
 * const coords = createCoordinates(7, 3)
 *
 * // Navigate
 * const origin = coords.origin()
 * const neighbor = coords.neighbor(origin, 0)
 * const allNeighbors = coords.neighbors(origin)
 *
 * // Compute distances and paths
 * const dist = coords.distance(tileA, tileB)
 * const path = coords.path(tileA, tileB)
 *
 * // Get geometric data
 * const center = coords.center(tile)
 * const vertices = coords.vertices(tile)
 * ```
 */

// Core types and interfaces
export * from './types'

// Factory function
export * from './factory'

// Spherical coordinates (Platonic solids)
export * from './spherical'

// Euclidean coordinates (square, triangular, hexagonal grids)
export * from './euclidean'

// Hyperbolic coordinates (Von Dyck groups, Fibonacci encoding)
export * from './hyperbolic'
