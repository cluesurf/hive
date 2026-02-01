/**
 * Three.js ShaderMaterial for Hyperbolic Honeycomb Rendering
 *
 * Creates a ray marching material for rendering {p,q,r} honeycombs.
 */

import * as THREE from 'three'

// Shader source is inlined to avoid bundler issues with .glsl imports
const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`

const fragmentShader = `
precision highp float;

varying vec2 vUv;

uniform vec2 resolution;
uniform vec3 cameraPos;
uniform vec3 cameraDir;
uniform vec3 cameraUp;
uniform float time;

uniform int AB;
uniform int AC;
uniform int AD;
uniform int BC;
uniform int BD;
uniform int CD;
uniform vec4 activeMirrors;
uniform float vertexSize;
uniform float edgeSize;
uniform int maxIterations;
uniform float clipRadius;

uniform vec3 edgeColorA;
uniform vec3 edgeColorB;
uniform vec3 edgeColorC;
uniform vec3 edgeColorD;
uniform vec3 vertexColor;
uniform vec3 backgroundColor;

uniform vec4 highlightCell;
uniform float highlightIntensity;

#define PI 3.14159265359

mat4 M;
vec4 v0;
float cvr, svr, csr, ssr;

float hdot(vec4 p, vec4 q) {
  return dot(p.xyz, q.xyz) - p.w * q.w;
}

vec4 hnormalize(vec4 p) {
  return p / sqrt(-hdot(p, p));
}

float tryReflect(inout vec4 p, vec4 n) {
  float k = min(0.0, hdot(p, n));
  p -= 2.0 * k * n;
  return k;
}

void initCoxeter() {
  float c01 = -cos(PI / float(AB));
  float c02 = -cos(PI / float(AC));
  float c03 = -cos(PI / float(AD));
  float c12 = -cos(PI / float(BC));
  float c13 = -cos(PI / float(BD));
  float c23 = -cos(PI / float(CD));

  vec4 A, B, C, D;
  A = vec4(1.0, 0.0, 0.0, 0.0);
  B = vec4(c01, sqrt(1.0 - c01 * c01), 0.0, 0.0);
  C = vec4(c02, 0.0, 0.0, 0.0);
  C.y = (c12 - C.x * B.x) / B.y;
  C.z = sqrt(abs(1.0 - dot(C.xy, C.xy)));
  D = vec4(c03, 0.0, 0.0, 0.0);
  D.y = (c13 - D.x * B.x) / B.y;
  D.z = (c23 - dot(D.xy, C.xy)) / C.z;
  D.w = -sqrt(abs(dot(D.xyz, D.xyz) - 1.0));

  M = mat4(A, B, C, D);

  vec4 H = vec4(1.0, 1.0, 1.0, -1.0);
  mat4 Minv = inverse(mat4(H * A, H * B, H * C, H * D));
  v0 = hnormalize(activeMirrors * Minv);

  cvr = cosh(vertexSize);
  svr = sinh(vertexSize);
  csr = cosh(edgeSize);
  ssr = sinh(edgeSize);
}

bool fold4d(inout vec4 p) {
  float k;
  for (int i = 0; i < 80; i++) {
    k = 0.0;
    p.x = abs(p.x);
    k += tryReflect(p, M[1]);
    k += tryReflect(p, M[2]);
    k += tryReflect(p, M[3]);
    if (k == 0.0) return true;
  }
  return false;
}

float knightyDD(float ca, float sa, float r) {
  float x = 1.0 + r * r;
  float y = 2.0 - x;
  return (2.0 * r * ca + x * sa) / (x * ca + 2.0 * r * sa + y) - r;
}

float dVertex(vec4 p, float r) {
  float ca = -hdot(p, v0);
  float sa = 0.5 * sqrt(-hdot(p - v0, p - v0) * hdot(p + v0, p + v0));
  return knightyDD(ca * cvr - sa * svr, sa * cvr - ca * svr, r);
}

float dSegment(vec4 p, vec4 n, float r) {
  float pn = hdot(p, n);
  float pv = hdot(p, v0);
  float nv = hdot(n, v0);
  float det = -1.0 - nv * nv;
  float a = (-nv * pv - pn) / det;
  float b = (pv - pn * nv) / det;
  vec4 pj = hnormalize(min(a, 0.0) * n + b * v0);
  float ca = -hdot(p, pj);
  float sa = 0.5 * sqrt(-hdot(p - pj, p - pj) * hdot(p + pj, p + pj));
  return knightyDD(ca * csr - sa * ssr, sa * csr - ca * ssr, r);
}

float dSegments(vec4 p, float r) {
  float dA = dSegment(p, M[0], r);
  float dB = dSegment(p, M[1], r);
  float dC = dSegment(p, M[2], r);
  float dD = dSegment(p, M[3], r);
  return min(min(dA, dB), min(dC, dD));
}

// Mobius addition: a ⊕ b in Poincare ball
vec3 mobiusAdd(vec3 a, vec3 b) {
  float a2 = dot(a, a);
  float b2 = dot(b, b);
  float ab = dot(a, b);
  float denom = 1.0 + 2.0 * ab + a2 * b2;
  if (abs(denom) < 1e-10) return a;
  float coefA = (1.0 + 2.0 * ab + b2) / denom;
  float coefB = (1.0 - a2) / denom;
  return coefA * a + coefB * b;
}

// Transform point from view space to honeycomb space
vec3 toHoneycombSpace(vec3 p) {
  // Apply inverse camera translation to map view-space points to honeycomb space
  // If camera is at position 'a' in the honeycomb, a view-space point 'p'
  // corresponds to (-a) ⊕ p in the honeycomb's coordinate system
  return mobiusAdd(-cameraPos, p);
}

// Distance estimator that works in honeycomb space
float DE(vec3 p) {
  float r = length(p);
  if (r >= 0.998) return 0.01;
  vec4 q = vec4(2.0 * p, 1.0 + r * r) / (1.0 - r * r);
  bool found = fold4d(q);
  if (!found) return 0.1;
  float dV = dVertex(q, r);
  float dS = dSegments(q, r);
  return min(dV, dS);
}

// Distance estimator with coordinate transform
float DEtransformed(vec3 p) {
  vec3 pH = toHoneycombSpace(p);
  return DE(pH);
}

int closestEdge(vec4 p, float r) {
  float dA = dSegment(p, M[0], r);
  float dB = dSegment(p, M[1], r);
  float dC = dSegment(p, M[2], r);
  float dD = dSegment(p, M[3], r);
  float minD = min(min(dA, dB), min(dC, dD));
  if (minD == dA) return 0;
  if (minD == dB) return 1;
  if (minD == dC) return 2;
  return 3;
}

vec3 estimateNormal(vec3 p) {
  float eps = 0.0001;
  return normalize(vec3(
    DEtransformed(p + vec3(eps, 0, 0)) - DEtransformed(p - vec3(eps, 0, 0)),
    DEtransformed(p + vec3(0, eps, 0)) - DEtransformed(p - vec3(0, eps, 0)),
    DEtransformed(p + vec3(0, 0, eps)) - DEtransformed(p - vec3(0, 0, eps))
  ));
}

float calcAO(vec3 pos, vec3 nor) {
  float occ = 0.0;
  float h1 = 0.02;
  float h2 = 0.08;
  occ += (h1 - DEtransformed(pos + h1 * nor));
  occ += (h2 - DEtransformed(pos + h2 * nor)) * 0.5;
  return clamp(1.0 - 2.5 * occ, 0.0, 1.0);
}

vec3 getColor(vec3 pos) {
  vec3 pH = toHoneycombSpace(pos);
  float r = length(pH);
  if (r >= 0.998) return backgroundColor;
  vec4 q = vec4(2.0 * pH, 1.0 + r * r) / (1.0 - r * r);
  bool found = fold4d(q);
  if (!found) return backgroundColor;
  float dV = dVertex(q, r);
  float dS = dSegments(q, r);
  if (dV < dS) return vertexColor;
  int edge = closestEdge(q, r);
  if (edge == 0) return edgeColorA;
  if (edge == 1) return edgeColorB;
  if (edge == 2) return edgeColorC;
  return edgeColorD;
}

void main() {
  initCoxeter();
  vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / resolution.y;
  vec3 right = normalize(cross(cameraDir, cameraUp));
  vec3 up = cross(right, cameraDir);
  vec3 rayDir = normalize(cameraDir + uv.x * right + uv.y * up);

  // Ray march from origin in view space
  // Camera is always at origin, honeycomb is transformed around it
  float t = 0.0;
  float minDist = 1e10;
  vec3 hitPos = vec3(0.0);

  for (int i = 0; i < 120; i++) {
    vec3 p = t * rayDir;
    float d = DEtransformed(p);
    if (d < minDist) { minDist = d; hitPos = p; }
    if (d < 0.001) { hitPos = p; break; }
    t += d;
    if (t > 5.0) break;
  }

  vec3 color;
  if (minDist < 0.001) {
    vec3 normal = estimateNormal(hitPos);
    vec3 baseColor = getColor(hitPos);
    vec3 viewDir = normalize(-hitPos);
    float dist = length(hitPos);

    // Main light from upper right
    vec3 lightDir1 = normalize(vec3(1.0, 1.0, 0.5));
    float diff1 = max(dot(normal, lightDir1), 0.0);

    // Fill light from opposite side (softer)
    vec3 lightDir2 = normalize(vec3(-0.5, 0.3, -1.0));
    float diff2 = max(dot(normal, lightDir2), 0.0) * 0.3;

    // Rim lighting for edge definition
    float rim = 1.0 - max(dot(viewDir, normal), 0.0);
    rim = pow(rim, 3.0) * 0.35;

    // Specular highlight
    vec3 halfDir = normalize(lightDir1 + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 48.0);

    // Ambient occlusion
    float ao = calcAO(hitPos, normal);

    // Combine lighting
    float amb = 0.3;
    float diffuse = diff1 * 0.6 + diff2;
    color = baseColor * (amb + diffuse) * (0.6 + ao * 0.4);
    color += vec3(1.0) * spec * 0.25;
    color += baseColor * rim;

    // Layered depth fog based on view-space distance
    float layer1 = smoothstep(0.2, 0.4, dist) * 0.15;
    float layer2 = smoothstep(0.4, 0.6, dist) * 0.15;
    float layer3 = smoothstep(0.6, 0.8, dist) * 0.20;
    float layer4 = smoothstep(0.8, 0.95, dist) * 0.25;
    float totalFog = layer1 + layer2 + layer3 + layer4;

    float depthDarken = 1.0 - dist * 0.3;
    color *= depthDarken;
    color = mix(color, backgroundColor, totalFog);

    if (highlightIntensity > 0.0) {
      vec3 pH = toHoneycombSpace(hitPos);
      float r = length(pH);
      vec4 q = vec4(2.0 * pH, 1.0 + r * r) / (1.0 - r * r);
      if (distance(q, highlightCell) < 0.5) {
        color = mix(color, vec3(1.0, 0.9, 0.7), highlightIntensity);
      }
    }
  } else {
    color = backgroundColor;
  }
  color = pow(color, vec3(1.0 / 2.2));
  gl_FragColor = vec4(color, 1.0);
}
`

/**
 * Options for creating a honeycomb material.
 */
export interface HoneycombMaterialOptions {
  /** Polygon sides (p in {p,q,r}) */
  p: number
  /** Polygons per edge (q in {p,q,r}) */
  q: number
  /** Cells per edge (r in {p,q,r}) */
  r: number
  /** Initial resolution */
  width: number
  height: number
  /** Feature sizes */
  vertexSize?: number
  edgeSize?: number
  /** Max folding iterations */
  maxIterations?: number
  /** Colors */
  edgeColors?: {
    a?: THREE.Color
    b?: THREE.Color
    c?: THREE.Color
    d?: THREE.Color
  }
  vertexColor?: THREE.Color
  backgroundColor?: THREE.Color
}

/**
 * Create a Three.js ShaderMaterial for honeycomb rendering.
 */
export function createHoneycombMaterial(
  options: HoneycombMaterialOptions,
): THREE.ShaderMaterial {
  const {
    p,
    q,
    r,
    width,
    height,
    vertexSize = 0.12,
    edgeSize = 0.05,
    maxIterations = 100,
    edgeColors = {},
    vertexColor = new THREE.Color(0.9, 0.9, 0.95),
    backgroundColor = new THREE.Color(0.1, 0.15, 0.2),
  } = options

  return new THREE.ShaderMaterial({
    uniforms: {
      resolution: { value: new THREE.Vector2(width, height) },
      cameraPos: { value: new THREE.Vector3(0, 0, 0) },
      cameraDir: { value: new THREE.Vector3(0, 0, 1) },
      cameraUp: { value: new THREE.Vector3(0, 1, 0) },
      time: { value: 0 },

      // Schlafli symbol mapped to Coxeter diagram
      AB: { value: p },
      AC: { value: 2 },
      AD: { value: 2 },
      BC: { value: q },
      BD: { value: 2 },
      CD: { value: r },

      // Which mirrors define the vertex
      activeMirrors: { value: new THREE.Vector4(1, 0, 0, 0) },

      // Feature sizes
      vertexSize: { value: vertexSize },
      edgeSize: { value: edgeSize },
      maxIterations: { value: maxIterations },
      clipRadius: { value: 0.998 },

      // Colors
      edgeColorA: {
        value: edgeColors.a ?? new THREE.Color(0.8, 0.7, 0.3),
      },
      edgeColorB: {
        value: edgeColors.b ?? new THREE.Color(0.3, 0.7, 0.8),
      },
      edgeColorC: {
        value: edgeColors.c ?? new THREE.Color(0.7, 0.3, 0.8),
      },
      edgeColorD: {
        value: edgeColors.d ?? new THREE.Color(0.3, 0.8, 0.5),
      },
      vertexColor: { value: vertexColor },
      backgroundColor: { value: backgroundColor },

      // Interaction
      highlightCell: { value: new THREE.Vector4(0, 0, 0, 1) },
      highlightIntensity: { value: 0 },
    },
    vertexShader,
    fragmentShader,
  })
}

/**
 * Update camera uniforms on the material.
 */
export function updateCameraUniforms(
  material: THREE.ShaderMaterial,
  position: THREE.Vector3,
  direction: THREE.Vector3,
  up: THREE.Vector3,
): void {
  material.uniforms.cameraPos.value.copy(position)
  material.uniforms.cameraDir.value.copy(direction)
  material.uniforms.cameraUp.value.copy(up)
}

/**
 * Update resolution uniform on the material.
 */
export function updateResolution(
  material: THREE.ShaderMaterial,
  width: number,
  height: number,
): void {
  material.uniforms.resolution.value.set(width, height)
}

/**
 * Update time uniform on the material.
 */
export function updateTime(
  material: THREE.ShaderMaterial,
  time: number,
): void {
  material.uniforms.time.value = time
}

/**
 * Set highlight for cell picking.
 */
export function setHighlight(
  material: THREE.ShaderMaterial,
  cell: THREE.Vector4 | null,
  intensity: number = 0.3,
): void {
  if (cell) {
    material.uniforms.highlightCell.value.copy(cell)
    material.uniforms.highlightIntensity.value = intensity
  } else {
    material.uniforms.highlightIntensity.value = 0
  }
}
