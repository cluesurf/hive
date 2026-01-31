import type { Point } from './point'
import type { Matrix } from './matrix'

/**
 * Geometry type identifier.
 */
export type GeometryType = 'euclidean' | 'hyperbolic' | 'spherical'

/**
 * Abstract base class for all geometries.
 * Implementations provide specific math for hyperbolic, Euclidean, or spherical space.
 *
 * Methods that return matrices/points accept an optional `out` parameter to
 * avoid allocation. If `out` is provided, results are written there. Otherwise,
 * a new array is allocated. This follows the gl-matrix convention.
 */
export abstract class Geometry {
  /** The intrinsic dimension (2 for surfaces, 3 for 3D space) */
  abstract readonly dimension: number

  /** The embedding dimension (dimension + 1 for curved spaces) */
  abstract readonly embeddingDimension: number

  /** Curvature: -1 for hyperbolic, 0 for Euclidean, 1 for spherical */
  abstract readonly curvature: number

  /** Get the type identifier for this geometry */
  abstract getType(): GeometryType

  /** Get the origin point of this geometry */
  abstract origin(out?: Point): Point

  /** Compute the geodesic distance between two points */
  abstract distance(a: Point, b: Point): number

  /**
   * Interpolate between two points along a geodesic.
   * t=0 returns a, t=1 returns b.
   */
  abstract interpolate(
    a: Point,
    b: Point,
    t: number,
    out?: Point,
  ): Point

  /** Normalize a point to lie on the model surface */
  abstract normalize(p: Point, out?: Point): Point

  /**
   * Create a rotation matrix.
   * For 2D: axis is ignored, angle is the rotation amount.
   * For 3D: axis specifies which plane to rotate in.
   */
  abstract rotation(angle: number, axis?: number, out?: Matrix): Matrix

  /**
   * Create a translation matrix that moves points in the given direction
   * by the specified distance.
   */
  abstract translation(
    direction: Point,
    distance: number,
    out?: Matrix,
  ): Matrix

  /**
   * Create a reflection matrix across a geodesic/plane defined by its normal.
   */
  abstract reflection(normal: Point, out?: Matrix): Matrix

  /** Apply a transformation matrix to a point */
  abstract applyMatrix(m: Matrix, p: Point, out?: Point): Point

  /**
   * Compose multiple transformation matrices.
   * Returns a matrix representing all transformations applied in order.
   */
  abstract compose(...matrices: Matrix[]): Matrix

  /**
   * Get the geodesic (line/great circle) through two points.
   * Returns the normal vector defining the geodesic.
   */
  abstract geodesicThrough(a: Point, b: Point, out?: Point): Point

  /**
   * Get a point on the geodesic starting at origin in the given direction,
   * at parameter t (which may represent arc length or other parameterization).
   */
  abstract pointOnGeodesic(
    origin: Point,
    direction: Point,
    t: number,
    out?: Point,
  ): Point
}
