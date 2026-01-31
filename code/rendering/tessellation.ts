/**
 * Generic tessellation rendering utilities.
 *
 * For hyperbolic-specific functions, see ./hyperbolic/tessellation.ts
 */

import type { Tessellation } from '@/tessellation/types'
import type { PolygonNode } from './scene'
import { createPolygon } from './scene'
import {
  type TileStyleOptions,
  depthFillColor,
  depthStrokeColor,
  DEFAULT_HUE,
  DEFAULT_BASE_SATURATION,
  DEFAULT_BASE_LIGHTNESS,
  DEFAULT_SATURATION_DECAY,
  DEFAULT_LIGHTNESS_DECAY,
} from './colors'

// Re-export for convenience
export type { TileStyleOptions }

/**
 * Convert tessellation tiles to polygon nodes.
 * Returns an array of nodes that can be added to any scene.
 */
export function tessellationToNodes(
  tessellation: Tessellation,
  options: TileStyleOptions = {},
): PolygonNode[] {
  const {
    hue = DEFAULT_HUE,
    baseSaturation = DEFAULT_BASE_SATURATION,
    baseLightness = DEFAULT_BASE_LIGHTNESS,
    saturationDecay = DEFAULT_SATURATION_DECAY,
    lightnessDecay = DEFAULT_LIGHTNESS_DECAY,
  } = options

  const nodes: PolygonNode[] = []

  for (const tile of tessellation.tiles.values()) {
    const fillColor = depthFillColor(
      tile.depth,
      hue,
      baseSaturation,
      baseLightness,
      saturationDecay,
      lightnessDecay,
    )
    const strokeColor = depthStrokeColor(
      tile.depth,
      hue,
      baseLightness,
      lightnessDecay,
    )

    // Calculate center from vertices
    let centerX = 0
    let centerY = 0
    let centerT = 0
    for (const v of tile.vertices) {
      centerX += v[0] ?? 0
      centerY += v[1] ?? 0
      centerT += v[2] ?? 1
    }
    const n = tile.vertices.length
    const center: [number, number, number] = [
      centerX / n,
      centerY / n,
      centerT / n,
    ]

    const polygon = createPolygon(tile.id, tile.vertices, {
      fillColor,
      strokeColor,
      strokeWidth: 1,
      depth: tile.depth,
      focusable: true,
      name: `Tile ${tile.id}`,
      center,
    })

    nodes.push(polygon)
  }

  return nodes
}
