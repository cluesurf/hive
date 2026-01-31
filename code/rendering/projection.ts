/**
 * Screen coordinate conversion functions for rendering.
 * For geometric model projections, use @/math/projection.
 */

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
