# Fractal Cathedral / Cave Style Analysis

This document analyzes the specific "fractal cathedral / cave" aesthetic and
provides implementation guidance.

## Visual Characteristics

The style has these defining features:

- Warm bronze / gold shading, high micro-detail
- Strong bilateral symmetry (mirrored space, not just a 2D mirror overlay)
- Lots of "corrugated ribs" and repeating crenellations
- Mandelbox/KIFS family look, not smooth Mandelbulb
- Camera flying forward through a tunnel
- Fractal parameters subtly morph (walls "breathe" instead of rigid tube)
- Lighting: ambient occlusion + directional lights + specular "metal" + fog

This is the classic look from **Mandelbox or Kaleidoscopic IFS (KIFS) style
distance-estimator fractals**, raymarched, then post-graded.

## 1. Practical Pipeline (Mandelbulber/Fragmentarium)

### A. Choose the Right Fractal Family: Mandelbox or KIFS

The "cave architecture" look comes from transforms like:

- Box folds (abs, clamp, mirror)
- Repeated scaling + translation
- Optional sphere folds
- Optional "kaleidoscopic fold" in multiple planes

In Mandelbulber / Fragmentarium terms, look for presets or formulas named:

- Mandelbox
- Mandelbox hybrid
- Kaleidoscopic IFS (KIFS)
- "Folding" based distance estimator fractals

Mandelbulb (the round lobey one) is not the primary vibe here. The cathedral
look is more rectilinear and ribbed.

### B. Camera Inside the Fractal, Flying Forward

Most of the motion is:

- Constant forward motion along a main axis
- Small yaw/roll oscillation (drifting feel)
- Tiny parameter morph so walls change, not just camera

A typical camera path:

- Position: `(0, 0, z(t))` where `z(t)` increases steadily
- Target: slightly offset and slowly rotating (tiny orbit)
- FOV: modest (too wide = fisheye, too narrow = loses tunnel)

### C. Symmetry in the World, Not Screen Effect

The geometry itself is symmetric, not a post mirror.

Done by folding the 3D sample point before evaluating distance estimator:

- Fold in XY plane
- Fold in XZ plane
- Fold in YZ plane

This creates kaleidoscopic repetition as actual structure.

In tools, this appears as:

- "Kaleidoscopic" transform
- "Symmetry" options
- "Fold" modifiers

### D. Lighting: AO Heavy, Metallic Specular, Mild Fog

The bronze look is a combo of:

| Parameter        | Setting                          |
| ---------------- | -------------------------------- |
| Ambient Occlusion| High, to carve the ridges        |
| Diffuse          | Moderate                         |
| Specular         | Fairly strong (metal sheen)      |
| Shadow softness  | Moderate                         |
| Fog/volumetrics  | Small but present (depth feel)   |

AO and specular are the big levers.

### E. Color Is Mostly Grading

The fractal is probably shaded with a simple palette (maybe iteration-based),
then color graded to warm gold.

Common approach:

1. Base color tied to iteration count or distance
2. Multiply by lighting
3. Post: contrast curve + warm shift + subtle bloom/glare

### F. Render Frames, Post in Blender

Final polish from compositor:

- Glare/bloom
- Slight vignette
- Contrast curve
- Sometimes tiny chromatic aberration

## 2. Build It Yourself: Shader Architecture

What you render is a distance field, `d = DE(p)`, raymarched.

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

### B. Kaleidoscopic Fold in 3D

Two common methods.

**Method 1: Polar wedge fold in planes**

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

**Method 2: Mirror-sort fold (fast, very "crystalline")**

```glsl
vec3 mirrorSortFold(vec3 p) {
  p = abs(p);
  if (p.x < p.y) p.xy = p.yx;
  if (p.x < p.z) p.xz = p.zx;
  if (p.y < p.z) p.yz = p.zy;
  return p;
}
```

The cathedral look reads closer to "folded symmetry" than a single 2D screen
mirror.

### C. Tunnel Flight: Where to Apply Motion

Two main ways:

1. Move the camera forward
2. Move space backward (often easier)

In shaders, people often do:

```glsl
p.z += iTime * speed;
```

inside `map(p)` before `DE(p)`.

Then your camera can stay roughly stable while the world scrolls.

### D. Living Cave: Small Parameter Morphs

If it were just camera-forward, the walls would feel static.

The ribs subtly changing comes from:

- Slowly change `scale`
- Slowly change fold limits
- Slowly change kaleido slice count or fold angle (careful, discontinuities)
- Add a tiny domain warp

Domain warp example:

```glsl
p += 0.08 * sin(p.yzx*2.0 + iTime*0.6);
```

Small warp goes a long way.

### E. Lighting Recipe

A minimal raymarch shading model:

- Normal from gradient of `map(p)`
- 1 directional light
- AO term sampled along the normal
- Specular (metal-like)
- Fog based on travel distance
- Optional glow accumulation from near misses

```glsl
col = baseColor * diff * ao + spec * fresnel;
col = mix(col, fogColor, fogAmount);
col += glowAcc * glowColor;
```

AO is important for that "carved rib" look.

### F. Post Processing

Even all in shader, the polish often adds:

- Bloom/glare
- Contrast curve
- Saturation management (rich, not blown out)

Blender compositor glare node works fast.

## 3. Concrete Checklist to Recreate This Style

Shortest path to "this looks like the video":

1. Start with Mandelbox or KIFS preset in Mandelbulber (or known Mandelbox DE
   in Fragmentarium)
2. Enable 3D symmetry folding (kaleido fold in multiple planes)
3. Set material toward metal: high specular, moderate roughness
4. Crank AO and add mild fog
5. Animate:
   - World scroll: `z += t * speed`
   - Very small changes to `scale` and fold parameters over time
   - Tiny camera drift / roll
6. Render image sequence
7. In Blender compositor: glare + contrast + vignette

## Implementation Options

Two paths forward:

**Option A: Complete GLSL raymarcher**

Implement Mandelbox-ish DE + 3D kaleido fold + lighting/glow stack. Drop-in
for Three.js wrapper.

**Option B: Mandelbulber step list**

Which formula family to pick, which parameters to animate, and what ranges
to tweak to reproduce the bronze cathedral vibe.
