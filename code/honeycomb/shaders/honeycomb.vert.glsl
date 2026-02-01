/**
 * Vertex Shader for Hyperbolic Honeycomb Ray Marching
 *
 * Simple pass-through for full-screen quad rendering.
 */

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
