import { describe, it, expect } from 'vitest'
import { Hyperbolic2D } from './hyperbolic2d'
import { pointsEqual } from '@/form/point'

describe('Hyperbolic2D', () => {
  const geom = new Hyperbolic2D()

  describe('properties', () => {
    it('has correct dimension', () => {
      expect(geom.dimension).toBe(2)
    })

    it('has correct embedding dimension', () => {
      expect(geom.embeddingDimension).toBe(3)
    })

    it('has negative curvature', () => {
      expect(geom.curvature).toBe(-1)
    })
  })

  describe('origin', () => {
    it('returns [0, 0, 1] (apex of hyperboloid)', () => {
      expect(geom.origin()).toEqual([0, 0, 1])
    })

    it('satisfies hyperboloid equation', () => {
      const o = geom.origin()
      // x² + y² - t² = -1
      const result =
        (o[0] ?? 0) ** 2 + (o[1] ?? 0) ** 2 - (o[2] ?? 1) ** 2
      expect(Math.abs(result + 1)).toBeLessThan(1e-10)
    })
  })

  describe('distance', () => {
    it('returns 0 for same point', () => {
      const p = geom.origin()
      expect(geom.distance(p, p)).toBe(0)
    })

    it('is symmetric', () => {
      const a = geom.origin()
      const b = geom.pointOnGeodesic(a, [1, 0], 2)
      expect(Math.abs(geom.distance(a, b) - geom.distance(b, a))).toBeLessThan(
        1e-10,
      )
    })

    it('satisfies triangle inequality', () => {
      const a = geom.origin()
      const b = geom.pointOnGeodesic(a, [1, 0], 1)
      const c = geom.pointOnGeodesic(a, [0, 1], 1)

      const ab = geom.distance(a, b)
      const bc = geom.distance(b, c)
      const ac = geom.distance(a, c)

      expect(ac).toBeLessThanOrEqual(ab + bc + 1e-10)
    })
  })

  describe('interpolate', () => {
    it('returns start at t=0', () => {
      const a = geom.origin()
      const b = geom.pointOnGeodesic(a, [1, 0], 2)
      const result = geom.interpolate(a, b, 0)
      expect(pointsEqual(result, a, 1e-10)).toBe(true)
    })

    it('returns end at t=1', () => {
      const a = geom.origin()
      const b = geom.pointOnGeodesic(a, [1, 0], 2)
      const result = geom.interpolate(a, b, 1)
      expect(pointsEqual(result, b, 1e-10)).toBe(true)
    })

    it('returns midpoint at t=0.5', () => {
      const a = geom.origin()
      const b = geom.pointOnGeodesic(a, [1, 0], 2)
      const mid = geom.interpolate(a, b, 0.5)

      // Midpoint should be equidistant from both ends
      const da = geom.distance(a, mid)
      const db = geom.distance(mid, b)
      expect(Math.abs(da - db)).toBeLessThan(1e-10)
    })

    it('result lies on hyperboloid', () => {
      const a = geom.origin()
      const b = geom.pointOnGeodesic(a, [1, 0], 2)
      const mid = geom.interpolate(a, b, 0.5)

      // Check hyperboloid constraint: x² + y² - t² = -1
      const result =
        (mid[0] ?? 0) ** 2 + (mid[1] ?? 0) ** 2 - (mid[2] ?? 1) ** 2
      expect(Math.abs(result + 1)).toBeLessThan(1e-10)
    })
  })

  describe('normalize', () => {
    it('projects point to hyperboloid', () => {
      const p = [1, 1, 3] // Not on hyperboloid
      const n = geom.normalize(p)

      // Check hyperboloid constraint
      const result =
        (n[0] ?? 0) ** 2 + (n[1] ?? 0) ** 2 - (n[2] ?? 1) ** 2
      expect(Math.abs(result + 1)).toBeLessThan(1e-10)
    })

    it('preserves points already on hyperboloid', () => {
      const p = geom.origin()
      const n = geom.normalize(p)
      expect(pointsEqual(n, p, 1e-10)).toBe(true)
    })
  })

  describe('rotation', () => {
    it('rotates in the xy-plane', () => {
      const m = geom.rotation(Math.PI / 2)
      const p = geom.pointOnGeodesic(geom.origin(), [1, 0], 1)
      const result = geom.applyMatrix(m, p)

      // Rotated 90° from x-direction to y-direction
      // The x-component should become small, y-component should grow
      expect(Math.abs(result[0] ?? 0)).toBeLessThan(1e-10)
      expect((result[1] ?? 0) > 0.5).toBe(true)
    })

    it('preserves distance from origin', () => {
      const m = geom.rotation(Math.PI / 4)
      const p = geom.pointOnGeodesic(geom.origin(), [1, 0], 2)
      const result = geom.applyMatrix(m, p)

      const d1 = geom.distance(geom.origin(), p)
      const d2 = geom.distance(geom.origin(), result)
      expect(Math.abs(d1 - d2)).toBeLessThan(1e-10)
    })
  })

  describe('translation', () => {
    it('moves origin by specified distance', () => {
      const m = geom.translation([1, 0], 2)
      const result = geom.applyMatrix(m, geom.origin())

      const d = geom.distance(geom.origin(), result)
      expect(Math.abs(d - 2)).toBeLessThan(1e-10)
    })

    it('result lies on hyperboloid', () => {
      const m = geom.translation([1, 1], 1.5)
      const result = geom.applyMatrix(m, geom.origin())

      // Check hyperboloid constraint
      const check =
        (result[0] ?? 0) ** 2 +
        (result[1] ?? 0) ** 2 -
        (result[2] ?? 1) ** 2
      expect(Math.abs(check + 1)).toBeLessThan(1e-10)
    })
  })

  describe('reflection', () => {
    it('is involutory (applying twice returns original)', () => {
      const normal = [1, 0, 0] // Geodesic through origin perpendicular to x
      const m = geom.reflection(normal)
      const p = geom.pointOnGeodesic(geom.origin(), [1, 0.5], 1)

      const once = geom.applyMatrix(m, p)
      const twice = geom.applyMatrix(m, once)

      expect(pointsEqual(twice, p, 1e-9)).toBe(true)
    })

    it('preserves points on the geodesic', () => {
      const normal = [1, 0, 0] // Geodesic is in the yz-plane
      const m = geom.reflection(normal)

      // Point on the geodesic (y-direction from origin)
      const p = geom.pointOnGeodesic(geom.origin(), [0, 1], 1)
      const result = geom.applyMatrix(m, p)

      expect(pointsEqual(result, p, 1e-9)).toBe(true)
    })
  })

  describe('pointOnGeodesic', () => {
    it('returns origin at t=0', () => {
      const o = geom.origin()
      const result = geom.pointOnGeodesic(o, [1, 0], 0)
      expect(pointsEqual(result, o, 1e-10)).toBe(true)
    })

    it('moves by correct distance', () => {
      const o = geom.origin()
      const result = geom.pointOnGeodesic(o, [1, 0], 3)

      const d = geom.distance(o, result)
      expect(Math.abs(d - 3)).toBeLessThan(1e-10)
    })

    it('result lies on hyperboloid', () => {
      const o = geom.origin()
      const result = geom.pointOnGeodesic(o, [1, 1], 2)

      const check =
        (result[0] ?? 0) ** 2 +
        (result[1] ?? 0) ** 2 -
        (result[2] ?? 1) ** 2
      expect(Math.abs(check + 1)).toBeLessThan(1e-10)
    })
  })
})
