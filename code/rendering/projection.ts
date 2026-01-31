import type { Point } from '@/form/point'

/**
 * Projection functions for converting between geometric models
 * and 2D screen coordinates.
 */

// =============================================================================
// Hyperbolic Projections (from Hyperboloid model)
// =============================================================================

/**
 * Project a point from the hyperboloid model to the Poincare disk.
 * Hyperboloid: [x, y, t] where x² + y² - t² = -1, t > 0
 * Poincare disk: [u, v] where u² + v² < 1
 */
export function hyperboloidToPoincare(
  point: Point,
  out?: [number, number],
): [number, number] {
  const x = point[0] ?? 0
  const y = point[1] ?? 0
  const t = point[2] ?? 1

  // Stereographic projection from hyperboloid to Poincare disk
  // u = x / (1 + t), v = y / (1 + t)
  const denom = 1 + t
  const u = x / denom
  const v = y / denom

  if (out) {
    out[0] = u
    out[1] = v
    return out
  }
  return [u, v]
}

/**
 * Project a point from the Poincare disk to the hyperboloid model.
 */
export function poincareToHyperboloid(
  point: [number, number],
  out?: Point,
): Point {
  const u = point[0]
  const v = point[1]
  const r2 = u * u + v * v

  // Inverse stereographic projection
  const denom = 1 - r2
  const x = (2 * u) / denom
  const y = (2 * v) / denom
  const t = (1 + r2) / denom

  if (out) {
    out[0] = x
    out[1] = y
    out[2] = t
    return out
  }
  return [x, y, t]
}

/**
 * Project a point from the hyperboloid model to the Klein disk.
 * Klein disk: [u, v] where u² + v² < 1, geodesics are straight lines
 */
export function hyperboloidToKlein(
  point: Point,
  out?: [number, number],
): [number, number] {
  const x = point[0] ?? 0
  const y = point[1] ?? 0
  const t = point[2] ?? 1

  // Central projection: u = x/t, v = y/t
  const u = x / t
  const v = y / t

  if (out) {
    out[0] = u
    out[1] = v
    return out
  }
  return [u, v]
}

/**
 * Project a point from the Klein disk to the hyperboloid model.
 */
export function kleinToHyperboloid(
  point: [number, number],
  out?: Point,
): Point {
  const u = point[0]
  const v = point[1]
  const r2 = u * u + v * v

  // Inverse central projection
  const scale = 1 / Math.sqrt(1 - r2)
  const x = u * scale
  const y = v * scale
  const t = scale

  if (out) {
    out[0] = x
    out[1] = y
    out[2] = t
    return out
  }
  return [x, y, t]
}

/**
 * Convert from Poincare disk to Klein disk.
 */
export function poincareToKlein(
  point: [number, number],
  out?: [number, number],
): [number, number] {
  const u = point[0]
  const v = point[1]
  const r2 = u * u + v * v
  const scale = 2 / (1 + r2)

  const ku = u * scale
  const kv = v * scale

  if (out) {
    out[0] = ku
    out[1] = kv
    return out
  }
  return [ku, kv]
}

/**
 * Convert from Klein disk to Poincare disk.
 */
export function kleinToPoincare(
  point: [number, number],
  out?: [number, number],
): [number, number] {
  const u = point[0]
  const v = point[1]
  const r2 = u * u + v * v
  const scale = 1 / (1 + Math.sqrt(1 - r2))

  const pu = u * scale
  const pv = v * scale

  if (out) {
    out[0] = pu
    out[1] = pv
    return out
  }
  return [pu, pv]
}

// =============================================================================
// Spherical Projections (from unit sphere S²)
// =============================================================================

/**
 * Stereographic projection from sphere to plane.
 * Projects from south pole (0, 0, -1).
 */
export function sphereToStereographic(
  point: Point,
  out?: [number, number],
): [number, number] {
  const x = point[0] ?? 0
  const y = point[1] ?? 0
  const z = point[2] ?? 1

  // Project from south pole (0, 0, -1)
  const denom = 1 + z
  if (Math.abs(denom) < 1e-10) {
    // Point near south pole, project to infinity
    if (out) {
      out[0] = Infinity
      out[1] = Infinity
      return out
    }
    return [Infinity, Infinity]
  }

  const u = x / denom
  const v = y / denom

  if (out) {
    out[0] = u
    out[1] = v
    return out
  }
  return [u, v]
}

/**
 * Orthographic projection from sphere to plane (view from z-axis).
 */
export function sphereToOrthographic(
  point: Point,
  out?: [number, number],
): [number, number] {
  const x = point[0] ?? 0
  const y = point[1] ?? 0

  if (out) {
    out[0] = x
    out[1] = y
    return out
  }
  return [x, y]
}

// =============================================================================
// Screen Coordinate Conversion
// =============================================================================

/**
 * Convert disk coordinates (-1 to 1) to canvas coordinates.
 */
export function diskToCanvas(
  point: [number, number],
  centerX: number,
  centerY: number,
  radius: number,
  out?: [number, number],
): [number, number] {
  const x = centerX + point[0] * radius
  const y = centerY - point[1] * radius // Y is flipped for canvas

  if (out) {
    out[0] = x
    out[1] = y
    return out
  }
  return [x, y]
}

/**
 * Convert canvas coordinates to disk coordinates (-1 to 1).
 */
export function canvasToDisk(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  radius: number,
  out?: [number, number],
): [number, number] {
  const u = (x - centerX) / radius
  const v = (centerY - y) / radius // Y is flipped for canvas

  if (out) {
    out[0] = u
    out[1] = v
    return out
  }
  return [u, v]
}

/**
 * Check if a disk point is inside the visible boundary.
 */
export function isInsideDisk(
  point: [number, number],
  threshold: number = 0.999,
): boolean {
  return point[0] * point[0] + point[1] * point[1] < threshold * threshold
}
