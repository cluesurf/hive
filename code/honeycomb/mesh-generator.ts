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
 * Normalize a hyperboloid point
 */
function hnormalize(p: number[]): number[] {
  const sq = -hdot(p, p)
  if (sq <= 0) return [0, 0, 0, 1] // fallback
  const norm = Math.sqrt(sq)
  return [p[0] / norm, p[1] / norm, p[2] / norm, p[3] / norm]
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
    p[3] + f * n[3], // + because η_33 = -1
  ]
}

/**
 * Compute Coxeter mirror normals for {p,q,r} honeycomb
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

  // Gram-Schmidt-like construction for mirror normals
  const A: number[] = [1, 0, 0, 0]

  const B: number[] = [c01, Math.sqrt(1 - c01 * c01), 0, 0]

  const C: number[] = [c02, 0, 0, 0]
  C[1] = (c12 - C[0] * B[0]) / B[1]
  const c2sq = 1 - C[0] * C[0] - C[1] * C[1]
  C[2] = Math.sqrt(Math.max(0, c2sq))

  const D: number[] = [c03, 0, 0, 0]
  D[1] = (c13 - D[0] * B[0]) / B[1]
  D[2] = (c23 - D[0] * C[0] - D[1] * C[1]) / C[2]
  const d3sq = D[0] * D[0] + D[1] * D[1] + D[2] * D[2] - 1
  D[3] = -Math.sqrt(Math.max(0, d3sq))

  return [A, B, C, D]
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

  console.log('Raw vertex v:', v, 'hdot(v,v):', hdot(v, v))

  // Normalize to hyperboloid
  const result = hnormalize(v)
  console.log('Normalized vertex:', result)
  console.log('Verify: hdot(v,B)=', hdot(result, B).toFixed(6), 'hdot(v,C)=', hdot(result, C).toFixed(6), 'hdot(v,D)=', hdot(result, D).toFixed(6))

  return result
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
function generateFaceReflections(mirrors: number[][], maxStabilizerDepth: number = 15): number[][] {
  const reflections = mirrors.map(n => reflectionMatrix(n))
  const [A, B, C, D] = reflections
  const stabilizer = [A, B, C]

  // Generate cell stabilizer elements up to some depth
  // Also track inverses for proper conjugation
  const stabElements: { mat: number[]; inv: number[] }[] = [{ mat: identity(), inv: identity() }]
  const stabVisited = new Set<string>()
  stabVisited.add(matrixKey(identity()))

  const queue: { mat: number[]; inv: number[] }[] = [{ mat: identity(), inv: identity() }]

  for (let depth = 0; depth < maxStabilizerDepth && queue.length > 0; ) {
    const levelSize = queue.length
    for (let i = 0; i < levelSize; i++) {
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
 * Enumerate cell transforms using BFS by cell layers
 * Uses all face reflections to ensure uniform exploration in all directions
 */
function enumerateCellTransforms(
  mirrors: number[][],
  maxCellLayers: number,
): number[][] {
  // Generate all face reflections (not just D)
  const faceReflections = generateFaceReflections(mirrors)

  const transforms: number[][] = []
  const visited = new Set<string>()

  const I = identity()
  const k0 = matrixKey(I)
  visited.add(k0)
  transforms.push(I)

  // BFS using face reflections - each application crosses one cell boundary
  const queue: { mat: number[]; depth: number }[] = [{ mat: I, depth: 0 }]

  while (queue.length > 0) {
    const { mat, depth } = queue.shift()!

    if (depth >= maxCellLayers) continue

    // Apply all face reflections
    for (const F of faceReflections) {
      const H = mulMatrix(F, mat)
      const k = matrixKey(H)

      if (!visited.has(k)) {
        visited.add(k)
        transforms.push(H)
        queue.push({ mat: H, depth: depth + 1 })
      }
    }
  }

  console.log(`Enumerated ${transforms.length} cells at depth ${maxCellLayers}`)
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

  // Compute Coxeter mirrors
  const mirrors = computeCoxeterMirrors(p, q, r)
  console.log('Mirrors:', mirrors)

  // Generate base polyhedron vertices first
  const baseVertices = generatePolyhedronVertices(mirrors)
  console.log(`Generated ${baseVertices.length} base vertices`)

  // Compute cell center as centroid of vertices in Poincaré space
  let centroidX = 0, centroidY = 0, centroidZ = 0
  for (const v of baseVertices) {
    const pv = hyperboloidToPoincare(v)
    centroidX += pv.x
    centroidY += pv.y
    centroidZ += pv.z
  }
  const n = baseVertices.length
  const cellCenterPoincare = new THREE.Vector3(centroidX / n, centroidY / n, centroidZ / n)
  console.log('Cell center (Poincaré centroid):', cellCenterPoincare, 'length:', cellCenterPoincare.length())

  // Generate edges
  const edges = generatePolyhedronEdges(baseVertices)
  console.log(`Generated ${edges.length} edges, edge length: ${findEdgeLength(baseVertices).toFixed(3)}`)

  // Enumerate cell transforms
  const cellTransforms = enumerateCellTransforms(mirrors, maxDepth)
  console.log(`Enumerated ${cellTransforms.length} cells`)

  // Zinc color palette for edges
  const zincColors = [
    0xe4e4e7, // zinc-200
    0xd4d4d8, // zinc-300
    0xa1a1aa, // zinc-400
    0x71717a, // zinc-500
    0x52525b, // zinc-600
  ]

  // Create materials for different shades - more metallic for better 3D depth
  const materials = zincColors.map(
    color =>
      new THREE.MeshStandardMaterial({
        color,
        metalness: 0.5,
        roughness: 0.3, // Shinier for better specular highlights
      }),
  )

  // Track unique edges to avoid duplicates
  const edgeSet = new Set<string>()

  function edgeKey(p1: THREE.Vector3, p2: THREE.Vector3): string {
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

  let skippedClipping = 0
  let skippedDuplicate = 0
  let skippedTooShort = 0

  // For each cell, transform vertices and create edge geometry
  for (const transform of cellTransforms) {
    // Transform all vertices to Poincaré ball
    const transformedVertices = baseVertices.map(v => {
      const tv = applyMatrix(transform, v)
      return hyperboloidToPoincare(tv)
    })

    // Create tube geometry for each edge
    for (const [i, j] of edges) {
      const v1 = transformedVertices[i]
      const v2 = transformedVertices[j]

      // Skip edges with vertices too close to boundary (they would appear infinitely large)
      if (v1.length() > 0.995 || v2.length() > 0.995) {
        skippedClipping++
        continue
      }

      // Skip duplicate edges
      const ek = edgeKey(v1, v2)
      if (edgeSet.has(ek)) {
        skippedDuplicate++
        continue
      }
      edgeSet.add(ek)

      // Create cylinder
      const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5)
      const direction = new THREE.Vector3().subVectors(v2, v1)
      const length = direction.length()

      if (length < 0.001) {
        skippedTooShort++
        continue
      }

      direction.normalize()

      const geometry = new THREE.CylinderGeometry(
        edgeRadius,
        edgeRadius,
        length,
        edgeSegments,
      )

      // Pick material based on distance from origin for visual variety
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
  }

  const edgeCount = group.children.length
  console.log(`Created ${edgeCount} edge meshes (skipped: ${skippedClipping} clipping, ${skippedDuplicate} duplicate, ${skippedTooShort} too short)`)

  // Optionally add vertex spheres
  if (options.showVertices !== false) {
    const vertexRadius = options.vertexRadius ?? edgeRadius * 1.5
    const vertexGeometry = new THREE.SphereGeometry(vertexRadius, 8, 6)

    const vertexSet = new Set<string>()
    function vertexKey(v: THREE.Vector3): string {
      return [
        Math.round(v.x * 1e4),
        Math.round(v.y * 1e4),
        Math.round(v.z * 1e4),
      ].join(',')
    }

    for (const transform of cellTransforms) {
      const transformedVertices = baseVertices.map(v => {
        const tv = applyMatrix(transform, v)
        return hyperboloidToPoincare(tv)
      })

      for (const v of transformedVertices) {
        if (v.length() > 0.995) continue
        const vk = vertexKey(v)
        if (vertexSet.has(vk)) continue
        vertexSet.add(vk)

        // Use same color scheme as edges based on distance
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

    console.log(`Added ${group.children.length - edgeCount} vertex spheres`)
  }

  return group
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
