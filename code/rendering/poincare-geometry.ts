/**
 * Minimal geometry adapter for rendering pre-computed Poincaré disk coordinates.
 *
 * When using AddressBasedTessellation, vertices are already transformed to
 * Poincaré disk coordinates. This adapter tells the renderer to treat them
 * as "euclidean" (i.e., direct [-1, 1] mapping to canvas) which is correct
 * for Poincaré disk coords.
 */

import type { GeometryType } from '@/form/geometry'

/**
 * Geometry adapter for pre-computed Poincaré disk coordinates.
 * Returns 'euclidean' so the renderer maps [-1, 1] directly to canvas.
 */
export class PoincareGeometry {
  readonly dimension = 2
  readonly embeddingDimension = 2
  readonly curvature = -1

  getType(): GeometryType {
    // Use 'euclidean' so renderer treats coords as [-1, 1] range
    // which is exactly what Poincaré disk coordinates are
    return 'euclidean'
  }
}

/**
 * Singleton instance for convenience.
 */
export const poincareGeometry = new PoincareGeometry()
