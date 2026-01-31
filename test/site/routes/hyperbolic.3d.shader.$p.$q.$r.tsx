import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, Link } from '@remix-run/react'
import { useRef, useEffect, useState } from 'react'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    {
      title: `{${data?.p},${data?.q},${data?.r}} Hyperbolic Honeycomb (Shader) - Interactive Demo`,
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

// Vertex shader - just renders a full-screen quad
const vertexShaderSource = `#version 300 es
in vec4 aPosition;
out vec2 vUv;

void main() {
  vUv = aPosition.xy * 0.5 + 0.5;
  gl_Position = aPosition;
}
`

// Fragment shader - Kleinian group sphere inversion fractal
// Based on iterative sphere inversions to generate limit set
const fragmentShaderSource = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uCameraPos;
uniform mat3 uCameraRot;
uniform float uP;
uniform float uQ;
uniform float uR;

#define PI 3.14159265359
#define MAX_ITER 50

// ============================================
// Sphere Inversion
// ============================================

// Invert point p in sphere with center c and radius r
vec3 invertInSphere(vec3 p, vec3 c, float r) {
    vec3 d = p - c;
    float d2 = dot(d, d);
    float r2 = r * r;
    return c + d * (r2 / d2);
}

// Check if point is inside sphere
bool insideSphere(vec3 p, vec3 c, float r) {
    vec3 d = p - c;
    return dot(d, d) < r * r;
}

// ============================================
// Honeycomb via Sphere Inversions
// ============================================

// For {5,3,4} dodecahedral honeycomb, we need 4 inversion spheres
// arranged so their inversions generate the honeycomb symmetry group

// These sphere parameters are computed from the Coxeter group
// The spheres are orthogonal to the Poincare ball boundary

void getInversionSpheres(float p, float q, float r,
    out vec3 c1, out float r1,
    out vec3 c2, out float r2,
    out vec3 c3, out float r3,
    out vec3 c4, out float r4) {

    // Compute from Schlafli symbol angles
    float ap = PI / p;
    float aq = PI / q;
    float ar = PI / r;

    // For a proper honeycomb, sphere positions come from Gram matrix
    // These are approximate values that give good visual results

    float scale = 1.0;

    // Sphere 1: related to edge p
    c1 = vec3(1.0, 0.0, 0.0) * scale;
    r1 = sqrt(2.0) * sin(ap) * scale;

    // Sphere 2: related to vertex q
    float cpa = cos(ap);
    float spa = sin(ap);
    c2 = vec3(cpa, spa, 0.0) * scale;
    r2 = sqrt(2.0) * sin(aq) * scale;

    // Sphere 3: related to cell r
    float cpq = cos(ap) * cos(aq);
    float spq = sin(ap) * sin(aq);
    c3 = vec3(cpq, spq * cos(ar), spq * sin(ar)) * scale;
    r3 = sqrt(2.0) * sin(ar) * scale;

    // Sphere 4: central inversion for hyperbolic structure
    c4 = vec3(0.0, 0.0, 0.0);
    r4 = 0.5;
}

// Iterate inversions and return iteration data
vec4 iterateInversions(vec3 p, float pv, float qv, float rv) {
    vec3 c1, c2, c3, c4;
    float r1, r2, r3, r4;
    getInversionSpheres(pv, qv, rv, c1, r1, c2, r2, c3, r3, c4, r4);

    int count = 0;
    int lastSphere = -1;
    float minDist = 1000.0;

    for (int i = 0; i < MAX_ITER; i++) {
        bool folded = false;

        // Check each inversion sphere
        if (insideSphere(p, c1, r1)) {
            p = invertInSphere(p, c1, r1);
            count++;
            lastSphere = 0;
            folded = true;
        }
        if (insideSphere(p, c2, r2)) {
            p = invertInSphere(p, c2, r2);
            count++;
            lastSphere = 1;
            folded = true;
        }
        if (insideSphere(p, c3, r3)) {
            p = invertInSphere(p, c3, r3);
            count++;
            lastSphere = 2;
            folded = true;
        }
        if (insideSphere(p, c4, r4)) {
            p = invertInSphere(p, c4, r4);
            count++;
            lastSphere = 3;
            folded = true;
        }

        // Track minimum distance to sphere boundaries
        minDist = min(minDist, length(p - c1) - r1);
        minDist = min(minDist, length(p - c2) - r2);
        minDist = min(minDist, length(p - c3) - r3);
        minDist = min(minDist, length(p - c4) - r4);

        if (!folded) break;
    }

    return vec4(float(count), float(lastSphere), minDist, length(p));
}

// ============================================
// Rendering
// ============================================

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;

    // Ray direction (first person view from origin)
    vec3 rd = normalize(uCameraRot * vec3(uv, 1.0));

    // We're rendering on a unit sphere surface
    // Find intersection with unit sphere
    float t = 1.0; // We start at the sphere surface
    vec3 p = rd * t;

    // Apply iterative inversions
    vec4 result = iterateInversions(p, uP, uQ, uR);

    float iterCount = result.x;
    float lastSphere = result.y;
    float minDist = result.z;
    float finalDist = result.w;

    // Color based on iteration dynamics
    vec3 col;

    // Background color for escaped points
    vec3 bgColor = vec3(0.2, 0.35, 0.55);

    // Points on the limit set (high iteration) get detailed coloring
    float t_iter = iterCount / float(MAX_ITER);

    if (iterCount < 2.0) {
        // Smooth region - points that quickly stabilize
        col = bgColor;
    } else {
        // Fractal region - color by iteration count and sphere
        // Metallic silver base
        col = vec3(0.7, 0.72, 0.75);

        // Add color variation based on last sphere hit
        if (lastSphere == 0.0) col *= vec3(1.0, 0.95, 0.9);
        if (lastSphere == 1.0) col *= vec3(0.95, 1.0, 0.95);
        if (lastSphere == 2.0) col *= vec3(0.9, 0.95, 1.0);

        // Darken with iteration depth (creates the infinite recession effect)
        col *= 1.0 - t_iter * 0.5;

        // Edge highlighting - points near sphere boundaries
        float edgeFactor = smoothstep(0.0, 0.1, abs(minDist));
        col = mix(col * 1.3, col, edgeFactor);
    }

    // Simple lighting based on ray direction
    float light = 0.5 + 0.5 * dot(rd, normalize(vec3(1.0, 1.0, 0.5)));
    col *= light;

    // Gamma correction
    col = pow(col, vec3(0.4545));

    fragColor = vec4(col, 1.0);
}
`

export default function HyperbolicHoneycombShader() {
  const { p, q, r, isHyperbolic, schlaefliSum } = useLoaderData<typeof loader>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGL2RenderingContext | null>(null)
  const programRef = useRef<WebGLProgram | null>(null)
  const animationRef = useRef<number>(0)

  const [rotationX, setRotationX] = useState(0)
  const [rotationY, setRotationY] = useState(0)
  const [fps, setFps] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Initialize WebGL2
    const gl = canvas.getContext('webgl2')
    if (!gl) {
      console.error('WebGL2 not supported')
      return
    }
    glRef.current = gl

    // Compile shaders
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!
    gl.shaderSource(vertexShader, vertexShaderSource)
    gl.compileShader(vertexShader)
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error('Vertex shader error:', gl.getShaderInfoLog(vertexShader))
      return
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!
    gl.shaderSource(fragmentShader, fragmentShaderSource)
    gl.compileShader(fragmentShader)
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error('Fragment shader error:', gl.getShaderInfoLog(fragmentShader))
      return
    }

    // Link program
    const program = gl.createProgram()!
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program))
      return
    }
    programRef.current = program

    // Create full-screen quad
    const vertices = new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ])
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    const aPosition = gl.getAttribLocation(program, 'aPosition')
    gl.enableVertexAttribArray(aPosition)
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)

    // Resize handler
    const resize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio
      canvas.height = canvas.clientHeight * window.devicePixelRatio
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  // Render loop
  useEffect(() => {
    const gl = glRef.current
    const program = programRef.current
    if (!gl || !program) return

    let lastTime = performance.now()
    let frameCount = 0

    const render = () => {
      const now = performance.now()
      frameCount++
      if (now - lastTime > 1000) {
        setFps(Math.round(frameCount * 1000 / (now - lastTime)))
        frameCount = 0
        lastTime = now
      }

      gl.useProgram(program)

      // Set uniforms
      const uResolution = gl.getUniformLocation(program, 'uResolution')
      gl.uniform2f(uResolution, gl.canvas.width, gl.canvas.height)

      const uTime = gl.getUniformLocation(program, 'uTime')
      gl.uniform1f(uTime, now * 0.001)

      // Camera position (inside the ball, near origin)
      const uCameraPos = gl.getUniformLocation(program, 'uCameraPos')
      gl.uniform3f(uCameraPos, 0, 0, 0)

      // Camera rotation matrix
      const cx = Math.cos(rotationX)
      const sx = Math.sin(rotationX)
      const cy = Math.cos(rotationY)
      const sy = Math.sin(rotationY)

      const rotMatrix = [
        cy, 0, sy,
        sx * sy, cx, -sx * cy,
        -cx * sy, sx, cx * cy,
      ]

      const uCameraRot = gl.getUniformLocation(program, 'uCameraRot')
      gl.uniformMatrix3fv(uCameraRot, false, rotMatrix)

      // Schläfli symbol
      const uP = gl.getUniformLocation(program, 'uP')
      const uQ = gl.getUniformLocation(program, 'uQ')
      const uR = gl.getUniformLocation(program, 'uR')
      gl.uniform1f(uP, p)
      gl.uniform1f(uQ, q)
      gl.uniform1f(uR, r)

      // Draw
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      animationRef.current = requestAnimationFrame(render)
    }

    render()

    return () => cancelAnimationFrame(animationRef.current)
  }, [p, q, r, rotationX, rotationY])

  // Mouse drag
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let dragging = false
    let lastX = 0
    let lastY = 0

    const onMouseDown = (e: MouseEvent) => {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      setRotationY(prev => prev + dx * 0.005)
      setRotationX(prev => prev + dy * 0.005)
    }

    const onMouseUp = () => {
      dragging = false
    }

    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-gray-100">
      <header className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-gray-200">
            ← Back
          </Link>
          <h1 className="text-xl font-semibold">
            {`{${p},${q},${r}}`} Hyperbolic Honeycomb (Raymarched)
          </h1>
          <span className="text-sm text-green-400 bg-green-400/10 px-2 py-1 rounded">
            WebGL Shader
          </span>
        </div>
        <div className="text-sm text-gray-400">
          {fps} FPS
        </div>
      </header>

      <main className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        />

        {!isHyperbolic && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="bg-red-900/80 p-4 rounded">
              {`{${p},${q},${r}}`} is not hyperbolic (sum = {schlaefliSum.toFixed(3)} ≥ 1)
            </div>
          </div>
        )}
      </main>

      <footer className="p-2 text-center text-gray-500 text-xs border-t border-gray-700">
        Drag to look around | WebGL raymarching shader with kaleidoscopic folding
      </footer>
    </div>
  )
}
