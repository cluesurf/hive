/**
 * Platonic Solid Data
 *
 * Precomputed adjacency tables and vertex coordinates for
 * the five Platonic solids (regular convex polyhedra).
 */

import type { Point3D } from '../types'

/**
 * Platonic solid definition with all geometric data.
 */
export interface PlatonicSolid {
  /** Name of the solid */
  readonly name: string
  /** Schläfli symbol p (polygon sides) */
  readonly p: number
  /** Schläfli symbol q (vertex degree) */
  readonly q: number
  /** Number of faces */
  readonly faceCount: number
  /** Face centers (normalized to unit sphere) */
  readonly centers: readonly Point3D[]
  /** Face vertices for each face (p vertices each) */
  readonly faceVertices: readonly (readonly Point3D[])[]
  /** Adjacency table: adjacency[face][dir] = neighbor face */
  readonly adjacency: readonly (readonly number[])[]
}

// Golden ratio
const PHI = (1 + Math.sqrt(5)) / 2
const INV_PHI = 1 / PHI

// Normalization helper
function normalize(x: number, y: number, z: number): Point3D {
  const len = Math.sqrt(x * x + y * y + z * z)
  return [x / len, y / len, z / len]
}

/**
 * Tetrahedron {3,3} - 4 triangular faces
 *
 * Vertices at alternating corners of a cube.
 */
export const TETRAHEDRON: PlatonicSolid = (() => {
  // Vertices at alternating cube corners
  const v0: Point3D = normalize(1, 1, 1)
  const v1: Point3D = normalize(1, -1, -1)
  const v2: Point3D = normalize(-1, 1, -1)
  const v3: Point3D = normalize(-1, -1, 1)

  // Face vertices (counterclockwise when viewed from outside)
  const faces: Point3D[][] = [
    [v0, v1, v2], // Face 0
    [v0, v2, v3], // Face 1
    [v0, v3, v1], // Face 2
    [v1, v3, v2], // Face 3
  ]

  // Face centers
  const centers: Point3D[] = faces.map(f => {
    const cx = (f[0][0] + f[1][0] + f[2][0]) / 3
    const cy = (f[0][1] + f[1][1] + f[2][1]) / 3
    const cz = (f[0][2] + f[1][2] + f[2][2]) / 3
    return normalize(cx, cy, cz)
  })

  // Each face touches all other faces
  // Adjacency ordered by edge (clockwise from first vertex)
  const adjacency: number[][] = [
    [2, 3, 1], // Face 0: edges to faces 2, 3, 1
    [0, 3, 2], // Face 1: edges to faces 0, 3, 2
    [1, 3, 0], // Face 2: edges to faces 1, 3, 0
    [2, 1, 0], // Face 3: edges to faces 2, 1, 0
  ]

  return {
    name: 'Tetrahedron',
    p: 3,
    q: 3,
    faceCount: 4,
    centers,
    faceVertices: faces,
    adjacency,
  }
})()

/**
 * Cube (Hexahedron) {4,3} - 6 square faces
 */
export const CUBE: PlatonicSolid = (() => {
  // Face centers on unit sphere
  const centers: Point3D[] = [
    [1, 0, 0], // Face 0: +X
    [-1, 0, 0], // Face 1: -X
    [0, 1, 0], // Face 2: +Y
    [0, -1, 0], // Face 3: -Y
    [0, 0, 1], // Face 4: +Z
    [0, 0, -1], // Face 5: -Z
  ]

  // Vertices
  const s = 1 / Math.sqrt(3)
  const vertices: Point3D[] = [
    [s, s, s],
    [s, s, -s],
    [s, -s, s],
    [s, -s, -s],
    [-s, s, s],
    [-s, s, -s],
    [-s, -s, s],
    [-s, -s, -s],
  ]

  // Face vertices (clockwise when viewed from outside)
  const faceVertices: Point3D[][] = [
    [vertices[0], vertices[1], vertices[3], vertices[2]], // +X
    [vertices[4], vertices[6], vertices[7], vertices[5]], // -X
    [vertices[0], vertices[4], vertices[5], vertices[1]], // +Y
    [vertices[2], vertices[3], vertices[7], vertices[6]], // -Y
    [vertices[0], vertices[2], vertices[6], vertices[4]], // +Z
    [vertices[1], vertices[5], vertices[7], vertices[3]], // -Z
  ]

  // Adjacency: [right, back, left, front] for each face
  const adjacency: number[][] = [
    [2, 5, 3, 4], // +X neighbors
    [2, 4, 3, 5], // -X neighbors
    [0, 5, 1, 4], // +Y neighbors
    [0, 4, 1, 5], // -Y neighbors
    [0, 2, 1, 3], // +Z neighbors
    [0, 3, 1, 2], // -Z neighbors
  ]

  return {
    name: 'Cube',
    p: 4,
    q: 3,
    faceCount: 6,
    centers,
    faceVertices,
    adjacency,
  }
})()

/**
 * Octahedron {3,4} - 8 triangular faces
 */
export const OCTAHEDRON: PlatonicSolid = (() => {
  // Vertices at axis intersections with unit sphere
  const vertices: Point3D[] = [
    [1, 0, 0], // 0: +X
    [-1, 0, 0], // 1: -X
    [0, 1, 0], // 2: +Y
    [0, -1, 0], // 3: -Y
    [0, 0, 1], // 4: +Z
    [0, 0, -1], // 5: -Z
  ]

  // Face vertices
  const faceVertices: Point3D[][] = [
    [vertices[0], vertices[2], vertices[4]], // 0: +X+Y+Z
    [vertices[0], vertices[4], vertices[3]], // 1: +X-Y+Z
    [vertices[0], vertices[3], vertices[5]], // 2: +X-Y-Z
    [vertices[0], vertices[5], vertices[2]], // 3: +X+Y-Z
    [vertices[1], vertices[4], vertices[2]], // 4: -X+Y+Z
    [vertices[1], vertices[3], vertices[4]], // 5: -X-Y+Z
    [vertices[1], vertices[5], vertices[3]], // 6: -X-Y-Z
    [vertices[1], vertices[2], vertices[5]], // 7: -X+Y-Z
  ]

  // Face centers
  const centers: Point3D[] = faceVertices.map(f => {
    const cx = (f[0][0] + f[1][0] + f[2][0]) / 3
    const cy = (f[0][1] + f[1][1] + f[2][1]) / 3
    const cz = (f[0][2] + f[1][2] + f[2][2]) / 3
    return normalize(cx, cy, cz)
  })

  // Adjacency (3 neighbors per triangular face)
  const adjacency: number[][] = [
    [3, 4, 1], // Face 0
    [0, 5, 2], // Face 1
    [1, 6, 3], // Face 2
    [2, 7, 0], // Face 3
    [7, 0, 5], // Face 4
    [4, 1, 6], // Face 5
    [5, 2, 7], // Face 6
    [6, 3, 4], // Face 7
  ]

  return {
    name: 'Octahedron',
    p: 3,
    q: 4,
    faceCount: 8,
    centers,
    faceVertices,
    adjacency,
  }
})()

/**
 * Dodecahedron {5,3} - 12 pentagonal faces
 */
export const DODECAHEDRON: PlatonicSolid = (() => {
  // 20 vertices of regular dodecahedron
  const vertices: Point3D[] = [
    // Cube vertices
    normalize(1, 1, 1),
    normalize(1, 1, -1),
    normalize(1, -1, 1),
    normalize(1, -1, -1),
    normalize(-1, 1, 1),
    normalize(-1, 1, -1),
    normalize(-1, -1, 1),
    normalize(-1, -1, -1),
    // Rectangle vertices (golden ratio proportions)
    normalize(0, INV_PHI, PHI),
    normalize(0, INV_PHI, -PHI),
    normalize(0, -INV_PHI, PHI),
    normalize(0, -INV_PHI, -PHI),
    normalize(INV_PHI, PHI, 0),
    normalize(INV_PHI, -PHI, 0),
    normalize(-INV_PHI, PHI, 0),
    normalize(-INV_PHI, -PHI, 0),
    normalize(PHI, 0, INV_PHI),
    normalize(PHI, 0, -INV_PHI),
    normalize(-PHI, 0, INV_PHI),
    normalize(-PHI, 0, -INV_PHI),
  ]

  // Face vertices (5 per face, clockwise from outside)
  const faceVertices: Point3D[][] = [
    [vertices[0], vertices[16], vertices[2], vertices[10], vertices[8]], // 0
    [vertices[0], vertices[8], vertices[4], vertices[14], vertices[12]], // 1
    [vertices[0], vertices[12], vertices[1], vertices[17], vertices[16]], // 2
    [vertices[1], vertices[12], vertices[14], vertices[5], vertices[9]], // 3
    [vertices[1], vertices[9], vertices[11], vertices[3], vertices[17]], // 4
    [vertices[2], vertices[16], vertices[17], vertices[3], vertices[13]], // 5
    [vertices[2], vertices[13], vertices[15], vertices[6], vertices[10]], // 6
    [vertices[4], vertices[8], vertices[10], vertices[6], vertices[18]], // 7
    [vertices[4], vertices[18], vertices[19], vertices[5], vertices[14]], // 8
    [vertices[5], vertices[19], vertices[7], vertices[11], vertices[9]], // 9
    [vertices[3], vertices[11], vertices[7], vertices[15], vertices[13]], // 10
    [vertices[6], vertices[15], vertices[7], vertices[19], vertices[18]], // 11
  ]

  // Face centers
  const centers: Point3D[] = faceVertices.map(f => {
    const cx = (f[0][0] + f[1][0] + f[2][0] + f[3][0] + f[4][0]) / 5
    const cy = (f[0][1] + f[1][1] + f[2][1] + f[3][1] + f[4][1]) / 5
    const cz = (f[0][2] + f[1][2] + f[2][2] + f[3][2] + f[4][2]) / 5
    return normalize(cx, cy, cz)
  })

  // Adjacency (5 neighbors per pentagonal face)
  const adjacency: number[][] = [
    [1, 7, 6, 5, 2], // Face 0
    [2, 3, 8, 7, 0], // Face 1
    [0, 5, 4, 3, 1], // Face 2
    [1, 2, 4, 9, 8], // Face 3
    [2, 5, 10, 9, 3], // Face 4
    [0, 6, 10, 4, 2], // Face 5
    [0, 7, 11, 10, 5], // Face 6
    [0, 1, 8, 11, 6], // Face 7
    [1, 3, 9, 11, 7], // Face 8
    [3, 4, 10, 11, 8], // Face 9
    [4, 5, 6, 11, 9], // Face 10
    [6, 7, 8, 9, 10], // Face 11
  ]

  return {
    name: 'Dodecahedron',
    p: 5,
    q: 3,
    faceCount: 12,
    centers,
    faceVertices,
    adjacency,
  }
})()

/**
 * Icosahedron {3,5} - 20 triangular faces
 */
export const ICOSAHEDRON: PlatonicSolid = (() => {
  // 12 vertices
  const vertices: Point3D[] = [
    normalize(0, 1, PHI),
    normalize(0, 1, -PHI),
    normalize(0, -1, PHI),
    normalize(0, -1, -PHI),
    normalize(1, PHI, 0),
    normalize(1, -PHI, 0),
    normalize(-1, PHI, 0),
    normalize(-1, -PHI, 0),
    normalize(PHI, 0, 1),
    normalize(PHI, 0, -1),
    normalize(-PHI, 0, 1),
    normalize(-PHI, 0, -1),
  ]

  // Face vertices (3 per face)
  const faceVertices: Point3D[][] = [
    [vertices[0], vertices[4], vertices[8]], // 0
    [vertices[0], vertices[8], vertices[2]], // 1
    [vertices[0], vertices[2], vertices[10]], // 2
    [vertices[0], vertices[10], vertices[6]], // 3
    [vertices[0], vertices[6], vertices[4]], // 4
    [vertices[4], vertices[6], vertices[1]], // 5
    [vertices[6], vertices[10], vertices[11]], // 6
    [vertices[10], vertices[2], vertices[7]], // 7
    [vertices[2], vertices[8], vertices[5]], // 8
    [vertices[8], vertices[4], vertices[9]], // 9
    [vertices[1], vertices[9], vertices[4]], // 10
    [vertices[1], vertices[6], vertices[11]], // 11
    [vertices[11], vertices[10], vertices[7]], // 12
    [vertices[7], vertices[2], vertices[5]], // 13
    [vertices[5], vertices[8], vertices[9]], // 14
    [vertices[3], vertices[9], vertices[1]], // 15
    [vertices[3], vertices[1], vertices[11]], // 16
    [vertices[3], vertices[11], vertices[7]], // 17
    [vertices[3], vertices[7], vertices[5]], // 18
    [vertices[3], vertices[5], vertices[9]], // 19
  ]

  // Face centers
  const centers: Point3D[] = faceVertices.map(f => {
    const cx = (f[0][0] + f[1][0] + f[2][0]) / 3
    const cy = (f[0][1] + f[1][1] + f[2][1]) / 3
    const cz = (f[0][2] + f[1][2] + f[2][2]) / 3
    return normalize(cx, cy, cz)
  })

  // Adjacency (3 neighbors per triangular face)
  const adjacency: number[][] = [
    [4, 9, 1], // 0
    [0, 8, 2], // 1
    [1, 7, 3], // 2
    [2, 6, 4], // 3
    [3, 5, 0], // 4
    [4, 10, 11], // 5
    [3, 11, 12], // 6
    [2, 12, 13], // 7
    [1, 13, 14], // 8
    [0, 14, 10], // 9
    [9, 5, 15], // 10
    [5, 6, 16], // 11
    [6, 7, 17], // 12
    [7, 8, 18], // 13
    [8, 9, 19], // 14
    [10, 19, 16], // 15
    [15, 11, 17], // 16
    [16, 12, 18], // 17
    [17, 13, 19], // 18
    [18, 14, 15], // 19
  ]

  return {
    name: 'Icosahedron',
    p: 3,
    q: 5,
    faceCount: 20,
    centers,
    faceVertices,
    adjacency,
  }
})()

/**
 * Get Platonic solid by Schläfli symbol {p,q}.
 * Returns undefined if no Platonic solid exists for given p,q.
 */
export function getPlatonicSolid(
  p: number,
  q: number,
): PlatonicSolid | undefined {
  if (p === 3 && q === 3) return TETRAHEDRON
  if (p === 4 && q === 3) return CUBE
  if (p === 3 && q === 4) return OCTAHEDRON
  if (p === 5 && q === 3) return DODECAHEDRON
  if (p === 3 && q === 5) return ICOSAHEDRON
  return undefined
}

/**
 * All Platonic solids.
 */
export const PLATONIC_SOLIDS: readonly PlatonicSolid[] = [
  TETRAHEDRON,
  CUBE,
  OCTAHEDRON,
  DODECAHEDRON,
  ICOSAHEDRON,
]
