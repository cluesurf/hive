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
    // Equivalently: t² - x² - y² = 1
    // For valid points, m = t² - x² - y² should be near 1
    const px = p[0] ?? 0
    const py = p[1] ?? 0
    const pt = p[2] ?? 1

    // Compute m = t² - x² - y² (should be +1 for valid hyperboloid points)
    const m = pt * pt - px * px - py * py

    // If m > 0, we can rescale to project back to hyperboloid
    // If m <= 0, the point has drifted too far - use safe fallback
    if (m > 1e-10) {
      const scale = 1 / Math.sqrt(m)
      const sign = pt >= 0 ? 1 : -1

      const x = sign * scale * px
      const y = sign * scale * py
      const z = sign * scale * pt

      if (out) {
        out[0] = x
        out[1] = y
        out[2] = z
        return out
      }
      return [x, y, z]
    }

    // Fallback: keep x, y and recompute t to satisfy t² = 1 + x² + y²
    // This is the safest projection when the point has drifted
    const newT = Math.sqrt(1 + px * px + py * py)

    if (out) {
      out[0] = px
      out[1] = py
      out[2] = newT
      return out
    }
    return [px, py, newT]
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
    // The normal should be spacelike: ⟨n,n⟩_M > 0
    const x = normal[0] ?? 0
    const y = normal[1] ?? 0
    const t = normal[2] ?? 0

    // Minkowski norm squared of the normal: ⟨n,n⟩_M = n.x² + n.y² - n.t²
    // For a valid geodesic normal, this should be positive (spacelike)
    const dot = x * x + y * y - t * t

    if (dot < 1e-10) {
      // Normal is not spacelike (lightlike or timelike), cannot reflect
      // This indicates an error in the geodesic normal computation
      if (out) {
        return this.setIdentity3(out)
      }
      return identity(3)
    }

    // Minkowski space reflection: R(v) = v - 2 * ⟨v,n⟩_M / ⟨n,n⟩_M * n
    // where ⟨a,b⟩_M = a.x*b.x + a.y*b.y - a.t*b.t
    //
    // Key: ⟨e_x, n⟩_M = n.x, ⟨e_y, n⟩_M = n.y, ⟨e_t, n⟩_M = -n.t
    //
    // R(e_x) = e_x - (2*n.x/dot)*n = (1 - 2x²/dot, -2xy/dot, -2xt/dot)
    // R(e_y) = e_y - (2*n.y/dot)*n = (-2xy/dot, 1 - 2y²/dot, -2yt/dot)
    // R(e_t) = e_t + (2*n.t/dot)*n = (2xt/dot, 2yt/dot, 1 + 2t²/dot)
    //
    // Matrix in row-major order: row i contains [R(e_x)[i], R(e_y)[i], R(e_t)[i]]
    if (out) {
      out[0] = 1 - (2 * x * x) / dot  // R(e_x).x
      out[1] = (-2 * x * y) / dot     // R(e_y).x
      out[2] = (2 * x * t) / dot      // R(e_t).x
      out[3] = (-2 * x * y) / dot     // R(e_x).y
      out[4] = 1 - (2 * y * y) / dot  // R(e_y).y
      out[5] = (2 * y * t) / dot      // R(e_t).y
      out[6] = (-2 * x * t) / dot     // R(e_x).t
      out[7] = (-2 * y * t) / dot     // R(e_y).t
      out[8] = 1 + (2 * t * t) / dot  // R(e_t).t
      return out
    }
    return [
      1 - (2 * x * x) / dot,  // R(e_x).x
      (-2 * x * y) / dot,     // R(e_y).x
      (2 * x * t) / dot,      // R(e_t).x
      (-2 * x * y) / dot,     // R(e_x).y
      1 - (2 * y * y) / dot,  // R(e_y).y
      (2 * y * t) / dot,      // R(e_t).y
      (-2 * x * t) / dot,     // R(e_x).t
      (-2 * y * t) / dot,     // R(e_y).t
      1 + (2 * t * t) / dot,  // R(e_t).t
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
    // The geodesic is the intersection of the hyperboloid with a plane through origin.
    // We need a normal n that is Minkowski-orthogonal to both a and b:
    //   ⟨n, a⟩_M = n.x*a.x + n.y*a.y - n.t*a.t = 0
    //   ⟨n, b⟩_M = n.x*b.x + n.y*b.y - n.t*b.t = 0
    //
    // This is equivalent to the Euclidean cross product of:
    //   a' = (a.x, a.y, -a.t)
    //   b' = (b.x, b.y, -b.t)
    //
    // n = a' × b' gives us a spacelike vector (⟨n,n⟩_M > 0) when a,b are on hyperboloid
    const ax = a[0] ?? 0
    const ay = a[1] ?? 0
    const at = a[2] ?? 1
    const bx = b[0] ?? 0
    const by = b[1] ?? 0
    const bt = b[2] ?? 1

    // Cross product of (ax, ay, -at) × (bx, by, -bt):
    // x = ay*(-bt) - (-at)*by = -ay*bt + at*by = at*by - ay*bt
    // y = (-at)*bx - ax*(-bt) = -at*bx + ax*bt = ax*bt - at*bx
    // z = ax*by - ay*bx
    const x = at * by - ay * bt
    const y = ax * bt - at * bx
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
