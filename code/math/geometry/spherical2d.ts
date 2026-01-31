import { Geometry } from '@/form/geometry'
import type { Point } from '@/form/point'
import type { Matrix } from '@/form/matrix'
import { identity, multiply } from '@/form/matrix'

/**
 * 2D Spherical geometry using the unit sphere model.
 * Points are [x, y, z] on S² where x² + y² + z² = 1.
 * Uses 3x3 rotation matrices for transformations.
 */
export class Spherical2D extends Geometry {
  readonly dimension = 2
  readonly embeddingDimension = 3
  readonly curvature = 1

  origin(out?: Point): Point {
    // North pole
    if (out) {
      out[0] = 0
      out[1] = 0
      out[2] = 1
      return out
    }
    return [0, 0, 1]
  }

  distance(a: Point, b: Point): number {
    // Great circle distance: arccos(a · b)
    const dot = this.dot(a, b)
    // Clamp to [-1, 1] for numerical stability
    return Math.acos(Math.max(-1, Math.min(1, dot)))
  }

  interpolate(a: Point, b: Point, t: number, out?: Point): Point {
    // Spherical linear interpolation (slerp)
    const d = this.distance(a, b)
    if (d < 1e-10) {
      if (out) {
        out[0] = a[0] ?? 0
        out[1] = a[1] ?? 0
        out[2] = a[2] ?? 0
        return out
      }
      return [a[0] ?? 0, a[1] ?? 0, a[2] ?? 0]
    }

    const sinD = Math.sin(d)
    const wa = Math.sin((1 - t) * d) / sinD
    const wb = Math.sin(t * d) / sinD

    const x = wa * (a[0] ?? 0) + wb * (b[0] ?? 0)
    const y = wa * (a[1] ?? 0) + wb * (b[1] ?? 0)
    const z = wa * (a[2] ?? 0) + wb * (b[2] ?? 0)

    if (out) {
      out[0] = x
      out[1] = y
      out[2] = z
      return out
    }
    return [x, y, z]
  }

  normalize(p: Point, out?: Point): Point {
    // Project onto unit sphere
    const len = Math.sqrt(
      (p[0] ?? 0) ** 2 + (p[1] ?? 0) ** 2 + (p[2] ?? 0) ** 2,
    )
    if (len < 1e-10) {
      if (out) {
        out[0] = 0
        out[1] = 0
        out[2] = 1
        return out
      }
      return [0, 0, 1]
    }

    const x = (p[0] ?? 0) / len
    const y = (p[1] ?? 0) / len
    const z = (p[2] ?? 0) / len

    if (out) {
      out[0] = x
      out[1] = y
      out[2] = z
      return out
    }
    return [x, y, z]
  }

  rotation(angle: number, axis: number = 2, out?: Matrix): Matrix {
    const c = Math.cos(angle)
    const s = Math.sin(angle)

    if (out) {
      this.setIdentity3(out)
      switch (axis) {
        case 0: // Rotation around X axis
          out[4] = c
          out[5] = -s
          out[7] = s
          out[8] = c
          break
        case 1: // Rotation around Y axis
          out[0] = c
          out[2] = s
          out[6] = -s
          out[8] = c
          break
        case 2: // Rotation around Z axis (default)
        default:
          out[0] = c
          out[1] = -s
          out[3] = s
          out[4] = c
          break
      }
      return out
    }

    switch (axis) {
      case 0: // Rotation around X axis
        return [1, 0, 0, 0, c, -s, 0, s, c]
      case 1: // Rotation around Y axis
        return [c, 0, s, 0, 1, 0, -s, 0, c]
      case 2: // Rotation around Z axis (default)
      default:
        return [c, -s, 0, s, c, 0, 0, 0, 1]
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
        return this.setIdentity3(out)
      }
      return identity(3)
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
      out[3] = t * ux * uy + s * uz
      out[4] = t * uy * uy + c
      out[5] = t * uy * uz - s * ux
      out[6] = t * ux * uz - s * uy
      out[7] = t * uy * uz + s * ux
      out[8] = t * uz * uz + c
      return out
    }

    return [
      t * ux * ux + c,
      t * ux * uy - s * uz,
      t * ux * uz + s * uy,
      t * ux * uy + s * uz,
      t * uy * uy + c,
      t * uy * uz - s * ux,
      t * ux * uz - s * uy,
      t * uy * uz + s * ux,
      t * uz * uz + c,
    ]
  }

  translation(
    direction: Point,
    distance: number,
    out?: Matrix,
  ): Matrix {
    // On the sphere, translation is rotation around the perpendicular axis
    const len = Math.sqrt(
      (direction[0] ?? 0) ** 2 + (direction[1] ?? 0) ** 2,
    )

    if (len < 1e-10 || distance < 1e-10) {
      if (out) {
        return this.setIdentity3(out)
      }
      return identity(3)
    }

    // Direction in the tangent plane at north pole
    const dx = (direction[0] ?? 0) / len
    const dy = (direction[1] ?? 0) / len

    // Axis of rotation is perpendicular to direction: [-dy, dx, 0]
    return this.rotationAroundAxis([-dy, dx, 0], distance, out)
  }

  reflection(normal: Point, out?: Matrix): Matrix {
    // Reflection across great circle with given normal
    const len = Math.sqrt(
      (normal[0] ?? 0) ** 2 +
        (normal[1] ?? 0) ** 2 +
        (normal[2] ?? 0) ** 2,
    )
    if (len < 1e-10) {
      if (out) {
        return this.setIdentity3(out)
      }
      return identity(3)
    }

    const nx = (normal[0] ?? 0) / len
    const ny = (normal[1] ?? 0) / len
    const nz = (normal[2] ?? 0) / len

    // Householder reflection: I - 2*n*n^T
    if (out) {
      out[0] = 1 - 2 * nx * nx
      out[1] = -2 * nx * ny
      out[2] = -2 * nx * nz
      out[3] = -2 * nx * ny
      out[4] = 1 - 2 * ny * ny
      out[5] = -2 * ny * nz
      out[6] = -2 * nx * nz
      out[7] = -2 * ny * nz
      out[8] = 1 - 2 * nz * nz
      return out
    }
    return [
      1 - 2 * nx * nx,
      -2 * nx * ny,
      -2 * nx * nz,
      -2 * nx * ny,
      1 - 2 * ny * ny,
      -2 * ny * nz,
      -2 * nx * nz,
      -2 * ny * nz,
      1 - 2 * nz * nz,
    ]
  }

  applyMatrix(m: Matrix, p: Point, out?: Point): Point {
    const x =
      (m[0] ?? 0) * (p[0] ?? 0) +
      (m[1] ?? 0) * (p[1] ?? 0) +
      (m[2] ?? 0) * (p[2] ?? 0)
    const y =
      (m[3] ?? 0) * (p[0] ?? 0) +
      (m[4] ?? 0) * (p[1] ?? 0) +
      (m[5] ?? 0) * (p[2] ?? 0)
    const z =
      (m[6] ?? 0) * (p[0] ?? 0) +
      (m[7] ?? 0) * (p[1] ?? 0) +
      (m[8] ?? 0) * (p[2] ?? 0)

    if (out) {
      out[0] = x
      out[1] = y
      out[2] = z
      return out
    }
    return [x, y, z]
  }

  compose(...matrices: Matrix[]): Matrix {
    if (matrices.length === 0) return identity(3)
    let result = matrices[0]!
    for (let i = 1; i < matrices.length; i++) {
      result = multiply(result, matrices[i]!)
    }
    return result
  }

  geodesicThrough(a: Point, b: Point, out?: Point): Point {
    // Great circle normal: a × b
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

  pointOnGeodesic(
    origin: Point,
    direction: Point,
    t: number,
    out?: Point,
  ): Point {
    // Move from origin in the direction by arc length t
    const len = Math.sqrt(
      (direction[0] ?? 0) ** 2 + (direction[1] ?? 0) ** 2,
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

    // Normalize direction in tangent plane
    const dx = (direction[0] ?? 0) / len
    const dy = (direction[1] ?? 0) / len

    // Axis of rotation is perpendicular to direction
    const m = this.rotationAroundAxis([-dy, dx, 0], t)
    return this.applyMatrix(m, origin, out)
  }

  private dot(a: Point, b: Point): number {
    return (
      (a[0] ?? 0) * (b[0] ?? 0) +
      (a[1] ?? 0) * (b[1] ?? 0) +
      (a[2] ?? 0) * (b[2] ?? 0)
    )
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
