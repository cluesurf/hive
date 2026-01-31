import { Geometry } from '@/form/geometry'
import type { Point } from '@/form/point'
import type { Matrix } from '@/form/matrix'
import { identity, multiply } from '@/form/matrix'

/**
 * 3D Spherical geometry using the unit 3-sphere model.
 * Points are [x, y, z, w] on S³ where x² + y² + z² + w² = 1.
 * Uses 4x4 rotation matrices for transformations.
 */
export class Spherical3D extends Geometry {
  readonly dimension = 3
  readonly embeddingDimension = 4
  readonly curvature = 1

  origin(out?: Point): Point {
    // "North pole" of S³
    if (out) {
      out[0] = 0
      out[1] = 0
      out[2] = 0
      out[3] = 1
      return out
    }
    return [0, 0, 0, 1]
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
        out[3] = a[3] ?? 1
        return out
      }
      return [a[0] ?? 0, a[1] ?? 0, a[2] ?? 0, a[3] ?? 1]
    }

    const sinD = Math.sin(d)
    const wa = Math.sin((1 - t) * d) / sinD
    const wb = Math.sin(t * d) / sinD

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
    // Project onto unit 3-sphere
    const len = Math.sqrt(
      (p[0] ?? 0) ** 2 +
        (p[1] ?? 0) ** 2 +
        (p[2] ?? 0) ** 2 +
        (p[3] ?? 1) ** 2,
    )
    if (len < 1e-10) {
      if (out) {
        out[0] = 0
        out[1] = 0
        out[2] = 0
        out[3] = 1
        return out
      }
      return [0, 0, 0, 1]
    }

    const x = (p[0] ?? 0) / len
    const y = (p[1] ?? 0) / len
    const z = (p[2] ?? 0) / len
    const w = (p[3] ?? 1) / len

    if (out) {
      out[0] = x
      out[1] = y
      out[2] = z
      out[3] = w
      return out
    }
    return [x, y, z, w]
  }

  rotation(angle: number, axis: number = 2, out?: Matrix): Matrix {
    // 4D rotations - rotate in planes
    const c = Math.cos(angle)
    const s = Math.sin(angle)

    if (out) {
      this.setIdentity4(out)
      switch (axis) {
        case 0: // Rotation in yz-plane (around x-w)
          out[5] = c
          out[6] = -s
          out[9] = s
          out[10] = c
          break
        case 1: // Rotation in xz-plane (around y-w)
          out[0] = c
          out[2] = s
          out[8] = -s
          out[10] = c
          break
        case 2: // Rotation in xy-plane (around z-w)
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

  /**
   * Rotation in a plane defined by two basis vectors.
   */
  rotationInPlane(u: Point, v: Point, angle: number, out?: Matrix): Matrix {
    // Normalize u and v
    const uLen = Math.sqrt(
      (u[0] ?? 0) ** 2 +
        (u[1] ?? 0) ** 2 +
        (u[2] ?? 0) ** 2 +
        (u[3] ?? 0) ** 2,
    )
    const vLen = Math.sqrt(
      (v[0] ?? 0) ** 2 +
        (v[1] ?? 0) ** 2 +
        (v[2] ?? 0) ** 2 +
        (v[3] ?? 0) ** 2,
    )

    if (uLen < 1e-10 || vLen < 1e-10) {
      if (out) {
        return this.setIdentity4(out)
      }
      return identity(4)
    }

    const ux = (u[0] ?? 0) / uLen
    const uy = (u[1] ?? 0) / uLen
    const uz = (u[2] ?? 0) / uLen
    const uw = (u[3] ?? 0) / uLen

    const vx = (v[0] ?? 0) / vLen
    const vy = (v[1] ?? 0) / vLen
    const vz = (v[2] ?? 0) / vLen
    const vw = (v[3] ?? 0) / vLen

    const c = Math.cos(angle)
    const s = Math.sin(angle)
    const omc = 1 - c

    // Rotation matrix: I + sin(θ)(vu^T - uv^T) + (cos(θ)-1)(uu^T + vv^T)
    if (out) {
      out[0] = 1 + omc * (-ux * ux - vx * vx)
      out[1] = omc * (-ux * uy - vx * vy) + s * (vx * uy - ux * vy)
      out[2] = omc * (-ux * uz - vx * vz) + s * (vx * uz - ux * vz)
      out[3] = omc * (-ux * uw - vx * vw) + s * (vx * uw - ux * vw)
      out[4] = omc * (-uy * ux - vy * vx) + s * (vy * ux - uy * vx)
      out[5] = 1 + omc * (-uy * uy - vy * vy)
      out[6] = omc * (-uy * uz - vy * vz) + s * (vy * uz - uy * vz)
      out[7] = omc * (-uy * uw - vy * vw) + s * (vy * uw - uy * vw)
      out[8] = omc * (-uz * ux - vz * vx) + s * (vz * ux - uz * vx)
      out[9] = omc * (-uz * uy - vz * vy) + s * (vz * uy - uz * vy)
      out[10] = 1 + omc * (-uz * uz - vz * vz)
      out[11] = omc * (-uz * uw - vz * vw) + s * (vz * uw - uz * vw)
      out[12] = omc * (-uw * ux - vw * vx) + s * (vw * ux - uw * vx)
      out[13] = omc * (-uw * uy - vw * vy) + s * (vw * uy - uw * vy)
      out[14] = omc * (-uw * uz - vw * vz) + s * (vw * uz - uw * vz)
      out[15] = 1 + omc * (-uw * uw - vw * vw)
      return out
    }

    return [
      1 + omc * (-ux * ux - vx * vx),
      omc * (-ux * uy - vx * vy) + s * (vx * uy - ux * vy),
      omc * (-ux * uz - vx * vz) + s * (vx * uz - ux * vz),
      omc * (-ux * uw - vx * vw) + s * (vx * uw - ux * vw),
      omc * (-uy * ux - vy * vx) + s * (vy * ux - uy * vx),
      1 + omc * (-uy * uy - vy * vy),
      omc * (-uy * uz - vy * vz) + s * (vy * uz - uy * vz),
      omc * (-uy * uw - vy * vw) + s * (vy * uw - uy * vw),
      omc * (-uz * ux - vz * vx) + s * (vz * ux - uz * vx),
      omc * (-uz * uy - vz * vy) + s * (vz * uy - uz * vy),
      1 + omc * (-uz * uz - vz * vz),
      omc * (-uz * uw - vz * vw) + s * (vz * uw - uz * vw),
      omc * (-uw * ux - vw * vx) + s * (vw * ux - uw * vx),
      omc * (-uw * uy - vw * vy) + s * (vw * uy - uw * vy),
      omc * (-uw * uz - vw * vz) + s * (vw * uz - uw * vz),
      1 + omc * (-uw * uw - vw * vw),
    ]
  }

  translation(direction: Point, distance: number, out?: Matrix): Matrix {
    // On S³, translation is rotation in the plane containing the direction and w-axis
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

    // Direction in the tangent space at origin (spatial components only)
    const dx = (direction[0] ?? 0) / len
    const dy = (direction[1] ?? 0) / len
    const dz = (direction[2] ?? 0) / len

    // Rotation in the plane spanned by [dx, dy, dz, 0] and [0, 0, 0, 1]
    return this.rotationInPlane([dx, dy, dz, 0], [0, 0, 0, 1], distance, out)
  }

  reflection(normal: Point, out?: Matrix): Matrix {
    // Reflection across great 2-sphere with given normal
    const len = Math.sqrt(
      (normal[0] ?? 0) ** 2 +
        (normal[1] ?? 0) ** 2 +
        (normal[2] ?? 0) ** 2 +
        (normal[3] ?? 0) ** 2,
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
    const nw = (normal[3] ?? 0) / len

    // Householder reflection: I - 2*n*n^T
    if (out) {
      out[0] = 1 - 2 * nx * nx
      out[1] = -2 * nx * ny
      out[2] = -2 * nx * nz
      out[3] = -2 * nx * nw
      out[4] = -2 * nx * ny
      out[5] = 1 - 2 * ny * ny
      out[6] = -2 * ny * nz
      out[7] = -2 * ny * nw
      out[8] = -2 * nx * nz
      out[9] = -2 * ny * nz
      out[10] = 1 - 2 * nz * nz
      out[11] = -2 * nz * nw
      out[12] = -2 * nx * nw
      out[13] = -2 * ny * nw
      out[14] = -2 * nz * nw
      out[15] = 1 - 2 * nw * nw
      return out
    }
    return [
      1 - 2 * nx * nx,
      -2 * nx * ny,
      -2 * nx * nz,
      -2 * nx * nw,
      -2 * nx * ny,
      1 - 2 * ny * ny,
      -2 * ny * nz,
      -2 * ny * nw,
      -2 * nx * nz,
      -2 * ny * nz,
      1 - 2 * nz * nz,
      -2 * nz * nw,
      -2 * nx * nw,
      -2 * ny * nw,
      -2 * nz * nw,
      1 - 2 * nw * nw,
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
    // Great circle lies in 2D plane through origin containing a and b
    // Return a direction orthogonal to this plane in the spatial subspace
    const ax = a[0] ?? 0
    const ay = a[1] ?? 0
    const az = a[2] ?? 0
    const bx = b[0] ?? 0
    const by = b[1] ?? 0
    const bz = b[2] ?? 0

    // Cross product of spatial components
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
    // Move from origin in the direction by arc length t
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

    // Normalize direction in tangent space
    const dx = (direction[0] ?? 0) / len
    const dy = (direction[1] ?? 0) / len
    const dz = (direction[2] ?? 0) / len

    // Apply rotation in the plane containing direction and w-axis
    const m = this.rotationInPlane([dx, dy, dz, 0], [0, 0, 0, 1], t)
    return this.applyMatrix(m, origin, out)
  }

  private dot(a: Point, b: Point): number {
    return (
      (a[0] ?? 0) * (b[0] ?? 0) +
      (a[1] ?? 0) * (b[1] ?? 0) +
      (a[2] ?? 0) * (b[2] ?? 0) +
      (a[3] ?? 1) * (b[3] ?? 1)
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
