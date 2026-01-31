import { mat3, mat4, vec3, vec4 } from 'gl-matrix'

/**
 * A matrix stored as a flat array in row-major order.
 * We use number[] for flexibility, but internally leverage gl-matrix
 * for optimized operations.
 */
export type Matrix = number[]

/**
 * Create an identity matrix of given size.
 */
export function identity(size: number): Matrix {
  if (size === 3) {
    return Array.from(mat3.create())
  } else if (size === 4) {
    return Array.from(mat4.create())
  }
  // Fallback for other sizes
  const m: Matrix = new Array(size * size).fill(0)
  for (let i = 0; i < size; i++) {
    m[i * size + i] = 1
  }
  return m
}

/**
 * Convert a number[] matrix to a mat3 (gl-matrix uses column-major order).
 * Our matrices are stored in row-major, so we transpose during conversion.
 */
function toMat3(m: Matrix): mat3 {
  const result = mat3.create()
  // gl-matrix is column-major, our storage is row-major
  // gl-matrix mat3: [m00, m10, m20, m01, m11, m21, m02, m12, m22]
  // row-major mat3: [m00, m01, m02, m10, m11, m12, m20, m21, m22]
  result[0] = m[0] ?? 0
  result[1] = m[3] ?? 0
  result[2] = m[6] ?? 0
  result[3] = m[1] ?? 0
  result[4] = m[4] ?? 0
  result[5] = m[7] ?? 0
  result[6] = m[2] ?? 0
  result[7] = m[5] ?? 0
  result[8] = m[8] ?? 0
  return result
}

/**
 * Convert a mat3 back to a row-major number[] matrix.
 */
function fromMat3(m: mat3): Matrix {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]
}

/**
 * Convert a number[] matrix to a mat4 (gl-matrix uses column-major order).
 */
function toMat4(m: Matrix): mat4 {
  const result = mat4.create()
  // gl-matrix is column-major, our storage is row-major
  result[0] = m[0] ?? 0
  result[1] = m[4] ?? 0
  result[2] = m[8] ?? 0
  result[3] = m[12] ?? 0
  result[4] = m[1] ?? 0
  result[5] = m[5] ?? 0
  result[6] = m[9] ?? 0
  result[7] = m[13] ?? 0
  result[8] = m[2] ?? 0
  result[9] = m[6] ?? 0
  result[10] = m[10] ?? 0
  result[11] = m[14] ?? 0
  result[12] = m[3] ?? 0
  result[13] = m[7] ?? 0
  result[14] = m[11] ?? 0
  result[15] = m[15] ?? 0
  return result
}

/**
 * Convert a mat4 back to a row-major number[] matrix.
 */
function fromMat4(m: mat4): Matrix {
  return [
    m[0],
    m[4],
    m[8],
    m[12],
    m[1],
    m[5],
    m[9],
    m[13],
    m[2],
    m[6],
    m[10],
    m[14],
    m[3],
    m[7],
    m[11],
    m[15],
  ]
}

/**
 * Multiply two square matrices of the same size.
 * Uses gl-matrix for 3x3 and 4x4 matrices.
 */
export function multiply(a: Matrix, b: Matrix): Matrix {
  const size = Math.sqrt(a.length)

  if (size === 3) {
    const result = mat3.create()
    mat3.multiply(result, toMat3(a), toMat3(b))
    return fromMat3(result)
  } else if (size === 4) {
    const result = mat4.create()
    mat4.multiply(result, toMat4(a), toMat4(b))
    return fromMat4(result)
  }

  // Fallback for other sizes
  if (!Number.isInteger(size)) {
    throw new Error('Matrix must be square')
  }
  const result: Matrix = new Array(a.length).fill(0)

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      let sum = 0
      for (let k = 0; k < size; k++) {
        sum += (a[i * size + k] ?? 0) * (b[k * size + j] ?? 0)
      }
      result[i * size + j] = sum
    }
  }

  return result
}

/**
 * Apply a matrix to a point (matrix-vector multiplication).
 * Uses gl-matrix for 3D and 4D vectors.
 */
export function applyToPoint(m: Matrix, p: number[]): number[] {
  const size = p.length

  if (size === 3 && m.length === 9) {
    const v = vec3.fromValues(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0)
    const result = vec3.create()
    vec3.transformMat3(result, v, toMat3(m))
    return [result[0], result[1], result[2]]
  } else if (size === 4 && m.length === 16) {
    const v = vec4.fromValues(
      p[0] ?? 0,
      p[1] ?? 0,
      p[2] ?? 0,
      p[3] ?? 0,
    )
    const result = vec4.create()
    vec4.transformMat4(result, v, toMat4(m))
    return [result[0], result[1], result[2], result[3]]
  }

  // Fallback for other sizes
  const result: number[] = new Array(size).fill(0)
  for (let i = 0; i < size; i++) {
    let sum = 0
    for (let j = 0; j < size; j++) {
      sum += (m[i * size + j] ?? 0) * (p[j] ?? 0)
    }
    result[i] = sum
  }

  return result
}

/**
 * Compose multiple matrices (left to right application order).
 */
export function compose(...matrices: Matrix[]): Matrix {
  if (matrices.length === 0) {
    throw new Error('At least one matrix required')
  }
  let result = matrices[0]!
  for (let i = 1; i < matrices.length; i++) {
    result = multiply(result, matrices[i]!)
  }
  return result
}

/**
 * Transpose a square matrix.
 * Uses gl-matrix for 3x3 and 4x4 matrices.
 */
export function transpose(m: Matrix): Matrix {
  const size = Math.sqrt(m.length)

  if (size === 3) {
    const result = mat3.create()
    mat3.transpose(result, toMat3(m))
    return fromMat3(result)
  } else if (size === 4) {
    const result = mat4.create()
    mat4.transpose(result, toMat4(m))
    return fromMat4(result)
  }

  // Fallback for other sizes
  const result: Matrix = new Array(m.length)
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      result[j * size + i] = m[i * size + j] ?? 0
    }
  }

  return result
}

/**
 * Invert a square matrix.
 * Uses gl-matrix for 3x3 and 4x4 matrices.
 */
export function invert(m: Matrix): Matrix | null {
  const size = Math.sqrt(m.length)

  if (size === 3) {
    const result = mat3.create()
    const inverted = mat3.invert(result, toMat3(m))
    return inverted ? fromMat3(result) : null
  } else if (size === 4) {
    const result = mat4.create()
    const inverted = mat4.invert(result, toMat4(m))
    return inverted ? fromMat4(result) : null
  }

  // No fallback for other sizes - would need Gaussian elimination
  throw new Error('Inversion only supported for 3x3 and 4x4 matrices')
}

/**
 * Calculate the determinant of a square matrix.
 * Uses gl-matrix for 3x3 and 4x4 matrices.
 */
export function determinant(m: Matrix): number {
  const size = Math.sqrt(m.length)

  if (size === 3) {
    return mat3.determinant(toMat3(m))
  } else if (size === 4) {
    return mat4.determinant(toMat4(m))
  }

  throw new Error('Determinant only supported for 3x3 and 4x4 matrices')
}
