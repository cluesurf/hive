import { Geometry } from '@/form/geometry'
import type { Point } from '@/form/point'
import type { Matrix } from '@/form/matrix'
import {
  identity,
  applyToPoint,
  compose as composeMatrices,
} from '@/form/matrix'

/**
 * 3D Euclidean geometry.
 * Points are [x, y, z] in ℝ³.
 * Uses 4x4 homogeneous matrices for transformations.
 */
export class Euclidean3D extends Geometry {
  readonly dimension = 3
  readonly embeddingDimension = 3
  readonly curvature = 0

  origin(out?: Point): Point {
    if (out) {
      out[0] = 0
      out[1] = 0
      out[2] = 0
      return out
    }
    return [0, 0, 0]
  }

  distance(a: Point, b: Point): number {
    const dx = (b[0] ?? 0) - (a[0] ?? 0)
    const dy = (b[1] ?? 0) - (a[1] ?? 0)
    const dz = (b[2] ?? 0) - (a[2] ?? 0)
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  interpolate(a: Point, b: Point, t: number, out?: Point): Point {
    const x = (a[0] ?? 0) + t * ((b[0] ?? 0) - (a[0] ?? 0))
    const y = (a[1] ?? 0) + t * ((b[1] ?? 0) - (a[1] ?? 0))
    const z = (a[2] ?? 0) + t * ((b[2] ?? 0) - (a[2] ?? 0))
    if (out) {
      out[0] = x
      out[1] = y
      out[2] = z
      return out
    }
    return [x, y, z]
  }

  normalize(p: Point, out?: Point): Point {
    // Euclidean points don't need normalization
    if (out) {
      out[0] = p[0] ?? 0
      out[1] = p[1] ?? 0
      out[2] = p[2] ?? 0
      return out
    }
    return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0]
  }

  rotation(angle: number, axis: number = 2, out?: Matrix): Matrix {
    const c = Math.cos(angle)
    const s = Math.sin(angle)

    // 4x4 homogeneous rotation matrices
    if (out) {
      // Reset to identity first
      this.setIdentity4(out)
      switch (axis) {
        case 0: // Rotation around X axis
          out[5] = c
          out[6] = -s
          out[9] = s
          out[10] = c
          break
        case 1: // Rotation around Y axis
          out[0] = c
          out[2] = s
          out[8] = -s
          out[10] = c
          break
        case 2: // Rotation around Z axis (default)
        default:
          out[0] = c
          out[1] = -s
          out[4] = s
          out[5] = c
          break
      }
      return out
    }

    switch (axis) {
      case 0: // Rotation around X axis
        return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1]
      case 1: // Rotation around Y axis
        return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1]
      case 2: // Rotation around Z axis (default)
      default:
        return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    }
  }

  /**
   * Rotation around an arbitrary axis using Rodrigues' formula.
   */
  rotationAroundAxis(axis: Point, angle: number, out?: Matrix): Matrix {
    const len = Math.sqrt(
      (axis[0] ?? 0) ** 2 + (axis[1] ?? 0) ** 2 + (axis[2] ?? 0) ** 2,
    )
    if (len < 1e-10) {
      if (out) {
        return this.setIdentity4(out)
      }
      return identity(4)
    }

    const ux = (axis[0] ?? 0) / len
    const uy = (axis[1] ?? 0) / len
    const uz = (axis[2] ?? 0) / len

    const c = Math.cos(angle)
    const s = Math.sin(angle)
    const t = 1 - c

    if (out) {
      out[0] = t * ux * ux + c
      out[1] = t * ux * uy - s * uz
      out[2] = t * ux * uz + s * uy
      out[3] = 0
      out[4] = t * ux * uy + s * uz
      out[5] = t * uy * uy + c
      out[6] = t * uy * uz - s * ux
      out[7] = 0
      out[8] = t * ux * uz - s * uy
      out[9] = t * uy * uz + s * ux
      out[10] = t * uz * uz + c
      out[11] = 0
      out[12] = 0
      out[13] = 0
      out[14] = 0
      out[15] = 1
      return out
    }

    return [
      t * ux * ux + c,
      t * ux * uy - s * uz,
      t * ux * uz + s * uy,
      0,
      t * ux * uy + s * uz,
      t * uy * uy + c,
      t * uy * uz - s * ux,
      0,
      t * ux * uz - s * uy,
      t * uy * uz + s * ux,
      t * uz * uz + c,
      0,
      0,
      0,
      0,
      1,
    ]
  }

  translation(direction: Point, distance: number, out?: Matrix): Matrix {
    const len = Math.sqrt(
      (direction[0] ?? 0) ** 2 +
        (direction[1] ?? 0) ** 2 +
        (direction[2] ?? 0) ** 2,
    )
    if (len < 1e-10) {
      if (out) {
        return this.setIdentity4(out)
      }
      return identity(4)
    }

    const dx = ((direction[0] ?? 0) / len) * distance
    const dy = ((direction[1] ?? 0) / len) * distance
    const dz = ((direction[2] ?? 0) / len) * distance

    // 4x4 homogeneous translation matrix
    if (out) {
      this.setIdentity4(out)
      out[3] = dx
      out[7] = dy
      out[11] = dz
      return out
    }
    return [1, 0, 0, dx, 0, 1, 0, dy, 0, 0, 1, dz, 0, 0, 0, 1]
  }

  reflection(normal: Point, out?: Matrix): Matrix {
    // Normalize the normal vector
    const len = Math.sqrt(
      (normal[0] ?? 0) ** 2 +
        (normal[1] ?? 0) ** 2 +
        (normal[2] ?? 0) ** 2,
    )
    if (len < 1e-10) {
      if (out) {
        return this.setIdentity4(out)
      }
      return identity(4)
    }

    const nx = (normal[0] ?? 0) / len
    const ny = (normal[1] ?? 0) / len
    const nz = (normal[2] ?? 0) / len

    // Householder reflection: I - 2*n*n^T
    if (out) {
      out[0] = 1 - 2 * nx * nx
      out[1] = -2 * nx * ny
      out[2] = -2 * nx * nz
      out[3] = 0
      out[4] = -2 * nx * ny
      out[5] = 1 - 2 * ny * ny
      out[6] = -2 * ny * nz
      out[7] = 0
      out[8] = -2 * nx * nz
      out[9] = -2 * ny * nz
      out[10] = 1 - 2 * nz * nz
      out[11] = 0
      out[12] = 0
      out[13] = 0
      out[14] = 0
      out[15] = 1
      return out
    }
    return [
      1 - 2 * nx * nx,
      -2 * nx * ny,
      -2 * nx * nz,
      0,
      -2 * nx * ny,
      1 - 2 * ny * ny,
      -2 * ny * nz,
      0,
      -2 * nx * nz,
      -2 * ny * nz,
      1 - 2 * nz * nz,
      0,
      0,
      0,
      0,
      1,
    ]
  }

  applyMatrix(m: Matrix, p: Point, out?: Point): Point {
    // Convert to homogeneous, apply, convert back
    const h = [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, 1]
    const result = applyToPoint(m, h)
    const w = result[3] ?? 1
    const x = (result[0] ?? 0) / w
    const y = (result[1] ?? 0) / w
    const z = (result[2] ?? 0) / w
    if (out) {
      out[0] = x
      out[1] = y
      out[2] = z
      return out
    }
    return [x, y, z]
  }

  compose(...matrices: Matrix[]): Matrix {
    if (matrices.length === 0) return identity(4)
    return composeMatrices(...matrices)
  }

  geodesicThrough(a: Point, b: Point, out?: Point): Point {
    // The direction vector from a to b
    const dx = (b[0] ?? 0) - (a[0] ?? 0)
    const dy = (b[1] ?? 0) - (a[1] ?? 0)
    const dz = (b[2] ?? 0) - (a[2] ?? 0)
    if (out) {
      out[0] = dx
      out[1] = dy
      out[2] = dz
      return out
    }
    return [dx, dy, dz]
  }

  pointOnGeodesic(
    origin: Point,
    direction: Point,
    t: number,
    out?: Point,
  ): Point {
    const len = Math.sqrt(
      (direction[0] ?? 0) ** 2 +
        (direction[1] ?? 0) ** 2 +
        (direction[2] ?? 0) ** 2,
    )
    if (len < 1e-10) {
      if (out) {
        out[0] = origin[0] ?? 0
        out[1] = origin[1] ?? 0
        out[2] = origin[2] ?? 0
        return out
      }
      return [origin[0] ?? 0, origin[1] ?? 0, origin[2] ?? 0]
    }

    const x = (origin[0] ?? 0) + (t * (direction[0] ?? 0)) / len
    const y = (origin[1] ?? 0) + (t * (direction[1] ?? 0)) / len
    const z = (origin[2] ?? 0) + (t * (direction[2] ?? 0)) / len
    if (out) {
      out[0] = x
      out[1] = y
      out[2] = z
      return out
    }
    return [x, y, z]
  }

  /**
   * Cross product of two 3D vectors.
   */
  cross(a: Point, b: Point, out?: Point): Point {
    const x = (a[1] ?? 0) * (b[2] ?? 0) - (a[2] ?? 0) * (b[1] ?? 0)
    const y = (a[2] ?? 0) * (b[0] ?? 0) - (a[0] ?? 0) * (b[2] ?? 0)
    const z = (a[0] ?? 0) * (b[1] ?? 0) - (a[1] ?? 0) * (b[0] ?? 0)
    if (out) {
      out[0] = x
      out[1] = y
      out[2] = z
      return out
    }
    return [x, y, z]
  }

  /**
   * Dot product of two 3D vectors.
   */
  dot(a: Point, b: Point): number {
    return (
      (a[0] ?? 0) * (b[0] ?? 0) +
      (a[1] ?? 0) * (b[1] ?? 0) +
      (a[2] ?? 0) * (b[2] ?? 0)
    )
  }

  private setIdentity4(out: Matrix): Matrix {
    out[0] = 1
    out[1] = 0
    out[2] = 0
    out[3] = 0
    out[4] = 0
    out[5] = 1
    out[6] = 0
    out[7] = 0
    out[8] = 0
    out[9] = 0
    out[10] = 1
    out[11] = 0
    out[12] = 0
    out[13] = 0
    out[14] = 0
    out[15] = 1
    return out
  }
}
