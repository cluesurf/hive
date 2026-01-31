import { describe, it, expect } from 'vitest'
import { Spherical2D } from './spherical2d'
import { pointsEqual } from '@/form/point'

describe('Spherical2D', () => {
  const geom = new Spherical2D()

  describe('properties', () => {
    it('has correct dimension', () => {
      expect(geom.dimension).toBe(2)
    })

    it('has correct embedding dimension', () => {
      expect(geom.embeddingDimension).toBe(3)
    })

    it('has positive curvature', () => {
      expect(geom.curvature).toBe(1)
    })
  })

  describe('origin', () => {
    it('returns [0, 0, 1] (north pole)', () => {
      expect(geom.origin()).toEqual([0, 0, 1])
    })

    it('lies on unit sphere', () => {
      const o = geom.origin()
      const r2 = (o[0] ?? 0) ** 2 + (o[1] ?? 0) ** 2 + (o[2] ?? 0) ** 2
      expect(Math.abs(r2 - 1)).toBeLessThan(1e-10)
    })
  })

  describe('distance', () => {
    it('returns 0 for same point', () => {
      const p = geom.origin()
      expect(geom.distance(p, p)).toBe(0)
    })

    it('returns pi for antipodal points', () => {
      const north = [0, 0, 1]
      const south = [0, 0, -1]
      expect(Math.abs(geom.distance(north, south) - Math.PI)).toBeLessThan(
        1e-10,
      )
    })

    it('returns pi/2 for 90 degree separation', () => {
      const a = [0, 0, 1]
      const b = [1, 0, 0]
      expect(
        Math.abs(geom.distance(a, b) - Math.PI / 2),
      ).toBeLessThan(1e-10)
    })

    it('is symmetric', () => {
      const a = [0, 0, 1]
      const b = [1, 0, 0]
      expect(Math.abs(geom.distance(a, b) - geom.distance(b, a))).toBeLessThan(
        1e-10,
      )
    })

    it('satisfies triangle inequality', () => {
      const a = [0, 0, 1]
      const b = [1, 0, 0]
      const c = [0, 1, 0]

      const ab = geom.distance(a, b)
      const bc = geom.distance(b, c)
      const ac = geom.distance(a, c)

      expect(ac).toBeLessThanOrEqual(ab + bc + 1e-10)
    })
  })

  describe('interpolate (slerp)', () => {
    it('returns start at t=0', () => {
      const a = geom.origin()
      const b = [1, 0, 0]
      const result = geom.interpolate(a, b, 0)
      expect(pointsEqual(result, a, 1e-10)).toBe(true)
    })

    it('returns end at t=1', () => {
      const a = geom.origin()
      const b = [1, 0, 0]
      const result = geom.interpolate(a, b, 1)
      expect(pointsEqual(result, b, 1e-10)).toBe(true)
    })

    it('returns midpoint at t=0.5', () => {
      const a = [0, 0, 1]
      const b = [1, 0, 0]
      const mid = geom.interpolate(a, b, 0.5)

      // Midpoint should be equidistant from both ends
      const da = geom.distance(a, mid)
      const db = geom.distance(mid, b)
      expect(Math.abs(da - db)).toBeLessThan(1e-10)
    })

    it('result lies on sphere', () => {
      const a = [0, 0, 1]
      const b = [1, 0, 0]
      const mid = geom.interpolate(a, b, 0.5)

      const r2 =
        (mid[0] ?? 0) ** 2 + (mid[1] ?? 0) ** 2 + (mid[2] ?? 0) ** 2
      expect(Math.abs(r2 - 1)).toBeLessThan(1e-10)
    })
  })

  describe('normalize', () => {
    it('projects point to sphere', () => {
      const p = [2, 0, 0] // Not on sphere
      const n = geom.normalize(p)

      const r2 = (n[0] ?? 0) ** 2 + (n[1] ?? 0) ** 2 + (n[2] ?? 0) ** 2
      expect(Math.abs(r2 - 1)).toBeLessThan(1e-10)
    })

    it('preserves points already on sphere', () => {
      const p = geom.origin()
      const n = geom.normalize(p)
      expect(pointsEqual(n, p, 1e-10)).toBe(true)
    })
  })

  describe('rotation', () => {
    it('rotates around Z axis by default', () => {
      const m = geom.rotation(Math.PI / 2)
      const p = [1, 0, 0]
      const result = geom.applyMatrix(m, p)

      expect(Math.abs(result[0] ?? 0)).toBeLessThan(1e-10)
      expect(Math.abs((result[1] ?? 0) - 1)).toBeLessThan(1e-10)
      expect(Math.abs(result[2] ?? 0)).toBeLessThan(1e-10)
    })

    it('rotates around X axis', () => {
      const m = geom.rotation(Math.PI / 2, 0)
      const p = [0, 1, 0]
      const result = geom.applyMatrix(m, p)

      expect(Math.abs(result[0] ?? 0)).toBeLessThan(1e-10)
      expect(Math.abs(result[1] ?? 0)).toBeLessThan(1e-10)
      expect(Math.abs((result[2] ?? 0) - 1)).toBeLessThan(1e-10)
    })

    it('preserves distance from origin', () => {
      const m = geom.rotation(Math.PI / 4)
      const p = [1, 0, 0]
      const result = geom.applyMatrix(m, p)

      // Point should still be on unit sphere
      const r2 =
        (result[0] ?? 0) ** 2 +
        (result[1] ?? 0) ** 2 +
        (result[2] ?? 0) ** 2
      expect(Math.abs(r2 - 1)).toBeLessThan(1e-10)
    })
  })

  describe('translation', () => {
    it('moves north pole by specified arc length', () => {
      const m = geom.translation([1, 0], Math.PI / 2)
      const result = geom.applyMatrix(m, geom.origin())

      const d = geom.distance(geom.origin(), result)
      expect(Math.abs(d - Math.PI / 2)).toBeLessThan(1e-10)
    })

    it('result lies on sphere', () => {
      const m = geom.translation([1, 1], 1)
      const result = geom.applyMatrix(m, geom.origin())

      const r2 =
        (result[0] ?? 0) ** 2 +
        (result[1] ?? 0) ** 2 +
        (result[2] ?? 0) ** 2
      expect(Math.abs(r2 - 1)).toBeLessThan(1e-10)
    })
  })

  describe('reflection', () => {
    it('is involutory (applying twice returns original)', () => {
      const normal = [1, 0, 0]
      const m = geom.reflection(normal)
      const p = [0.5, 0.5, Math.sqrt(0.5)]

      const once = geom.applyMatrix(m, p)
      const twice = geom.applyMatrix(m, once)

      expect(pointsEqual(twice, p, 1e-9)).toBe(true)
    })

    it('preserves points on the great circle', () => {
      const normal = [1, 0, 0] // Great circle is yz-plane
      const m = geom.reflection(normal)

      // Point on the yz-plane
      const p = [0, 0.6, 0.8]
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

    it('moves by correct arc length', () => {
      const o = geom.origin()
      const result = geom.pointOnGeodesic(o, [1, 0], Math.PI / 4)

      const d = geom.distance(o, result)
      expect(Math.abs(d - Math.PI / 4)).toBeLessThan(1e-10)
    })

    it('result lies on sphere', () => {
      const o = geom.origin()
      const result = geom.pointOnGeodesic(o, [1, 1], 1)

      const r2 =
        (result[0] ?? 0) ** 2 +
        (result[1] ?? 0) ** 2 +
        (result[2] ?? 0) ** 2
      expect(Math.abs(r2 - 1)).toBeLessThan(1e-10)
    })
  })
})
