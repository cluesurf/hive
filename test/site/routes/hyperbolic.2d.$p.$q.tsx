import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, Link } from '@remix-run/react'
import { useRef, useEffect, useState, useCallback } from 'react'
import { Hyperbolic2DTessellation } from '@cluesurf/hive/tessellation'
import {
  Canvas2DRenderer,
  createScene,
  tessellationToNodes,
} from '@cluesurf/hive/rendering'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: `{${data?.p},${data?.q}} Hyperbolic Tiling` },
    {
      name: 'description',
      content: `Hyperbolic {${data?.p},${data?.q}} tiling visualization`,
    },
  ]
}

export async function loader({ params }: LoaderFunctionArgs) {
  const p = parseInt(params.p ?? '7', 10)
  const q = parseInt(params.q ?? '3', 10)

  if (isNaN(p) || isNaN(q) || p < 3 || q < 3) {
    return { p: 7, q: 3, isHyperbolic: true, error: 'Invalid p or q' }
  }

  const curvatureCheck = (p - 2) * (q - 2)
  const isHyperbolic = curvatureCheck > 4

  return { p, q, isHyperbolic, error: null }
}

export default function HyperbolicTiling() {
  const { p, q, isHyperbolic, error } = useLoaderData<typeof loader>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<Canvas2DRenderer | null>(null)
  const [zoom, setZoom] = useState(0.9)
  const [depth, setDepth] = useState(4)

  const drawTiling = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (!rendererRef.current) {
      rendererRef.current = new Canvas2DRenderer(canvas, { zoom })
    }

    const renderer = rendererRef.current
    renderer.setConfig({ zoom })
    renderer.clear()
    renderer.drawDiskBoundary()

    if (error || !isHyperbolic) {
      const ctx = renderer.getContext()
      const [cx, cy] = renderer.getCenter()
      ctx.fillStyle = 'rgb(239, 68, 68)'
      ctx.font = '16px Inter, sans-serif'
      ctx.textAlign = 'center'
      const message =
        error ?? `{${p},${q}} is not hyperbolic (need (p-2)(q-2) > 4)`
      ctx.fillText(message, cx, cy)
      return
    }

    const tessellation = new Hyperbolic2DTessellation({
      p,
      q,
      maxDepth: depth,
    })
    const result = tessellation.generate()
    const geometry = tessellation.getGeometry()

    const nodes = tessellationToNodes(result, { hue: 220 })
    const scene = createScene(geometry, nodes)

    renderer.render(scene)

    renderer.drawInfo([
      `{${p},${q}} tiling`,
      `${result.tiles.size} tiles (depth ${depth})`,
    ])
  }, [p, q, isHyperbolic, error, zoom, depth])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (!container) return
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight

      if (rendererRef.current) {
        rendererRef.current.resize(canvas.width, canvas.height)
      }

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
