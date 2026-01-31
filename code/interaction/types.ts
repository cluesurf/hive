import type { Matrix } from '@/form/matrix'
import type { Point } from '@/form/point'

/**
 * 2D screen/canvas coordinates.
 */
export interface ScreenPoint {
  x: number
  y: number
}

/**
 * 2D disk/plane coordinates (Poincare disk, Euclidean plane, etc.)
 */
export interface DiskPoint {
  u: number
  v: number
}

/**
 * State for tracking drag interactions.
 */
export interface DragState {
  /** Whether a drag is in progress */
  active: boolean

  /** Starting screen position */
  startScreen: ScreenPoint

  /** Starting position in disk coordinates */
  startDisk: DiskPoint

  /** Current screen position */
  currentScreen: ScreenPoint

  /** Current position in disk coordinates */
  currentDisk: DiskPoint

  /** Transform at the start of this drag */
  startTransform: Matrix
}

/**
 * Navigation (drag/pan) configuration.
 */
export interface NavigationConfig {
  /** Whether drag navigation is enabled */
  enabled: boolean

  /** Sensitivity multiplier for drag movements (higher = faster) */
  dragSensitivity: number

  /** Sensitivity multiplier for momentum/throw */
  throwSensitivity: number

  /** Whether momentum/inertia is enabled after release */
  momentumEnabled: boolean

  /** Momentum decay factor (0-1, higher = more momentum) */
  momentumDecay: number

  /** Whether to invert drag direction */
  invertDrag: boolean

  /** Minimum drag distance (pixels) before registering movement */
  dragThreshold: number
}

/**
 * Tile selection configuration.
 */
export interface SelectionConfig {
  /** Whether tile selection is enabled */
  enabled: boolean

  /** Allow selecting multiple tiles */
  multiSelect: boolean

  /** Deselect all when clicking background */
  deselectOnBackground: boolean
}

/**
 * Easing function type.
 */
export type EasingFunction =
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInExpo'
  | 'easeOutExpo'
  | 'easeInOutExpo'

/**
 * Focus animation configuration.
 * Controls auto-navigation to selected tiles.
 */
export interface FocusAnimationConfig {
  /** Whether to auto-navigate when a tile is selected */
  enabled: boolean

  /** Animation duration in milliseconds */
  duration: number

  /** Easing function for the animation */
  easing: EasingFunction
}

/**
 * Rotation gesture configuration.
 */
export interface RotationConfig {
  /** Whether two-finger rotation is enabled */
  enabled: boolean

  /** Sensitivity multiplier for rotation */
  sensitivity: number
}

/**
 * Zoom configuration.
 */
export interface ZoomConfig {
  /** Whether zoom is enabled */
  enabled: boolean

  /** Minimum zoom level */
  minZoom: number

  /** Maximum zoom level */
  maxZoom: number

  /** Sensitivity multiplier for zoom gestures */
  sensitivity: number
}

/**
 * Complete tessellation interaction configuration.
 */
export interface TessellationInteractionConfig {
  navigation: NavigationConfig
  selection: SelectionConfig
  focusAnimation: FocusAnimationConfig
  rotation: RotationConfig
  zoom: ZoomConfig
}

/**
 * Default navigation configuration.
 */
export const DEFAULT_NAVIGATION_CONFIG: NavigationConfig = {
  enabled: true,
  dragSensitivity: 1.5,
  throwSensitivity: 1.0,
  momentumEnabled: false,
  momentumDecay: 0.95,
  invertDrag: false,
  dragThreshold: 2,
}

/**
 * Default selection configuration.
 */
export const DEFAULT_SELECTION_CONFIG: SelectionConfig = {
  enabled: false,
  multiSelect: false,
  deselectOnBackground: true,
}

/**
 * Default focus animation configuration.
 */
export const DEFAULT_FOCUS_ANIMATION_CONFIG: FocusAnimationConfig = {
  enabled: false,
  duration: 300,
  easing: 'easeOutCubic',
}

/**
 * Default rotation configuration.
 */
export const DEFAULT_ROTATION_CONFIG: RotationConfig = {
  enabled: false,
  sensitivity: 1.0,
}

/**
 * Default zoom configuration.
 */
export const DEFAULT_ZOOM_CONFIG: ZoomConfig = {
  enabled: false,
  minZoom: 0.5,
  maxZoom: 2.0,
  sensitivity: 1.0,
}

/**
 * Default complete interaction configuration.
 */
export const DEFAULT_TESSELLATION_INTERACTION_CONFIG: TessellationInteractionConfig =
  {
    navigation: DEFAULT_NAVIGATION_CONFIG,
    selection: DEFAULT_SELECTION_CONFIG,
    focusAnimation: DEFAULT_FOCUS_ANIMATION_CONFIG,
    rotation: DEFAULT_ROTATION_CONFIG,
    zoom: DEFAULT_ZOOM_CONFIG,
  }

/**
 * Legacy configuration for backward compatibility.
 * @deprecated Use TessellationInteractionConfig instead
 */
export interface InteractionConfig {
  /** Sensitivity multiplier for drag movements */
  sensitivity: number

  /** Whether to invert drag direction (drag to move vs drag to scroll) */
  invertDrag: boolean

  /** Minimum drag distance (pixels) before registering movement */
  dragThreshold: number

  /** Whether momentum/inertia is enabled */
  momentumEnabled: boolean

  /** Momentum decay factor (0-1, higher = more momentum) */
  momentumDecay: number
}

/**
 * Default interaction configuration (legacy).
 * @deprecated Use DEFAULT_TESSELLATION_INTERACTION_CONFIG instead
 */
export const DEFAULT_INTERACTION_CONFIG: InteractionConfig = {
  sensitivity: 1.5,
  invertDrag: false,
  dragThreshold: 2,
  momentumEnabled: false,
  momentumDecay: 0.95,
}

/**
 * Callback types for interaction events.
 */
export type TransformChangeCallback = (transform: Matrix) => void
export type InteractionStartCallback = () => void
export type InteractionEndCallback = () => void

/**
 * Tile reference for selection callbacks.
 */
export interface TileReference {
  id: string
  center: Point
}

/**
 * Selection event callbacks.
 */
export type TileSelectCallback = (tile: TileReference) => void
export type TileDeselectCallback = (tile: TileReference) => void

/**
 * Focus animation callbacks.
 */
export type FocusStartCallback = (tile: TileReference) => void
export type FocusEndCallback = (tile: TileReference) => void

/**
 * Deep partial type for nested configuration updates.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Merge a partial configuration into the defaults.
 */
export function mergeConfig(
  partial: DeepPartial<TessellationInteractionConfig>,
): TessellationInteractionConfig {
  return {
    navigation: {
      ...DEFAULT_NAVIGATION_CONFIG,
      ...partial.navigation,
    },
    selection: {
      ...DEFAULT_SELECTION_CONFIG,
      ...partial.selection,
    },
    focusAnimation: {
      ...DEFAULT_FOCUS_ANIMATION_CONFIG,
      ...partial.focusAnimation,
    },
    rotation: {
      ...DEFAULT_ROTATION_CONFIG,
      ...partial.rotation,
    },
    zoom: {
      ...DEFAULT_ZOOM_CONFIG,
      ...partial.zoom,
    },
  }
}

/**
 * Apply a partial configuration to multiple tessellations.
 */
export function applyConfigToAll<T extends { setConfig: (c: DeepPartial<TessellationInteractionConfig>) => void }>(
  tessellations: T[],
  config: DeepPartial<TessellationInteractionConfig>,
): void {
  for (const t of tessellations) {
    t.setConfig(config)
  }
}

/**
 * Interface that geometries must implement to support interaction.
 * This allows each geometry to define its own coordinate transforms
 * and translation behavior without switch statements.
 */
export interface InteractiveGeometry {
  /**
   * Convert a point in the geometry's native coordinates to disk/plane coordinates.
   * For hyperbolic: hyperboloid -> Poincare disk
   * For spherical: sphere -> stereographic projection
   * For Euclidean: identity (or simple scaling)
   */
  toDisplayCoordinates(point: Point): DiskPoint

  /**
   * Convert disk/plane coordinates back to geometry's native coordinates.
   */
  fromDisplayCoordinates(disk: DiskPoint): Point

  /**
   * Build a translation transform matrix for moving from one disk point to another.
   * The returned matrix operates in the geometry's native coordinate system.
   */
  buildTranslation(from: DiskPoint, to: DiskPoint): Matrix

  /**
   * Compose two transforms (multiply matrices).
   * Returns: a * b (apply b first, then a)
   */
  composeTransforms(a: Matrix, b: Matrix): Matrix

  /**
   * Get the identity transform for this geometry.
   */
  identityTransform(): Matrix

  /**
   * Apply a transform to a point.
   */
  applyTransform(transform: Matrix, point: Point): Point

  /**
   * Normalize a point to ensure it stays on the geometry's surface.
   * For hyperboloid: ensure x² + y² - t² = -1
   * For sphere: ensure x² + y² + z² = 1
   */
  normalizePoint(point: Point): Point
}

/**
 * View state managed by the interaction controller.
 */
export interface ViewState {
  /** Current accumulated view transform */
  transform: Matrix

  /** Velocity for momentum (in disk coordinates per frame) */
  velocity: DiskPoint

  /** Whether view is currently animating (momentum) */
  animating: boolean
}
