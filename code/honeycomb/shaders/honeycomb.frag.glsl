/**
 * Fragment Shader for Hyperbolic Honeycomb Ray Marching
 *
 * Renders any {p,q,r} hyperbolic honeycomb using the hyperboloid model
 * with Coxeter group reflections.
 *
 * Based on neozhaoliang/Hyperbolic-Honeycombs
 */

precision highp float;

varying vec2 vUv;

uniform vec2 resolution;
uniform vec3 cameraPos;
uniform vec3 cameraDir;
uniform vec3 cameraUp;
uniform float time;

// Honeycomb parameters (Coxeter diagram indices)
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

// Colors
uniform vec3 edgeColorA;
uniform vec3 edgeColorB;
uniform vec3 edgeColorC;
uniform vec3 edgeColorD;
uniform vec3 vertexColor;
uniform vec3 backgroundColor;

// Interaction
uniform vec4 highlightCell;
uniform float highlightIntensity;

#define PI 3.14159265359

// ============================================
// Global State (set by initCoxeter)
// ============================================

// Reflection mirrors in 4D Minkowski space
mat4 M;
// Initial vertex
vec4 v0;
// cosh/sinh of vertex and edge radii
float cvr, svr, csr, ssr;

// ============================================
// Minkowski Space Operations
// ============================================

// Minkowski inner product with signature (3, 1)
float hdot(vec4 p, vec4 q) {
  return dot(p.xyz, q.xyz) - p.w * q.w;
}

// Normalize a timelike vector (hdot < 0)
vec4 hnormalize(vec4 p) {
  return p / sqrt(-hdot(p, p));
}

// Reflection about a hyperplane in Minkowski space
float tryReflect(inout vec4 p, vec4 n) {
  float k = min(0.0, hdot(p, n));
  p -= 2.0 * k * n;
  return k;
}

// ============================================
// Coxeter Group Initialization
// ============================================

void initCoxeter() {
  // Cosines of dihedral angles (negative for inward-facing mirrors)
  float c01 = -cos(PI / float(AB));
  float c02 = -cos(PI / float(AC));
  float c03 = -cos(PI / float(AD));
  float c12 = -cos(PI / float(BC));
  float c13 = -cos(PI / float(BD));
  float c23 = -cos(PI / float(CD));

  vec4 A, B, C, D;

  // Mirror A: along x-axis
  A = vec4(1.0, 0.0, 0.0, 0.0);

  // Mirror B: makes angle arccos(c01) with A
  B = vec4(c01, sqrt(1.0 - c01 * c01), 0.0, 0.0);

  // Mirror C: determined by angles with A and B
  C = vec4(c02, 0.0, 0.0, 0.0);
  C.y = (c12 - C.x * B.x) / B.y;
  C.z = sqrt(abs(1.0 - dot(C.xy, C.xy)));

  // Mirror D: in 4D, with negative w for upper hyperboloid sheet
  D = vec4(c03, 0.0, 0.0, 0.0);
  D.y = (c13 - D.x * B.x) / B.y;
  D.z = (c23 - dot(D.xy, C.xy)) / C.z;
  D.w = -sqrt(abs(dot(D.xyz, D.xyz) - 1.0));

  // Store mirrors
  M = mat4(A, B, C, D);

  // Compute initial vertex from active mirrors
  vec4 H = vec4(1.0, 1.0, 1.0, -1.0);
  mat4 Minv = inverse(mat4(H * A, H * B, H * C, H * D));
  v0 = hnormalize(activeMirrors * Minv);

  // Precompute hyperbolic trig for radii
  cvr = cosh(vertexSize);
  svr = sinh(vertexSize);
  csr = cosh(edgeSize);
  ssr = sinh(edgeSize);
}

// ============================================
// Folding Algorithm
// ============================================

bool fold4d(inout vec4 p) {
  float k;
  for (int i = 0; i < 200; i++) {
    if (i >= maxIterations) break;
    k = 0.0;
    p.x = abs(p.x);  // Reflect across A (x = 0 plane)
    k += tryReflect(p, M[1]);
    k += tryReflect(p, M[2]);
    k += tryReflect(p, M[3]);
    if (k == 0.0) return true;
  }
  return false;
}

// ============================================
// Distance Conversion (Knighty's Formula)
// ============================================

// Convert hyperbolic distance to Euclidean for ray marching
float knightyDD(float ca, float sa, float r) {
  float x = 1.0 + r * r;
  float y = 2.0 - x;
  return (2.0 * r * ca + x * sa) / (x * ca + 2.0 * r * sa + y) - r;
}

// ============================================
// Distance Estimators
// ============================================

// Distance to vertex (ball)
float dVertex(vec4 p, float r) {
  float ca = -hdot(p, v0);
  float sa = 0.5 * sqrt(-hdot(p - v0, p - v0) * hdot(p + v0, p + v0));
  return knightyDD(ca * cvr - sa * svr, sa * cvr - ca * svr, r);
}

// Distance to edge (tube along geodesic from v0 in direction of mirror n)
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

// Distance to all edges
float dSegments(vec4 p, float r) {
  float dA = dSegment(p, M[0], r);
  float dB = dSegment(p, M[1], r);
  float dC = dSegment(p, M[2], r);
  float dD = dSegment(p, M[3], r);
  return min(min(dA, dB), min(dC, dD));
}

// ============================================
// Main Distance Estimator
// ============================================

float DE(vec3 p) {
  float r = length(p);
  if (r >= 0.9999) return 0.001;

  // Lift to hyperboloid
  vec4 q = vec4(2.0 * p, 1.0 + r * r) / (1.0 - r * r);

  // Fold into fundamental domain
  bool found = fold4d(q);

  // Distance to features
  float dV = dVertex(q, r);
  float dS = dSegments(q, r);

  // Clip to ball boundary
  return max(r - clipRadius, min(dV, dS));
}

// Which edge is closest (for coloring)
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

// ============================================
// Normal Estimation
// ============================================

vec3 estimateNormal(vec3 p) {
  float eps = 0.0001;
  return normalize(vec3(
    DE(p + vec3(eps, 0, 0)) - DE(p - vec3(eps, 0, 0)),
    DE(p + vec3(0, eps, 0)) - DE(p - vec3(0, eps, 0)),
    DE(p + vec3(0, 0, eps)) - DE(p - vec3(0, 0, eps))
  ));
}

// ============================================
// Ambient Occlusion
// ============================================

float calcAO(vec3 pos, vec3 nor) {
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 0; i < 5; i++) {
    float h = 0.01 + 0.12 * float(i) / 4.0;
    float d = DE(pos + h * nor);
    occ += (h - d) * sca;
    sca *= 0.95;
  }
  return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}

// ============================================
// Coloring
// ============================================

vec3 getColor(vec3 pos) {
  float r = length(pos);
  if (r >= 0.999) return backgroundColor;

  vec4 q = vec4(2.0 * pos, 1.0 + r * r) / (1.0 - r * r);
  bool found = fold4d(q);

  if (!found) return backgroundColor;

  float dV = dVertex(q, r);
  float dS = dSegments(q, r);

  if (dV < dS) {
    return vertexColor;
  }

  // Color by which edge is closest
  int edge = closestEdge(q, r);
  if (edge == 0) return edgeColorA;
  if (edge == 1) return edgeColorB;
  if (edge == 2) return edgeColorC;
  return edgeColorD;
}

// ============================================
// Main Ray Marching
// ============================================

void main() {
  initCoxeter();

  // Ray setup
  vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / resolution.y;
  vec3 right = normalize(cross(cameraDir, cameraUp));
  vec3 up = cross(right, cameraDir);
  vec3 rayDir = normalize(cameraDir + uv.x * right + uv.y * up);
  vec3 rayOrigin = cameraPos;

  // Ray march
  float t = 0.0;
  float minDist = 1e10;
  vec3 hitPos = rayOrigin;

  for (int i = 0; i < 200; i++) {
    vec3 p = rayOrigin + t * rayDir;
    float d = DE(p);

    if (d < minDist) {
      minDist = d;
      hitPos = p;
    }

    if (d < 0.0001) {
      hitPos = p;
      break;
    }

    t += d * 0.8;

    if (t > 5.0) break;
  }

  // Shading
  vec3 color;
  if (minDist < 0.001) {
    vec3 normal = estimateNormal(hitPos);
    vec3 baseColor = getColor(hitPos);

    // Lighting
    vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
    float diff = max(dot(normal, lightDir), 0.0);
    float amb = 0.3;
    float ao = calcAO(hitPos, normal);

    // Specular
    vec3 viewDir = normalize(cameraPos - hitPos);
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 64.0);

    color = baseColor * (amb + diff * 0.7) * ao + vec3(1.0) * spec * 0.3;

    // Fog based on distance from origin
    float fog = 1.0 - exp(-length(hitPos) * 2.0);
    color = mix(color, backgroundColor, fog * 0.5);

    // Highlight
    if (highlightIntensity > 0.0) {
      float r = length(hitPos);
      vec4 q = vec4(2.0 * hitPos, 1.0 + r * r) / (1.0 - r * r);
      if (distance(q, highlightCell) < 0.5) {
        color = mix(color, vec3(1.0, 0.9, 0.7), highlightIntensity);
      }
    }
  } else {
    color = backgroundColor;
  }

  // Gamma correction
  color = pow(color, vec3(1.0 / 2.2));

  gl_FragColor = vec4(color, 1.0);
}
