import { Geometry } from '@/form/geometry'
import type { Point } from '@/form/point'
import type { Matrix } from '@/form/matrix'
import { identity, multiply } from '@/form/matrix'

/**
 * 3D Hyperbolic geometry using the hyperboloid model.
 * Points are [x, y, z, w] in Minkowski space ℝ³'¹ where x² + y² + z² - w² = -1, w > 0.
 * Uses 4x4 Lorentz transformation matrices.
 */
export class Hyperbolic3D extends Geometry {
  readonly dimension = 3
  readonly embeddingDimension = 4
  readonly curvature = -1

  origin(out?: Point): Point {
    if (out) {
      out[0] = 0
      out[1] = 0
      out[2] = 0
      out[3] = 1
      return out
    }
    return [0, 0, 0, 1]
  }

  /**
   * Minkowski inner product: <a, b> = a.x*b.x + a.y*b.y + a.z*b.z - a.w*b.w
   */
  private minkowskiDot(a: Point, b: Point): number {
    return (
      (a[0] ?? 0) * (b[0] ?? 0) +
      (a[1] ?? 0) * (b[1] ?? 0) +
      (a[2] ?? 0) * (b[2] ?? 0) -
      (a[3] ?? 1) * (b[3] ?? 1)
    )
  }

  distance(a: Point, b: Point): number {
    const dot = this.minkowskiDot(a, b)
    // Clamp to handle numerical errors (dot should be <= -1)
    return Math.acosh(Math.max(1, -dot))
  }

  interpolate(a: Point, b: Point, t: number, out?: Point): Point {
    const d = this.distance(a, b)
    if (d < 1e-10) {
      if (out) {
        out[0] = a[0] ?? 0
        out[1] = a[1] ?? 0
        out[2] = a[2] ?? 0
        out[3] = a[3] ?? 1
        return out
      }
      return [a[0] ?? 0, a[1] ?? 0, a[2] ?? 0, a[3] ?? 1]
    }

    const sinhD = Math.sinh(d)
    const wa = Math.sinh((1 - t) * d) / sinhD
    const wb = Math.sinh(t * d) / sinhD

    const x = wa * (a[0] ?? 0) + wb * (b[0] ?? 0)
    const y = wa * (a[1] ?? 0) + wb * (b[1] ?? 0)
    const z = wa * (a[2] ?? 0) + wb * (b[2] ?? 0)
    const w = wa * (a[3] ?? 1) + wb * (b[3] ?? 1)

    if (out) {
      out[0] = x
      out[1] = y
      out[2] = z
      out[3] = w
      return out
    }
    return [x, y, z, w]
  }

  normalize(p: Point, out?: Point): Point {
    // Project onto hyperboloid: x² + y² + z² - w² = -1
    const dot = this.minkowskiDot(p, p)
    const scale = 1 / Math.sqrt(Math.abs(dot))
    const w = p[3] ?? 1
    const sign = w >= 0 ? 1 : -1

    const x = sign * scale * (p[0] ?? 0)
    const y = sign * scale * (p[1] ?? 0)
    const z = sign * scale * (p[2] ?? 0)
    const wn = sign * scale * (p[3] ?? 1)

    if (out) {
      out[0] = x
      out[1] = y
      out[2] = z
      out[3] = wn
      return out
    }
    return [x, y, z, wn]
  }

  rotation(angle: number, axis: number = 2, out?: Matrix): Matrix {
    // Rotation in the spatial subspace (preserves w)
    const c = Math.cos(angle)
    const s = Math.sin(angle)

    if (out) {
      this.setIdentity4(out)
      switch (axis) {
        case 0: // Rotation around X axis (yz-plane)
          out[5] = c
          out[6] = -s
          out[9] = s
          out[10] = c
          break
        case 1: // Rotation around Y axis (xz-plane)
          out[0] = c
          out[2] = s
          out[8] = -s
          out[10] = c
          break
        case 2: // Rotation around Z axis (xy-plane)
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
      case 0:
        return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1]
      case 1:
        return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1]
      case 2:
      default:
        return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    }
  }

  translation(direction: Point, distance: number, out?: Matrix): Matrix {
    // Boost (hyperbolic translation) in the direction
    const len = Math.sqrt(
      (direction[0] ?? 0) ** 2 +
        (direction[1] ?? 0) ** 2 +
        (direction[2] ?? 0) ** 2,
    )
    if (len < 1e-10 || distance < 1e-10) {
      if (out) {
        return this.setIdentity4(out)
      }
      return identity(4)
    }

    const ux = (direction[0] ?? 0) / len
    const uy = (direction[1] ?? 0) / len
    const uz = (direction[2] ?? 0) / len
    const coshD = Math.cosh(distance)
    const sinhD = Math.sinh(distance)

    // Lorentz boost matrix in 4D
    if (out) {
      out[0] = 1 + (coshD - 1) * ux * ux
      out[1] = (coshD - 1) * ux * uy
      out[2] = (coshD - 1) * ux * uz
      out[3] = sinhD * ux
      out[4] = (coshD - 1) * ux * uy
      out[5] = 1 + (coshD - 1) * uy * uy
      out[6] = (coshD - 1) * uy * uz
      out[7] = sinhD * uy
      out[8] = (coshD - 1) * ux * uz
      out[9] = (coshD - 1) * uy * uz
      out[10] = 1 + (coshD - 1) * uz * uz
      out[11] = sinhD * uz
      out[12] = sinhD * ux
      out[13] = sinhD * uy
      out[14] = sinhD * uz
      out[15] = coshD
      return out
    }
    return [
      1 + (coshD - 1) * ux * ux,
      (coshD - 1) * ux * uy,
      (coshD - 1) * ux * uz,
      sinhD * ux,
      (coshD - 1) * ux * uy,
      1 + (coshD - 1) * uy * uy,
      (coshD - 1) * uy * uz,
      sinhD * uy,
      (coshD - 1) * ux * uz,
      (coshD - 1) * uy * uz,
      1 + (coshD - 1) * uz * uz,
      sinhD * uz,
      sinhD * ux,
      sinhD * uy,
      sinhD * uz,
      coshD,
    ]
  }

  reflection(normal: Point, out?: Matrix): Matrix {
    // Reflection across geodesic hyperplane with given normal (in Minkowski space)
    const x = normal[0] ?? 0
    const y = normal[1] ?? 0
    const z = normal[2] ?? 0
    const w = normal[3] ?? 0

    // Minkowski norm squared of the normal
    const dot = x * x + y * y + z * z - w * w

    if (Math.abs(dot) < 1e-10) {
      if (out) {
        return this.setIdentity4(out)
      }
      return identity(4)
    }

    // Householder-like reflection in Minkowski space
    if (out) {
      out[0] = 1 - (2 * x * x) / dot
      out[1] = (-2 * x * y) / dot
      out[2] = (-2 * x * z) / dot
      out[3] = (2 * x * w) / dot
      out[4] = (-2 * x * y) / dot
      out[5] = 1 - (2 * y * y) / dot
      out[6] = (-2 * y * z) / dot
      out[7] = (2 * y * w) / dot
      out[8] = (-2 * x * z) / dot
      out[9] = (-2 * y * z) / dot
      out[10] = 1 - (2 * z * z) / dot
      out[11] = (2 * z * w) / dot
      out[12] = (2 * x * w) / dot
      out[13] = (2 * y * w) / dot
      out[14] = (2 * z * w) / dot
      out[15] = 1 + (2 * w * w) / dot
      return out
    }
    return [
      1 - (2 * x * x) / dot,
      (-2 * x * y) / dot,
      (-2 * x * z) / dot,
      (2 * x * w) / dot,
      (-2 * x * y) / dot,
      1 - (2 * y * y) / dot,
      (-2 * y * z) / dot,
      (2 * y * w) / dot,
      (-2 * x * z) / dot,
      (-2 * y * z) / dot,
      1 - (2 * z * z) / dot,
      (2 * z * w) / dot,
      (2 * x * w) / dot,
      (2 * y * w) / dot,
      (2 * z * w) / dot,
      1 + (2 * w * w) / dot,
    ]
  }

  applyMatrix(m: Matrix, p: Point, out?: Point): Point {
    const x =
      (m[0] ?? 0) * (p[0] ?? 0) +
      (m[1] ?? 0) * (p[1] ?? 0) +
      (m[2] ?? 0) * (p[2] ?? 0) +
      (m[3] ?? 0) * (p[3] ?? 1)
    const y =
      (m[4] ?? 0) * (p[0] ?? 0) +
      (m[5] ?? 0) * (p[1] ?? 0) +
      (m[6] ?? 0) * (p[2] ?? 0) +
      (m[7] ?? 0) * (p[3] ?? 1)
    const z =
      (m[8] ?? 0) * (p[0] ?? 0) +
      (m[9] ?? 0) * (p[1] ?? 0) +
      (m[10] ?? 0) * (p[2] ?? 0) +
      (m[11] ?? 0) * (p[3] ?? 1)
    const w =
      (m[12] ?? 0) * (p[0] ?? 0) +
      (m[13] ?? 0) * (p[1] ?? 0) +
      (m[14] ?? 0) * (p[2] ?? 0) +
      (m[15] ?? 0) * (p[3] ?? 1)

    if (out) {
      out[0] = x
      out[1] = y
      out[2] = z
      out[3] = w
      return out
    }
    return [x, y, z, w]
  }

  compose(...matrices: Matrix[]): Matrix {
    if (matrices.length === 0) return identity(4)
    let result = matrices[0]!
    for (let i = 1; i < matrices.length; i++) {
      result = multiply(result, matrices[i]!)
    }
    return result
  }

  geodesicThrough(a: Point, b: Point, out?: Point): Point {
    // The geodesic lies in a 2D plane through origin
    // Return the normal to this plane (simplified for 3D case)
    // This returns a direction in the spatial subspace
    const ax = a[0] ?? 0
    const ay = a[1] ?? 0
    const az = a[2] ?? 0
    const bx = b[0] ?? 0
    const by = b[1] ?? 0
    const bz = b[2] ?? 0

    // Cross product of spatial components gives direction perpendicular to geodesic
    const x = ay * bz - az * by
    const y = az * bx - ax * bz
    const z = ax * by - ay * bx

    if (out) {
      out[0] = x
      out[1] = y
      out[2] = z
      out[3] = 0
      return out
    }
    return [x, y, z, 0]
  }

  pointOnGeodesic(
    origin: Point,
    direction: Point,
    t: number,
    out?: Point,
  ): Point {
    // Move from origin in the direction by hyperbolic distance t
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
        out[3] = origin[3] ?? 1
        return out
      }
      return [origin[0] ?? 0, origin[1] ?? 0, origin[2] ?? 0, origin[3] ?? 1]
    }

    // Normalize direction to unit spatial vector
    const dx = (direction[0] ?? 0) / len
    const dy = (direction[1] ?? 0) / len
    const dz = (direction[2] ?? 0) / len

    const coshT = Math.cosh(t)
    const sinhT = Math.sinh(t)

    // Exponential map in hyperbolic space
    const ox = origin[0] ?? 0
    const oy = origin[1] ?? 0
    const oz = origin[2] ?? 0
    const ow = origin[3] ?? 1

    const spatialDot = dx * ox + dy * oy + dz * oz

    const x = coshT * ox + sinhT * dx * ow
    const y = coshT * oy + sinhT * dy * ow
    const z = coshT * oz + sinhT * dz * ow
    const w = coshT * ow + sinhT * spatialDot

    if (out) {
      out[0] = x
      out[1] = y
      out[2] = z
      out[3] = w
      return out
    }
    return [x, y, z, w]
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
