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
 * Configuration for an interaction controller.
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
 * Default interaction configuration.
 */
export const DEFAULT_INTERACTION_CONFIG: InteractionConfig = {
  sensitivity: 1.0,
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
