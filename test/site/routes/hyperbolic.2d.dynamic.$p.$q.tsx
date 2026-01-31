import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, Link } from '@remix-run/react'
import { useRef, useEffect, useState, useCallback } from 'react'
import {
  DynamicTessellationManager,
  type Tile,
} from '@cluesurf/hive/tessellation'
import {
  Canvas2DRenderer,
  createScene,
  dynamicTilesToNodes,
  setupParentReferences,
} from '@cluesurf/hive/rendering'
import {
  InteractionController,
  Hyperbolic2DInteraction,
  GeometryView,
} from '@cluesurf/hive/interaction'
import { Hyperbolic2D } from '@cluesurf/hive/math'
import {
  FocusManager,
  FocusRing,
  FocusNavigation,
  hitTest,
} from '@cluesurf/hive/focus'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: `{${data?.p},${data?.q}} Dynamic Hyperbolic Tiling` },
    {
      name: 'description',
      content: `Dynamic hyperbolic {${data?.p},${data?.q}} tiling with infinite scrolling`,
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

export default function DynamicHyperbolicTiling() {
  const { p, q, isHyperbolic, error } = useLoaderData<typeof loader>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<Canvas2DRenderer | null>(null)
  const controllerRef = useRef<InteractionController | null>(null)
  const viewRef = useRef<GeometryView | null>(null)
  const tessellationRef = useRef<DynamicTessellationManager | null>(null)
  const geometryRef = useRef<Hyperbolic2D | null>(null)
  const focusManagerRef = useRef<FocusManager | null>(null)
  const focusRingRef = useRef<FocusRing | null>(null)
  const focusNavRef = useRef<FocusNavigation | null>(null)

  const [zoom, setZoom] = useState(0.9)
  const [visibleRadius, setVisibleRadius] = useState(3.0)
  const [tileCount, setTileCount] = useState(0)
  const [totalTiles, setTotalTiles] = useState(0)
  const [focusedTileId, setFocusedTileId] = useState<string | null>(null)

  // Draw the current scene with current view transform
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const renderer = rendererRef.current
    const tessellation = tessellationRef.current
    const geometry = geometryRef.current

    if (!canvas || !renderer || !tessellation || !geometry) return

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

    // Update view center from current transform
    const view = viewRef.current
    if (view) {
      const transform = view.getTransform()
      tessellation.setViewTransform(transform)
    }

    // Get visible tiles dynamically
    const visibleTiles = tessellation.getVisibleTiles()
    setTileCount(visibleTiles.length)
    setTotalTiles(tessellation.getTileCount())

    // Convert tiles to scene nodes
    const nodes = dynamicTilesToNodes(visibleTiles, { hue: 220 })
    const scene = createScene(geometry, nodes)
    setupParentReferences(scene)

    // Update focus manager with new scene
    if (focusManagerRef.current) {
      focusManagerRef.current.setScene(scene)
    }

    // Render the scene
    renderer.render(scene)

    // Render focus ring if there's a focused node
    const focusManager = focusManagerRef.current
    const focusRing = focusRingRef.current
    const focused = focusManager?.getFocused()
    if (focused && focusRing && view) {
      focusRing.update(performance.now())
      focusRing.render(
        renderer.getContext(),
        focused,
        scene,
        view,
        renderer.getCenterX(),
        renderer.getCenterY(),
        renderer.getRadius(),
      )
    }

    // Draw info
    const infoLines = [
      `{${p},${q}} dynamic tiling`,
      `Visible: ${visibleTiles.length} / Total: ${tessellation.getTileCount()}`,
    ]
    if (focusedTileId) {
      infoLines.push(`Focused: ${focusedTileId}`)
    }
    renderer.drawInfo(infoLines)

    // Garbage collect old tiles
    tessellation.collectGarbage()
  }, [p, q, isHyperbolic, error, focusedTileId])

  // Initialize renderer, view, tessellation, and interaction controller
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Create renderer
    if (!rendererRef.current) {
      rendererRef.current = new Canvas2DRenderer(canvas, { zoom })
    }

    // Create focus ring
    if (!focusRingRef.current) {
      focusRingRef.current = new FocusRing({
        color: '#00ff88',
        width: 3,
        dash: [8, 4],
        animated: true,
        pulseSpeed: 2,
      })
    }

    // Create geometry
    geometryRef.current = new Hyperbolic2D()

    // Create dynamic tessellation manager
    tessellationRef.current = new DynamicTessellationManager({
      p,
      q,
      maxTiles: 3000,
      visibleRadius,
    })

    // Create interaction geometry and view
    const interactionGeom = new Hyperbolic2DInteraction()
    viewRef.current = new GeometryView(interactionGeom)
    rendererRef.current.setView(viewRef.current)

    // Create interaction controller
    controllerRef.current = new InteractionController(
      interactionGeom,
      canvas,
      {
        sensitivity: 1.0,
        invertDrag: true,
        momentumEnabled: true,
        momentumDecay: 0.92,
      },
    )

    // Update view and redraw on transform change
    const unsubscribe = controllerRef.current.onTransformChange(
      transform => {
        if (viewRef.current) {
          viewRef.current.setTransform(transform)
        }
        draw()
      },
    )

    // Create initial scene for focus manager
    const initialTiles = tessellationRef.current.getVisibleTiles()
    const initialNodes = dynamicTilesToNodes(initialTiles, { hue: 220 })
    const initialScene = createScene(geometryRef.current, initialNodes)
    setupParentReferences(initialScene)

    // Create focus manager
    focusManagerRef.current = new FocusManager(initialScene)
    focusManagerRef.current.onFocusChange((prev, next) => {
      setFocusedTileId(next?.id ?? null)
    })

    // Set up keyboard navigation
    focusNavRef.current = new FocusNavigation(
      focusManagerRef.current,
      canvas,
    )

    // Handle click for focus
    const handleClick = (event: MouseEvent) => {
      const tessellation = tessellationRef.current
      const focusManager = focusManagerRef.current
      const renderer = rendererRef.current
      const geometry = geometryRef.current

      if (!tessellation || !focusManager || !renderer || !geometry) return

      const rect = canvas.getBoundingClientRect()
      const screenPoint = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }

      // Rebuild scene for hit testing
      const visibleTiles = tessellation.getVisibleTiles()
      const nodes = dynamicTilesToNodes(visibleTiles, { hue: 220 })
      const scene = createScene(geometry, nodes)
      setupParentReferences(scene)
      focusManager.setScene(scene)

      const hit = hitTest(
        screenPoint,
        scene,
        viewRef.current,
        renderer.getCenterX(),
        renderer.getCenterY(),
        renderer.getRadius(),
      )

      if (hit) {
        focusManager.focus(hit)
      } else {
        focusManager.blur()
      }
    }

    canvas.addEventListener('click', handleClick)

    // Initial draw
    draw()

    return () => {
      unsubscribe()
      controllerRef.current?.dispose()
      focusNavRef.current?.dispose()
      canvas.removeEventListener('click', handleClick)
    }
  }, [p, q, visibleRadius])

  // Update renderer config when zoom changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setConfig({ zoom })
      const radius =
        Math.min(
          rendererRef.current.getCenter()[0],
          rendererRef.current.getCenter()[1],
        ) * zoom
      controllerRef.current?.setRadius(radius)
      draw()
    }
  }, [zoom, draw])

  // Handle resize
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

      controllerRef.current?.updateCanvasDimensions()
      draw()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [draw])

  // Animation loop for focus ring
  useEffect(() => {
    let animationId: number

    const animate = () => {
      const focused = focusManagerRef.current?.getFocused()
      if (focused) {
        draw()
        animationId = requestAnimationFrame(animate)
      }
    }

    if (focusedTileId) {
      animate()
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [focusedTileId, draw])

  // Reset view handler
  const handleResetView = () => {
    controllerRef.current?.resetView()
    draw()
  }

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
            {'}'} Dynamic Hyperbolic Tiling
          </h1>
          <span className="text-sm text-green-400 bg-green-900/30 px-2 py-1 rounded">
            Infinite Scrolling
          </span>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={handleResetView}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Reset View
          </button>
          <label className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Radius:</span>
            <input
              type="range"
              min="1.5"
              max="5.0"
              step="0.1"
              value={visibleRadius}
              onChange={e => setVisibleRadius(parseFloat(e.target.value))}
              className="w-24"
            />
            <span className="text-sm w-12">{visibleRadius.toFixed(1)}</span>
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
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        />
      </main>
      <footer className="p-2 text-center text-gray-500 text-xs">
        Drag to explore infinite hyperbolic space | Tiles generated on-demand |
        Click to focus | Arrow keys to navigate
      </footer>
    </div>
  )
}
