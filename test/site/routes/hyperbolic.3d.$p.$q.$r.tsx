import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, Link } from '@remix-run/react'
import { useRef, useEffect, useState, useCallback } from 'react'
// Future imports when implemented:
// import { Hyperbolic3DTessellation, type VisibleCell3D } from '@cluesurf/hive/tessellation'
// import { Canvas3DRenderer } from '@cluesurf/hive/rendering'
// import { Hyperbolic3DInteraction } from '@cluesurf/hive/interaction'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    {
      title: `{${data?.p},${data?.q},${data?.r}} Hyperbolic Honeycomb - Interactive Demo`,
    },
    {
      name: 'description',
      content: `Interactive hyperbolic {${data?.p},${data?.q},${data?.r}} honeycomb visualization`,
    },
  ]
}

export async function loader({ params }: LoaderFunctionArgs) {
  const p = parseInt(params.p ?? '4', 10)
  const q = parseInt(params.q ?? '3', 10)
  const r = parseInt(params.r ?? '5', 10)

  if (isNaN(p) || isNaN(q) || isNaN(r) || p < 3 || q < 3 || r < 3) {
    return {
      p: 4,
      q: 3,
      r: 5,
      isHyperbolic: true,
      isKnown: false,
      error: 'Invalid p, q, or r',
    }
  }

  // Check if {p,q,r} is hyperbolic using Schläfli criterion
  // For hyperbolic: 1/p + 1/q + 1/r < 1
  const schlaefliSum = 1 / p + 1 / q + 1 / r
  const isHyperbolic = schlaefliSum < 1

  // Common hyperbolic honeycombs
  const validHoneycombs = [
    { p: 4, q: 3, r: 5 }, // Cubes, 5 per edge
    { p: 5, q: 3, r: 4 }, // Dodecahedra, 4 per edge
    { p: 5, q: 3, r: 5 }, // Dodecahedra, 5 per edge
    { p: 3, q: 5, r: 3 }, // Icosahedra, 3 per edge
  ]

  const isKnown = validHoneycombs.some(
    h => h.p === p && h.q === q && h.r === r,
  )

  return { p, q, r, isHyperbolic, isKnown, schlaefliSum, error: null }
}

// Placeholder types until implementation
interface VisibleCell3D {
  id: string
  vertices: Array<[number, number, number]>
  faces: number[][]
  depth: number
}

interface LorentzMatrix extends Array<number> {
  length: 16
}

// Placeholder: Cube faces (vertex indices)
const CUBE_FACES = [
  [0, 1, 2, 3], // front
  [4, 5, 6, 7], // back
  [0, 1, 5, 4], // bottom
  [2, 3, 7, 6], // top
  [0, 3, 7, 4], // left
  [1, 2, 6, 5], // right
]

// Cube edges for wireframe
const CUBE_EDGES: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0], // front
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4], // back
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7], // sides
]

// Hyperbolic math utilities for Poincaré ball model
// Point in Poincaré ball: |p| < 1

// Hyperbolic distance in Poincaré ball
function hyperbolicDistance(
  a: [number, number, number],
  b: [number, number, number],
): number {
  const [ax, ay, az] = a
  const [bx, by, bz] = b
  const dx = bx - ax,
    dy = by - ay,
    dz = bz - az
  const distSq = dx * dx + dy * dy + dz * dz
  const aSq = ax * ax + ay * ay + az * az
  const bSq = bx * bx + by * by + bz * bz
  const denom = (1 - aSq) * (1 - bSq)
  if (denom <= 0) return Infinity
  const delta = (2 * distSq) / denom
  return Math.acosh(1 + delta)
}

// Interpolate along a hyperbolic geodesic in Poincaré ball
// Returns points along the curved path between a and b
function hyperbolicGeodesic(
  a: [number, number, number],
  b: [number, number, number],
  numPoints: number,
): Array<[number, number, number]> {
  const points: Array<[number, number, number]> = []

  // For the Poincaré ball model, geodesics are circular arcs orthogonal to the boundary
  // We can interpolate using the gyrovector formalism

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints
    const p = hyperbolicLerp(a, b, t)
    points.push(p)
  }

  return points
}

// Hyperbolic linear interpolation (along geodesic)
function hyperbolicLerp(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  // Use Möbius operations for proper hyperbolic interpolation
  // p(t) = a ⊕ (t ⊗ (⊖a ⊕ b))
  // where ⊕ is Möbius addition, ⊗ is scalar multiplication, ⊖ is negation

  const [ax, ay, az] = a
  const negA: [number, number, number] = [-ax, -ay, -az]

  // ⊖a ⊕ b (translate b by -a)
  const diff = mobiusAdd(negA, b)

  // t ⊗ diff (scale in hyperbolic space)
  const scaled = hyperbolicScalarMult(diff, t)

  // a ⊕ scaled (translate back)
  return mobiusAdd(a, scaled)
}

// Hyperbolic scalar multiplication (gyroscalar multiplication)
function hyperbolicScalarMult(
  p: [number, number, number],
  t: number,
): [number, number, number] {
  const [x, y, z] = p
  const r = Math.sqrt(x * x + y * y + z * z)

  if (r < 1e-10) return [0, 0, 0]
  if (r >= 1) return p // At boundary

  // ||t ⊗ p|| = tanh(t * artanh(||p||))
  const artanhR = Math.atanh(r)
  const newR = Math.tanh(t * artanhR)
  const scale = newR / r

  return [x * scale, y * scale, z * scale]
}

// Möbius addition in Poincaré ball (translates point by vector)
function mobiusAdd(
  a: [number, number, number],
  b: [number, number, number],
): [number, number, number] {
  const [ax, ay, az] = a
  const [bx, by, bz] = b
  const aSq = ax * ax + ay * ay + az * az
  const bSq = bx * bx + by * by + bz * bz
  const ab = ax * bx + ay * by + az * bz

  const denom = 1 + 2 * ab + aSq * bSq
  if (Math.abs(denom) < 1e-10) return [0, 0, 0]

  const coefA = (1 + 2 * ab + bSq) / denom
  const coefB = (1 - aSq) / denom

  return [coefA * ax + coefB * bx, coefA * ay + coefB * by, coefA * az + coefB * bz]
}

// Scale a point in hyperbolic space (move toward/away from origin)
function hyperbolicScale(
  p: [number, number, number],
  t: number,
): [number, number, number] {
  const [x, y, z] = p
  const r = Math.sqrt(x * x + y * y + z * z)
  if (r < 1e-10) return [0, 0, 0]
  // Convert to hyperbolic distance, scale, convert back
  const dist = 2 * Math.atanh(r)
  const newDist = dist * t
  const newR = Math.tanh(newDist / 2)
  const scale = newR / r
  return [x * scale, y * scale, z * scale]
}

// Compute cube vertices centered at a point in Poincaré ball
function computeCubeAtPoint(
  center: [number, number, number],
  size: number,
): Array<[number, number, number]> {
  // Base cube vertices (small, at origin)
  const s = size
  const baseVerts: Array<[number, number, number]> = [
    [-s, -s, -s],
    [s, -s, -s],
    [s, s, -s],
    [-s, s, -s],
    [-s, -s, s],
    [s, -s, s],
    [s, s, s],
    [-s, s, s],
  ]

  // Translate each vertex using Möbius addition
  return baseVerts.map(v => mobiusAdd(center, v))
}

// Generate the EDGE SKELETON of a hyperbolic honeycomb
// This generates vertices and edges, NOT cells
// The reference image shows struts (edges) meeting at nodes (vertices)
function generateHoneycombSkeleton(
  maxDepth: number,
  maxVertices: number,
): {
  vertices: Array<{ pos: [number, number, number]; depth: number }>
  edges: Array<[number, number]>
} {
  const vertices: Array<{ pos: [number, number, number]; depth: number }> = []
  const edges: Array<[number, number]> = []
  const vertexMap = new Map<string, number>()

  // For {4,3,5} or {5,3,4}, the vertex figure determines how edges meet
  // At each vertex, edges radiate outward in a pattern determined by the vertex figure

  // Hyperbolic edge length (in Poincaré ball, distance shrinks near boundary)
  const edgeLength = 0.25

  const snapKey = (p: [number, number, number]): string => {
    const snap = (x: number) => Math.round(x * 1000) / 1000
    return `${snap(p[0])},${snap(p[1])},${snap(p[2])}`
  }

  const addVertex = (
    pos: [number, number, number],
    depth: number,
  ): number => {
    const key = snapKey(pos)
    if (vertexMap.has(key)) {
      return vertexMap.get(key)!
    }
    const idx = vertices.length
    vertices.push({ pos, depth })
    vertexMap.set(key, idx)
    return idx
  }

  const addEdge = (a: number, b: number) => {
    // Avoid duplicate edges
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    if (!edgeSet.has(key)) {
      edgeSet.add(key)
      edges.push([a, b])
    }
  }

  const edgeSet = new Set<string>()

  // Start with origin vertex
  const originIdx = addVertex([0, 0, 0], 0)

  // For a cube-based honeycomb, each vertex has degree based on vertex figure
  // {4,3,5}: vertex figure is icosahedron, so 12 edges meet at each vertex
  // {5,3,4}: vertex figure is octahedron, so 6 edges meet at each vertex

  // Generate icosahedral directions (12 vertices of icosahedron)
  const phi = (1 + Math.sqrt(5)) / 2 // Golden ratio
  const icosahedralDirs: Array<[number, number, number]> = []

  // Icosahedron vertices (normalized)
  const raw = [
    [0, 1, phi],
    [0, -1, phi],
    [0, 1, -phi],
    [0, -1, -phi],
    [1, phi, 0],
    [-1, phi, 0],
    [1, -phi, 0],
    [-1, -phi, 0],
    [phi, 0, 1],
    [-phi, 0, 1],
    [phi, 0, -1],
    [-phi, 0, -1],
  ]

  for (const [x, y, z] of raw) {
    const len = Math.sqrt(x * x + y * y + z * z)
    icosahedralDirs.push([x / len, y / len, z / len])
  }

  // BFS expansion from origin
  const queue: Array<{ vertexIdx: number; depth: number }> = [
    { vertexIdx: originIdx, depth: 0 },
  ]
  const processed = new Set<number>()

  while (queue.length > 0 && vertices.length < maxVertices) {
    const { vertexIdx, depth } = queue.shift()!
    if (processed.has(vertexIdx)) continue
    if (depth >= maxDepth) continue
    processed.add(vertexIdx)

    const currentPos = vertices[vertexIdx]!.pos

    // Add edges in all icosahedral directions
    for (const dir of icosahedralDirs) {
      // Compute neighbor position using Möbius addition
      const offset: [number, number, number] = [
        dir[0] * edgeLength,
        dir[1] * edgeLength,
        dir[2] * edgeLength,
      ]
      const neighborPos = mobiusAdd(currentPos, offset)

      // Check if within ball
      const r = Math.sqrt(
        neighborPos[0] ** 2 + neighborPos[1] ** 2 + neighborPos[2] ** 2,
      )
      if (r >= 0.97) continue

      const neighborIdx = addVertex(neighborPos, depth + 1)
      addEdge(vertexIdx, neighborIdx)

      if (!processed.has(neighborIdx)) {
        queue.push({ vertexIdx: neighborIdx, depth: depth + 1 })
      }
    }
  }

  return { vertices, edges }
}

export default function Hyperbolic3DHoneycomb() {
  const { p, q, r, isHyperbolic, isKnown, schlaefliSum, error } =
    useLoaderData<typeof loader>()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // UI state
  const [cellCount, setCellCount] = useState(0)
  const [showControlPanel, setShowControlPanel] = useState(true)
  const [renderMode, setRenderMode] = useState<'wireframe' | 'solid'>(
    'wireframe',
  )
  const [rotationX, setRotationX] = useState(0.3)
  const [rotationY, setRotationY] = useState(0.5)

  // 3D projection with rotation - looking at the Poincaré ball from outside
  // This gives a clearer view of the structure
  const project3D = useCallback(
    (
      point: [number, number, number],
      cx: number,
      cy: number,
      scale: number,
    ): [number, number, number] => {
      // Returns [screenX, screenY, depth] for depth sorting and line thickness
      const [x, y, z] = point

      // Apply rotation
      const cosX = Math.cos(rotationX)
      const sinX = Math.sin(rotationX)
      const cosY = Math.cos(rotationY)
      const sinY = Math.sin(rotationY)

      // Rotate around X axis
      const y1 = y * cosX - z * sinX
      const z1 = y * sinX + z * cosX

      // Rotate around Y axis
      const x2 = x * cosY + z1 * sinY
      const z2 = -x * sinY + z1 * cosY

      // Camera distance from ball center
      const cameraZ = 2.5

      // Perspective projection (camera looking at origin from +Z)
      const viewZ = cameraZ - z2 // Distance from camera
      if (viewZ < 0.1) {
        return [cx, cy, -1] // Behind camera
      }

      const perspective = 1.5 / viewZ
      const screenX = cx + x2 * scale * perspective
      const screenY = cy - y1 * scale * perspective

      // Depth for sorting (closer to camera = smaller depth value)
      // Normalize to 0.5-2.0 range for reasonable thickness calculations
      const depth = viewZ / cameraZ

      return [screenX, screenY, depth]
    },
    [rotationX, rotationY],
  )

  // Draw placeholder visualization
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const cx = width / 2
    const cy = height / 2
    const radius = Math.min(cx, cy) * 0.85

    // Clear with background
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)

    // Draw Poincaré ball boundary (we're viewing from outside for now)
    ctx.strokeStyle = 'rgba(100, 120, 150, 0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()

    // Error state
    if (error || !isHyperbolic) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.fillRect(cx - 300, cy - 30, 600, 60)
      ctx.fillStyle = '#ef4444'
      ctx.font = '16px Inter, sans-serif'
      ctx.textAlign = 'center'
      const message =
        error ??
        `{${p},${q},${r}} is not hyperbolic (need 1/p + 1/q + 1/r < 1, got ${schlaefliSum?.toFixed(
          3,
        )})`
      ctx.fillText(message, cx, cy)
      return
    }

    // Generate the edge skeleton of the honeycomb
    // This gives us vertices (nodes) and edges (struts) directly
    const skeleton = generateHoneycombSkeleton(6, 600)
    setCellCount(skeleton.vertices.length)

    // Project all skeleton vertices to screen space
    const projectedVerts = skeleton.vertices.map(v =>
      project3D(v.pos, cx, cy, radius),
    )

    // Collect edges with their screen depths
    interface EdgeData {
      x1: number
      y1: number
      x2: number
      y2: number
      avgDepth: number
    }
    const edgesToDraw: EdgeData[] = []

    for (const [a, b] of skeleton.edges) {
      const [x1, y1, d1] = projectedVerts[a]!
      const [x2, y2, d2] = projectedVerts[b]!

      // Skip edges with both endpoints behind camera
      if (d1 < 0.01 && d2 < 0.01) continue

      // Skip edges completely outside viewport
      const margin = 100
      const v1InView = x1 > -margin && x1 < width + margin && y1 > -margin && y1 < height + margin
      const v2InView = x2 > -margin && x2 < width + margin && y2 > -margin && y2 < height + margin
      if (!v1InView && !v2InView) continue

      edgesToDraw.push({
        x1,
        y1,
        x2,
        y2,
        avgDepth: (Math.max(0.01, d1) + Math.max(0.01, d2)) / 2,
      })
    }

    // Sort by depth: FARTHEST FIRST (painter's algorithm)
    edgesToDraw.sort((a, b) => b.avgDepth - a.avgDepth)

    // Draw edges as metallic struts
    for (const edge of edgesToDraw) {
      const { x1, y1, x2, y2, avgDepth } = edge

      // Thickness: use logarithmic scale for better range
      // avgDepth typically 0.1 to 2.0, we want thickness 1-15
      const thickness = Math.max(1, Math.min(15, 4 / Math.sqrt(avgDepth)))

      // Metallic gray color, brighter when closer
      const depthFactor = Math.min(1, 0.5 / avgDepth)
      const brightness = Math.floor(100 + 100 * depthFactor)
      const color = `rgb(${brightness - 20}, ${brightness - 10}, ${brightness})`

      ctx.strokeStyle = color
      ctx.lineWidth = thickness
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()

      // Highlight for 3D tube illusion
      if (thickness > 2) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.4, depthFactor * 0.5)})`
        ctx.lineWidth = thickness * 0.25
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
    }

    // Collect visible vertices for drawing nodes
    interface VertexData {
      x: number
      y: number
      depth: number
    }
    const verticesToDraw: VertexData[] = []

    for (let i = 0; i < projectedVerts.length; i++) {
      const [x, y, d] = projectedVerts[i]!
      if (d < 0.01) continue
      if (x < -50 || x > width + 50 || y < -50 || y > height + 50) continue
      verticesToDraw.push({ x, y, depth: d })
    }

    // Sort: farthest first
    verticesToDraw.sort((a, b) => b.depth - a.depth)

    // Draw vertex nodes (gold/yellow spheres)
    for (const v of verticesToDraw) {
      // Node radius: use sqrt for better scaling, range 2-10 pixels
      const nodeRadius = Math.max(2, Math.min(10, 3 / Math.sqrt(v.depth)))

      // Gold color, brighter when closer
      const depthFactor = Math.min(1, 0.5 / v.depth)
      const brightness = Math.floor(150 + 105 * depthFactor)
      ctx.fillStyle = `rgb(${brightness}, ${Math.floor(brightness * 0.7)}, ${Math.floor(brightness * 0.2)})`
      ctx.beginPath()
      ctx.arc(v.x, v.y, nodeRadius, 0, Math.PI * 2)
      ctx.fill()

      // Dark outline for definition
      if (nodeRadius > 3) {
        ctx.strokeStyle = `rgba(60, 40, 10, ${0.3 + depthFactor * 0.4})`
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

    const edgeCount = edgesToDraw.length

    // Draw info overlay (semi-transparent background for readability)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(5, 5, 220, isKnown ? 65 : 85)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.font = '14px Inter, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`{${p},${q},${r}} honeycomb`, 10, 22)
    ctx.fillText(`Vertices: ${skeleton.vertices.length} | Edges: ${edgeCount}`, 10, 42)
    ctx.fillText(`Orbiting view (placeholder)`, 10, 62)
    if (!isKnown) {
      ctx.fillStyle = '#fbbf24'
      ctx.fillText(
        `Warning: {${p},${q},${r}} may not be regular`,
        10,
        82,
      )
    }
  }, [
    p,
    q,
    r,
    isHyperbolic,
    isKnown,
    schlaefliSum,
    error,
    renderMode,
    project3D,
  ])

  // Initialize and handle resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (!container) return
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      draw()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [draw])

  // Redraw on state change
  useEffect(() => {
    draw()
  }, [draw])

  // Mouse drag for rotation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let dragging = false
    let lastX = 0
    let lastY = 0

    const handleMouseDown = (e: MouseEvent) => {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY

      setRotationY(prev => prev + dx * 0.01)
      setRotationX(prev => prev + dy * 0.01)
    }

    const handleMouseUp = () => {
      dragging = false
    }

    canvas.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-gray-100">
      <header className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            ← Back
          </Link>
          <h1 className="text-xl font-semibold">
            {'{'}
            {p},{q},{r}
            {'}'} 3D Hyperbolic Honeycomb
          </h1>
          <span className="text-sm text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
            Placeholder
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowControlPanel(!showControlPanel)}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            {showControlPanel ? 'Hide' : 'Show'} Controls
          </button>
        </div>
      </header>

      <div className="flex-1 flex relative">
        {/* Canvas */}
        <main className="flex-1 relative">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
          />
        </main>

        {/* Control Panel */}
        {showControlPanel && (
          <aside className="w-80 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Settings</h2>

            {/* Render Mode */}
            <section className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">
                Render Mode
              </h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="renderMode"
                    checked={renderMode === 'wireframe'}
                    onChange={() => setRenderMode('wireframe')}
                  />
                  <span className="text-sm">Wireframe</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="renderMode"
                    checked={renderMode === 'solid'}
                    onChange={() => setRenderMode('solid')}
                  />
                  <span className="text-sm">Solid (basic)</span>
                </label>
              </div>
            </section>

            {/* Honeycomb Info */}
            <section className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">
                Honeycomb Info
              </h3>
              <div className="text-sm space-y-1 text-gray-300">
                <p>
                  Symbol: {'{'}
                  {p},{q},{r}
                  {'}'}
                </p>
                <p>
                  Cell:{' '}
                  {p === 4
                    ? 'Cube'
                    : p === 5
                    ? 'Dodecahedron'
                    : p === 3
                    ? 'Tetrahedron'
                    : `{${p},${q}} face`}
                </p>
                <p>Cells per edge: {r}</p>
                <p>Schläfli sum: {schlaefliSum.toFixed(4)}</p>
                <p>
                  Type: {isHyperbolic ? 'Hyperbolic' : 'Not hyperbolic'}
                </p>
              </div>
            </section>

            {/* Supported Honeycombs */}
            <section className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">
                Try These
              </h3>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/hyperbolic/3d/4/3/5"
                  className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                >
                  {'{4,3,5}'}
                </Link>
                <Link
                  to="/hyperbolic/3d/5/3/4"
                  className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                >
                  {'{5,3,4}'}
                </Link>
                <Link
                  to="/hyperbolic/3d/5/3/5"
                  className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                >
                  {'{5,3,5}'}
                </Link>
                <Link
                  to="/hyperbolic/3d/3/5/3"
                  className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                >
                  {'{3,5,3}'}
                </Link>
              </div>
            </section>

            {/* Implementation Status */}
            <section className="border-t border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">
                Implementation Status
              </h3>
              <div className="text-sm space-y-1 text-gray-300">
                <p className="text-yellow-400">This is a placeholder</p>
                <p>See note/hyperbolic3d-tessellation-plan.md</p>
                <p className="mt-2">Needed:</p>
                <ul className="list-disc list-inside text-xs text-gray-400">
                  <li>SO(3,1) Lorentz transforms</li>
                  <li>Margenstern 3D addressing</li>
                  <li>Hyperbolic3DTessellation class</li>
                  <li>Three.js WebGL renderer</li>
                </ul>
              </div>
            </section>

            {/* Status */}
            <section className="border-t border-gray-700 pt-4 mt-4">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">
                Stats
              </h3>
              <div className="text-sm space-y-1 text-gray-300">
                <p>Visible cells: {cellCount}</p>
                <p>Rotation X: {rotationX.toFixed(2)}</p>
                <p>Rotation Y: {rotationY.toFixed(2)}</p>
              </div>
            </section>
          </aside>
        )}
      </div>

      <footer className="p-2 text-center text-gray-500 text-xs border-t border-gray-700">
        Drag to rotate | Canvas 2D placeholder - real implementation needs Three.js with proper hyperbolic tessellation
      </footer>
    </div>
  )
}
