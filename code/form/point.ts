/**
 * A point in any geometry, represented as a number array.
 * The length depends on the embedding dimension:
 * - E²: [x, y] (length 2)
 * - E³: [x, y, z] (length 3)
 * - H²: [x, y, t] in ℝ²'¹ (length 3)
 * - H³: [x, y, z, w] in ℝ³'¹ (length 4)
 * - S²: [x, y, z] on unit sphere (length 3)
 * - S³: [x, y, z, w] on unit 3-sphere (length 4)
 */
export type Point = number[]

/**
 * Create a point from coordinates.
 */
export function point(...coords: number[]): Point {
  return coords
}

/**
 * Copy a point.
 */
export function copyPoint(p: Point): Point {
  return [...p]
}

/**
 * Check if two points are approximately equal.
 */
export function pointsEqual(
  a: Point,
  b: Point,
  epsilon = 1e-10,
): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (Math.abs((a[i] ?? 0) - (b[i] ?? 0)) > epsilon) return false
  }
  return true
}
