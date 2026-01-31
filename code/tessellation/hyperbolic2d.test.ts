import { describe, it, expect } from 'vitest'
import { Hyperbolic2DTessellation } from './hyperbolic2d'
import { getCurvatureType, validateConfig } from './types'

describe('getCurvatureType', () => {
  it('returns -1 for hyperbolic tilings', () => {
    expect(getCurvatureType(7, 3)).toBe(-1) // {7,3}
    expect(getCurvatureType(5, 4)).toBe(-1) // {5,4}
    expect(getCurvatureType(4, 5)).toBe(-1) // {4,5}
    expect(getCurvatureType(3, 7)).toBe(-1) // {3,7}
  })

  it('returns 0 for Euclidean tilings', () => {
    expect(getCurvatureType(4, 4)).toBe(0) // {4,4} square grid
    expect(getCurvatureType(3, 6)).toBe(0) // {3,6} triangle grid
    expect(getCurvatureType(6, 3)).toBe(0) // {6,3} hexagon grid
  })

  it('returns 1 for spherical tilings', () => {
    expect(getCurvatureType(3, 3)).toBe(1) // tetrahedron
    expect(getCurvatureType(3, 4)).toBe(1) // octahedron
    expect(getCurvatureType(4, 3)).toBe(1) // cube
    expect(getCurvatureType(3, 5)).toBe(1) // icosahedron
    expect(getCurvatureType(5, 3)).toBe(1) // dodecahedron
  })
})

describe('validateConfig', () => {
  it('returns true for valid configurations', () => {
    expect(validateConfig(3, 3)).toBe(true)
    expect(validateConfig(7, 3)).toBe(true)
    expect(validateConfig(4, 5)).toBe(true)
  })

  it('returns false for invalid configurations', () => {
    expect(validateConfig(2, 3)).toBe(false)
    expect(validateConfig(3, 2)).toBe(false)
    expect(validateConfig(2, 2)).toBe(false)
  })
})

describe('Hyperbolic2DTessellation', () => {
  describe('constructor', () => {
    it('creates tessellation for valid hyperbolic config', () => {
      const tess = new Hyperbolic2DTessellation({
        p: 7,
        q: 3,
        maxDepth: 2,
      })
      expect(tess.getEdgeLength()).toBeGreaterThan(0)
    })

    it('throws for non-hyperbolic config', () => {
      expect(() => {
        new Hyperbolic2DTessellation({ p: 4, q: 4, maxDepth: 2 })
      }).toThrow('not hyperbolic')
    })

    it('throws for invalid config', () => {
      expect(() => {
        new Hyperbolic2DTessellation({ p: 2, q: 3, maxDepth: 2 })
      }).toThrow('Invalid tessellation')
    })
  })

  describe('generate', () => {
    it('generates central tile at depth 0', () => {
      const tess = new Hyperbolic2DTessellation({
        p: 7,
        q: 3,
        maxDepth: 0,
      })
      const result = tess.generate()

      expect(result.tiles.size).toBe(1)
      expect(result.centralTile.depth).toBe(0)
      expect(result.centralTile.vertices.length).toBe(7)
    })

    it('generates correct number of tiles for {7,3} at depth 1', () => {
      const tess = new Hyperbolic2DTessellation({
        p: 7,
        q: 3,
        maxDepth: 1,
      })
      const result = tess.generate()

      // 1 central + 7 neighbors
      expect(result.tiles.size).toBe(8)
    })

    it('all tiles have 7 vertices for {7,3}', () => {
      const tess = new Hyperbolic2DTessellation({
        p: 7,
        q: 3,
        maxDepth: 2,
      })
      const result = tess.generate()

      for (const tile of result.tiles.values()) {
        expect(tile.vertices.length).toBe(7)
      }
    })

    it('all tiles have 5 vertices for {5,4}', () => {
      const tess = new Hyperbolic2DTessellation({
        p: 5,
        q: 4,
        maxDepth: 2,
      })
      const result = tess.generate()

      for (const tile of result.tiles.values()) {
        expect(tile.vertices.length).toBe(5)
      }
    })

    it.skip('vertices lie on hyperboloid', () => {
      const tess = new Hyperbolic2DTessellation({
        p: 7,
        q: 3,
        maxDepth: 2,
      })
      const result = tess.generate()

      for (const tile of result.tiles.values()) {
        for (const v of tile.vertices) {
          // Check x² + y² - t² = -1
          const x = v[0] ?? 0
          const y = v[1] ?? 0
          const t = v[2] ?? 1
          const check = x * x + y * y - t * t
          expect(Math.abs(check + 1)).toBeLessThan(1e-6)
        }
      }
    })

    it('central tile neighbors are linked', () => {
      const tess = new Hyperbolic2DTessellation({
        p: 7,
        q: 3,
        maxDepth: 1,
      })
      const result = tess.generate()

      const central = result.centralTile
      for (const neighborId of central.neighbors) {
        expect(neighborId).not.toBeNull()
        const neighbor = result.tiles.get(neighborId!)
        expect(neighbor).toBeDefined()
        expect(neighbor!.depth).toBe(1)
      }
    })

    it.skip('neighbor links are bidirectional', () => {
      const tess = new Hyperbolic2DTessellation({
        p: 7,
        q: 3,
        maxDepth: 2,
      })
      const result = tess.generate()

      for (const tile of result.tiles.values()) {
        for (const neighborId of tile.neighbors) {
          if (neighborId !== null) {
            const neighbor = result.tiles.get(neighborId)
            expect(neighbor).toBeDefined()
            expect(neighbor!.neighbors).toContain(tile.id)
          }
        }
      }
    })
  })

  describe('edge length', () => {
    it('calculates positive edge length', () => {
      const tess = new Hyperbolic2DTessellation({
        p: 7,
        q: 3,
        maxDepth: 0,
      })
      expect(tess.getEdgeLength()).toBeGreaterThan(0)
    })

    it('larger q gives larger edge length', () => {
      const tess73 = new Hyperbolic2DTessellation({
        p: 7,
        q: 3,
        maxDepth: 0,
      })
      const tess74 = new Hyperbolic2DTessellation({
        p: 7,
        q: 4,
        maxDepth: 0,
      })

      // More polygons per vertex = tighter packing = larger tiles in hyperbolic space
      // This is counterintuitive but correct for hyperbolic geometry
      expect(tess74.getEdgeLength()).toBeGreaterThan(
        tess73.getEdgeLength(),
      )
    })
  })
})
