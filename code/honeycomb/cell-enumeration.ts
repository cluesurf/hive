/**
 * Cell Enumeration for Hyperbolic Honeycombs
 *
 * Implements BFS over cell adjacency graph to enumerate cells to depth N.
 * Uses reflection generators from Coxeter mirrors.
 */

/**
 * Minkowski inner product for 4-vectors (signature +,+,+,-)
 */
function minkowskiDot(a: number[], b: number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] - a[3] * b[3]
}

/**
 * Create identity 4x4 matrix (column-major, like gl-matrix)
 */
function identity4(): number[] {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
}

/**
 * Multiply two 4x4 matrices (column-major)
 */
function mul4(a: number[], b: number[]): number[] {
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
 * Create reflection matrix for hyperplane with normal n (hyperboloid model)
 * R = I - 2 * n * n^T * eta / <n,n>
 * where eta = diag(1,1,1,-1)
 */
function reflectionMatrix4(n: number[]): number[] {
  const nn = minkowskiDot(n, n)
  const f = 2.0 / nn
  const m = new Array(16).fill(0)

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const eta_j = j === 3 ? -1 : 1
      const delta = i === j ? 1 : 0
      // Column-major: m[col * 4 + row] = m[j * 4 + i]
      m[j * 4 + i] = delta - f * n[i] * n[j] * eta_j
    }
  }
  return m
}

/**
 * Quantize a 4x4 matrix to create a hashable key
 */
function matrixKey(m: number[], precision: number = 1e6): string {
  return m.map((v) => Math.round(v * precision)).join(',')
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
  const c01 = -Math.cos(PI / p) // AB
  const c02 = -Math.cos(PI / 2) // AC (perpendicular)
  const c03 = -Math.cos(PI / 2) // AD (perpendicular)
  const c12 = -Math.cos(PI / q) // BC
  const c13 = -Math.cos(PI / 2) // BD (perpendicular)
  const c23 = -Math.cos(PI / r) // CD

  const A = [1, 0, 0, 0]
  const B = [c01, Math.sqrt(1 - c01 * c01), 0, 0]
  const C = [c02, 0, 0, 0]
  C[1] = (c12 - C[0] * B[0]) / B[1]
  C[2] = Math.sqrt(Math.abs(1 - C[0] * C[0] - C[1] * C[1]))

  const D = [c03, 0, 0, 0]
  D[1] = (c13 - D[0] * B[0]) / B[1]
  D[2] = (c23 - D[0] * C[0] - D[1] * C[1]) / C[2]
  D[3] = -Math.sqrt(Math.abs(D[0] * D[0] + D[1] * D[1] + D[2] * D[2] - 1))

  return [A, B, C, D]
}

export interface CellEnumeration {
  /** Flat array of 4x4 matrices (16 floats each, column-major) */
  matrices: Float32Array
  /** Depth of each cell */
  depths: Int32Array
  /** Number of cells */
  count: number
}

/**
 * Enumerate cells to a given depth using BFS.
 * Uses the 4 Coxeter reflection matrices as generators.
 */
export function enumerateCells(
  p: number,
  q: number,
  r: number,
  maxDepth: number,
): CellEnumeration {
  const mirrors = computeCoxeterMirrors(p, q, r)
  const reflections = mirrors.map((n) => reflectionMatrix4(n))

  const depthByKey = new Map<string, number>()
  const matrixByKey = new Map<string, number[]>()

  // Start with identity
  const I = identity4()
  const k0 = matrixKey(I)
  depthByKey.set(k0, 0)
  matrixByKey.set(k0, I)

  const queue: number[][] = [I]

  while (queue.length > 0) {
    const G = queue.shift()!
    const gKey = matrixKey(G)
    const d = depthByKey.get(gKey)!

    if (d >= maxDepth) continue

    // Apply each reflection generator
    for (const R of reflections) {
      const H = mul4(R, G)
      const hKey = matrixKey(H)

      if (!depthByKey.has(hKey)) {
        depthByKey.set(hKey, d + 1)
        matrixByKey.set(hKey, H)
        queue.push(H)
      }
    }
  }

  // Convert to GPU format
  const count = depthByKey.size
  const matrices = new Float32Array(count * 16)
  const depths = new Int32Array(count)

  let i = 0
  for (const [key, depth] of depthByKey) {
    const m = matrixByKey.get(key)!
    for (let j = 0; j < 16; j++) {
      matrices[i * 16 + j] = m[j]
    }
    depths[i] = depth
    i++
  }

  return { matrices, depths, count }
}

/**
 * Get expected cell count for given depth (approximate)
 */
export function estimateCellCount(
  p: number,
  q: number,
  r: number,
  depth: number,
): number {
  // Very rough estimate based on branching factor
  // Each cell has roughly p*q/(p+q-2) neighbors (varies by honeycomb)
  let count = 1
  let frontier = 1
  for (let d = 0; d < depth; d++) {
    const newFrontier = frontier * 4 // 4 generators
    count += newFrontier
    frontier = newFrontier
  }
  return count
}
