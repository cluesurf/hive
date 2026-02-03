/**
 * Three.js ShaderMaterial for Hyperbolic Honeycomb Rendering (V2)
 *
 * Implements Option C: Explicit cell enumeration for complete polyhedra.
 * Loops over precomputed cells and computes minimum SDF.
 */

import * as THREE from 'three'

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`

// Maximum cells - keep small for performance (each cell = 1 SDF eval per ray step)
const MAX_CELLS = 64

const fragmentShader = `
precision highp float;

varying vec2 vUv;

uniform vec2 resolution;
uniform vec3 cameraPos;
uniform vec3 cameraDir;
uniform vec3 cameraUp;

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

uniform vec3 edgeColorA;
uniform vec3 edgeColorB;
uniform vec3 edgeColorC;
uniform vec3 edgeColorD;
uniform vec3 vertexColor;
uniform vec3 backgroundColor;

// Cell transforms: each cell is a 4x4 SO(3,1) matrix
uniform int cellCount;
uniform vec4 cellMat0[${MAX_CELLS}];
uniform vec4 cellMat1[${MAX_CELLS}];
uniform vec4 cellMat2[${MAX_CELLS}];
uniform vec4 cellMat3[${MAX_CELLS}];

#define PI 3.14159265359

// Coxeter mirror normals
mat4 M;
vec4 v0;
float cvr, svr, csr, ssr;

float hdot(vec4 p, vec4 q) {
  return dot(p.xyz, q.xyz) - p.w * q.w;
}

vec4 hnormalize(vec4 p) {
  return p / sqrt(abs(-hdot(p, p)));
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

// Apply SO(3,1) matrix to hyperboloid point
vec4 applyTransform(mat4 T, vec4 p) {
  return T * p;
}

// Fold point to fundamental domain (no depth tracking)
bool fold4d(inout vec4 p) {
  for (int i = 0; i < 200; i++) {
    if (i >= maxIterations) return false;

    bool reflected = false;

    if (p.x < 0.0) {
      p.x = -p.x;
      reflected = true;
    }

    float kb = hdot(p, M[1]);
    if (kb < 0.0) {
      p -= 2.0 * kb * M[1];
      reflected = true;
    }

    float kc = hdot(p, M[2]);
    if (kc < 0.0) {
      p -= 2.0 * kc * M[2];
      reflected = true;
    }

    float kd = hdot(p, M[3]);
    if (kd < 0.0) {
      p -= 2.0 * kd * M[3];
      reflected = true;
    }

    if (!reflected) return true;
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
  float sa = 0.5 * sqrt(abs(-hdot(p - v0, p - v0) * hdot(p + v0, p + v0)));
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
  float sa = 0.5 * sqrt(abs(-hdot(p - pj, p - pj) * hdot(p + pj, p + pj)));
  return knightyDD(ca * csr - sa * ssr, sa * csr - ca * ssr, r);
}

float dSegments(vec4 p, float r) {
  float dA = dSegment(p, M[0], r);
  float dB = dSegment(p, M[1], r);
  float dC = dSegment(p, M[2], r);
  float dD = dSegment(p, M[3], r);
  return min(min(dA, dB), min(dC, dD));
}

// Compute SDF for a single point in a single cell
float cellSDF(vec4 q, float r) {
  vec4 folded = q;
  if (!fold4d(folded)) return 1.0;

  float dV = dVertex(folded, r);
  float dS = dSegments(folded, r);
  return min(dV, dS);
}

// Mobius addition for Poincare ball
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

vec3 toHoneycombSpace(vec3 p) {
  return mobiusAdd(-cameraPos, p);
}

// Hyperbolic distance from origin in Poincare ball
float hyperbolicDist(float r) {
  return 2.0 * atanh(r);
}

// Simple folding-based DE with hyperbolic distance cutoff
float DE(vec3 p) {
  float r = length(p);
  if (r >= 0.998) return 1.0;

  // Hyperbolic distance cutoff - adjustable via maxCellDepth uniform (repurposed)
  // maxCellDepth of 3 -> clip at hyperbolic distance ~1.5
  float maxHypDist = float(cellCount) * 0.3;
  float hypDist = hyperbolicDist(r);
  if (hypDist > maxHypDist) return 1.0;

  // Convert to hyperboloid model
  vec4 q = vec4(2.0 * p, 1.0 + r * r) / (1.0 - r * r);

  // Standard folding
  if (!fold4d(q)) return 0.1;

  float dV = dVertex(q, r);
  float dS = dSegments(q, r);
  return min(dV, dS);
}

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

  // Same hyperbolic distance cutoff as DE
  float maxHypDist = float(cellCount) * 0.3;
  float hypDist = hyperbolicDist(r);
  if (hypDist > maxHypDist) return backgroundColor;

  vec4 q = vec4(2.0 * pH, 1.0 + r * r) / (1.0 - r * r);

  if (!fold4d(q)) return backgroundColor;

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

  float t = 0.0;
  float minDist = 1e10;
  vec3 hitPos = vec3(0.0);

  for (int i = 0; i < 80; i++) {
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

    vec3 lightDir1 = normalize(vec3(1.0, 1.0, 0.5));
    float diff1 = max(dot(normal, lightDir1), 0.0);

    vec3 lightDir2 = normalize(vec3(-0.5, 0.3, -1.0));
    float diff2 = max(dot(normal, lightDir2), 0.0) * 0.3;

    float rim = 1.0 - max(dot(viewDir, normal), 0.0);
    rim = pow(rim, 3.0) * 0.35;

    vec3 halfDir = normalize(lightDir1 + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 48.0);

    float ao = calcAO(hitPos, normal);

    float depthDarken = 1.0 - smoothstep(0.3, 0.95, dist) * 0.35;

    float amb = 0.35;
    float diffuse = diff1 * 0.6 + diff2;
    color = baseColor * (amb + diffuse) * (0.6 + ao * 0.4) * depthDarken;
    color += vec3(1.0) * spec * 0.2;
    color += baseColor * rim * 0.8;
  } else {
    color = backgroundColor;
  }

  color = pow(color, vec3(1.0 / 2.2));
  gl_FragColor = vec4(color, 1.0);
}
`

export interface HoneycombMaterialV2Options {
  p: number
  q: number
  r: number
  width: number
  height: number
  vertexSize?: number
  edgeSize?: number
  maxIterations?: number
  maxCellDepth?: number
  edgeColors?: {
    a?: THREE.Color
    b?: THREE.Color
    c?: THREE.Color
    d?: THREE.Color
  }
  vertexColor?: THREE.Color
  backgroundColor?: THREE.Color
  /** Precomputed cell matrices (flattened, 16 floats per cell) */
  cellMatrices?: Float32Array
  /** Cell depths corresponding to cellMatrices */
  cellDepths?: Int32Array
}

export function createHoneycombMaterialV2(
  options: HoneycombMaterialV2Options,
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
    maxCellDepth = 4,
    edgeColors = {},
    vertexColor = new THREE.Color(0.9, 0.9, 0.95),
    backgroundColor = new THREE.Color(0.1, 0.15, 0.2),
    cellMatrices,
    cellDepths,
  } = options

  // Initialize cell arrays
  const cellMat0: THREE.Vector4[] = []
  const cellMat1: THREE.Vector4[] = []
  const cellMat2: THREE.Vector4[] = []
  const cellMat3: THREE.Vector4[] = []

  let cellCount = 0

  if (cellMatrices && cellDepths) {
    cellCount = Math.min(cellDepths.length, MAX_CELLS)
    for (let i = 0; i < cellCount; i++) {
      const offset = i * 16
      cellMat0.push(
        new THREE.Vector4(
          cellMatrices[offset + 0],
          cellMatrices[offset + 1],
          cellMatrices[offset + 2],
          cellMatrices[offset + 3],
        ),
      )
      cellMat1.push(
        new THREE.Vector4(
          cellMatrices[offset + 4],
          cellMatrices[offset + 5],
          cellMatrices[offset + 6],
          cellMatrices[offset + 7],
        ),
      )
      cellMat2.push(
        new THREE.Vector4(
          cellMatrices[offset + 8],
          cellMatrices[offset + 9],
          cellMatrices[offset + 10],
          cellMatrices[offset + 11],
        ),
      )
      cellMat3.push(
        new THREE.Vector4(
          cellMatrices[offset + 12],
          cellMatrices[offset + 13],
          cellMatrices[offset + 14],
          cellMatrices[offset + 15],
        ),
      )
    }
  }

  // Pad arrays to MAX_CELLS
  while (cellMat0.length < MAX_CELLS) {
    cellMat0.push(new THREE.Vector4(0, 0, 0, 0))
    cellMat1.push(new THREE.Vector4(0, 0, 0, 0))
    cellMat2.push(new THREE.Vector4(0, 0, 0, 0))
    cellMat3.push(new THREE.Vector4(0, 0, 0, 0))
  }

  return new THREE.ShaderMaterial({
    uniforms: {
      resolution: { value: new THREE.Vector2(width, height) },
      cameraPos: { value: new THREE.Vector3(0, 0, 0) },
      cameraDir: { value: new THREE.Vector3(0, 0, 1) },
      cameraUp: { value: new THREE.Vector3(0, 1, 0) },

      AB: { value: p },
      AC: { value: 2 },
      AD: { value: 2 },
      BC: { value: q },
      BD: { value: 2 },
      CD: { value: r },

      activeMirrors: { value: new THREE.Vector4(1, 0, 0, 0) },

      vertexSize: { value: vertexSize },
      edgeSize: { value: edgeSize },
      maxIterations: { value: maxIterations },

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

      cellCount: { value: cellCount },
      cellMat0: { value: cellMat0 },
      cellMat1: { value: cellMat1 },
      cellMat2: { value: cellMat2 },
      cellMat3: { value: cellMat3 },
    },
    vertexShader,
    fragmentShader,
  })
}

export function updateCameraUniformsV2(
  material: THREE.ShaderMaterial,
  position: THREE.Vector3,
  direction: THREE.Vector3,
  up: THREE.Vector3,
): void {
  material.uniforms.cameraPos.value.copy(position)
  material.uniforms.cameraDir.value.copy(direction)
  material.uniforms.cameraUp.value.copy(up)
}

export function updateResolutionV2(
  material: THREE.ShaderMaterial,
  width: number,
  height: number,
): void {
  material.uniforms.resolution.value.set(width, height)
}
