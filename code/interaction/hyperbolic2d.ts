import type { Matrix } from '@/form/matrix'
import type { Point } from '@/form/point'
import type { InteractiveGeometry, DiskPoint } from './types'
import {
  hyperboloidToPoincare,
  poincareToHyperboloid,
} from '@/math/projection'

/**
 * Interactive geometry implementation for 2D hyperbolic space.
 *
 * Uses SU(1,1) representation for navigation, which is numerically stable.
 *
 * The transform is stored as SU(1,1) parameters [a_re, a_im, b_re, b_im]
 * representing the Möbius transformation:
 *   f(z) = (a*z + b) / (conj(b)*z + conj(a))
 *
 * Constraint: |a|² - |b|² = 1 (enforced via renormalization after composition)
 *
 * Key properties:
 * - View center in disk: z_center = -b/a
 * - Composition: SU(1,1) matrix multiplication
 * - Numerically stable (only one scalar constraint to maintain)
 *
 * For compatibility with Matrix type, stored as 9-element array:
 * [a_re, a_im, b_re, b_im, 0, 0, 0, 0, 1]
 */
export class Hyperbolic2DInteraction implements InteractiveGeometry {
  /**
   * Convert a hyperboloid point to Poincare disk coordinates.
   */
  toDisplayCoordinates(point: Point): DiskPoint {
    const [u, v] = hyperboloidToPoincare(point)
    return { u, v }
  }

  /**
   * Convert Poincare disk coordinates to hyperboloid point.
   */
  fromDisplayCoordinates(disk: DiskPoint): Point {
    return poincareToHyperboloid([disk.u, disk.v])
  }

  /**
   * Build an SU(1,1) translation from a drag displacement.
   *
   * A hyperbolic translation by w in the Poincaré disk is:
   *   f(z) = (z + w) / (conj(w)*z + 1)
   *
   * In SU(1,1) form:
   *   a = 1 / sqrt(1 - |w|²)
   *   b = w / sqrt(1 - |w|²)
   */
  buildTranslation(from: DiskPoint, to: DiskPoint): Matrix {
    // Compute displacement vector w
    let wRe = to.u - from.u
    let wIm = to.v - from.v

    // Scale for sensitivity (1.5x feels more responsive)
    const sensitivity = 1.5
    wRe *= sensitivity
    wIm *= sensitivity

    // Clamp |w| to stay inside the disk (max 0.5 per drag update for stability)
    const wMagSq = wRe * wRe + wIm * wIm
    const maxMag = 0.5
    if (wMagSq > maxMag * maxMag) {
      const scale = maxMag / Math.sqrt(wMagSq)
      wRe *= scale
      wIm *= scale
    }

    const wMagSqClamped = wRe * wRe + wIm * wIm
    if (wMagSqClamped < 1e-12) {
      return this.identityTransform()
    }

    // SU(1,1) parameters for translation by w
    const factor = 1 / Math.sqrt(1 - wMagSqClamped)
    const aRe = factor
    const aIm = 0
    const bRe = wRe * factor
    const bIm = wIm * factor

    return [aRe, aIm, bRe, bIm, 0, 0, 0, 0, 1]
  }

  /**
   * Compose two SU(1,1) transforms via matrix multiplication.
   *
   * For SU(1,1) matrices:
   *   [a1  b1]   [a2  b2]   [a1*a2 + b1*conj(b2)   a1*b2 + b1*conj(a2)]
   *   [b1* a1*] × [b2* a2*] = [...]
   *
   * Result: a = a1*a2 + b1*conj(b2), b = a1*b2 + b1*conj(a2)
   *
   * After composition, renormalize to ensure |a|² - |b|² = 1.
   */
  composeTransforms(t1: Matrix, t2: Matrix): Matrix {
    const a1Re = t1[0] ?? 1
    const a1Im = t1[1] ?? 0
    const b1Re = t1[2] ?? 0
    const b1Im = t1[3] ?? 0

    const a2Re = t2[0] ?? 1
    const a2Im = t2[1] ?? 0
    const b2Re = t2[2] ?? 0
    const b2Im = t2[3] ?? 0

    // a = a1*a2 + b1*conj(b2)
    // a1*a2 = (a1Re*a2Re - a1Im*a2Im) + (a1Re*a2Im + a1Im*a2Re)i
    // b1*conj(b2) = (b1Re*b2Re + b1Im*b2Im) + (-b1Re*b2Im + b1Im*b2Re)i
    const aRe = (a1Re * a2Re - a1Im * a2Im) + (b1Re * b2Re + b1Im * b2Im)
    const aIm = (a1Re * a2Im + a1Im * a2Re) + (-b1Re * b2Im + b1Im * b2Re)

    // b = a1*b2 + b1*conj(a2)
    // a1*b2 = (a1Re*b2Re - a1Im*b2Im) + (a1Re*b2Im + a1Im*b2Re)i
    // b1*conj(a2) = (b1Re*a2Re + b1Im*a2Im) + (-b1Re*a2Im + b1Im*a2Re)i
    const bRe = (a1Re * b2Re - a1Im * b2Im) + (b1Re * a2Re + b1Im * a2Im)
    const bIm = (a1Re * b2Im + a1Im * b2Re) + (-b1Re * a2Im + b1Im * a2Re)

    // Renormalize: enforce |a|² - |b|² = 1
    const aMagSq = aRe * aRe + aIm * aIm
    const bMagSq = bRe * bRe + bIm * bIm
    const det = aMagSq - bMagSq

    if (det <= 0.001) {
      // Degenerate, return identity
      return this.identityTransform()
    }

    const s = 1 / Math.sqrt(det)

    return [aRe * s, aIm * s, bRe * s, bIm * s, 0, 0, 0, 0, 1]
  }

  /**
   * Get the identity SU(1,1) transform (a=1, b=0).
   */
  identityTransform(): Matrix {
    return [1, 0, 0, 0, 0, 0, 0, 0, 1]
  }

  /**
   * Apply the SU(1,1) transform to a hyperboloid point.
   *
   * Pipeline:
   * 1. Project hyperboloid → Poincaré disk
   * 2. Apply Möbius transform: f(z) = (a*z + b) / (conj(b)*z + conj(a))
   * 3. Convert back to hyperboloid
   */
  applyTransform(transform: Matrix, point: Point): Point {
    // 1. Hyperboloid → Poincaré disk
    const [u, v] = hyperboloidToPoincare(point)

    // 2. Apply Möbius transform
    const aRe = transform[0] ?? 1
    const aIm = transform[1] ?? 0
    const bRe = transform[2] ?? 0
    const bIm = transform[3] ?? 0

    // f(z) = (a*z + b) / (conj(b)*z + conj(a))
    // z = u + v*i

    // Numerator: a*z + b
    const numRe = (aRe * u - aIm * v) + bRe
    const numIm = (aRe * v + aIm * u) + bIm

    // Denominator: conj(b)*z + conj(a) = (bRe - bIm*i)(u + v*i) + (aRe - aIm*i)
    const denRe = (bRe * u + bIm * v) + aRe
    const denIm = (bRe * v - bIm * u) - aIm

    // Complex division
    const denMagSq = denRe * denRe + denIm * denIm
    if (denMagSq < 1e-12) {
      return point // Degenerate, return original
    }

    let resultU = (numRe * denRe + numIm * denIm) / denMagSq
    let resultV = (numIm * denRe - numRe * denIm) / denMagSq

    // Clamp to disk (numerical safety)
    const rSq = resultU * resultU + resultV * resultV
    if (rSq >= 0.9999) {
      const scale = 0.999 / Math.sqrt(rSq)
      resultU *= scale
      resultV *= scale
    }

    // 3. Poincaré disk → Hyperboloid
    return poincareToHyperboloid([resultU, resultV])
  }

  /**
   * Normalize a point to ensure it lies on the hyperboloid.
   * Constraint: x² + y² - t² = -1, equivalently t² - x² - y² = 1
   */
  normalizePoint(point: Point, out?: Point): Point {
    const px = point[0] ?? 0
    const py = point[1] ?? 0
    const pt = point[2] ?? 1

    // Compute m = t² - x² - y² (should be +1 for valid hyperboloid points)
    const m = pt * pt - px * px - py * py

    // If m > 0, we can rescale to project back to hyperboloid
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
    const newT = Math.sqrt(1 + px * px + py * py)

    if (out) {
      out[0] = px
      out[1] = py
      out[2] = newT
      return out
    }
    return [px, py, newT]
  }

  /**
   * Get the view center in the Poincaré disk.
   * For SU(1,1) transform, the world point at screen center is: z = -b/a
   */
  getViewCenterDisk(transform: Matrix): DiskPoint {
    const aRe = transform[0] ?? 1
    const aIm = transform[1] ?? 0
    const bRe = transform[2] ?? 0
    const bIm = transform[3] ?? 0

    // -b/a = -(bRe + bIm*i) / (aRe + aIm*i)
    // = -(b * conj(a)) / |a|²
    const aMagSq = aRe * aRe + aIm * aIm
    if (aMagSq < 1e-12) {
      return { u: 0, v: 0 }
    }

    // -b * conj(a) = -(bRe + bIm*i)(aRe - aIm*i)
    // = -(bRe*aRe + bIm*aIm) - (-bRe*aIm + bIm*aRe)*i
    const u = -(bRe * aRe + bIm * aIm) / aMagSq
    const v = -(-bRe * aIm + bIm * aRe) / aMagSq

    return { u, v }
  }

  /**
   * Get the view center in hyperboloid coordinates.
   */
  getViewCenterHyperboloid(transform: Matrix): Point {
    const { u, v } = this.getViewCenterDisk(transform)

    // Clamp to valid disk
    const rSq = u * u + v * v
    if (rSq >= 0.9999) {
      const scale = 0.999 / Math.sqrt(rSq)
      return poincareToHyperboloid([u * scale, v * scale])
    }

    return poincareToHyperboloid([u, v])
  }
}
