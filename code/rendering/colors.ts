/**
 * Tailwind color constants for rendering.
 * All colors are from the Tailwind CSS palette.
 */

import type { Point } from '@/form/point'

// Slate
export const SLATE_400 = 'rgb(148, 163, 184)'
export const SLATE_600 = 'rgb(71, 85, 105)'
export const SLATE_700 = 'rgb(51, 65, 85)'

// Zinc
export const ZINC_950 = 'rgb(9, 9, 11)'

// Blue
export const BLUE_400 = 'rgb(96, 165, 250)'

// Default rendering colors
export const DEFAULT_BACKGROUND_COLOR = ZINC_950
export const DEFAULT_BOUNDARY_COLOR = SLATE_700
export const DEFAULT_FILL_COLOR = SLATE_700
export const DEFAULT_STROKE_COLOR = SLATE_600
export const DEFAULT_PATH_STROKE_COLOR = SLATE_400
export const DEFAULT_POINT_FILL_COLOR = BLUE_400
export const DEFAULT_TEXT_COLOR = SLATE_400
export const DEFAULT_INFO_COLOR = SLATE_400

// Default numeric values
export const DEFAULT_ZOOM = 0.9
export const DEFAULT_STROKE_WIDTH = 1
export const DEFAULT_BOUNDARY_LINE_WIDTH = 2
export const DEFAULT_POINT_RADIUS = 4
export const DEFAULT_FONT_SIZE = 14
export const DEFAULT_FONT_FAMILY = 'sans-serif'
export const DEFAULT_INFO_FONT = '14px Inter, sans-serif'

// Depth-based coloring defaults
export const DEFAULT_HUE = 220
export const DEFAULT_BASE_SATURATION = 60
export const DEFAULT_BASE_LIGHTNESS = 30
export const DEFAULT_SATURATION_DECAY = 8
export const DEFAULT_LIGHTNESS_DECAY = 4

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
  /** View center for distance-based coloring */
  viewCenter?: Point
}

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
