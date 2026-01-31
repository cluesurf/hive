import type { Tessellation } from '@/tessellation/types'
import type { PolygonNode } from './scene'
import { createPolygon } from './scene'

/**
 * Options for converting tessellation tiles to polygon nodes.
 */
export interface TileStyleOptions {
  /** Base hue for depth-based coloring (0-360) */
  hue?: number
  /** Base saturation for depth-based coloring (0-100) */
  baseSaturation?: number
  /** Base lightness for depth-based coloring (0-100) */
  baseLightness?: number
  /** Saturation decrease per depth level */
  saturationDecay?: number
  /** Lightness decrease per depth level */
  lightnessDecay?: number
}

const DEFAULT_HUE = 220
const DEFAULT_BASE_SATURATION = 60
const DEFAULT_BASE_LIGHTNESS = 30
const DEFAULT_SATURATION_DECAY = 8
const DEFAULT_LIGHTNESS_DECAY = 4

/**
 * Generate fill color for a given depth level.
 */
export function depthFillColor(
  depth: number,
  hue: number = DEFAULT_HUE,
  baseSaturation: number = DEFAULT_BASE_SATURATION,
  baseLightness: number = DEFAULT_BASE_LIGHTNESS,
  saturationDecay: number = DEFAULT_SATURATION_DECAY,
  lightnessDecay: number = DEFAULT_LIGHTNESS_DECAY,
): string {
  const s = Math.max(20, baseSaturation - depth * saturationDecay)
  const l = Math.max(10, baseLightness - depth * lightnessDecay)
  return `hsl(${hue}, ${s}%, ${l}%)`
}

/**
 * Generate stroke color for a given depth level.
 */
export function depthStrokeColor(
  depth: number,
  hue: number = DEFAULT_HUE,
  baseLightness: number = DEFAULT_BASE_LIGHTNESS,
  lightnessDecay: number = DEFAULT_LIGHTNESS_DECAY,
): string {
  const l = Math.max(20, baseLightness - depth * lightnessDecay + 15)
  return `hsl(${hue}, 50%, ${l}%)`
}

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

    const polygon = createPolygon(tile.id, tile.vertices, {
      fillColor,
      strokeColor,
      strokeWidth: 1,
      depth: tile.depth,
    })

    nodes.push(polygon)
  }

  return nodes
}
