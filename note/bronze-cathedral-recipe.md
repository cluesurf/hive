# Bronze Cathedral Recipe

A practical guide to recreating the specific "fractal cathedral / cave"
style with warm bronze/gold shading. This is the exact "how they did it"
model.

## Visual Characteristics

The style has these specific features:

- **Warm bronze / gold shading**, high micro-detail
- **Strong bilateral symmetry** (reads like mirrored space, not just a
  2D mirror overlay)
- **Corrugated ribs and repeating crenellations** that feel like
  Mandelbox/KIFS family, not a smooth Mandelbulb
- **Camera flying forward through a tunnel** while fractal parameters
  subtly morph (walls "breathe" instead of being a rigid tube)
- **Lighting**: mostly ambient occlusion + a few directional lights,
  with specular "metal" response, maybe a little fog

This is the classic look from **Mandelbox or Kaleidoscopic IFS (KIFS)
style distance-estimator fractals**, raymarched, then post-graded.

## 1. Practical Pipeline (Mandelbulber/Fragmentarium)

### A. Choose the Right Fractal Family: Mandelbox or KIFS

The "cave architecture" look usually comes from transforms like:

- Box folds (abs, clamp, mirror)
- Repeated scaling + translation
- Optional sphere folds
- Optional "kaleidoscopic fold" in multiple planes

In Mandelbulber / Fragmentarium terms, look for presets or formulas
named like:

- Mandelbox
- Mandelbox hybrid
- Kaleidoscopic IFS (KIFS)
- "Folding" based distance estimator fractals

Mandelbulb (the round lobey one) is not the primary vibe here. This
style is more rectilinear and ribbed.

### B. Put the Camera Inside the Fractal and Fly Forward

Most of the motion is:

- Constant forward motion along a main axis
- Small yaw/roll oscillation so it feels like drifting
- Tiny parameter morph so the walls change, not just the camera

A typical camera path:

- **Position**: `(0, 0, z(t))` where `z(t)` increases steadily
- **Target**: slightly offset and slowly rotating (tiny orbit)
- **FOV**: modest (too wide looks like fisheye, too narrow loses the
  tunnel)

### C. Add "Symmetry in the World," Not Just a Screen Effect

The geometry itself should be symmetric, not a post mirror.

That is usually done by folding the 3D sample point before evaluating
the distance estimator:

- Fold in XY plane
- Fold in XZ plane
- Fold in YZ plane

This creates kaleidoscopic repetition as actual structure.

In tools, this often appears as:

- "Kaleidoscopic" transform
- "Symmetry" options
- "Fold" modifiers

### D. Lighting: AO Heavy, Metallic Specular, Mild Fog

The bronze look is a combo of:

| Parameter       | Setting                           |
| --------------- | --------------------------------- |
| Ambient Occl.   | High, to carve the ridges         |
| Diffuse         | Moderate                          |
| Specular        | Fairly strong (metal sheen)       |
| Shadow softness | Moderate                          |
| Fog/volumetrics | Small but present (depth feel)    |

AO and specular are the big levers.

### E. Color is Mostly Grading, Not "Painted Textures"

The fractal itself is probably shaded with a simple palette (maybe
iteration-based), then color graded to that warm gold.

Common approach:

1. Base color tied to iteration count or distance
2. Multiply by lighting
3. Post: contrast curve + warm shift + subtle bloom/glare

### F. Render Frames, Then Post in Blender

The "final polish" look usually comes from compositor:

- Glare/bloom
- Slight vignette
- Contrast curve
- Sometimes a tiny chromatic aberration

## 2. Build It Yourself: The Exact Model

What you render is a distance field, `d = DE(p)`, and you raymarch it.

The "cave fractal" feel comes from this structure:

### A. Core Loop: Folding + Scaling Transforms (Mandelbox-like)

```glsl
// returns distance estimate
float DE(vec3 p) {
  vec3 z = p;
  float dr = 1.0;     // derivative accumulator
  float r2 = 0.0;

  for (int i = 0; i < ITERS; i++) {

    // 1) kaleidoscopic / symmetry folds (world symmetry)
    z = kaleidoFold3D(z, slices);

    // 2) box fold (creates rectilinear ribs)
    z = boxFold(z, foldLimit);

    // 3) sphere fold (creates "pinched" cavern chambers)
    z = sphereFold(z, minRadius, maxRadius, dr);

    // 4) scale + translate (creates self-similar layering)
    z = z * scale + p;

    r2 = dot(z, z);
    if (r2 > bailout) break;
  }

  // distance estimate is some function of |z| and dr
  float r = sqrt(r2);
  return r / abs(dr);
}
```

The exact formulas differ, but this is the canonical shape of these
"architectural caves."

### B. Kaleidoscopic Fold in 3D (Makes It Look Like the Style)

Two common methods.

**Method 1: Polar Wedge Fold in Planes**

```glsl
vec2 kaleido2(vec2 p, float n) {
  float r = length(p);
  float a = atan(p.y, p.x);
  float sector = 2.0*PI / n;
  a = mod(a, sector);
  a = abs(a - 0.5*sector);
  return r * vec2(cos(a), sin(a));
}

vec3 kaleidoFold3D(vec3 p, float n) {
  p.xy = kaleido2(p.xy, n);
  p.xz = kaleido2(p.xz, n);
  // optional: p.yz too, but that can get "too symmetric"
  return p;
}
```

**Method 2: Mirror-Sort Fold (Fast, Very "Crystalline")**

```glsl
vec3 mirrorSortFold(vec3 p) {
  p = abs(p);
  if (p.x < p.y) p.xy = p.yx;
  if (p.x < p.z) p.xz = p.zx;
  if (p.y < p.z) p.yz = p.zy;
  return p;
}
```

The bronze cathedral style reads closer to "folded symmetry" than a
single 2D screen mirror, so something like the above is likely.

### C. "Tunnel Flight" Comes From Where You Apply Motion

There are two main ways:

1. Move the camera forward
2. Move space backward (often easier)

In shaders, people often do:

```glsl
p.z += iTime * speed;
```

inside `map(p)` before `DE(p)`.

Then your camera can stay roughly stable while the world scrolls.

### D. The "Living Cave" Look: Small Parameter Morphs

If it were just camera-forward, the walls would feel static.

The ribs subtly change because of:

- Slowly change `scale`
- Slowly change fold limits
- Slowly change kaleido slice count or fold angle (careful,
  discontinuities)
- Add a tiny domain warp

Domain warp example:

```glsl
p += 0.08 * sin(p.yzx*2.0 + iTime*0.6);
```

Small warp goes a long way.

### E. Lighting Recipe That Matches This Vibe

A minimal raymarch shading model that will get you close:

- Normal from gradient of `map(p)`
- 1 directional light
- AO term sampled along the normal
- Specular (metal-like)
- Fog based on travel distance
- Optional glow accumulation from near misses

Pseudo:

```glsl
col = baseColor * diff * ao + spec * fresnel;
col = mix(col, fogColor, fogAmount);
col += glowAcc * glowColor;
```

AO is important for that "carved rib" look.

### F. Post Processing

Even if you do it all in shader, the "final polish" often adds:

- Bloom/glare
- Contrast curve
- Saturation management (keep it rich, not blown out)

Blender compositor glare node can do this fast.

## 3. Concrete Checklist to Recreate This Style

The shortest path to "this looks like the bronze cathedral":

1. **Start with Mandelbox or KIFS preset** in Mandelbulber (or a known
   Mandelbox DE in Fragmentarium)

2. **Enable 3D symmetry folding** (kaleido fold in multiple planes)

3. **Set material toward metal**: high specular, moderate roughness (or
   equivalent)

4. **Crank AO and add mild fog**

5. **Animate**:
   - World scroll: `z += t * speed`
   - Very small changes to `scale` and fold parameters over time
   - Tiny camera drift / roll

6. **Render image sequence**

7. **In Blender compositor**: glare + contrast + vignette

## Complete GLSL Shader: Bronze Cathedral

A drop-in shader implementing Mandelbox-ish DE + 3D kaleido fold + the
exact lighting/glow stack for this cave look.

```glsl
precision highp float;

uniform vec2  iResolution;
uniform float iTime;

#define PI 3.14159265359
#define MAX_STEPS 100
#define MAX_DIST 50.0
#define SURF_DIST 0.001
#define ITERS 12

// ============================================================
// KALEIDOSCOPIC FOLDS
// ============================================================

vec2 kaleido2(vec2 p, float n) {
  float r = length(p);
  float a = atan(p.y, p.x);
  float sector = 2.0 * PI / n;
  a = mod(a, sector);
  a = abs(a - 0.5 * sector);
  return r * vec2(cos(a), sin(a));
}

vec3 kaleidoFold3D(vec3 p, float n) {
  p.xy = kaleido2(p.xy, n);
  p.xz = kaleido2(p.xz, n);
  return p;
}

// Alternative: mirror-sort fold for crystalline look
vec3 mirrorSortFold(vec3 p) {
  p = abs(p);
  if (p.x < p.y) p.xy = p.yx;
  if (p.x < p.z) p.xz = p.zx;
  if (p.y < p.z) p.yz = p.zy;
  return p;
}

// ============================================================
// MANDELBOX DISTANCE ESTIMATOR
// ============================================================

float boxFoldComponent(float v, float limit) {
  if (v > limit) return 2.0 * limit - v;
  if (v < -limit) return -2.0 * limit - v;
  return v;
}

vec3 boxFold(vec3 z, float limit) {
  return vec3(
    boxFoldComponent(z.x, limit),
    boxFoldComponent(z.y, limit),
    boxFoldComponent(z.z, limit)
  );
}

void sphereFold(inout vec3 z, inout float dr, float minR, float maxR) {
  float r2 = dot(z, z);
  float minR2 = minR * minR;
  float maxR2 = maxR * maxR;

  if (r2 < minR2) {
    float factor = maxR2 / minR2;
    z *= factor;
    dr *= factor;
  } else if (r2 < maxR2) {
    float factor = maxR2 / r2;
    z *= factor;
    dr *= factor;
  }
}

// Parameters (animate these for "breathing" effect)
float getScale() {
  return 2.0 + 0.1 * sin(iTime * 0.3);
}

float getFoldLimit() {
  return 1.0 + 0.05 * sin(iTime * 0.4 + 1.0);
}

float mandelboxDE(vec3 p) {
  // Apply 3D kaleidoscopic symmetry first
  p = kaleidoFold3D(p, 6.0);

  vec3 offset = p;
  vec3 z = p;
  float dr = 1.0;

  float scale = getScale();
  float foldLimit = getFoldLimit();
  float minRadius = 0.5;
  float maxRadius = 1.0;

  for (int i = 0; i < ITERS; i++) {
    // Box fold
    z = boxFold(z, foldLimit);

    // Sphere fold
    sphereFold(z, dr, minRadius, maxRadius);

    // Scale and translate
    z = z * scale + offset;
    dr = dr * abs(scale) + 1.0;
  }

  float r = length(z);
  return r / abs(dr);
}

// ============================================================
// SCENE
// ============================================================

float map(vec3 p) {
  // Tunnel motion: scroll world backward
  p.z += iTime * 1.5;

  // Small domain warp for organic feel
  p += 0.06 * sin(p.yzx * 2.5 + iTime * 0.5);

  return mandelboxDE(p * 0.4) * 2.5;
}

// ============================================================
// NORMALS AND AO
// ============================================================

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  float d = map(p);
  return normalize(vec3(
    d - map(p - e.xyy),
    d - map(p - e.yxy),
    d - map(p - e.yyx)
  ));
}

float calcAO(vec3 p, vec3 n) {
  float ao = 0.0;
  float scale = 1.0;

  for (int i = 1; i <= 5; i++) {
    float dist = 0.02 * float(i);
    float d = map(p + n * dist);
    ao += (dist - d) * scale;
    scale *= 0.5;
  }

  return clamp(1.0 - ao * 3.0, 0.0, 1.0);
}

// ============================================================
// RAYMARCHING
// ============================================================

struct RayResult {
  float dist;
  vec3 pos;
  float glow;
  bool hit;
};

RayResult raymarch(vec3 ro, vec3 rd) {
  float t = 0.0;
  float glow = 0.0;

  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * t;
    float d = map(p);

    // Glow accumulation for near-misses
    glow += exp(-abs(d) * 15.0) * 0.015;

    if (d < SURF_DIST) {
      return RayResult(t, p, glow, true);
    }

    t += d * 0.8;
    if (t > MAX_DIST) break;
  }

  return RayResult(t, ro + rd * t, glow, false);
}

// ============================================================
// BRONZE PALETTE
// ============================================================

vec3 bronzePalette(float t) {
  // Warm bronze/gold tones
  vec3 a = vec3(0.5, 0.4, 0.3);
  vec3 b = vec3(0.4, 0.3, 0.2);
  vec3 c = vec3(1.0, 0.8, 0.6);
  vec3 d = vec3(0.0, 0.1, 0.2);
  return a + b * cos(6.28318 * (c * t + d));
}

// ============================================================
// SHADING
// ============================================================

vec3 shade(RayResult result, vec3 rd) {
  if (!result.hit) {
    // Background with glow
    vec3 bg = vec3(0.02, 0.015, 0.01);
    return bg + result.glow * vec3(1.0, 0.7, 0.4);
  }

  vec3 p = result.pos;
  vec3 n = calcNormal(p);

  // Lighting
  vec3 lightDir = normalize(vec3(0.5, 0.8, 0.3));
  vec3 lightDir2 = normalize(vec3(-0.3, 0.5, -0.5));

  float diff = max(0.0, dot(n, lightDir));
  float diff2 = max(0.0, dot(n, lightDir2)) * 0.3;

  // Specular (metallic)
  vec3 viewDir = -rd;
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(0.0, dot(n, halfDir)), 32.0);

  // Ambient occlusion
  float ao = calcAO(p, n);

  // Fresnel
  float fresnel = pow(1.0 - max(0.0, dot(n, viewDir)), 3.0);

  // Base color from position
  float colorParam = p.z * 0.1 + length(p.xy) * 0.2 + iTime * 0.05;
  vec3 baseColor = bronzePalette(colorParam);

  // Combine
  vec3 col = baseColor * (0.1 + 0.9 * (diff + diff2)) * ao;
  col += spec * vec3(1.0, 0.9, 0.7) * 0.5;
  col += fresnel * vec3(0.8, 0.6, 0.4) * 0.2;

  // Add glow
  col += result.glow * vec3(1.0, 0.7, 0.4) * 0.8;

  // Fog
  float fogAmount = 1.0 - exp(-result.dist * 0.04);
  vec3 fogColor = vec3(0.03, 0.02, 0.015);
  col = mix(col, fogColor, fogAmount);

  return col;
}

// ============================================================
// CAMERA
// ============================================================

mat3 setCamera(vec3 ro, vec3 ta, float cr) {
  vec3 cw = normalize(ta - ro);
  vec3 cp = vec3(sin(cr), cos(cr), 0.0);
  vec3 cu = normalize(cross(cw, cp));
  vec3 cv = normalize(cross(cu, cw));
  return mat3(cu, cv, cw);
}

// ============================================================
// MAIN
// ============================================================

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

  // Camera with slight drift
  float camDrift = 0.15 * sin(iTime * 0.2);
  float camRoll = 0.1 * sin(iTime * 0.15);

  vec3 ro = vec3(camDrift, camDrift * 0.7, -4.0);
  vec3 ta = vec3(0.0, 0.0, 0.0);

  mat3 cam = setCamera(ro, ta, camRoll);
  vec3 rd = cam * normalize(vec3(uv, 1.5));

  // Raymarch
  RayResult result = raymarch(ro, rd);

  // Shade
  vec3 col = shade(result, rd);

  // Tone mapping
  col = col / (1.0 + col);

  // Slight contrast boost
  col = pow(col, vec3(0.9));

  // Vignette
  float vign = 1.0 - 0.3 * length(uv);
  col *= vign;

  gl_FragColor = vec4(col, 1.0);
}
```

## Parameter Reference

Key parameters to tweak for variations:

| Parameter      | Effect                      | Range       |
| -------------- | --------------------------- | ----------- |
| `scale`        | Self-similarity density     | 1.5 - 3.0   |
| `foldLimit`    | Rib sharpness               | 0.8 - 1.5   |
| `minRadius`    | Chamber pinching            | 0.3 - 0.7   |
| `maxRadius`    | Chamber openness            | 0.8 - 1.5   |
| `kaleido n`    | Symmetry count              | 4, 6, 8, 12 |
| `domain warp`  | Organic vs crystalline      | 0.02 - 0.15 |
| `tunnel speed` | Flight speed                | 0.5 - 3.0   |
| `AO strength`  | Ridge definition            | 2.0 - 5.0   |
| `specular`     | Metal vs matte              | 0.2 - 0.8   |
| `fog density`  | Depth atmosphere            | 0.02 - 0.1  |

## Mandelbulber Recipe

If using Mandelbulber instead of custom shader:

1. **Formula**: Select "Mandelbox" or "KIFS" family

2. **Parameters**:
   - Scale: 2.0
   - Folding limit: 1.0
   - Min radius: 0.5
   - Fixed radius: 1.0

3. **Symmetry**:
   - Enable "Kaleidoscopic" transform
   - Set slices to 6 or 8

4. **Material**:
   - Metalness: High
   - Roughness: Low to medium
   - Base color: Warm orange/gold

5. **Lighting**:
   - AO: Enabled, strength 2.0+
   - 1-2 directional lights
   - Fog: Enabled, subtle

6. **Animation**:
   - Keyframe camera Z position
   - Keyframe slight scale variation (2.0 to 2.1)
   - Keyframe tiny fold limit variation

7. **Post in Blender**:
   - Glare node (fog glow)
   - RGB curves for contrast
   - Warm color grade
