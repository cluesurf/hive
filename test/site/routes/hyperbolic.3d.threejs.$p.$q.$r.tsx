import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, Link } from '@remix-run/react'
import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    {
      title: `{${data?.p},${data?.q},${data?.r}} Hyperbolic Honeycomb (Three.js)`,
    },
  ]
}

export async function loader({ params }: LoaderFunctionArgs) {
  const p = parseInt(params.p ?? '5', 10)
  const q = parseInt(params.q ?? '3', 10)
  const r = parseInt(params.r ?? '4', 10)
  const schlaefliSum = 1 / p + 1 / q + 1 / r
  const isHyperbolic = schlaefliSum < 1
  return { p, q, r, isHyperbolic, schlaefliSum }
}

// ============================================
// Hyperboloid Model Mathematics
// ============================================

// Point on hyperboloid: x² + y² + z² - w² = -1, w > 0
type HyperboloidPoint = [number, number, number, number]

// Minkowski inner product
function minkowskiDot(a: HyperboloidPoint, b: HyperboloidPoint): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] - a[3] * b[3]
}

// Origin on hyperboloid
const ORIGIN: HyperboloidPoint = [0, 0, 0, 1]

// Convert hyperboloid to Poincare ball
function hyperboloidToBall(p: HyperboloidPoint): THREE.Vector3 {
  const [x, y, z, w] = p
  const denom = w + 1
  return new THREE.Vector3(x / denom, y / denom, z / denom)
}

// Convert Poincare ball to hyperboloid
function ballToHyperboloid(p: THREE.Vector3): HyperboloidPoint {
  const r2 = p.x * p.x + p.y * p.y + p.z * p.z
  const denom = 1 - r2
  return [
    (2 * p.x) / denom,
    (2 * p.y) / denom,
    (2 * p.z) / denom,
    (1 + r2) / denom,
  ]
}

// Hyperbolic distance
function hyperbolicDistance(a: HyperboloidPoint, b: HyperboloidPoint): number {
  const dot = -minkowskiDot(a, b)
  return Math.acosh(Math.max(1, dot))
}

// ============================================
// Lorentz Transforms (SO(3,1))
// ============================================

type LorentzMatrix = number[] // 16 elements, row-major 4x4

function identityLorentz(): LorentzMatrix {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
}

function applyLorentz(m: LorentzMatrix, p: HyperboloidPoint): HyperboloidPoint {
  const [x, y, z, w] = p
  return [
    m[0] * x + m[1] * y + m[2] * z + m[3] * w,
    m[4] * x + m[5] * y + m[6] * z + m[7] * w,
    m[8] * x + m[9] * y + m[10] * z + m[11] * w,
    m[12] * x + m[13] * y + m[14] * z + m[15] * w,
  ]
}

function composeLorentz(a: LorentzMatrix, b: LorentzMatrix): LorentzMatrix {
  const result: number[] = new Array(16).fill(0)
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      for (let k = 0; k < 4; k++) {
        result[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j]
      }
    }
  }
  return result
}

// Create hyperbolic translation (boost) along direction
function createBoost(
  direction: [number, number, number],
  distance: number,
): LorentzMatrix {
  const [dx, dy, dz] = direction
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
  if (len < 1e-10) return identityLorentz()

  const nx = dx / len
  const ny = dy / len
  const nz = dz / len

  const c = Math.cosh(distance)
  const s = Math.sinh(distance)

  // Lorentz boost matrix
  return [
    1 + (c - 1) * nx * nx,
    (c - 1) * nx * ny,
    (c - 1) * nx * nz,
    s * nx,
    (c - 1) * ny * nx,
    1 + (c - 1) * ny * ny,
    (c - 1) * ny * nz,
    s * ny,
    (c - 1) * nz * nx,
    (c - 1) * nz * ny,
    1 + (c - 1) * nz * nz,
    s * nz,
    s * nx,
    s * ny,
    s * nz,
    c,
  ]
}

// ============================================
// Dodecahedron Geometry (for {5,3,4})
// ============================================

function createDodecahedronVertices(edgeLength: number): HyperboloidPoint[] {
  // Golden ratio
  const phi = (1 + Math.sqrt(5)) / 2

  // Dodecahedron vertices in Euclidean space (scaled)
  const scale = edgeLength / 2

  const coords: [number, number, number][] = []

  // Cube vertices (±1, ±1, ±1)
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        coords.push([sx * scale, sy * scale, sz * scale])
      }
    }
  }

  // Rectangle vertices
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      coords.push([0, sx * phi * scale, sy * (1 / phi) * scale])
      coords.push([sx * (1 / phi) * scale, 0, sy * phi * scale])
      coords.push([sx * phi * scale, sy * (1 / phi) * scale, 0])
    }
  }

  // Convert to hyperboloid (map tangent space to hyperboloid)
  return coords.map(([x, y, z]) => {
    const r = Math.sqrt(x * x + y * y + z * z)
    if (r < 1e-10) return ORIGIN
    // Point on hyperboloid at distance r from origin in direction (x,y,z)
    const w = Math.cosh(r)
    const s = Math.sinh(r) / r
    return [x * s, y * s, z * s, w] as HyperboloidPoint
  })
}

// Dodecahedron edges (pairs of vertex indices)
const DODECAHEDRON_EDGES: [number, number][] = [
  // This is a simplified edge list - proper dodecahedron has 30 edges
  // For now, generate edges by finding vertices at edge-length distance
]

function generateDodecahedronEdges(
  vertices: HyperboloidPoint[],
): [number, number][] {
  const edges: [number, number][] = []
  const edgeThreshold = 1.5 // Adjust based on actual edge length

  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const dist = hyperbolicDistance(vertices[i], vertices[j])
      if (dist < edgeThreshold) {
        edges.push([i, j])
      }
    }
  }

  return edges
}

// ============================================
// Cell Generation via BFS
// ============================================

interface Cell {
  id: string
  transform: LorentzMatrix
  vertices: HyperboloidPoint[]
  depth: number
}

function generateCells(
  baseVertices: HyperboloidPoint[],
  maxDepth: number,
  maxCells: number,
): Cell[] {
  const cells: Cell[] = []
  const visited = new Set<string>()

  // Face-crossing transforms for dodecahedron
  // Each face has a neighbor - we translate across faces
  const faceTransforms = createFaceTransforms(baseVertices)

  const queue: { transform: LorentzMatrix; depth: number }[] = [
    { transform: identityLorentz(), depth: 0 },
  ]

  while (queue.length > 0 && cells.length < maxCells) {
    const { transform, depth } = queue.shift()!

    // Hash the transform to avoid duplicates
    const center = applyLorentz(transform, ORIGIN)
    const hash = `${center[0].toFixed(3)},${center[1].toFixed(3)},${center[2].toFixed(3)}`

    if (visited.has(hash)) continue
    visited.add(hash)

    // Transform base vertices
    const vertices = baseVertices.map(v => applyLorentz(transform, v))

    cells.push({
      id: hash,
      transform,
      vertices,
      depth,
    })

    // Add neighbors to queue
    if (depth < maxDepth) {
      for (const ft of faceTransforms) {
        const newTransform = composeLorentz(transform, ft)
        queue.push({ transform: newTransform, depth: depth + 1 })
      }
    }
  }

  return cells
}

function createFaceTransforms(vertices: HyperboloidPoint[]): LorentzMatrix[] {
  // For each face of the dodecahedron, create a transform to the neighbor cell
  // This is a simplified version - proper implementation needs face geometry

  // For now, create transforms in 12 face directions (dodecahedron has 12 faces)
  const transforms: LorentzMatrix[] = []

  // Approximate face center directions
  const faceDirections: [number, number, number][] = [
    [1, 1, 1],
    [1, 1, -1],
    [1, -1, 1],
    [1, -1, -1],
    [-1, 1, 1],
    [-1, 1, -1],
    [-1, -1, 1],
    [-1, -1, -1],
    [0, 1, 0],
    [0, -1, 0],
    [1, 0, 0],
    [-1, 0, 0],
  ]

  // Distance between cell centers (hyperbolic)
  const cellDistance = 1.2 // Adjust based on {5,3,4} geometry

  for (const dir of faceDirections) {
    const len = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2)
    const normalized: [number, number, number] = [
      dir[0] / len,
      dir[1] / len,
      dir[2] / len,
    ]
    transforms.push(createBoost(normalized, cellDistance))
  }

  return transforms
}

// ============================================
// Three.js Rendering
// ============================================

function createEdgeGeometry(
  cells: Cell[],
  edges: [number, number][],
): THREE.BufferGeometry {
  const positions: number[] = []

  for (const cell of cells) {
    for (const [i, j] of edges) {
      const v1 = hyperboloidToBall(cell.vertices[i])
      const v2 = hyperboloidToBall(cell.vertices[j])

      // Add line segment
      positions.push(v1.x, v1.y, v1.z)
      positions.push(v2.x, v2.y, v2.z)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  )
  return geometry
}

function createTubeGeometry(
  cells: Cell[],
  edges: [number, number][],
  tubeRadius: number,
): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = []

  for (const cell of cells) {
    for (const [i, j] of edges) {
      if (i >= cell.vertices.length || j >= cell.vertices.length) continue

      const v1 = hyperboloidToBall(cell.vertices[i])
      const v2 = hyperboloidToBall(cell.vertices[j])

      // Skip if outside visible region
      if (v1.length() > 0.95 || v2.length() > 0.95) continue

      // Create tube along edge
      const path = new THREE.LineCurve3(v1, v2)
      const tube = new THREE.TubeGeometry(path, 4, tubeRadius, 6, false)
      geometries.push(tube)
    }
  }

  // Merge all tubes
  if (geometries.length === 0) {
    return new THREE.BufferGeometry()
  }

  // Simple merge - just concatenate positions
  const allPositions: number[] = []
  const allNormals: number[] = []
  const allIndices: number[] = []
  let indexOffset = 0

  for (const geom of geometries) {
    const pos = geom.attributes.position
    const norm = geom.attributes.normal
    const idx = geom.index

    for (let i = 0; i < pos.count; i++) {
      allPositions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
      if (norm) {
        allNormals.push(norm.getX(i), norm.getY(i), norm.getZ(i))
      }
    }

    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        allIndices.push(idx.getX(i) + indexOffset)
      }
    }

    indexOffset += pos.count
    geom.dispose()
  }

  const merged = new THREE.BufferGeometry()
  merged.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(allPositions, 3),
  )
  if (allNormals.length > 0) {
    merged.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(allNormals, 3),
    )
  }
  if (allIndices.length > 0) {
    merged.setIndex(allIndices)
  }

  return merged
}

// ============================================
// React Component
// ============================================

export default function HyperbolicHoneycombThreeJS() {
  const { p, q, r, isHyperbolic } = useLoaderData<typeof loader>()
  const containerRef = useRef<HTMLDivElement>(null)
  const [cellCount, setCellCount] = useState(0)
  const [edgeCount, setEdgeCount] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a2e)

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.01,
      100,
    )
    camera.position.set(0, 0, 2.5)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 0.5
    controls.maxDistance = 5

    // Generate honeycomb geometry
    const edgeLength = 0.3 // Adjust for cell size
    const baseVertices = createDodecahedronVertices(edgeLength)
    const edges = generateDodecahedronEdges(baseVertices)

    console.log('Base vertices:', baseVertices.length)
    console.log('Edges:', edges.length)

    // Generate cells via BFS
    const cells = generateCells(baseVertices, 3, 50)
    setCellCount(cells.length)
    setEdgeCount(cells.length * edges.length)

    console.log('Generated cells:', cells.length)

    // Create wireframe geometry
    const edgeGeometry = createEdgeGeometry(cells, edges)
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x88aacc,
      linewidth: 1,
    })
    const edgeMesh = new THREE.LineSegments(edgeGeometry, edgeMaterial)
    scene.add(edgeMesh)

    // Add Poincare ball boundary (for reference)
    const sphereGeom = new THREE.SphereGeometry(1, 32, 32)
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x334455,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
    })
    const sphere = new THREE.Mesh(sphereGeom, sphereMat)
    scene.add(sphere)

    // Add boundary wireframe
    const boundaryWire = new THREE.LineSegments(
      new THREE.EdgesGeometry(sphereGeom),
      new THREE.LineBasicMaterial({ color: 0x556677, transparent: true, opacity: 0.3 }),
    )
    scene.add(boundaryWire)

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Resize handler
    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', onResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', onResize)
      container.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [p, q, r])

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-gray-100">
      <header className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-gray-200">
            ← Back
          </Link>
          <h1 className="text-xl font-semibold">
            {`{${p},${q},${r}}`} Hyperbolic Honeycomb (Three.js)
          </h1>
          <span className="text-sm text-blue-400 bg-blue-400/10 px-2 py-1 rounded">
            Mesh-based
          </span>
        </div>
        <div className="text-sm text-gray-400">
          {cellCount} cells | {edgeCount} edges
        </div>
      </header>

      <main className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0" />

        {!isHyperbolic && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="bg-red-900/80 p-4 rounded">
              {`{${p},${q},${r}}`} is not hyperbolic
            </div>
          </div>
        )}
      </main>

      <footer className="p-2 text-center text-gray-500 text-xs border-t border-gray-700">
        Drag to rotate | Three.js mesh-based rendering with hyperboloid model
      </footer>
    </div>
  )
}
