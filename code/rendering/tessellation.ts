import type { Tessellation } from '@/tessellation/types'
import type { Tile as DynamicTile } from '@/tessellation/dynamic'
import type { Point } from '@/form/point'
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
  /** View center for distance-based coloring (for dynamic tiles) */
  viewCenter?: Point
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

/**
 * Compute hyperbolic distance between two points using Minkowski inner product.
 */
function hyperbolicDistance(a: Point, b: Point): number {
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
function distanceToDepth(distance: number, scale: number = 0.8): number {
  return Math.floor(distance / scale)
}

/**
 * Convert dynamic tiles to polygon nodes.
 * Used for rendering dynamically generated tessellations.
 * When viewCenter is provided, coloring is based on distance from viewCenter.
 */
export function dynamicTilesToNodes(
  tiles: DynamicTile[],
  options: TileStyleOptions = {},
): PolygonNode[] {
  const {
    hue = DEFAULT_HUE,
    baseSaturation = DEFAULT_BASE_SATURATION,
    baseLightness = DEFAULT_BASE_LIGHTNESS,
    saturationDecay = DEFAULT_SATURATION_DECAY,
    lightnessDecay = DEFAULT_LIGHTNESS_DECAY,
    viewCenter,
  } = options

  const nodes: PolygonNode[] = []

  for (const tile of tiles) {
    // Use distance-based depth when viewCenter is provided
    // This gives correct coloring when panning through the space
    let visualDepth: number
    if (viewCenter) {
      const dist = hyperbolicDistance(viewCenter, tile.center)
      visualDepth = distanceToDepth(dist)
    } else {
      visualDepth = tile.depth
    }

    const fillColor = depthFillColor(
      visualDepth,
      hue,
      baseSaturation,
      baseLightness,
      saturationDecay,
      lightnessDecay,
    )
    const strokeColor = depthStrokeColor(
      visualDepth,
      hue,
      baseLightness,
      lightnessDecay,
    )

    const polygon = createPolygon(tile.id, tile.vertices, {
      fillColor,
      strokeColor,
      strokeWidth: 1,
      depth: visualDepth,
      focusable: true,
      name: `Tile ${tile.id}`,
      center: tile.center,
    })

    nodes.push(polygon)
  }

  return nodes
}
