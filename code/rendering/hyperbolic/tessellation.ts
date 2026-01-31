/**
 * Hyperbolic tessellation rendering utilities.
 *
 * Converts hyperbolic tessellation tiles to polygon nodes for rendering.
 * Works with address-based tiles that use Von Dyck group words.
 */

import type { Point } from '@/form/point'
import type { PolygonNode } from '../scene'
import { createPolygon } from '../scene'
import {
  type TileStyleOptions,
  depthFillColor,
  depthStrokeColor,
  DEFAULT_HUE,
  DEFAULT_BASE_SATURATION,
  DEFAULT_BASE_LIGHTNESS,
  DEFAULT_SATURATION_DECAY,
  DEFAULT_LIGHTNESS_DECAY,
} from '../colors'

/**
 * Address-based tile from the tessellation system.
 * Vertices are already in Poincaré disk coordinates.
 */
export interface AddressedTileData {
  id: string
  vertices: Array<[number, number]>
  /** Optional depth (if provided, used instead of computing from word) */
  depth?: number
  /** Optional Margenstern address string */
  address?: string
}

/**
 * Convert address-based tiles to polygon nodes.
 *
 * These tiles have vertices already transformed to Poincaré disk
 * coordinates, so no further projection is needed during rendering.
 *
 * Accepts either AddressedTileData or VisibleTile from Hyperbolic2DTessellation.
 */
export function addressedTilesToNodes(
  tiles: AddressedTileData[],
  options: Omit<TileStyleOptions, 'viewCenter'> = {},
): PolygonNode[] {
  const {
    hue = DEFAULT_HUE,
    baseSaturation = DEFAULT_BASE_SATURATION,
    baseLightness = DEFAULT_BASE_LIGHTNESS,
    saturationDecay = DEFAULT_SATURATION_DECAY,
    lightnessDecay = DEFAULT_LIGHTNESS_DECAY,
  } = options

  const nodes: PolygonNode[] = []

  for (const tile of tiles) {
    // Use provided depth if available, otherwise compute from word
    const depth = tile.depth ?? computeWordDepth(tile.id)

    const fillColor = depthFillColor(
      depth,
      hue,
      baseSaturation,
      baseLightness,
      saturationDecay,
      lightnessDecay,
    )
    const strokeColor = depthStrokeColor(
      depth,
      hue,
      baseLightness,
      lightnessDecay,
    )

    // Convert 2D Poincaré vertices to 3D format (z=0 for disk coords)
    // This allows reuse of the existing rendering pipeline
    const vertices3D: Point[] = tile.vertices.map(([u, v]) => [u, v, 0])

    // Compute center in disk coords
    let centerU = 0
    let centerV = 0
    for (const [u, v] of tile.vertices) {
      centerU += u
      centerV += v
    }
    const n = tile.vertices.length
    const center: Point = [centerU / n, centerV / n, 0]

    const polygon = createPolygon(tile.id, vertices3D, {
      fillColor,
      strokeColor,
      strokeWidth: 1,
      depth,
      focusable: true,
      name: `Tile ${tile.id || 'origin'}`,
      center,
    })

    nodes.push(polygon)
  }

  return nodes
}

/**
 * Compute depth from a Von Dyck group word.
 * The depth is based on word length (number of generator applications).
 */
function computeWordDepth(word: string): number {
  if (!word) return 0

  let depth = 0
  const regex = /[ab](-?\d+)/g
  let match

  while ((match = regex.exec(word)) !== null) {
    const power = parseInt(match[1] ?? '1', 10)
    depth += Math.abs(power)
  }

  // Scale down for visual purposes (word length grows faster than visual depth)
  return Math.floor(depth / 2)
}

/**
 * Compute hyperbolic distance between two points using Minkowski inner product.
 * Used for distance-based coloring in hyperboloid model.
 */
export function hyperbolicDistance(a: Point, b: Point): number {
  const ax = a[0] ?? 0
  const ay = a[1] ?? 0
  const at = a[2] ?? 1
  const bx = b[0] ?? 0
  const by = b[1] ?? 0
  const bt = b[2] ?? 1

  // Minkowski inner product: <a,b> = a.x*b.x + a.y*b.y - a.t*b.t
  // For points on hyperboloid: cosh(d) = -<a,b>
  const innerProduct = ax * bx + ay * by - at * bt
  const clamped = Math.max(1, -innerProduct)
  return Math.acosh(clamped)
}

/**
 * Convert hyperbolic distance to a depth level for coloring.
 * Uses a scale factor to map continuous distance to discrete depth steps.
 */
export function distanceToDepth(
  distance: number,
  scale: number = 0.8,
): number {
  return Math.floor(distance / scale)
}
