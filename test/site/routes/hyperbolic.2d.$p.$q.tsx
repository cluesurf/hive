import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, Link } from '@remix-run/react'
import { useRef, useEffect, useState, useCallback } from 'react'
import {
  Hyperbolic2DTessellation,
  type VisibleTile,
} from '@cluesurf/hive/tessellation'
import {
  Canvas2DRenderer,
  createScene,
  setupParentReferences,
  addressedTilesToNodes,
} from '@cluesurf/hive/rendering'
import {
  InteractionController,
  Hyperbolic2DInteraction,
  GeometryView,
} from '@cluesurf/hive/interaction'
import {
  FocusManager,
  FocusRing,
  FocusNavigation,
  hitTest,
} from '@cluesurf/hive/focus'
import { PoincareGeometry } from '@cluesurf/hive/rendering/poincare-geometry'
import type {
  TessellationInteractionConfig,
  DeepPartial,
  EasingFunction,
} from '@cluesurf/hive/interaction/types'
import {
  DEFAULT_TESSELLATION_INTERACTION_CONFIG,
  mergeConfig,
} from '@cluesurf/hive/interaction/types'
import type { Matrix } from '@/form/matrix'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: `{${data?.p},${data?.q}} Hyperbolic Tiling - Interactive Demo` },
    {
      name: 'description',
      content: `Interactive hyperbolic {${data?.p},${data?.q}} tiling with configurable features`,
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

// Easing functions for animations
const easingFunctions: Record<EasingFunction, (t: number) => number> = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: t => t * t * t,
  easeOutCubic: t => --t * t * t + 1,
  easeInOutCubic: t =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInExpo: t => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: t => {
    if (t === 0) return 0
    if (t === 1) return 1
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2
    return (2 - Math.pow(2, -20 * t + 10)) / 2
  },
}

export default function HyperbolicTiling() {
  const { p, q, isHyperbolic, error } = useLoaderData<typeof loader>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<Canvas2DRenderer | null>(null)
  const controllerRef = useRef<InteractionController | null>(null)
  const viewRef = useRef<GeometryView | null>(null)
  const tessellationRef = useRef<Hyperbolic2DTessellation | null>(null)
  const focusManagerRef = useRef<FocusManager | null>(null)
  const focusRingRef = useRef<FocusRing | null>(null)
  const focusNavRef = useRef<FocusNavigation | null>(null)
  const interactionGeomRef = useRef<Hyperbolic2DInteraction | null>(null)

  // Geometry adapter for Poincaré disk
  const geometryRef = useRef(new PoincareGeometry())

  // UI state
  const [zoom, setZoom] = useState(0.9)
  const [tileCount, setTileCount] = useState(0)
  const [totalTiles, setTotalTiles] = useState(0)
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null)
  const [showControlPanel, setShowControlPanel] = useState(true)

  // Interaction configuration state
  const [config, setConfig] = useState<TessellationInteractionConfig>(() =>
    mergeConfig({
      navigation: {
        enabled: true,
        dragSensitivity: 1.5,
        throwSensitivity: 1.2,
        momentumEnabled: true,
        momentumDecay: 0.92,
        invertDrag: true,
        dragThreshold: 2,
      },
      selection: {
        enabled: true,
        multiSelect: false,
        deselectOnBackground: true,
      },
      focusAnimation: {
        enabled: true,
        duration: 800,
        easing: 'easeOutCubic',
      },
      rotation: {
        enabled: true,
        sensitivity: 1.0,
      },
      zoom: {
        enabled: true,
        minZoom: 0.5,
        maxZoom: 0.98,
        sensitivity: 1.0,
      },
    }),
  )

  // Two-finger rotation state
  const rotationStateRef = useRef({
    active: false,
    initialAngle: 0,
    lastAngle: 0,
  })

  // Focus animation state
  const animationRef = useRef<{
    active: boolean
    startTime: number
    duration: number
    targetCellId: string | null
    easing: EasingFunction
    startTransform: number[] | null
    endTransform: number[] | null
  }>({
    active: false,
    startTime: 0,
    duration: 300,
    targetCellId: null,
    easing: 'easeOutCubic',
    startTransform: null,
    endTransform: null,
  })

  // Update config helper
  const updateConfig = useCallback(
    (partial: DeepPartial<TessellationInteractionConfig>) => {
      setConfig(prev => mergeConfig({ ...prev, ...partial }))
    },
    [],
  )

  // Draw the current scene
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const renderer = rendererRef.current
    const tessellation = tessellationRef.current

    if (!canvas || !renderer) return

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

    if (!tessellation) return

    // Update tessellation view center from current transform
    const view = viewRef.current
    if (view) {
      tessellation.setViewTransform(view.getTransform())
    }

    // Get visible tiles
    const visibleTiles = tessellation.getVisibleTiles()
    setTileCount(visibleTiles.length)
    setTotalTiles(tessellation.getTileCount())

    // Convert to scene nodes and render
    const nodes = addressedTilesToNodes(visibleTiles, { hue: 220 })
    const scene = createScene(geometryRef.current, nodes)
    setupParentReferences(scene)

    // Update focus manager
    if (focusManagerRef.current) {
      focusManagerRef.current.setScene(scene)
    }

    renderer.render(scene)

    // Render focus ring if there's a selected node
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

    // Draw info overlay
    const infoLines = [
      `{${p},${q}} tiling`,
      `Visible: ${visibleTiles.length} / Total: ${tessellation.getTileCount()}`,
    ]
    if (selectedTileId) {
      infoLines.push(`Selected: ${selectedTileId}`)
    }
    renderer.drawInfo(infoLines)

    // Ensure visible area is fully filled with tiles (no blank spaces)
    tessellation.expandVisibleBoundary()

    // Garbage collect distant tiles
    tessellation.collectGarbage()
  }, [p, q, isHyperbolic, error, selectedTileId])

  // Animate to center a cell by ID using tessellation's navigation
  const animateToCellCenter = useCallback(
    (cellId: string) => {
      if (!config.focusAnimation.enabled) return

      const tessellation = tessellationRef.current
      const view = viewRef.current
      if (!tessellation || !view) return

      // Store start transform for interpolation
      const startTransform = tessellation.getViewTransform()

      // Navigate immediately to set centerCell and get target transform
      // This ensures the graph is correct before animation starts
      const actualTransform = tessellation.navigateToCell(cellId)
      if (!actualTransform) return

      // Set the view transform so expansion knows where we're looking
      tessellation.setViewTransform(actualTransform)

      // Expand ALL tiles in visible area BEFORE animation
      // This ensures no blank spaces
      tessellation.expandVisibleBoundary()

      animationRef.current = {
        active: true,
        startTime: performance.now(),
        duration: config.focusAnimation.duration,
        targetCellId: cellId,
        easing: config.focusAnimation.easing,
        startTransform: [...startTransform],
        endTransform: [...actualTransform],
      }

      const animate = () => {
        const anim = animationRef.current
        if (!anim.active || !anim.startTransform || !anim.endTransform) return

        const elapsed = performance.now() - anim.startTime
        const t = Math.min(1, elapsed / anim.duration)
        const eased = easingFunctions[anim.easing](t)

        // Interpolate between ACTUAL transforms (not pure translations)
        // This keeps the graph system consistent
        const interpolated: number[] = []
        for (let i = 0; i < 9; i++) {
          const s = anim.startTransform[i] ?? 0
          const e = anim.endTransform[i] ?? 0
          interpolated.push(s + (e - s) * eased)
        }

        // Renormalize SU(1,1) matrix
        const aRe = interpolated[0]!
        const aIm = interpolated[1]!
        const bRe = interpolated[2]!
        const bIm = interpolated[3]!
        const aMagSq = aRe * aRe + aIm * aIm
        const bMagSq = bRe * bRe + bIm * bIm
        const det = aMagSq - bMagSq
        if (det > 0.001) {
          const s = 1 / Math.sqrt(det)
          interpolated[0] = aRe * s
          interpolated[1] = aIm * s
          interpolated[2] = bRe * s
          interpolated[3] = bIm * s
        }

        const transform = interpolated as unknown as Matrix
        view.setTransform(transform)
        // Don't call tessellation.setViewTransform during animation
        // Just update the view for rendering
        draw()

        if (t < 1) {
          requestAnimationFrame(animate)
        } else {
          // Animation complete - ensure final state is correct
          view.setTransform(anim.endTransform as unknown as Matrix)
          tessellation.setViewTransform(anim.endTransform as unknown as Matrix)
          draw()
          // Expand boundary so next click on any edge tile works
          tessellation.expandVisibleBoundary()
          anim.active = false
        }
      }

      requestAnimationFrame(animate)
    },
    [config.focusAnimation, draw],
  )

  // Initialize everything
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !isHyperbolic || error) return

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

    // Create tessellation
    tessellationRef.current = new Hyperbolic2DTessellation({
      p,
      q,
      maxTiles: 3000,
      maxDepth: 50,
    })

    // Create interaction geometry and view
    const interactionGeom = new Hyperbolic2DInteraction()
    interactionGeomRef.current = interactionGeom
    viewRef.current = new GeometryView(interactionGeom)
    rendererRef.current.setView(viewRef.current)

    // Create interaction controller with current config
    controllerRef.current = new InteractionController(interactionGeom, canvas, {
      sensitivity: config.navigation.dragSensitivity,
      invertDrag: config.navigation.invertDrag,
      momentumEnabled: config.navigation.momentumEnabled,
      momentumDecay: config.navigation.momentumDecay,
      dragThreshold: config.navigation.dragThreshold,
    })

    // Update view and redraw on transform change
    const unsubscribe = controllerRef.current.onTransformChange(transform => {
      if (viewRef.current) {
        viewRef.current.setTransform(transform)
      }
      draw()
    })

    // Create initial scene for focus manager
    const initialTiles = tessellationRef.current.getVisibleTiles()
    const initialNodes = addressedTilesToNodes(initialTiles, { hue: 220 })
    const initialScene = createScene(geometryRef.current, initialNodes)
    setupParentReferences(initialScene)

    // Create focus manager
    focusManagerRef.current = new FocusManager(initialScene)
    focusManagerRef.current.onFocusChange((prev, next) => {
      if (next && config.selection.enabled) {
        setSelectedTileId(next.id)
      } else if (!next && config.selection.deselectOnBackground) {
        setSelectedTileId(null)
      }
    })

    // Set up keyboard navigation
    focusNavRef.current = new FocusNavigation(focusManagerRef.current, canvas)

    // Handle click for selection
    const handleClick = (event: MouseEvent) => {
      if (!config.selection.enabled) return

      const tessellation = tessellationRef.current
      const focusManager = focusManagerRef.current
      const renderer = rendererRef.current

      if (!tessellation || !focusManager || !renderer) return

      const rect = canvas.getBoundingClientRect()
      const screenPoint = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }

      // Build current scene for hit testing
      const visibleTiles = tessellation.getVisibleTiles()
      const nodes = addressedTilesToNodes(visibleTiles, { hue: 220 })
      const scene = createScene(geometryRef.current, nodes)
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

        // Animate to center the clicked tile
        if (config.focusAnimation.enabled) {
          animateToCellCenter(hit.id)
        }
      } else if (config.selection.deselectOnBackground) {
        focusManager.blur()
        setSelectedTileId(null)
      }
    }

    // Handle two-finger rotation on touch
    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2 && config.rotation.enabled) {
        event.preventDefault()
        const touch0 = event.touches[0]!
        const touch1 = event.touches[1]!
        const angle = Math.atan2(
          touch1.clientY - touch0.clientY,
          touch1.clientX - touch0.clientX,
        )
        rotationStateRef.current = {
          active: true,
          initialAngle: angle,
          lastAngle: angle,
        }
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (
        event.touches.length === 2 &&
        config.rotation.enabled &&
        rotationStateRef.current.active
      ) {
        event.preventDefault()
        const touch0 = event.touches[0]!
        const touch1 = event.touches[1]!
        const currentAngle = Math.atan2(
          touch1.clientY - touch0.clientY,
          touch1.clientX - touch0.clientX,
        )

        const deltaAngle =
          (currentAngle - rotationStateRef.current.lastAngle) *
          config.rotation.sensitivity
        rotationStateRef.current.lastAngle = currentAngle

        // Apply rotation to view
        const view = viewRef.current
        if (view && Math.abs(deltaAngle) > 0.001) {
          const halfAngle = deltaAngle / 2
          const rotation: [
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
          ] = [Math.cos(halfAngle), Math.sin(halfAngle), 0, 0, 0, 0, 0, 0, 1]

          const currentTransform = view.getTransform()
          const newTransform = interactionGeom.composeTransforms(
            rotation,
            currentTransform,
          )
          view.setTransform(newTransform)
          draw()
        }
      }
    }

    const handleTouchEnd = () => {
      rotationStateRef.current.active = false
    }

    // Handle wheel for zoom (when enabled)
    const handleWheel = (event: WheelEvent) => {
      if (config.zoom.enabled && event.ctrlKey) {
        event.preventDefault()
        const delta = event.deltaY > 0 ? -0.02 : 0.02
        const newZoom = Math.max(
          config.zoom.minZoom,
          Math.min(config.zoom.maxZoom, zoom + delta * config.zoom.sensitivity),
        )
        setZoom(newZoom)
      }
    }

    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd)
    canvas.addEventListener('wheel', handleWheel, { passive: false })

    // Initial draw
    draw()

    return () => {
      unsubscribe()
      controllerRef.current?.dispose()
      focusNavRef.current?.dispose()
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
      canvas.removeEventListener('wheel', handleWheel)
    }
    // Only re-initialize when p, q, or hyperbolic status changes
    // NOT when config changes (that would reset the view)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, q, isHyperbolic, error])

  // Update renderer zoom
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

    if (selectedTileId) {
      animate()
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [selectedTileId, draw])

  // Reset view handler
  const handleResetView = () => {
    controllerRef.current?.resetView()
    draw()
  }

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
            {p},{q}
            {'}'} Interactive Demo
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowControlPanel(!showControlPanel)}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            {showControlPanel ? 'Hide' : 'Show'} Controls
          </button>
          <button
            onClick={handleResetView}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Reset View
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
            <h2 className="text-lg font-semibold mb-4">Interaction Settings</h2>

            {/* Navigation */}
            <section className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">
                Navigation
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm">Drag Enabled</span>
                  <input
                    type="checkbox"
                    checked={config.navigation.enabled}
                    onChange={e =>
                      updateConfig({
                        navigation: { enabled: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm">Drag Sensitivity</span>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={config.navigation.dragSensitivity}
                    onChange={e =>
                      updateConfig({
                        navigation: {
                          dragSensitivity: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-24"
                  />
                  <span className="text-xs w-8 text-right">
                    {config.navigation.dragSensitivity.toFixed(1)}
                  </span>
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm">Momentum/Throw</span>
                  <input
                    type="checkbox"
                    checked={config.navigation.momentumEnabled}
                    onChange={e =>
                      updateConfig({
                        navigation: { momentumEnabled: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm">Throw Sensitivity</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={config.navigation.throwSensitivity}
                    onChange={e =>
                      updateConfig({
                        navigation: {
                          throwSensitivity: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-24"
                  />
                  <span className="text-xs w-8 text-right">
                    {config.navigation.throwSensitivity.toFixed(1)}
                  </span>
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm">Friction</span>
                  <input
                    type="range"
                    min="0.85"
                    max="0.98"
                    step="0.01"
                    value={config.navigation.momentumDecay}
                    onChange={e =>
                      updateConfig({
                        navigation: {
                          momentumDecay: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-24"
                  />
                  <span className="text-xs w-8 text-right">
                    {config.navigation.momentumDecay.toFixed(2)}
                  </span>
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm">Invert Drag</span>
                  <input
                    type="checkbox"
                    checked={config.navigation.invertDrag}
                    onChange={e =>
                      updateConfig({
                        navigation: { invertDrag: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                </label>
              </div>
            </section>

            {/* Selection */}
            <section className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">
                Selection
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm">Click to Select</span>
                  <input
                    type="checkbox"
                    checked={config.selection.enabled}
                    onChange={e =>
                      updateConfig({
                        selection: { enabled: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm">Multi-Select</span>
                  <input
                    type="checkbox"
                    checked={config.selection.multiSelect}
                    onChange={e =>
                      updateConfig({
                        selection: { multiSelect: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm">Deselect on Background</span>
                  <input
                    type="checkbox"
                    checked={config.selection.deselectOnBackground}
                    onChange={e =>
                      updateConfig({
                        selection: { deselectOnBackground: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                </label>
              </div>
            </section>

            {/* Focus Animation */}
            <section className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">
                Navigate to Selected
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm">Auto-Navigate</span>
                  <input
                    type="checkbox"
                    checked={config.focusAnimation.enabled}
                    onChange={e =>
                      updateConfig({
                        focusAnimation: { enabled: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm">Duration (ms)</span>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="50"
                    value={config.focusAnimation.duration}
                    onChange={e =>
                      updateConfig({
                        focusAnimation: {
                          duration: parseInt(e.target.value, 10),
                        },
                      })
                    }
                    className="w-24"
                  />
                  <span className="text-xs w-12 text-right">
                    {config.focusAnimation.duration}ms
                  </span>
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm">Easing</span>
                  <select
                    value={config.focusAnimation.easing}
                    onChange={e =>
                      updateConfig({
                        focusAnimation: {
                          easing: e.target.value as EasingFunction,
                        },
                      })
                    }
                    className="bg-gray-700 text-sm rounded px-2 py-1"
                  >
                    <option value="linear">Linear</option>
                    <option value="easeInQuad">Ease In Quad</option>
                    <option value="easeOutQuad">Ease Out Quad</option>
                    <option value="easeInOutQuad">Ease In/Out Quad</option>
                    <option value="easeInCubic">Ease In Cubic</option>
                    <option value="easeOutCubic">Ease Out Cubic</option>
                    <option value="easeInOutCubic">Ease In/Out Cubic</option>
                    <option value="easeOutExpo">Ease Out Expo</option>
                  </select>
                </label>
              </div>
            </section>

            {/* Rotation */}
            <section className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">
                Rotation (Two-Finger)
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm">Enabled</span>
                  <input
                    type="checkbox"
                    checked={config.rotation.enabled}
                    onChange={e =>
                      updateConfig({
                        rotation: { enabled: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm">Sensitivity</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={config.rotation.sensitivity}
                    onChange={e =>
                      updateConfig({
                        rotation: {
                          sensitivity: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-24"
                  />
                  <span className="text-xs w-8 text-right">
                    {config.rotation.sensitivity.toFixed(1)}
                  </span>
                </label>
              </div>
            </section>

            {/* Zoom */}
            <section className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">
                Zoom (Ctrl+Scroll)
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm">Enabled</span>
                  <input
                    type="checkbox"
                    checked={config.zoom.enabled}
                    onChange={e =>
                      updateConfig({
                        zoom: { enabled: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm">Current Zoom</span>
                  <input
                    type="range"
                    min={config.zoom.minZoom}
                    max={config.zoom.maxZoom}
                    step="0.01"
                    value={zoom}
                    onChange={e => setZoom(parseFloat(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-xs w-12 text-right">
                    {(zoom * 100).toFixed(0)}%
                  </span>
                </label>
              </div>
            </section>

            {/* Status */}
            <section className="border-t border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">
                Status
              </h3>
              <div className="text-sm space-y-1 text-gray-300">
                <p>Visible tiles: {tileCount}</p>
                <p>Total tiles: {totalTiles}</p>
                <p>Selected: {selectedTileId ?? 'None'}</p>
              </div>
            </section>
          </aside>
        )}
      </div>

      <footer className="p-2 text-center text-gray-500 text-xs border-t border-gray-700">
        Drag to explore | Click to select | Two-finger rotate (touch) |
        Ctrl+Scroll to zoom | Arrow keys to navigate
      </footer>
    </div>
  )
}
