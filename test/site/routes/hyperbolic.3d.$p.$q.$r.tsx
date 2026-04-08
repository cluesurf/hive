import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, Link } from '@remix-run/react'
import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import {
  isHyperbolicHoneycomb,
  honeycombName,
  createHoneycombScene,
} from '../../../code/honeycomb'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    {
      title: `{${data?.p},${data?.q},${data?.r}} Hyperbolic Honeycomb`,
    },
  ]
}

export async function loader({ params }: LoaderFunctionArgs) {
  const p = parseInt(params.p ?? '5', 10)
  const q = parseInt(params.q ?? '3', 10)
  const r = parseInt(params.r ?? '4', 10)
  const isHyperbolic = isHyperbolicHoneycomb(p, q, r)
  return { p, q, r, isHyperbolic }
}

export default function HyperbolicHoneycombMesh() {
  const { p, q, r, isHyperbolic } = useLoaderData<typeof loader>()
  const containerRef = useRef<HTMLDivElement>(null)
  const [info, setInfo] = useState('')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Scene setup
    const scene = new THREE.Scene()
    const bgColor = new THREE.Color(5 / 255, 150 / 255, 105 / 255) // Emerald 600
    scene.background = bgColor
    // Add fog for depth perception - push far out to show distant structure
    scene.fog = new THREE.Fog(bgColor, 0.5, 2.5)

    // Perspective camera at origin looking toward the geometry
    const camera = new THREE.PerspectiveCamera(
      90,
      container.clientWidth / container.clientHeight,
      0.001,
      10,
    )
    camera.position.set(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)

    // Lighting - setup for good 3D depth perception like Wikipedia
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
    scene.add(ambientLight)

    // Strong point light at camera for interior viewing
    const pointLight = new THREE.PointLight(0xffffff, 1.5, 5)
    pointLight.position.set(0, 0, 0)
    scene.add(pointLight)

    // Directional lights from multiple angles for depth shading
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.6)
    dirLight1.position.set(1, 1, 1)
    scene.add(dirLight1)

    const dirLight2 = new THREE.DirectionalLight(0xaaaaaa, 0.4)
    dirLight2.position.set(-1, -0.5, -1)
    scene.add(dirLight2)

    const dirLight3 = new THREE.DirectionalLight(0x888888, 0.3)
    dirLight3.position.set(0, -1, 0)
    scene.add(dirLight3)

    // Generate honeycomb mesh
    const maxDepth = 3 // Number of cell layers (each layer = one D reflection)
    console.log(
      `Generating mesh for {${p},${q},${r}} with ${maxDepth} cell layers...`,
    )

    try {
      const honeycombGroup = createHoneycombScene(p, q, r, maxDepth)
      scene.add(honeycombGroup)
      setInfo(
        `${honeycombName(p, q, r)} (depth ${maxDepth}, ${
          honeycombGroup.children.length
        } meshes)`,
      )

      // Point camera toward the geometry centroid for the best initial view
      if (honeycombGroup.children.length > 0) {
        const box = new THREE.Box3().setFromObject(honeycombGroup)
        const center = box.getCenter(new THREE.Vector3())
        camera.lookAt(center)
      }
    } catch (error) {
      console.error('Error generating honeycomb:', error)
      setInfo(`${honeycombName(p, q, r)} (error generating mesh)`)
    }

    // Camera rotation state - initialize from current camera orientation
    const initialEuler = new THREE.Euler().setFromQuaternion(
      camera.quaternion,
      'YXZ',
    )
    let yaw = initialEuler.y
    let pitch = initialEuler.x
    const euler = new THREE.Euler(0, 0, 0, 'YXZ')

    function updateCameraRotation() {
      euler.set(pitch, yaw, 0, 'YXZ')
      camera.quaternion.setFromEuler(euler)
    }

    // Animation loop
    let animationId: number

    function animate() {
      animationId = requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }

    animate()

    // Mouse drag controls for looking around
    let isDragging = false
    let lastX = 0
    let lastY = 0

    function onMouseDown(e: MouseEvent) {
      isDragging = true
      lastX = e.clientX
      lastY = e.clientY
    }

    function onMouseUp() {
      isDragging = false
    }

    function onMouseMove(e: MouseEvent) {
      if (!isDragging) return

      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY

      yaw -= dx * 0.003
      pitch -= dy * 0.003
      pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch))

      updateCameraRotation()
    }

    function onResize() {
      const width = container.clientWidth
      const height = container.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    container.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animationId)
      container.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      container.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [p, q, r])

  return (
    <div className="min-h-screen flex flex-col bg-black text-gray-100">
      <header className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-gray-400 hover:text-gray-200"
          >
            ← Back
          </Link>
          <h1 className="text-xl font-semibold">{info}</h1>
        </div>
        <div className="text-sm text-gray-500">
          Explicit Mesh Geometry
        </div>
      </header>
      <main className="flex-1 relative">
        <div
          ref={containerRef}
          className="absolute inset-0"
        />
        {!isHyperbolic && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="bg-red-900/80 p-4 rounded">
              {`{${p},${q},${r}}`} is not hyperbolic (1/p + 1/q + 1/r
              must be &lt; 1)
            </div>
          </div>
        )}
        <div className="absolute bottom-4 left-4 text-xs text-gray-300 bg-black/50 p-2 rounded space-y-1">
          <div>Drag to look around</div>
        </div>
      </main>
    </div>
  )
}
