/**
 * Mobius (Gyrovector) Operations for Hyperbolic Navigation
 *
 * Operations in the Poincare ball model using Mobius addition.
 * Used for hyperbolic camera movement and navigation.
 */

export type Vec3 = [number, number, number]

/**
 * Mobius addition in the Poincare ball model.
 * This is the hyperbolic equivalent of vector addition.
 *
 * Formula: a ⊕ b = ((1 + 2<a,b> + |b|²)a + (1 - |a|²)b) / (1 + 2<a,b> + |a|²|b|²)
 */
export function mobiusAdd(a: Vec3, b: Vec3): Vec3 {
  const a2 = a[0] * a[0] + a[1] * a[1] + a[2] * a[2]
  const b2 = b[0] * b[0] + b[1] * b[1] + b[2] * b[2]
  const ab = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const denom = 1 + 2 * ab + a2 * b2

  if (Math.abs(denom) < 1e-10) {
    return a
  }

  const coefA = (1 + 2 * ab + b2) / denom
  const coefB = (1 - a2) / denom

  return [
    coefA * a[0] + coefB * b[0],
    coefA * a[1] + coefB * b[1],
    coefA * a[2] + coefB * b[2],
  ]
}

/**
 * Mobius negation: -a in the gyrovector space.
 * In the Poincare ball, this is simply the Euclidean negation.
 */
export function mobiusNeg(a: Vec3): Vec3 {
  return [-a[0], -a[1], -a[2]]
}

/**
 * Mobius subtraction: a ⊖ b = a ⊕ (-b)
 */
export function mobiusSub(a: Vec3, b: Vec3): Vec3 {
  return mobiusAdd(a, mobiusNeg(b))
}

/**
 * Gyroscalar multiplication: scale a gyrovector by a real number.
 * r ⊗ a = tanh(r * atanh(|a|)) * (a / |a|)
 */
export function mobiusScale(a: Vec3, r: number): Vec3 {
  const norm = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])
  if (norm < 1e-10) {
    return [0, 0, 0]
  }

  const atanhNorm = Math.atanh(Math.min(norm, 0.9999))
  const newNorm = Math.tanh(r * atanhNorm)

  return [
    (a[0] * newNorm) / norm,
    (a[1] * newNorm) / norm,
    (a[2] * newNorm) / norm,
  ]
}

/**
 * Hyperbolic linear interpolation in the Poincare ball.
 * Follows the geodesic from a to b.
 */
export function mobiusLerp(a: Vec3, b: Vec3, t: number): Vec3 {
  // Compute the displacement from a to b
  const aToB = mobiusAdd(mobiusNeg(a), b)

  // Scale the displacement by t
  const scaled = mobiusScale(aToB, t)

  // Add back to a
  return mobiusAdd(a, scaled)
}

/**
 * Hyperbolic distance in the Poincare ball.
 */
export function mobiusDistance(a: Vec3, b: Vec3): number {
  const diff = mobiusSub(b, a)
  const norm = Math.sqrt(diff[0] * diff[0] + diff[1] * diff[1] + diff[2] * diff[2])
  return 2 * Math.atanh(Math.min(norm, 0.9999))
}

/**
 * Vec3 length.
 */
export function vec3Length(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
}

/**
 * Vec3 normalize.
 */
export function vec3Normalize(v: Vec3): Vec3 {
  const len = vec3Length(v)
  if (len < 1e-10) return [0, 0, 0]
  return [v[0] / len, v[1] / len, v[2] / len]
}

/**
 * Vec3 dot product.
 */
export function vec3Dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

/**
 * Vec3 cross product.
 */
export function vec3Cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

/**
 * Vec3 scale.
 */
export function vec3Scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s]
}

/**
 * Vec3 add.
 */
export function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}
