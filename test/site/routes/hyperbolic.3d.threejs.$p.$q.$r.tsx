import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, Link } from '@remix-run/react'
import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import {
  createHoneycombMaterial,
  updateResolution,
  createCameraState,
  syncCameraToMaterial,
  isHyperbolicHoneycomb,
  honeycombName,
  rotateCamera,
  moveCamera,
  resetCamera,
  type HyperbolicCameraState,
} from '../../../code/honeycomb'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: `{${data?.p},${data?.q},${data?.r}} Hyperbolic Honeycomb` }]
}

export async function loader({ params }: LoaderFunctionArgs) {
  const p = parseInt(params.p ?? '5', 10)
  const q = parseInt(params.q ?? '3', 10)
  const r = parseInt(params.r ?? '4', 10)
  const isHyperbolic = isHyperbolicHoneycomb(p, q, r)
  return { p, q, r, isHyperbolic }
}

export default function HyperbolicHoneycombThreeJS() {
  const { p, q, r, isHyperbolic } = useLoaderData<typeof loader>()
  const containerRef = useRef<HTMLDivElement>(null)
  const [info, setInfo] = useState('')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Scene setup
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    // Use lower resolution for performance - no antialiasing, pixel ratio 1
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })
    renderer.setPixelRatio(1) // Force pixel ratio 1 for performance
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)

    // Zinc colors
    const zinc200 = new THREE.Color(228 / 255, 228 / 255, 231 / 255)
    const zinc300 = new THREE.Color(212 / 255, 212 / 255, 216 / 255)
    const zinc400 = new THREE.Color(161 / 255, 161 / 255, 170 / 255)
    const zinc500 = new THREE.Color(113 / 255, 113 / 255, 122 / 255)
    const zinc950 = new THREE.Color(9 / 255, 9 / 255, 11 / 255)

    // Create shader material
    const material = createHoneycombMaterial({
      p,
      q,
      r,
      width: container.clientWidth,
      height: container.clientHeight,
      vertexSize: 0,
      edgeSize: 0.05,
      maxIterations: 40,
      edgeColors: {
        a: zinc200,
        b: zinc300,
        c: zinc400,
        d: zinc500,
      },
      vertexColor: zinc200,
      backgroundColor: zinc950,
    })

    // Full-screen quad
    const geometry = new THREE.PlaneGeometry(2, 2)
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    // Camera state
    const cameraState = createCameraState()
    syncCameraToMaterial(cameraState, material)

    // Render flag - only render when needed
    let needsRender = true

    function render() {
      if (needsRender) {
        renderer.render(scene, camera)
        needsRender = false
      }
    }

    // Initial render
    render()

    // Drag state
    const dragState = {
      isDragging: false,
      lastX: 0,
      lastY: 0,
    }

    // Keys state for movement
    const keysPressed = new Set<string>()
    let movementInterval: number | null = null

    function startMovementLoop() {
      if (movementInterval) return
      movementInterval = window.setInterval(() => {
        let forward = 0
        let strafe = 0
        if (keysPressed.has('w') || keysPressed.has('arrowup')) forward += 1
        if (keysPressed.has('s') || keysPressed.has('arrowdown')) forward -= 1
        if (keysPressed.has('a') || keysPressed.has('arrowleft')) strafe -= 1
        if (keysPressed.has('d') || keysPressed.has('arrowright')) strafe += 1

        if (forward !== 0 || strafe !== 0) {
          moveCamera(cameraState, forward, strafe, 0.02, 0.95)
          syncCameraToMaterial(cameraState, material)
          needsRender = true
          render()
        } else {
          stopMovementLoop()
        }
      }, 32) // ~30fps for movement
    }

    function stopMovementLoop() {
      if (movementInterval) {
        clearInterval(movementInterval)
        movementInterval = null
      }
    }

    function onMouseDown(e: MouseEvent) {
      dragState.isDragging = true
      dragState.lastX = e.clientX
      dragState.lastY = e.clientY
    }

    function onMouseUp() {
      dragState.isDragging = false
    }

    function onMouseMove(e: MouseEvent) {
      if (!dragState.isDragging) return

      const dx = e.clientX - dragState.lastX
      const dy = e.clientY - dragState.lastY
      dragState.lastX = e.clientX
      dragState.lastY = e.clientY

      rotateCamera(cameraState, dx * 0.003, dy * 0.003)
      syncCameraToMaterial(cameraState, material)
      needsRender = true
      render()
    }

    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase()
      keysPressed.add(key)

      if (e.key === ' ') {
        resetCamera(cameraState)
        syncCameraToMaterial(cameraState, material)
        needsRender = true
        render()
      }

      if (['w', 's', 'a', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        startMovementLoop()
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      keysPressed.delete(e.key.toLowerCase())
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const delta = -Math.sign(e.deltaY) * 0.5
      moveCamera(cameraState, delta, 0, 0.04, 0.95)
      syncCameraToMaterial(cameraState, material)
      needsRender = true
      render()
    }

    function onResize() {
      const width = container.clientWidth
      const height = container.clientHeight
      renderer.setSize(width, height)
      updateResolution(material, width, height)
      needsRender = true
      render()
    }

    // Attach events
    container.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    container.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('resize', onResize)

    setInfo(honeycombName(p, q, r))

    return () => {
      stopMovementLoop()
      container.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      container.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
      container.removeChild(renderer.domElement)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
    }
  }, [p, q, r])

  return (
    <div className="min-h-screen flex flex-col bg-black text-gray-100">
      <header className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-gray-200">
            ← Back
          </Link>
          <h1 className="text-xl font-semibold">{info}</h1>
        </div>
        <div className="text-sm text-gray-500">GPU Ray Marching (Hyperboloid Model)</div>
      </header>
      <main className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0" />
        {!isHyperbolic && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="bg-red-900/80 p-4 rounded">
              {`{${p},${q},${r}}`} is not hyperbolic (1/p + 1/q + 1/r must be &lt; 1)
            </div>
          </div>
        )}
        <div className="absolute bottom-4 left-4 text-xs text-gray-300 bg-black/50 p-2 rounded space-y-1">
          <div>Drag to look around</div>
          <div>WASD / Arrow keys to move</div>
          <div>Scroll to zoom</div>
          <div>Space to reset position</div>
        </div>
      </main>
    </div>
  )
}
