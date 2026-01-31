import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, Link } from '@remix-run/react'
import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: `{${data?.p},${data?.q},${data?.r}} Hyperbolic Honeycomb` }]
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
// Vector Math
// ============================================

type Vec3 = [number, number, number]

const len = (v: Vec3) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
const normalize = (v: Vec3): Vec3 => {
  const l = len(v)
  return l < 1e-10 ? [0, 0, 1] : [v[0] / l, v[1] / l, v[2] / l]
}
const scale = (v: Vec3, s: number): Vec3 => [v[0] * s, v[1] * s, v[2] * s]
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

// ============================================
// Poincaré Ball Hyperbolic Geometry
// ============================================

function mobiusAdd(a: Vec3, b: Vec3): Vec3 {
  const a2 = dot(a, a), b2 = dot(b, b), ab = dot(a, b)
  const denom = 1 + 2 * ab + a2 * b2
  if (Math.abs(denom) < 1e-10) return a
  const coefA = (1 + 2 * ab + b2) / denom
  const coefB = (1 - a2) / denom
  return [coefA * a[0] + coefB * b[0], coefA * a[1] + coefB * b[1], coefA * a[2] + coefB * b[2]]
}

function translate(point: Vec3, dir: Vec3, dist: number): Vec3 {
  const d = normalize(dir)
  const t = Math.tanh(dist / 2)
  return mobiusAdd([d[0] * t, d[1] * t, d[2] * t], point)
}

// ============================================
// Geodesic Arc - Curved paths in Poincaré ball
// ============================================

function geodesicPoints(p1: Vec3, p2: Vec3, numPoints: number): Vec3[] {
  const points: Vec3[] = []
  const crossP = cross(p1, p2)
  const crossLen = len(crossP)

  // Straight line for collinear or near-origin points
  if (crossLen < 1e-6 || (len(p1) < 0.01 && len(p2) < 0.01)) {
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints
      points.push([p1[0] * (1 - t) + p2[0] * t, p1[1] * (1 - t) + p2[1] * t, p1[2] * (1 - t) + p2[2] * t])
    }
    return points
  }

  // Find geodesic circle center (outside ball, orthogonal to boundary)
  const normal = normalize(crossP)
  const mid: Vec3 = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2]
  const d12 = sub(p2, p1)
  const perpInPlane = normalize(cross(normal, d12))

  const p1Sq = dot(p1, p1)
  const targetDot = (1 + p1Sq) / 2
  const midDotP1 = dot(mid, p1)
  const perpDotP1 = dot(perpInPlane, p1)

  if (Math.abs(perpDotP1) < 1e-10) {
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints
      points.push([p1[0] * (1 - t) + p2[0] * t, p1[1] * (1 - t) + p2[1] * t, p1[2] * (1 - t) + p2[2] * t])
    }
    return points
  }

  const s = (targetDot - midDotP1) / perpDotP1
  const center: Vec3 = [mid[0] + s * perpInPlane[0], mid[1] + s * perpInPlane[1], mid[2] + s * perpInPlane[2]]
  const radius = len(sub(center, p1))

  const v1 = sub(p1, center)
  const v2 = sub(p2, center)
  const cosAngle = Math.max(-1, Math.min(1, dot(v1, v2) / (len(v1) * len(v2))))
  const angle = Math.acos(cosAngle)
  const axis = normalize(cross(v1, v2))

  for (let i = 0; i <= numPoints; i++) {
    const theta = (i / numPoints) * angle
    const cosT = Math.cos(theta), sinT = Math.sin(theta)
    const v1Norm = normalize(v1)
    const rotated = add(add(scale(v1Norm, cosT), scale(cross(axis, v1Norm), sinT)), scale(axis, dot(axis, v1Norm) * (1 - cosT)))
    points.push(add(center, scale(rotated, radius)))
  }

  return points
}

// ============================================
// Dodecahedron Geometry
// ============================================

const PHI = (1 + Math.sqrt(5)) / 2

function getDodecahedronVertices(): Vec3[] {
  const verts: Vec3[] = []
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) verts.push(normalize([x, y, z]))
  const invPhi = 1 / PHI
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    verts.push(normalize([0, a * invPhi, b * PHI]))
    verts.push(normalize([a * invPhi, b * PHI, 0]))
    verts.push(normalize([a * PHI, 0, b * invPhi]))
  }
  return verts
}

function getDodecahedronEdges(vertices: Vec3[]): [number, number][] {
  const pairs: { i: number; j: number; d: number }[] = []
  for (let i = 0; i < vertices.length; i++)
    for (let j = i + 1; j < vertices.length; j++)
      pairs.push({ i, j, d: dot(vertices[i], vertices[j]) })
  pairs.sort((a, b) => b.d - a.d)
  return pairs.slice(0, 30).map(p => [p.i, p.j])
}

function getFaceCenters(): Vec3[] {
  const centers: Vec3[] = []
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    centers.push(normalize([0, a, b * PHI]))
    centers.push(normalize([a, b * PHI, 0]))
    centers.push(normalize([b * PHI, 0, a]))
  }
  return centers
}

// ============================================
// Honeycomb Generation
// ============================================

interface Cell { center: Vec3; depth: number }

function generateCells(faceDirs: Vec3[], cellSeparation: number, maxDepth: number, maxCells: number): Cell[] {
  const cells: Cell[] = []
  const visited = new Set<string>()
  const hash = (p: Vec3) => `${(p[0] * 1000) | 0},${(p[1] * 1000) | 0},${(p[2] * 1000) | 0}`
  const queue: Cell[] = [{ center: [0, 0, 0], depth: 0 }]

  while (queue.length > 0 && cells.length < maxCells) {
    const cell = queue.shift()!
    const h = hash(cell.center)
    if (visited.has(h) || len(cell.center) > 0.92) continue
    visited.add(h)
    cells.push(cell)
    if (cell.depth < maxDepth) {
      for (const dir of faceDirs) {
        const neighborCenter = translate(cell.center, dir, cellSeparation)
        if (len(neighborCenter) < 0.95) queue.push({ center: neighborCenter, depth: cell.depth + 1 })
      }
    }
  }
  return cells
}

// ============================================
// Create 3D Tube Geometry for Edges
// ============================================

function createTubeMesh(
  points: Vec3[],
  radius: number,
  material: THREE.Material,
): THREE.Mesh | null {
  if (points.length < 2) return null

  const curve = new THREE.CatmullRomCurve3(
    points.map(p => new THREE.Vector3(p[0], p[1], p[2]))
  )

  const geometry = new THREE.TubeGeometry(curve, points.length * 2, radius, 6, false)
  return new THREE.Mesh(geometry, material)
}

// ============================================
// React Component
// ============================================

export default function HyperbolicHoneycombThreeJS() {
  const { p, q, r, isHyperbolic } = useLoaderData<typeof loader>()
  const containerRef = useRef<HTMLDivElement>(null)
  const [cellCount, setCellCount] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Scene with fog for depth
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x030308)
    scene.fog = new THREE.FogExp2(0x030308, 1.5) // Exponential fog for depth

    // Camera at origin
    const camera = new THREE.PerspectiveCamera(90, container.clientWidth / container.clientHeight, 0.001, 10)
    camera.position.set(0, 0, 0)

    // Renderer with shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableZoom = false
    controls.enablePan = false
    controls.rotateSpeed = 0.3
    controls.target.set(0, 0, 0.0001)
    controls.enableDamping = true
    controls.dampingFactor = 0.05

    // === LIGHTING ===
    // Ambient light (soft fill)
    const ambient = new THREE.AmbientLight(0x404060, 0.4)
    scene.add(ambient)

    // Point light at center (where camera is)
    const centerLight = new THREE.PointLight(0xffffff, 1, 2)
    centerLight.position.set(0, 0, 0)
    scene.add(centerLight)

    // Directional lights from different angles
    const light1 = new THREE.DirectionalLight(0x8888ff, 0.6)
    light1.position.set(1, 1, 1)
    scene.add(light1)

    const light2 = new THREE.DirectionalLight(0xff8888, 0.4)
    light2.position.set(-1, -0.5, -1)
    scene.add(light2)

    // === GEOMETRY ===
    const baseVerts = getDodecahedronVertices()
    const edges = getDodecahedronEdges(baseVerts)
    const faceDirs = getFaceCenters()

    const cellRadius = 0.18
    const cellSeparation = cellRadius * 2 * 0.85

    const cells = generateCells(faceDirs, cellSeparation, 4, 80)
    setCellCount(cells.length)

    // Material for tubes - metallic look
    const tubeMaterial = new THREE.MeshStandardMaterial({
      color: 0x6688bb,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x112233,
      emissiveIntensity: 0.1,
    })

    // Create tubes for each edge
    const tubeRadius = 0.004
    const tubeGroup = new THREE.Group()

    for (const cell of cells) {
      const cellVerts = baseVerts.map(v => mobiusAdd(cell.center, scale(v, cellRadius)))

      for (const [i, j] of edges) {
        const v1 = cellVerts[i]
        const v2 = cellVerts[j]

        // Skip if near boundary
        if (len(v1) > 0.9 || len(v2) > 0.9) continue

        // Get geodesic arc points
        const arcPoints = geodesicPoints(v1, v2, 8)

        // Distance-based tube radius (thinner far away)
        const midDist = (len(v1) + len(v2)) / 2
        const adjustedRadius = tubeRadius * (1 - midDist * 0.5)

        const tube = createTubeMesh(arcPoints, adjustedRadius, tubeMaterial)
        if (tube) tubeGroup.add(tube)
      }
    }

    scene.add(tubeGroup)

    // Vertex spheres at joints
    const sphereGeom = new THREE.SphereGeometry(0.008, 8, 8)
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xaaccff,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x334455,
      emissiveIntensity: 0.2,
    })

    for (const cell of cells) {
      const cellVerts = baseVerts.map(v => mobiusAdd(cell.center, scale(v, cellRadius)))
      for (const v of cellVerts) {
        if (len(v) > 0.88) continue
        const sphere = new THREE.Mesh(sphereGeom, sphereMat)
        sphere.position.set(v[0], v[1], v[2])
        // Scale spheres based on distance
        const s = 1 - len(v) * 0.6
        sphere.scale.setScalar(s)
        scene.add(sphere)
      }
    }

    // Boundary sphere
    const boundaryGeom = new THREE.SphereGeometry(0.95, 64, 64)
    const boundaryMat = new THREE.MeshBasicMaterial({
      color: 0x050510,
      side: THREE.BackSide,
    })
    scene.add(new THREE.Mesh(boundaryGeom, boundaryMat))

    // Animation
    function animate() {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Resize
    function onResize() {
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      container.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [p, q, r])

  return (
    <div className="min-h-screen flex flex-col bg-black text-gray-100">
      <header className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-gray-200">← Back</Link>
          <h1 className="text-xl font-semibold">{`{${p},${q},${r}}`} Hyperbolic Honeycomb</h1>
        </div>
        <div className="text-sm text-gray-500">{cellCount} cells</div>
      </header>
      <main className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0" />
        {!isHyperbolic && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="bg-red-900/80 p-4 rounded">{`{${p},${q},${r}}`} is not hyperbolic</div>
          </div>
        )}
        <div className="absolute bottom-4 left-4 text-xs text-gray-600 bg-black/50 p-2 rounded">
          Drag to look around
        </div>
      </main>
    </div>
  )
}
