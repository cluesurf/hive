import { describe, it, expect } from 'vitest'
import { Euclidean2D } from './euclidean2d'
import { pointsEqual } from '@/form/point'

describe('Euclidean2D', () => {
  const geom = new Euclidean2D()

  describe('properties', () => {
    it('has correct dimension', () => {
      expect(geom.dimension).toBe(2)
    })

    it('has correct embedding dimension', () => {
      expect(geom.embeddingDimension).toBe(2)
    })

    it('has zero curvature', () => {
      expect(geom.curvature).toBe(0)
    })
  })

  describe('origin', () => {
    it('returns [0, 0]', () => {
      expect(geom.origin()).toEqual([0, 0])
    })
  })

  describe('distance', () => {
    it('returns 0 for same point', () => {
      const p = [3, 4]
      expect(geom.distance(p, p)).toBe(0)
    })

    it('computes Euclidean distance', () => {
      expect(geom.distance([0, 0], [3, 4])).toBe(5)
      expect(geom.distance([1, 1], [4, 5])).toBe(5)
    })

    it('is symmetric', () => {
      const a = [1, 2]
      const b = [5, 7]
      expect(geom.distance(a, b)).toBe(geom.distance(b, a))
    })
  })

  describe('interpolate', () => {
    it('returns start at t=0', () => {
      const a = [1, 2]
      const b = [5, 6]
      expect(geom.interpolate(a, b, 0)).toEqual(a)
    })

    it('returns end at t=1', () => {
      const a = [1, 2]
      const b = [5, 6]
      expect(geom.interpolate(a, b, 1)).toEqual(b)
    })

    it('returns midpoint at t=0.5', () => {
      const a = [0, 0]
      const b = [10, 10]
      expect(geom.interpolate(a, b, 0.5)).toEqual([5, 5])
    })

    it('works for arbitrary t', () => {
      const a = [0, 0]
      const b = [10, 0]
      expect(geom.interpolate(a, b, 0.25)).toEqual([2.5, 0])
    })
  })

  describe('rotation', () => {
    it('rotates by 90 degrees', () => {
      const m = geom.rotation(Math.PI / 2)
      const p = [1, 0]
      const result = geom.applyMatrix(m, p)
      expect(pointsEqual(result, [0, 1], 1e-10)).toBe(true)
    })

    it('rotates by 180 degrees', () => {
      const m = geom.rotation(Math.PI)
      const p = [1, 0]
      const result = geom.applyMatrix(m, p)
      expect(pointsEqual(result, [-1, 0], 1e-10)).toBe(true)
    })

    it('identity at 0 degrees', () => {
      const m = geom.rotation(0)
      const p = [3, 4]
      const result = geom.applyMatrix(m, p)
      expect(pointsEqual(result, p, 1e-10)).toBe(true)
    })
  })

  describe('translation', () => {
    it('translates in x direction', () => {
      const m = geom.translation([1, 0], 5)
      const p = [0, 0]
      const result = geom.applyMatrix(m, p)
      expect(pointsEqual(result, [5, 0], 1e-10)).toBe(true)
    })

    it('translates in y direction', () => {
      const m = geom.translation([0, 1], 3)
      const p = [0, 0]
      const result = geom.applyMatrix(m, p)
      expect(pointsEqual(result, [0, 3], 1e-10)).toBe(true)
    })

    it('translates in diagonal direction', () => {
      const m = geom.translation([1, 1], Math.sqrt(2))
      const p = [0, 0]
      const result = geom.applyMatrix(m, p)
      expect(pointsEqual(result, [1, 1], 1e-10)).toBe(true)
    })
  })

  describe('reflection', () => {
    it('reflects across x-axis', () => {
      const m = geom.reflection([0, 1]) // Normal pointing up
      const p = [3, 4]
      const result = geom.applyMatrix(m, p)
      expect(pointsEqual(result, [3, -4], 1e-10)).toBe(true)
    })

    it('reflects across y-axis', () => {
      const m = geom.reflection([1, 0]) // Normal pointing right
      const p = [3, 4]
      const result = geom.applyMatrix(m, p)
      expect(pointsEqual(result, [-3, 4], 1e-10)).toBe(true)
    })

    it('is involutory (applying twice returns original)', () => {
      const m = geom.reflection([1, 1])
      const p = [3, 4]
      const once = geom.applyMatrix(m, p)
      const twice = geom.applyMatrix(m, once)
      expect(pointsEqual(twice, p, 1e-10)).toBe(true)
    })
  })

  describe('geodesicThrough', () => {
    it('returns normal to line', () => {
      const a = [0, 0]
      const b = [1, 0]
      const normal = geom.geodesicThrough(a, b)
      // Normal should be perpendicular to [1, 0], so [0, 1] or [0, -1]
      expect(Math.abs(normal[0] ?? 0)).toBeLessThan(1e-10)
      expect(Math.abs(normal[1] ?? 0)).toBeGreaterThan(0.5)
    })
  })

  describe('pointOnGeodesic', () => {
    it('returns origin at t=0', () => {
      const o = [1, 2]
      const d = [1, 0]
      const result = geom.pointOnGeodesic(o, d, 0)
      expect(pointsEqual(result, o, 1e-10)).toBe(true)
    })

    it('moves by t in direction', () => {
      const o = [0, 0]
      const d = [1, 0]
      const result = geom.pointOnGeodesic(o, d, 5)
      expect(pointsEqual(result, [5, 0], 1e-10)).toBe(true)
    })
  })
})
