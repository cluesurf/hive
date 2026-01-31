/**
 * Utility functions for tessellation calculations.
 */

/**
 * Determines the curvature type for a {p,q} tessellation.
 * Returns: -1 (hyperbolic), 0 (Euclidean), 1 (spherical)
 */
export function getCurvatureType(p: number, q: number): number {
  const sum = (p - 2) * (q - 2)
  if (sum > 4) return -1 // Hyperbolic
  if (sum === 4) return 0 // Euclidean
  return 1 // Spherical
}

/**
 * Validates a {p,q} configuration.
 * Both p and q must be at least 3.
 */
export function validateConfig(p: number, q: number): boolean {
  return p >= 3 && q >= 3
}

/**
 * Check if a {p,q} tessellation is hyperbolic.
 */
export function isHyperbolic(p: number, q: number): boolean {
  return getCurvatureType(p, q) === -1
}

/**
 * Check if a {p,q} tessellation is Euclidean.
 */
export function isEuclidean(p: number, q: number): boolean {
  return getCurvatureType(p, q) === 0
}

/**
 * Check if a {p,q} tessellation is spherical.
 */
export function isSpherical(p: number, q: number): boolean {
  return getCurvatureType(p, q) === 1
}

/**
 * Get the defect angle for a {p,q} tessellation.
 * Negative = hyperbolic, zero = Euclidean, positive = spherical
 */
export function getDefectAngle(p: number, q: number): number {
  return Math.PI - (Math.PI * (p - 2)) / p - (2 * Math.PI) / q
}

/**
 * Get the internal angle of a regular p-gon.
 */
export function getPolygonAngle(p: number): number {
  return (Math.PI * (p - 2)) / p
}

/**
 * Get the vertex angle (angle between edges meeting at a vertex) for {p,q}.
 */
export function getVertexAngle(p: number, q: number): number {
  return (2 * Math.PI) / q
}
