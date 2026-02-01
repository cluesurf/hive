/**
 * Minkowski Space Operations
 *
 * Operations in 4D Minkowski space R^{3,1} for 3D hyperbolic geometry.
 * The hyperboloid model embeds H^3 as: x^2 + y^2 + z^2 - w^2 = -1, w > 0
 */

export interface Vec4 {
  x: number
  y: number
  z: number
  w: number
}

/**
 * Minkowski inner product with signature (3, 1).
 * Three positive spatial dimensions, one negative temporal dimension.
 */
export function hdot(a: Vec4, b: Vec4): number {
  return a.x * b.x + a.y * b.y + a.z * b.z - a.w * b.w
}

/**
 * Normalize a timelike vector (hdot < 0) to lie on the hyperboloid.
 * Points on the hyperboloid satisfy hdot(p, p) = -1.
 */
export function hnormalize(p: Vec4): Vec4 {
  const norm = Math.sqrt(-hdot(p, p))
  return {
    x: p.x / norm,
    y: p.y / norm,
    z: p.z / norm,
    w: p.w / norm,
  }
}

/**
 * Hyperbolic distance between two points on the hyperboloid.
 */
export function hdistance(a: Vec4, b: Vec4): number {
  return Math.acosh(Math.abs(-hdot(a, b)))
}

/**
 * Reflect a point across a hyperplane defined by normal n.
 * Returns the reflected point and whether reflection occurred.
 */
export function hreflect(
  p: Vec4,
  n: Vec4,
): { reflected: Vec4; didReflect: boolean } {
  const k = hdot(p, n)
  if (k >= 0) {
    return { reflected: p, didReflect: false }
  }
  return {
    reflected: {
      x: p.x - 2 * k * n.x,
      y: p.y - 2 * k * n.y,
      z: p.z - 2 * k * n.z,
      w: p.w - 2 * k * n.w,
    },
    didReflect: true,
  }
}

/**
 * Create a Vec4 from components.
 */
export function vec4(x: number, y: number, z: number, w: number): Vec4 {
  return { x, y, z, w }
}

/**
 * Add two Vec4.
 */
export function vadd(a: Vec4, b: Vec4): Vec4 {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
    w: a.w + b.w,
  }
}

/**
 * Subtract Vec4: a - b.
 */
export function vsub(a: Vec4, b: Vec4): Vec4 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
    w: a.w - b.w,
  }
}

/**
 * Scale a Vec4.
 */
export function vscale(v: Vec4, s: number): Vec4 {
  return {
    x: v.x * s,
    y: v.y * s,
    z: v.z * s,
    w: v.w * s,
  }
}

/**
 * Lift a point from the Poincare ball to the hyperboloid.
 * p is a 3D point with |p| < 1.
 * Returns q on the hyperboloid: q = (2p, 1+r^2) / (1-r^2)
 */
export function poincareToHyperboloid(
  px: number,
  py: number,
  pz: number,
): Vec4 {
  const r2 = px * px + py * py + pz * pz
  const denom = 1 - r2
  if (Math.abs(denom) < 1e-10) {
    // At boundary, return point at infinity direction
    return { x: px * 1e10, y: py * 1e10, z: pz * 1e10, w: 1e10 }
  }
  return {
    x: (2 * px) / denom,
    y: (2 * py) / denom,
    z: (2 * pz) / denom,
    w: (1 + r2) / denom,
  }
}

/**
 * Project from the hyperboloid to the Poincare ball.
 */
export function hyperboloidToPoincare(q: Vec4): { x: number; y: number; z: number } {
  const denom = 1 + q.w
  return {
    x: q.x / denom,
    y: q.y / denom,
    z: q.z / denom,
  }
}

/**
 * Hyperbolic linear interpolation along a geodesic.
 */
export function hlerp(a: Vec4, b: Vec4, t: number): Vec4 {
  const d = hdistance(a, b)
  if (d < 1e-10) return a

  const sinhD = Math.sinh(d)
  const wa = Math.sinh((1 - t) * d) / sinhD
  const wb = Math.sinh(t * d) / sinhD

  return hnormalize({
    x: wa * a.x + wb * b.x,
    y: wa * a.y + wb * b.y,
    z: wa * a.z + wb * b.z,
    w: wa * a.w + wb * b.w,
  })
}
