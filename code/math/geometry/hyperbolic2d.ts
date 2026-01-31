import { Geometry, type GeometryType } from '@/form/geometry'
import type { Point } from '@/form/point'
import type { Matrix } from '@/form/matrix'
import { identity, multiply } from '@/form/matrix'

/**
 * 2D Hyperbolic geometry using the hyperboloid model.
 * Points are [x, y, t] in Minkowski space ℝ²'¹ where x² + y² - t² = -1, t > 0.
 * Uses 3x3 Lorentz transformation matrices.
 */
export class Hyperbolic2D extends Geometry {
  readonly dimension = 2
  readonly embeddingDimension = 3
  readonly curvature = -1

  getType(): GeometryType {
    return 'hyperbolic'
  }

  origin(out?: Point): Point {
    if (out) {
      out[0] = 0
      out[1] = 0
      out[2] = 1
      return out
    }
    return [0, 0, 1]
  }

  /**
   * Minkowski inner product: <a, b> = a.x*b.x + a.y*b.y - a.t*b.t
   */
  private minkowskiDot(a: Point, b: Point): number {
    return (
      (a[0] ?? 0) * (b[0] ?? 0) +
      (a[1] ?? 0) * (b[1] ?? 0) -
      (a[2] ?? 1) * (b[2] ?? 1)
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
        out[2] = a[2] ?? 1
        return out
      }
      return [a[0] ?? 0, a[1] ?? 0, a[2] ?? 1]
    }

    const sinhD = Math.sinh(d)
    const wa = Math.sinh((1 - t) * d) / sinhD
    const wb = Math.sinh(t * d) / sinhD

    const x = wa * (a[0] ?? 0) + wb * (b[0] ?? 0)
    const y = wa * (a[1] ?? 0) + wb * (b[1] ?? 0)
    const z = wa * (a[2] ?? 1) + wb * (b[2] ?? 1)

    if (out) {
      out[0] = x
      out[1] = y
      out[2] = z
      return out
    }
    return [x, y, z]
  }

  normalize(p: Point, out?: Point): Point {
    // Project onto hyperboloid: x² + y² - t² = -1
    const dot = this.minkowskiDot(p, p)
    const scale = 1 / Math.sqrt(Math.abs(dot))
    const t = p[2] ?? 1
    const sign = t >= 0 ? 1 : -1

    const x = sign * scale * (p[0] ?? 0)
    const y = sign * scale * (p[1] ?? 0)
    const z = sign * scale * (p[2] ?? 1)

    if (out) {
      out[0] = x
      out[1] = y
      out[2] = z
      return out
    }
    return [x, y, z]
  }

  rotation(angle: number, _axis?: number, out?: Matrix): Matrix {
    // Rotation in the xy-plane (preserves t)
    const c = Math.cos(angle)
    const s = Math.sin(angle)

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

  translation(direction: Point, distance: number, out?: Matrix): Matrix {
    // Boost (hyperbolic translation) in the direction
    const len = Math.sqrt(
      (direction[0] ?? 0) ** 2 + (direction[1] ?? 0) ** 2,
    )
    if (len < 1e-10 || distance < 1e-10) {
      if (out) {
        return this.setIdentity3(out)
      }
      return identity(3)
    }

    const ux = (direction[0] ?? 0) / len
    const uy = (direction[1] ?? 0) / len
    const coshD = Math.cosh(distance)
    const sinhD = Math.sinh(distance)

    // Lorentz boost matrix
    if (out) {
      out[0] = 1 + (coshD - 1) * ux * ux
      out[1] = (coshD - 1) * ux * uy
      out[2] = sinhD * ux
      out[3] = (coshD - 1) * ux * uy
      out[4] = 1 + (coshD - 1) * uy * uy
      out[5] = sinhD * uy
      out[6] = sinhD * ux
      out[7] = sinhD * uy
      out[8] = coshD
      return out
    }
    return [
      1 + (coshD - 1) * ux * ux,
      (coshD - 1) * ux * uy,
      sinhD * ux,
      (coshD - 1) * ux * uy,
      1 + (coshD - 1) * uy * uy,
      sinhD * uy,
      sinhD * ux,
      sinhD * uy,
      coshD,
    ]
  }

  reflection(normal: Point, out?: Matrix): Matrix {
    // Reflection across geodesic with given normal (in Minkowski space)
    const x = normal[0] ?? 0
    const y = normal[1] ?? 0
    const t = normal[2] ?? 0

    // Minkowski norm squared of the normal
    const dot = x * x + y * y - t * t

    if (Math.abs(dot) < 1e-10) {
      if (out) {
        return this.setIdentity3(out)
      }
      return identity(3)
    }

    // Minkowski space reflection: R(v) = v - 2 * <v,n>_M / <n,n>_M * n
    // where <a,b>_M = a.x*b.x + a.y*b.y - a.t*b.t
    //
    // Key: <e_x, n>_M = n.x, <e_y, n>_M = n.y, <e_t, n>_M = -n.t
    //
    // R(e_x) = e_x - (2*n.x/dot)*n = [1 - 2x²/dot, -2xy/dot, -2xt/dot]
    // R(e_y) = e_y - (2*n.y/dot)*n = [-2xy/dot, 1 - 2y²/dot, -2yt/dot]
    // R(e_t) = e_t - (2*(-n.t)/dot)*n = [2xt/dot, 2yt/dot, 1 + 2t²/dot]
    if (out) {
      out[0] = 1 - (2 * x * x) / dot
      out[1] = (-2 * x * y) / dot
      out[2] = (-2 * x * t) / dot
      out[3] = (-2 * x * y) / dot
      out[4] = 1 - (2 * y * y) / dot
      out[5] = (-2 * y * t) / dot
      out[6] = (2 * x * t) / dot
      out[7] = (2 * y * t) / dot
      out[8] = 1 + (2 * t * t) / dot
      return out
    }
    return [
      1 - (2 * x * x) / dot,
      (-2 * x * y) / dot,
      (-2 * x * t) / dot,
      (-2 * x * y) / dot,
      1 - (2 * y * y) / dot,
      (-2 * y * t) / dot,
      (2 * x * t) / dot,
      (2 * y * t) / dot,
      1 + (2 * t * t) / dot,
    ]
  }

  applyMatrix(m: Matrix, p: Point, out?: Point): Point {
    const x =
      (m[0] ?? 0) * (p[0] ?? 0) +
      (m[1] ?? 0) * (p[1] ?? 0) +
      (m[2] ?? 0) * (p[2] ?? 1)
    const y =
      (m[3] ?? 0) * (p[0] ?? 0) +
      (m[4] ?? 0) * (p[1] ?? 0) +
      (m[5] ?? 0) * (p[2] ?? 1)
    const z =
      (m[6] ?? 0) * (p[0] ?? 0) +
      (m[7] ?? 0) * (p[1] ?? 0) +
      (m[8] ?? 0) * (p[2] ?? 1)

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
    // The geodesic is the intersection of the hyperboloid with a plane through origin
    // The normal to this plane is a × b (Minkowski cross product)
    const ax = a[0] ?? 0
    const ay = a[1] ?? 0
    const at = a[2] ?? 1
    const bx = b[0] ?? 0
    const by = b[1] ?? 0
    const bt = b[2] ?? 1

    // Minkowski cross product (with sign flip for t component)
    const x = ay * bt - at * by
    const y = at * bx - ax * bt
    const z = ax * by - ay * bx

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
    // Move from origin in the direction by hyperbolic distance t
    const len = Math.sqrt(
      (direction[0] ?? 0) ** 2 + (direction[1] ?? 0) ** 2,
    )
    if (len < 1e-10) {
      if (out) {
        out[0] = origin[0] ?? 0
        out[1] = origin[1] ?? 0
        out[2] = origin[2] ?? 1
        return out
      }
      return [origin[0] ?? 0, origin[1] ?? 0, origin[2] ?? 1]
    }

    // Normalize direction to unit spatial vector
    const dx = (direction[0] ?? 0) / len
    const dy = (direction[1] ?? 0) / len

    // Create a point at distance t from origin in this direction
    // Using boost: the result is cosh(t) * origin + sinh(t) * direction_tangent
    const coshT = Math.cosh(t)
    const sinhT = Math.sinh(t)

    // The tangent vector at origin in direction [dx, dy] is [dx, dy, 0] in tangent space
    // After applying the exponential map:
    const x = coshT * (origin[0] ?? 0) + sinhT * dx * (origin[2] ?? 1)
    const y = coshT * (origin[1] ?? 0) + sinhT * dy * (origin[2] ?? 1)
    const z =
      coshT * (origin[2] ?? 1) +
      sinhT * (dx * (origin[0] ?? 0) + dy * (origin[1] ?? 0))

    if (out) {
      out[0] = x
      out[1] = y
      out[2] = z
      return out
    }
    return [x, y, z]
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
