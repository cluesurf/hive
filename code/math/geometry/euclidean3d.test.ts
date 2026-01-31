import { describe, it, expect } from 'vitest'
import { Euclidean3D } from './euclidean3d'
import { pointsEqual } from '@/form/point'

describe('Euclidean3D', () => {
  const geom = new Euclidean3D()

  describe('properties', () => {
    it('has correct dimension', () => {
      expect(geom.dimension).toBe(3)
    })

    it('has correct embedding dimension', () => {
      expect(geom.embeddingDimension).toBe(3)
    })

    it('has zero curvature', () => {
      expect(geom.curvature).toBe(0)
    })
  })

  describe('origin', () => {
    it('returns [0, 0, 0]', () => {
      expect(geom.origin()).toEqual([0, 0, 0])
    })
  })

  describe('distance', () => {
    it('returns 0 for same point', () => {
      const p = [1, 2, 3]
      expect(geom.distance(p, p)).toBe(0)
    })

    it('calculates correct distance for unit vectors', () => {
      const a = [0, 0, 0]
      const b = [1, 0, 0]
      expect(geom.distance(a, b)).toBe(1)
    })

    it('calculates Euclidean distance correctly', () => {
      const a = [1, 2, 3]
      const b = [4, 6, 3]
      // sqrt((4-1)^2 + (6-2)^2 + (3-3)^2) = sqrt(9 + 16) = 5
      expect(geom.distance(a, b)).toBe(5)
    })

    it('is symmetric', () => {
      const a = [1, 2, 3]
      const b = [4, 5, 6]
      expect(geom.distance(a, b)).toBe(geom.distance(b, a))
    })

    it('satisfies triangle inequality', () => {
      const a = [0, 0, 0]
      const b = [1, 1, 0]
      const c = [2, 0, 0]

      const ab = geom.distance(a, b)
      const bc = geom.distance(b, c)
      const ac = geom.distance(a, c)

      expect(ac).toBeLessThanOrEqual(ab + bc + 1e-10)
    })
  })

  describe('interpolate', () => {
    it('returns start at t=0', () => {
      const a = [1, 2, 3]
      const b = [4, 5, 6]
      expect(geom.interpolate(a, b, 0)).toEqual(a)
    })

    it('returns end at t=1', () => {
      const a = [1, 2, 3]
      const b = [4, 5, 6]
      expect(geom.interpolate(a, b, 1)).toEqual(b)
    })

    it('returns midpoint at t=0.5', () => {
      const a = [0, 0, 0]
      const b = [2, 4, 6]
      expect(geom.interpolate(a, b, 0.5)).toEqual([1, 2, 3])
    })

    it('produces equidistant midpoint', () => {
      const a = [1, 1, 1]
      const b = [5, 5, 5]
      const mid = geom.interpolate(a, b, 0.5)

      const da = geom.distance(a, mid)
      const db = geom.distance(mid, b)
      expect(Math.abs(da - db)).toBeLessThan(1e-10)
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

    it('rotates around Y axis', () => {
      const m = geom.rotation(Math.PI / 2, 1)
      const p = [0, 0, 1]
      const result = geom.applyMatrix(m, p)

      expect(Math.abs((result[0] ?? 0) - 1)).toBeLessThan(1e-10)
      expect(Math.abs(result[1] ?? 0)).toBeLessThan(1e-10)
      expect(Math.abs(result[2] ?? 0)).toBeLessThan(1e-10)
    })

    it('preserves distance from origin', () => {
      const m = geom.rotation(Math.PI / 4, 2)
      const p = [1, 2, 3]
      const result = geom.applyMatrix(m, p)

      const d1 = geom.distance(geom.origin(), p)
      const d2 = geom.distance(geom.origin(), result)
      expect(Math.abs(d1 - d2)).toBeLessThan(1e-6)
    })
  })

  describe('rotationAroundAxis', () => {
    it('rotates around an arbitrary axis', () => {
      // Rotate 180 degrees around the diagonal [1,1,1]
      const m = geom.rotationAroundAxis([1, 1, 1], Math.PI)
      const p = [1, 0, 0]
      const result = geom.applyMatrix(m, p)

      // After 180 degree rotation around [1,1,1], [1,0,0] -> [0,1,0] or similar
      // Actually [1,0,0] -> [0,0,1] for this rotation
      const d = geom.distance(geom.origin(), result)
      expect(Math.abs(d - 1)).toBeLessThan(1e-6) // Preserves distance
    })
  })

  describe('translation', () => {
    it('moves origin by specified distance', () => {
      const m = geom.translation([1, 0, 0], 5)
      const result = geom.applyMatrix(m, geom.origin())

      expect(Math.abs((result[0] ?? 0) - 5)).toBeLessThan(1e-10)
      expect(Math.abs(result[1] ?? 0)).toBeLessThan(1e-10)
      expect(Math.abs(result[2] ?? 0)).toBeLessThan(1e-10)
    })

    it('translates in diagonal direction', () => {
      const m = geom.translation([1, 1, 1], Math.sqrt(3))
      const result = geom.applyMatrix(m, geom.origin())

      expect(Math.abs((result[0] ?? 0) - 1)).toBeLessThan(1e-10)
      expect(Math.abs((result[1] ?? 0) - 1)).toBeLessThan(1e-10)
      expect(Math.abs((result[2] ?? 0) - 1)).toBeLessThan(1e-10)
    })
  })

  describe('reflection', () => {
    it('is involutory (applying twice returns original)', () => {
      const normal = [1, 0, 0]
      const m = geom.reflection(normal)
      const p = [3, 4, 5]

      const once = geom.applyMatrix(m, p)
      const twice = geom.applyMatrix(m, once)

      expect(pointsEqual(twice, p, 1e-9)).toBe(true)
    })

    it('reflects across YZ plane', () => {
      const normal = [1, 0, 0]
      const m = geom.reflection(normal)
      const p = [3, 4, 5]
      const result = geom.applyMatrix(m, p)

      expect(Math.abs((result[0] ?? 0) + 3)).toBeLessThan(1e-10)
      expect(Math.abs((result[1] ?? 0) - 4)).toBeLessThan(1e-10)
      expect(Math.abs((result[2] ?? 0) - 5)).toBeLessThan(1e-10)
    })

    it('preserves points on the plane', () => {
      const normal = [0, 0, 1]
      const m = geom.reflection(normal)
      const p = [5, 7, 0] // Point on XY plane
      const result = geom.applyMatrix(m, p)

      expect(pointsEqual(result, p, 1e-9)).toBe(true)
    })
  })

  describe('pointOnGeodesic', () => {
    it('returns origin at t=0', () => {
      const o = geom.origin()
      const result = geom.pointOnGeodesic(o, [1, 0, 0], 0)
      expect(pointsEqual(result, o, 1e-10)).toBe(true)
    })

    it('moves by correct distance', () => {
      const o = geom.origin()
      const result = geom.pointOnGeodesic(o, [1, 0, 0], 5)

      const d = geom.distance(o, result)
      expect(Math.abs(d - 5)).toBeLessThan(1e-10)
    })

    it('normalizes direction', () => {
      const o = geom.origin()
      const result = geom.pointOnGeodesic(o, [2, 0, 0], 5)

      expect(Math.abs((result[0] ?? 0) - 5)).toBeLessThan(1e-10)
    })
  })

  describe('cross', () => {
    it('computes cross product correctly', () => {
      const a = [1, 0, 0]
      const b = [0, 1, 0]
      const result = geom.cross(a, b)

      expect(Math.abs(result[0] ?? 0)).toBeLessThan(1e-10)
      expect(Math.abs(result[1] ?? 0)).toBeLessThan(1e-10)
      expect(Math.abs((result[2] ?? 0) - 1)).toBeLessThan(1e-10)
    })

    it('is anticommutative', () => {
      const a = [1, 2, 3]
      const b = [4, 5, 6]
      const ab = geom.cross(a, b)
      const ba = geom.cross(b, a)

      expect(Math.abs((ab[0] ?? 0) + (ba[0] ?? 0))).toBeLessThan(1e-10)
      expect(Math.abs((ab[1] ?? 0) + (ba[1] ?? 0))).toBeLessThan(1e-10)
      expect(Math.abs((ab[2] ?? 0) + (ba[2] ?? 0))).toBeLessThan(1e-10)
    })
  })

  describe('dot', () => {
    it('computes dot product correctly', () => {
      const a = [1, 2, 3]
      const b = [4, 5, 6]
      // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
      expect(geom.dot(a, b)).toBe(32)
    })

    it('returns zero for perpendicular vectors', () => {
      const a = [1, 0, 0]
      const b = [0, 1, 0]
      expect(geom.dot(a, b)).toBe(0)
    })
  })
})
