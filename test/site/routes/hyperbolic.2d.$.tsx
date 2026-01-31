import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, Link } from '@remix-run/react'
import { useRef, useEffect, useState, useCallback } from 'react'
import { Hyperbolic2DTessellation } from '@cluesurf/hive/tessellation'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: `{${data?.p},${data?.q}} Hyperbolic Tiling` },
    {
      name: 'description',
      content: `Hyperbolic {${data?.p},${data?.q}} tiling visualization`,
    },
  ]
}

/**
 * Parse {p,q} notation from URL.
 * Accepts: {7,3} or %7B7,3%7D (URL-encoded)
 */
function parseNotation(
  segment: string,
): { p: number; q: number } | null {
  // URL decode first
  const decoded = decodeURIComponent(segment)

  // Match {p,q} pattern
  const match = decoded.match(/^\{(\d+),(\d+)\}$/)
  if (!match) return null

  const p = parseInt(match[1], 10)
  const q = parseInt(match[2], 10)

  if (isNaN(p) || isNaN(q) || p < 3 || q < 3) return null

  return { p, q }
}

export async function loader({ params }: LoaderFunctionArgs) {
  const segment = params['*'] ?? '{7,3}'
  const parsed = parseNotation(segment)

  if (!parsed) {
    return { p: 7, q: 3, isHyperbolic: true, error: 'Invalid notation' }
  }

  const { p, q } = parsed

  // Validate: (p-2)(q-2) > 4 for hyperbolic
  const curvatureCheck = (p - 2) * (q - 2)
  const isHyperbolic = curvatureCheck > 4

  return { p, q, isHyperbolic, error: null }
}

export default function HyperbolicTiling() {
  const { p, q, isHyperbolic, error } = useLoaderData<typeof loader>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = useState(0.9)
  const [depth, setDepth] = useState(4)

  const drawTiling = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const cx = width / 2
    const cy = height / 2
    const radius = Math.min(cx, cy) * zoom

    // Clear canvas
    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, width, height)

    // Draw Poincare disk boundary
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()

    if (error) {
      ctx.fillStyle = '#ef4444'
      ctx.font = '16px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(error, cx, cy)
      return
    }

    if (!isHyperbolic) {
      ctx.fillStyle = '#ef4444'
      ctx.font = '16px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(
        `{${p},${q}} is not hyperbolic (need (p-2)(q-2) > 4)`,
        cx,
        cy,
      )
      return
    }

    // Generate tessellation
    const tessellation = new Hyperbolic2DTessellation({
      p,
      q,
      maxDepth: depth,
    })
    const result = tessellation.generate()
    const geom = tessellation.getGeometry()

    // Convert hyperboloid point to Poincare disk
    const toPoincare = (point: number[]): [number, number] => {
      const x = point[0] ?? 0
      const y = point[1] ?? 0
      const t = point[2] ?? 1
      // Stereographic projection from hyperboloid to Poincare disk
      const denom = 1 + t
      return [x / denom, y / denom]
    }

    // Convert Poincare coordinates to canvas
    const toCanvas = (poincare: [number, number]): [number, number] => {
      return [cx + poincare[0] * radius, cy - poincare[1] * radius]
    }

    // Draw a polygon
    const drawPolygon = (
      vertices: number[][],
      fillColor: string,
      strokeColor: string,
    ) => {
      if (vertices.length < 3) return

      const canvasPoints = vertices.map(v => toCanvas(toPoincare(v)))

      // Check if polygon is visible (any point inside disk)
      const isVisible = vertices.some(v => {
        const [px, py] = toPoincare(v)
        return px * px + py * py < 0.99
      })
      if (!isVisible) return

      ctx.beginPath()
      ctx.moveTo(canvasPoints[0][0], canvasPoints[0][1])

      for (let i = 1; i < canvasPoints.length; i++) {
        ctx.lineTo(canvasPoints[i][0], canvasPoints[i][1])
      }
      ctx.closePath()

      ctx.fillStyle = fillColor
      ctx.fill()
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Draw tiles with depth-based coloring
    const hueBase = 220 // Blue base
    for (const tile of result.tiles.values()) {
      const lightness = 30 - tile.depth * 4
      const saturation = 60 - tile.depth * 8
      const fillColor = `hsl(${hueBase}, ${Math.max(
        20,
        saturation,
      )}%, ${Math.max(10, lightness)}%)`
      const strokeColor = `hsl(${hueBase}, 50%, ${Math.max(
        20,
        lightness + 15,
      )}%)`
      drawPolygon(tile.vertices, fillColor, strokeColor)
    }

    // Draw info
    ctx.fillStyle = '#94a3b8'
    ctx.font = '14px Inter, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`{${p},${q}} tiling`, 16, 28)
    ctx.fillText(`${result.tiles.size} tiles (depth ${depth})`, 16, 48)
  }, [p, q, isHyperbolic, error, zoom, depth])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (!container) return
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      drawTiling()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [drawTiling])

  useEffect(() => {
    drawTiling()
  }, [drawTiling])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            ← Back
          </Link>
          <h1 className="text-xl font-semibold">
            {'{'}
            {p},{q}
            {'}'} Hyperbolic Tiling
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Depth:</span>
            <input
              type="range"
              min="1"
              max="6"
              value={depth}
              onChange={e => setDepth(parseInt(e.target.value, 10))}
              className="w-24"
            />
            <span className="text-sm w-4">{depth}</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Zoom:</span>
            <input
              type="range"
              min="0.5"
              max="0.98"
              step="0.01"
              value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              className="w-24"
            />
            <span className="text-sm w-12">
              {(zoom * 100).toFixed(0)}%
            </span>
          </label>
        </div>
      </header>
      <main className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />
      </main>
    </div>
  )
}
