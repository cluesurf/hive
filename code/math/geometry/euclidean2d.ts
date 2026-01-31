import { Geometry } from '@/form/geometry'
import type { Point } from '@/form/point'
import type { Matrix } from '@/form/matrix'
import {
  identity,
  multiply,
  applyToPoint,
  compose as composeMatrices,
} from '@/form/matrix'

/**
 * 2D Euclidean geometry.
 * Points are [x, y] in ℝ².
 * Uses 3x3 homogeneous matrices for transformations.
 */
export class Euclidean2D extends Geometry {
  readonly dimension = 2
  readonly embeddingDimension = 2
  readonly curvature = 0

  origin(out?: Point): Point {
    if (out) {
      out[0] = 0
      out[1] = 0
      return out
    }
    return [0, 0]
  }

  distance(a: Point, b: Point): number {
    const dx = (b[0] ?? 0) - (a[0] ?? 0)
    const dy = (b[1] ?? 0) - (a[1] ?? 0)
    return Math.sqrt(dx * dx + dy * dy)
  }

  interpolate(a: Point, b: Point, t: number, out?: Point): Point {
    const x = (a[0] ?? 0) + t * ((b[0] ?? 0) - (a[0] ?? 0))
    const y = (a[1] ?? 0) + t * ((b[1] ?? 0) - (a[1] ?? 0))
    if (out) {
      out[0] = x
      out[1] = y
      return out
    }
    return [x, y]
  }

  normalize(p: Point, out?: Point): Point {
    // Euclidean points don't need normalization
    if (out) {
      out[0] = p[0] ?? 0
      out[1] = p[1] ?? 0
      return out
    }
    return [p[0] ?? 0, p[1] ?? 0]
  }

  rotation(angle: number, _axis?: number, out?: Matrix): Matrix {
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    // 3x3 homogeneous rotation matrix
    if (out) {
      out[0] = c
      out[1] = -s
      out[2] = 0
      out[3] = s
      out[4] = c
      out[5] = 0
      out[6] = 0
      out[7] = 0
      out[8] = 1
      return out
    }
    return [c, -s, 0, s, c, 0, 0, 0, 1]
  }

  translation(
    direction: Point,
    distance: number,
    out?: Matrix,
  ): Matrix {
    const len = Math.sqrt(
      (direction[0] ?? 0) ** 2 + (direction[1] ?? 0) ** 2,
    )
    if (len < 1e-10) {
      if (out) {
        return this.setIdentity3(out)
      }
      return identity(3)
    }

    const dx = ((direction[0] ?? 0) / len) * distance
    const dy = ((direction[1] ?? 0) / len) * distance

    // 3x3 homogeneous translation matrix
    if (out) {
      out[0] = 1
      out[1] = 0
      out[2] = dx
      out[3] = 0
      out[4] = 1
      out[5] = dy
      out[6] = 0
      out[7] = 0
      out[8] = 1
      return out
    }
    return [1, 0, dx, 0, 1, dy, 0, 0, 1]
  }

  reflection(normal: Point, out?: Matrix): Matrix {
    // Normalize the normal vector
    const len = Math.sqrt((normal[0] ?? 0) ** 2 + (normal[1] ?? 0) ** 2)
    if (len < 1e-10) {
      if (out) {
        return this.setIdentity3(out)
      }
      return identity(3)
    }

    const nx = (normal[0] ?? 0) / len
    const ny = (normal[1] ?? 0) / len

    // Householder reflection: I - 2*n*n^T
    if (out) {
      out[0] = 1 - 2 * nx * nx
      out[1] = -2 * nx * ny
      out[2] = 0
      out[3] = -2 * nx * ny
      out[4] = 1 - 2 * ny * ny
      out[5] = 0
      out[6] = 0
      out[7] = 0
      out[8] = 1
      return out
    }
    return [
      1 - 2 * nx * nx,
      -2 * nx * ny,
      0,
      -2 * nx * ny,
      1 - 2 * ny * ny,
      0,
      0,
      0,
      1,
    ]
  }

  applyMatrix(m: Matrix, p: Point, out?: Point): Point {
    // Convert to homogeneous, apply, convert back
    const h = [p[0] ?? 0, p[1] ?? 0, 1]
    const result = applyToPoint(m, h)
    const w = result[2] ?? 1
    const x = (result[0] ?? 0) / w
    const y = (result[1] ?? 0) / w
    if (out) {
      out[0] = x
      out[1] = y
      return out
    }
    return [x, y]
  }

  compose(...matrices: Matrix[]): Matrix {
    if (matrices.length === 0) return identity(3)
    return composeMatrices(...matrices)
  }

  geodesicThrough(a: Point, b: Point, out?: Point): Point {
    // The normal to the line through a and b
    const dx = (b[0] ?? 0) - (a[0] ?? 0)
    const dy = (b[1] ?? 0) - (a[1] ?? 0)
    // Normal is perpendicular to direction
    if (out) {
      out[0] = -dy
      out[1] = dx
      return out
    }
    return [-dy, dx]
  }

  pointOnGeodesic(
    origin: Point,
    direction: Point,
    t: number,
    out?: Point,
  ): Point {
    const len = Math.sqrt(
      (direction[0] ?? 0) ** 2 + (direction[1] ?? 0) ** 2,
    )

    if (len < 1e-10) {
      if (out) {
        out[0] = origin[0] ?? 0
        out[1] = origin[1] ?? 0
        return out
      }
      return [origin[0] ?? 0, origin[1] ?? 0]
    }

    const x = (origin[0] ?? 0) + (t * (direction[0] ?? 0)) / len
    const y = (origin[1] ?? 0) + (t * (direction[1] ?? 0)) / len
    if (out) {
      out[0] = x
      out[1] = y
      return out
    }
    return [x, y]
  }

  private setIdentity3(out: Matrix): Matrix {
    out[0] = 1
    out[1] = 0
    out[2] = 0
    out[3] = 0
    out[4] = 1
    out[5] = 0
    out[6] = 0
    out[7] = 0
    out[8] = 1
    return out
  }
}
