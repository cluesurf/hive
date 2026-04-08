/**
 * Mesh Generator for Hyperbolic Honeycombs
 *
 * Generates explicit Three.js geometry for complete polyhedra.
 * Uses BFS cell enumeration to ensure only complete cells are rendered.
 */

import * as THREE from 'three'

/**
 * Minkowski inner product for 4-vectors (signature +,+,+,-)
 */
function hdot(a: number[], b: number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] - a[3] * b[3]
}

/**
 * Normalize a hyperboloid point.
 * For timelike vectors (on the hyperboloid), normalize to unit hyperboloid.
 * For spacelike/lightlike vectors (ultra-ideal/ideal vertices),
 * truncate to a finite point on the hyperboloid along the spatial direction.
 */
function hnormalize(p: number[]): number[] {
  const sq = -hdot(p, p) // positive for timelike
  if (sq > 1e-10) {
    const norm = Math.sqrt(sq)
    return [p[0] / norm, p[1] / norm, p[2] / norm, p[3] / norm]
  }

  // Ultra-ideal or lightlike: project along spatial direction
  // at a fixed hyperbolic distance from the origin
  const spatialSq = p[0] * p[0] + p[1] * p[1] + p[2] * p[2]
  if (spatialSq < 1e-10) return [0, 0, 0, 1]

  const spatialNorm = Math.sqrt(spatialSq)
  const truncDist = 1.2
  const sinhD = Math.sinh(truncDist)
  const coshD = Math.cosh(truncDist)

  return [
    (sinhD * p[0]) / spatialNorm,
    (sinhD * p[1]) / spatialNorm,
    (sinhD * p[2]) / spatialNorm,
    coshD,
  ]
}

/**
 * Convert hyperboloid point to Poincare ball
 */
function hyperboloidToPoincare(p: number[]): THREE.Vector3 {
  const denom = 1 + p[3]
  if (denom < 0.001) return new THREE.Vector3(0, 0, 0)
  return new THREE.Vector3(p[0] / denom, p[1] / denom, p[2] / denom)
}

/**
 * Gyrovector subtraction in Poincaré ball: (-a) ⊕ z
 * This translates point 'a' to the origin, carrying z along
 *
 * Formula: (-a) ⊕ z = (-(1 - 2<a,z> + |z|²)a + (1 - |a|²)z) / (1 - 2<a,z> + |a|²|z|²)
 */
function mobiusTranslate(z: THREE.Vector3, a: THREE.Vector3): THREE.Vector3 {
  const az = a.dot(z)
  const aSq = a.dot(a)
  const zSq = z.dot(z)

  if (aSq < 1e-10) return z.clone() // a is already at origin

  const denom = 1 - 2 * az + aSq * zSq
  if (Math.abs(denom) < 1e-10) return new THREE.Vector3(0, 0, 0)

  const coeffA = -(1 - 2 * az + zSq)
  const coeffZ = 1 - aSq

  return new THREE.Vector3(
    (coeffA * a.x + coeffZ * z.x) / denom,
    (coeffA * a.y + coeffZ * z.y) / denom,
    (coeffA * a.z + coeffZ * z.z) / denom,
  )
}

/**
 * Reflect a point across a hyperplane with given normal (Minkowski)
 */
function reflect(p: number[], n: number[]): number[] {
  const nn = hdot(n, n)
  if (Math.abs(nn) < 1e-10) return p
  const pn = hdot(p, n)
  const f = 2 * pn / nn
  return [
    p[0] - f * n[0],
    p[1] - f * n[1],
    p[2] - f * n[2],
    p[3] - f * n[3],
  ]
}

/**
 * Compute Coxeter mirror normals for {p,q,r} honeycomb.
 *
 * Handles both compact honeycombs (where all spatial components suffice)
 * and non-compact ones (where mirror C needs a timelike component because
 * the 3x3 Gram minor goes negative, e.g. {7,3,3}).
 */
function computeCoxeterMirrors(
  p: number,
  q: number,
  r: number,
): number[][] {
  const PI = Math.PI
  const c01 = -Math.cos(PI / p) // A-B angle
  const c02 = 0 // A-C perpendicular
  const c03 = 0 // A-D perpendicular
  const c12 = -Math.cos(PI / q) // B-C angle
  const c13 = 0 // B-D perpendicular
  const c23 = -Math.cos(PI / r) // C-D angle

  // Gram-Schmidt-like decomposition in Minkowski space R^{3,1}
  const A: number[] = [1, 0, 0, 0]

  const B: number[] = [c01, Math.sqrt(1 - c01 * c01), 0, 0]

  const C: number[] = [c02, 0, 0, 0]
  C[1] = (c12 - C[0] * B[0]) / B[1]
  const c2sq = 1 - C[0] * C[0] - C[1] * C[1]

  if (c2sq >= 0) {
    // Compact case: C is purely spacelike
    C[2] = Math.sqrt(c2sq)
    C[3] = 0

    const D: number[] = [c03, 0, 0, 0]
    D[1] = (c13 - D[0] * B[0]) / B[1]
    D[2] = (c23 - D[0] * C[0] - D[1] * C[1]) / C[2]
    const d3sq = D[0] * D[0] + D[1] * D[1] + D[2] * D[2] - 1
    D[3] = -Math.sqrt(Math.max(0, d3sq))

    return [A, B, C, D]
  } else {
    // Non-compact case: C needs a timelike component
    // hdot(C,C) = C[0]^2 + C[1]^2 + C[2]^2 - C[3]^2 = 1
    // With C[2]=0: C[3]^2 = C[0]^2 + C[1]^2 - 1 = -c2sq
    C[2] = 0
    C[3] = Math.sqrt(-c2sq)

    const D: number[] = [c03, 0, 0, 0]
    D[1] = (c13 - D[0] * B[0]) / B[1]
    // hdot(D,C) = D[1]*C[1] + D[2]*C[2] - D[3]*C[3] = c23
    // With C[2]=0: D[3] = (D[1]*C[1] - c23) / C[3]
    D[3] = (D[1] * C[1] - c23) / C[3]
    // hdot(D,D) = D[0]^2 + D[1]^2 + D[2]^2 - D[3]^2 = 1
    const d2sq = 1 - D[0] * D[0] - D[1] * D[1] + D[3] * D[3]
    D[2] = Math.sqrt(Math.max(0, d2sq))

    return [A, B, C, D]
  }
}

/**
 * Compute the cell center (intersection of A, B, C mirrors)
 * This is V_D - the point equidistant from all cell faces
 */
function computeCellCenter(mirrors: number[][]): number[] {
  const [A, B, C] = mirrors
  const v = minkowskiNullVector(A, B, C)
  return hnormalize(v)
}

/**
 * Solve 3x4 linear system in Minkowski space to find null vector
 * Returns vector v such that hdot(v, n1) = hdot(v, n2) = hdot(v, n3) = 0
 */
function minkowskiNullVector(n1: number[], n2: number[], n3: number[]): number[] {
  // We want hdot(v, ni) = 0 for i=1,2,3
  // hdot(v, n) = v[0]*n[0] + v[1]*n[1] + v[2]*n[2] - v[3]*n[3]
  //
  // Write as matrix equation M * v = 0 where M incorporates the metric:
  // Row i: [ni[0], ni[1], ni[2], -ni[3]]
  //
  // We find the null space by Gaussian elimination

  // Build the 3x4 matrix with Minkowski metric built in
  const M = [
    [n1[0], n1[1], n1[2], -n1[3]],
    [n2[0], n2[1], n2[2], -n2[3]],
    [n3[0], n3[1], n3[2], -n3[3]],
  ]

  // Gaussian elimination to row echelon form
  for (let col = 0; col < 3; col++) {
    // Find pivot
    let maxRow = col
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) {
        maxRow = row
      }
    }

    // Swap rows
    if (maxRow !== col) {
      const temp = M[col]
      M[col] = M[maxRow]
      M[maxRow] = temp
    }

    const pivot = M[col][col]
    if (Math.abs(pivot) < 1e-10) continue

    // Eliminate below
    for (let row = col + 1; row < 3; row++) {
      const factor = M[row][col] / pivot
      for (let c = col; c < 4; c++) {
        M[row][c] -= factor * M[col][c]
      }
    }
  }

  // Back substitution to find null vector
  // Set v[3] = 1 (free variable), solve for v[0], v[1], v[2]
  const v = [0, 0, 0, 1]

  // Row 2: M[2][2]*v[2] + M[2][3]*v[3] = 0
  if (Math.abs(M[2][2]) > 1e-10) {
    v[2] = -M[2][3] * v[3] / M[2][2]
  }

  // Row 1: M[1][1]*v[1] + M[1][2]*v[2] + M[1][3]*v[3] = 0
  if (Math.abs(M[1][1]) > 1e-10) {
    v[1] = -(M[1][2] * v[2] + M[1][3] * v[3]) / M[1][1]
  }

  // Row 0: M[0][0]*v[0] + M[0][1]*v[1] + M[0][2]*v[2] + M[0][3]*v[3] = 0
  if (Math.abs(M[0][0]) > 1e-10) {
    v[0] = -(M[0][1] * v[1] + M[0][2] * v[2] + M[0][3] * v[3]) / M[0][0]
  }

  return v
}

/**
 * Compute the polyhedron vertex (intersection of B, C, D mirrors)
 * This is the vertex V_A - opposite to mirror A
 *
 * In {p,q,r}: this is where q faces of the {p,q} polyhedron meet
 * V_A is fixed by reflections B, C (within the cell) but NOT by A
 * So applying A generates new vertices
 */
function computePolyhedronVertex(mirrors: number[][]): number[] {
  const [A, B, C, D] = mirrors

  // V_A satisfies: hdot(V_A, B) = hdot(V_A, C) = hdot(V_A, D) = 0, hdot(V_A, V_A) = -1
  // It's perpendicular to B, C, D in Minkowski space

  // Use proper Minkowski null space computation
  const v = minkowskiNullVector(B, C, D)

  return hnormalize(v)
}

/**
 * Generate all vertices of the polyhedron by applying cell symmetry group
 */
function generatePolyhedronVertices(mirrors: number[][]): number[][] {
  const [A, B, C] = mirrors // Cell symmetry is generated by A, B, C (not D)

  // Start with the fundamental vertex (opposite mirror A)
  const v0 = computePolyhedronVertex(mirrors)

  const vertices: number[][] = []
  const visited = new Set<string>()

  function key(v: number[]): string {
    return v.map(x => Math.round(x * 1e5)).join(',')
  }

  // BFS through the cell symmetry group
  const queue: number[][] = [v0]
  visited.add(key(v0))
  vertices.push(v0)

  const maxVertices = 200 // Safety limit

  while (queue.length > 0 && vertices.length < maxVertices) {
    const v = queue.shift()!

    // Apply reflections A, B, C (cell symmetry generators)
    for (let i = 0; i < 3; i++) {
      const vr = reflect(v, mirrors[i])
      const k = key(vr)
      if (!visited.has(k)) {
        visited.add(k)
        vertices.push(vr)
        queue.push(vr)
      }
    }
  }

  return vertices
}

/**
 * Compute hyperbolic distance between two points
 */
function hyperbolicDistance(a: number[], b: number[]): number {
  const d = -hdot(a, b)
  return Math.acosh(Math.max(1, d))
}

/**
 * Find the edge length of the polyhedron
 */
function findEdgeLength(vertices: number[][]): number {
  if (vertices.length < 2) return 1

  // Find the minimum distance between distinct vertices
  let minDist = Infinity
  for (let i = 0; i < Math.min(vertices.length, 20); i++) {
    for (let j = i + 1; j < Math.min(vertices.length, 20); j++) {
      const d = hyperbolicDistance(vertices[i], vertices[j])
      if (d > 0.01 && d < minDist) {
        minDist = d
      }
    }
  }

  return minDist < Infinity ? minDist : 1
}

/**
 * Generate edges of the polyhedron
 */
function generatePolyhedronEdges(
  vertices: number[][],
): [number, number][] {
  const edges: [number, number][] = []
  const edgeLength = findEdgeLength(vertices)
  const tolerance = edgeLength * 1.2

  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const dist = hyperbolicDistance(vertices[i], vertices[j])
      if (dist > 0.01 && dist < tolerance) {
        edges.push([i, j])
      }
    }
  }

  return edges
}

/**
 * Apply 4x4 matrix (column-major) to 4-vector
 */
function applyMatrix(m: number[], v: number[]): number[] {
  const result = [0, 0, 0, 0]
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result[i] += m[j * 4 + i] * v[j]
    }
  }
  return result
}

/**
 * Create reflection matrix for hyperplane with normal n
 */
function reflectionMatrix(n: number[]): number[] {
  const nn = hdot(n, n)
  const f = 2.0 / nn
  const m = new Array(16).fill(0)

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const eta_j = j === 3 ? -1 : 1
      const delta = i === j ? 1 : 0
      m[j * 4 + i] = delta - f * n[i] * n[j] * eta_j
    }
  }
  return m
}

/**
 * Multiply two 4x4 matrices (column-major)
 */
function mulMatrix(a: number[], b: number[]): number[] {
  const result = new Array(16).fill(0)
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let sum = 0
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + i] * b[j * 4 + k]
      }
      result[j * 4 + i] = sum
    }
  }
  return result
}

/**
 * Identity 4x4 matrix
 */
function identity(): number[] {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
}

/**
 * Matrix key for deduplication
 */
function matrixKey(m: number[]): string {
  return m.map(v => Math.round(v * 1e5)).join(',')
}

/**
 * Compute matrix inverse for 4x4 Lorentz transformation
 * For orthogonal matrices M, M^(-1) = M^T, but we need to account for Minkowski metric
 */
function matrixInverse(m: number[]): number[] {
  // For Lorentz transformations, M^(-1) = η * M^T * η where η = diag(1,1,1,-1)
  // This simplifies to: flip signs of elements involving index 3
  const result = new Array(16).fill(0)
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      // Transpose: result[j*4+i] = m[i*4+j]
      // But with metric correction for Lorentz group
      let val = m[i * 4 + j]
      // Apply η from left and right: η_ii * val * η_jj
      // η_ii = 1 for i<3, -1 for i=3
      if ((i === 3) !== (j === 3)) {
        val = -val
      }
      result[j * 4 + i] = val
    }
  }
  return result
}

/**
 * Generate all face reflections by conjugating D with cell stabilizer elements
 * This gives reflections for all faces of the cell, not just one
 */
function generateFaceReflections(mirrors: number[][], maxStabilizerDepth: number = 15, maxStabilizerElements: number = 5000): number[][] {
  const reflections = mirrors.map(n => reflectionMatrix(n))
  const [A, B, C, D] = reflections
  const stabilizer = [A, B, C]

  // Generate cell stabilizer elements up to some depth
  // Also track inverses for proper conjugation
  const stabElements: { mat: number[]; inv: number[] }[] = [{ mat: identity(), inv: identity() }]
  const stabVisited = new Set<string>()
  stabVisited.add(matrixKey(identity()))

  const queue: { mat: number[]; inv: number[] }[] = [{ mat: identity(), inv: identity() }]

  for (let depth = 0; depth < maxStabilizerDepth && queue.length > 0 && stabElements.length < maxStabilizerElements; ) {
    const levelSize = queue.length
    for (let i = 0; i < levelSize && stabElements.length < maxStabilizerElements; i++) {
      const { mat: g, inv: gInv } = queue.shift()!

      for (let si = 0; si < 3; si++) {
        const S = stabilizer[si]
        // New element: S * g
        const H = mulMatrix(S, g)
        // Inverse: g^(-1) * S^(-1) = g^(-1) * S (since S is a reflection, S^(-1) = S)
        const HInv = mulMatrix(gInv, S)

        const k = matrixKey(H)
        if (!stabVisited.has(k)) {
          stabVisited.add(k)
          stabElements.push({ mat: H, inv: HInv })
          queue.push({ mat: H, inv: HInv })
        }
      }
    }
    depth++
  }

  // Conjugate D by all stabilizer elements to get all face reflections
  // g * D * g^(-1) gives the reflection across a different face
  const faceReflections: number[][] = []
  const faceVisited = new Set<string>()

  for (const { mat: g, inv: gInv } of stabElements) {
    const gD = mulMatrix(g, D)
    const gDgInv = mulMatrix(gD, gInv)
    const k = matrixKey(gDgInv)
    if (!faceVisited.has(k)) {
      faceVisited.add(k)
      faceReflections.push(gDgInv)
    }
  }

  console.log(`Generated ${faceReflections.length} face reflections from ${stabElements.length} stabilizer elements`)
  return faceReflections
}

/**
 * Enumerate cell transforms using BFS.
 *
 * For compact cells (finite stabilizer), uses face reflections (conjugates of D)
 * to step between cells. This is efficient and exact.
 *
 * For non-compact cells (infinite stabilizer), face reflections are incomplete,
 * so we BFS through the full Coxeter group (all 4 reflections) and identify
 * unique cells by where they map the cell center. This explores uniformly
 * in all directions.
 */
function enumerateCellTransforms(
  mirrors: number[][],
  maxCellLayers: number,
  maxCells: number = 500,
): number[][] {
  const isCompact = 1 - mirrors[2][0] ** 2 - mirrors[2][1] ** 2 >= 0

  if (isCompact) {
    return enumerateCellTransformsFaceReflections(mirrors, maxCellLayers, maxCells)
  }
  return enumerateCellTransformsCoxeterBFS(mirrors, maxCells)
}

/**
 * Cell enumeration via face reflections (compact cells only).
 */
function enumerateCellTransformsFaceReflections(
  mirrors: number[][],
  maxCellLayers: number,
  maxCells: number,
): number[][] {
  const faceReflections = generateFaceReflections(mirrors)

  const transforms: number[][] = []
  const visited = new Set<string>()

  const I = identity()
  visited.add(matrixKey(I))
  transforms.push(I)

  const queue: { mat: number[]; depth: number }[] = [{ mat: I, depth: 0 }]

  while (queue.length > 0 && transforms.length < maxCells) {
    const { mat, depth } = queue.shift()!
    if (depth >= maxCellLayers) continue

    for (const F of faceReflections) {
      if (transforms.length >= maxCells) break
      const H = mulMatrix(F, mat)
      const k = matrixKey(H)
      if (!visited.has(k)) {
        visited.add(k)
        transforms.push(H)
        queue.push({ mat: H, depth: depth + 1 })
      }
    }
  }

  console.log(`Face-reflection BFS: ${transforms.length} cells at depth ${maxCellLayers}`)
  return transforms
}

/**
 * Cell enumeration via full Coxeter group BFS (non-compact cells).
 *
 * BFS through all 4 reflection matrices, identifying unique cells
 * by where the cell center maps to. This ensures uniform exploration
 * in all directions even when face reflections are incomplete.
 */
function enumerateCellTransformsCoxeterBFS(
  mirrors: number[][],
  maxCells: number,
): number[][] {
  const reflections = mirrors.map(n => reflectionMatrix(n))
  const cellCenter = computeCellCenter(mirrors)

  function centerKey(m: number[]): string {
    const c = applyMatrix(m, cellCenter)
    return c.map(v => Math.round(v * 1e4)).join(',')
  }

  const transforms: number[][] = []
  const groupVisited = new Set<string>()
  const cellVisited = new Set<string>()

  const I = identity()
  groupVisited.add(matrixKey(I))
  cellVisited.add(centerKey(I))
  transforms.push(I)

  // BFS through the full Coxeter group
  const queue: number[][] = [I]
  const maxGroupElements = maxCells * 50 // explore enough group elements

  while (queue.length > 0 && groupVisited.size < maxGroupElements && transforms.length < maxCells) {
    const g = queue.shift()!

    for (const R of reflections) {
      const h = mulMatrix(R, g)
      const gk = matrixKey(h)

      if (groupVisited.has(gk)) continue
      groupVisited.add(gk)

      // Check if this maps cell center to a new location
      const ck = centerKey(h)
      if (!cellVisited.has(ck)) {
        cellVisited.add(ck)
        transforms.push(h)
      }

      queue.push(h)
    }
  }

  console.log(`Coxeter BFS: ${transforms.length} cells from ${groupVisited.size} group elements`)
  return transforms
}

export interface HoneycombMeshOptions {
  p: number
  q: number
  r: number
  maxDepth: number
  edgeRadius?: number
  edgeSegments?: number
  showVertices?: boolean
  vertexRadius?: number
}

/**
 * Generate Three.js geometry for a hyperbolic honeycomb
 */
export function generateHoneycombMesh(
  options: HoneycombMeshOptions,
): THREE.Group {
  const {
    p,
    q,
    r,
    maxDepth,
    edgeRadius = 0.015,
    edgeSegments = 6,
  } = options

  const group = new THREE.Group()
  const mirrors = computeCoxeterMirrors(p, q, r)

  const baseVertices = generatePolyhedronVertices(mirrors)
  const edges = generatePolyhedronEdges(baseVertices)
  const cellTransforms = enumerateCellTransforms(mirrors, maxDepth)

  console.log(`{${p},${q},${r}}: ${baseVertices.length} vertices, ${edges.length} edges, ${cellTransforms.length} cells`)

  const materials = createEdgeMaterials()
  const edgeSet = new Set<string>()

  for (const transform of cellTransforms) {
    if (group.children.length >= 50000) break

    const transformedVertices = baseVertices.map(v => {
      const tv = applyMatrix(transform, v)
      return hyperboloidToPoincare(tv)
    })

    for (const [i, j] of edges) {
      const v1 = transformedVertices[i]
      const v2 = transformedVertices[j]

      if (v1.length() > 0.995 || v2.length() > 0.995) continue

      const ek = pairKey(v1, v2)
      if (edgeSet.has(ek)) continue
      edgeSet.add(ek)

      addEdgeMesh(group, v1, v2, edgeRadius, edgeSegments, materials)
    }
  }

  if (options.showVertices !== false) {
    addVertexSpheres(group, baseVertices, cellTransforms, options, materials)
  }

  return group
}

/**
 * Create zinc-toned materials for edge rendering
 */
function createEdgeMaterials(): THREE.MeshStandardMaterial[] {
  const zincColors = [
    0xe4e4e7, 0xd4d4d8, 0xa1a1aa, 0x71717a, 0x52525b,
  ]
  return zincColors.map(
    color =>
      new THREE.MeshStandardMaterial({
        color,
        metalness: 0.5,
        roughness: 0.3,
      }),
  )
}

/**
 * Poincaré-space key for edge deduplication
 */
function pairKey(p1: THREE.Vector3, p2: THREE.Vector3): string {
  const a = [
    Math.round(p1.x * 1e4),
    Math.round(p1.y * 1e4),
    Math.round(p1.z * 1e4),
  ].join(',')
  const b = [
    Math.round(p2.x * 1e4),
    Math.round(p2.y * 1e4),
    Math.round(p2.z * 1e4),
  ].join(',')
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/**
 * Add a cylinder mesh between two Poincaré-ball points
 */
function addEdgeMesh(
  group: THREE.Group,
  v1: THREE.Vector3,
  v2: THREE.Vector3,
  edgeRadius: number,
  edgeSegments: number,
  materials: THREE.MeshStandardMaterial[],
): void {
  const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5)
  const direction = new THREE.Vector3().subVectors(v2, v1)
  const length = direction.length()

  if (length < 0.001) return

  direction.normalize()

  const geometry = new THREE.CylinderGeometry(
    edgeRadius,
    edgeRadius,
    length,
    edgeSegments,
  )

  const distFromOrigin = mid.length()
  const materialIndex = Math.min(
    Math.floor(distFromOrigin * materials.length * 1.5),
    materials.length - 1,
  )
  const mesh = new THREE.Mesh(geometry, materials[materialIndex])
  mesh.position.copy(mid)
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction,
  )

  group.add(mesh)
}

/**
 * Add vertex spheres for compact honeycomb rendering
 */
function addVertexSpheres(
  group: THREE.Group,
  baseVertices: number[][],
  cellTransforms: number[][],
  options: HoneycombMeshOptions,
  materials: THREE.MeshStandardMaterial[],
): void {
  const vertexRadius = options.vertexRadius ?? (options.edgeRadius ?? 0.015) * 1.5
  const vertexGeometry = new THREE.SphereGeometry(vertexRadius, 8, 6)

  const vertexSet = new Set<string>()

  for (const transform of cellTransforms) {
    const transformedVertices = baseVertices.map(v => {
      const tv = applyMatrix(transform, v)
      return hyperboloidToPoincare(tv)
    })

    for (const v of transformedVertices) {
      if (v.length() > 0.995) continue
      const vk = [
        Math.round(v.x * 1e4),
        Math.round(v.y * 1e4),
        Math.round(v.z * 1e4),
      ].join(',')
      if (vertexSet.has(vk)) continue
      vertexSet.add(vk)

      const distFromOrigin = v.length()
      const materialIndex = Math.min(
        Math.floor(distFromOrigin * materials.length * 1.5),
        materials.length - 1,
      )
      const mesh = new THREE.Mesh(vertexGeometry, materials[materialIndex])
      mesh.position.copy(v)
      group.add(mesh)
    }
  }
}

/**
 * Create honeycomb scene
 */
export function createHoneycombScene(
  p: number,
  q: number,
  r: number,
  maxDepth: number,
): THREE.Group {
  return generateHoneycombMesh({
    p,
    q,
    r,
    maxDepth,
    edgeRadius: 0.006, // Thinner bars
    edgeSegments: 6,
    showVertices: false, // No vertex balls
  })
}
