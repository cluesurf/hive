import type { Matrix } from '@/form/matrix'
import type { Point } from '@/form/point'
import { identity, multiply } from '@/form/matrix'
import type { InteractiveGeometry, DiskPoint } from './types'
import {
  hyperboloidToPoincare,
  poincareToHyperboloid,
} from '@/math/projection'

/**
 * Interactive geometry implementation for 2D hyperbolic space.
 *
 * Uses the hyperboloid model internally and Poincare disk for display.
 * Translations are Lorentz boosts in Minkowski space.
 */
export class Hyperbolic2DInteraction implements InteractiveGeometry {
  /**
   * Convert a hyperboloid point to Poincare disk coordinates.
   */
  toDisplayCoordinates(point: Point): DiskPoint {
    const [u, v] = hyperboloidToPoincare(point)
    return { u, v }
  }

  /**
   * Convert Poincare disk coordinates to hyperboloid point.
   */
  fromDisplayCoordinates(disk: DiskPoint): Point {
    return poincareToHyperboloid([disk.u, disk.v])
  }

  /**
   * Build a Lorentz boost matrix that translates from one disk point to another.
   *
   * The boost moves the "from" point toward the origin and the origin toward "to".
   * This creates the effect of panning the view.
   */
  buildTranslation(from: DiskPoint, to: DiskPoint): Matrix {
    // Compute the displacement in the Poincare disk
    const du = to.u - from.u
    const dv = to.v - from.v

    const euclideanDist = Math.sqrt(du * du + dv * dv)

    if (euclideanDist < 1e-10) {
      return identity(3)
    }

    // Direction unit vector
    const ux = du / euclideanDist
    const uy = dv / euclideanDist

    // Convert Euclidean distance in Poincare disk to hyperbolic distance
    // For small distances: hyperbolicDist ≈ 2 * atanh(euclideanDist)
    // But we need to be careful near the boundary
    const clampedDist = Math.min(euclideanDist, 0.99)
    const hyperbolicDist = 2 * Math.atanh(clampedDist)

    // Scale by sensitivity (smaller movements feel better)
    const scaledDist = hyperbolicDist * 0.5

    // Build Lorentz boost matrix
    return this.buildBoostMatrix(ux, uy, scaledDist)
  }

  /**
   * Build a Lorentz boost matrix for translation in direction (ux, uy)
   * by hyperbolic distance d.
   *
   * The boost matrix in Minkowski space ℝ²'¹ is:
   *
   * | 1 + (cosh(d)-1)*ux²    (cosh(d)-1)*ux*uy     sinh(d)*ux |
   * | (cosh(d)-1)*ux*uy      1 + (cosh(d)-1)*uy²   sinh(d)*uy |
   * | sinh(d)*ux             sinh(d)*uy            cosh(d)    |
   */
  private buildBoostMatrix(ux: number, uy: number, d: number): Matrix {
    const coshD = Math.cosh(d)
    const sinhD = Math.sinh(d)
    const coshM1 = coshD - 1 // cosh(d) - 1

    return [
      1 + coshM1 * ux * ux,
      coshM1 * ux * uy,
      sinhD * ux,
      coshM1 * ux * uy,
      1 + coshM1 * uy * uy,
      sinhD * uy,
      sinhD * ux,
      sinhD * uy,
      coshD,
    ]
  }

  /**
   * Compose two transforms by matrix multiplication.
   */
  composeTransforms(a: Matrix, b: Matrix): Matrix {
    return multiply(a, b)
  }

  /**
   * Get the identity transform (3x3 identity matrix).
   */
  identityTransform(): Matrix {
    return identity(3)
  }

  /**
   * Apply a transform matrix to a hyperboloid point.
   */
  applyTransform(transform: Matrix, point: Point): Point {
    const x = point[0] ?? 0
    const y = point[1] ?? 0
    const t = point[2] ?? 1

    const m = transform
    return [
      (m[0] ?? 0) * x + (m[1] ?? 0) * y + (m[2] ?? 0) * t,
      (m[3] ?? 0) * x + (m[4] ?? 0) * y + (m[5] ?? 0) * t,
      (m[6] ?? 0) * x + (m[7] ?? 0) * y + (m[8] ?? 0) * t,
    ]
  }

  /**
   * Normalize a point to ensure it lies on the hyperboloid.
   * The hyperboloid constraint is: x² + y² - t² = -1
   */
  normalizePoint(point: Point): Point {
    const x = point[0] ?? 0
    const y = point[1] ?? 0
    const t = point[2] ?? 1

    // Compute Minkowski norm squared: x² + y² - t²
    const dot = x * x + y * y - t * t

    // Should be -1 for points on the hyperboloid
    const scale = 1 / Math.sqrt(Math.abs(dot))

    // Ensure t > 0 (upper sheet)
    const sign = t >= 0 ? 1 : -1

    return [sign * scale * x, sign * scale * y, sign * scale * t]
  }
}
