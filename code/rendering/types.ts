import type { Point } from '@/form/point'

/**
 * A renderable polygon with vertices and styling.
 */
export interface RenderablePolygon {
  /** Vertices in screen/canvas coordinates */
  vertices: [number, number][]

  /** Fill color (CSS color string) */
  fillColor: string

  /** Stroke color (CSS color string) */
  strokeColor: string

  /** Stroke width in pixels */
  strokeWidth: number

  /** Depth for z-ordering (lower = render first) */
  depth: number
}

/**
 * Configuration for the 2D renderer.
 */
export interface Renderer2DConfig {
  /** Canvas width in pixels */
  width: number

  /** Canvas height in pixels */
  height: number

  /** Zoom level (0.5 to 1.0 for Poincare disk) */
  zoom: number

  /** Background color */
  backgroundColor: string
}

/**
 * Projection types for 2D hyperbolic visualization.
 */
export type HyperbolicProjection = 'poincare' | 'klein' | 'halfplane'

/**
 * Projection types for spherical visualization.
 */
export type SphericalProjection = 'stereographic' | 'orthographic' | 'gnomonic'

/**
 * Color scheme generator for depth-based coloring.
 */
export interface ColorScheme {
  /** Generate fill color for a given depth */
  fill(depth: number): string

  /** Generate stroke color for a given depth */
  stroke(depth: number): string
}

/**
 * Create a HSL-based color scheme.
 */
export function createHSLColorScheme(
  hue: number,
  baseSaturation: number = 60,
  baseLightness: number = 30,
  saturationDecay: number = 8,
  lightnessDecay: number = 4,
): ColorScheme {
  return {
    fill(depth: number): string {
      const s = Math.max(20, baseSaturation - depth * saturationDecay)
      const l = Math.max(10, baseLightness - depth * lightnessDecay)
      return `hsl(${hue}, ${s}%, ${l}%)`
    },
    stroke(depth: number): string {
      const l = Math.max(20, baseLightness - depth * lightnessDecay + 15)
      return `hsl(${hue}, 50%, ${l}%)`
    },
  }
}
