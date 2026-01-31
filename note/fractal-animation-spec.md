# Fractal Animation System Specification

A detailed data model and implementation plan for infinite kaleidoscopic
fractal tunnel animations. This covers the complete architecture from
mathematical foundations to rendering pipeline.

## 1. System Overview

The system renders real-time fractal animations by:

1. Defining a mathematical space via distance functions
2. Folding space with symmetry operations
3. Applying scale/translation transforms for self-similarity
4. Raymarching to visualize the distance field
5. Lighting with fake but effective techniques
6. Post-processing for final polish

The result: "flying through infinite fractal cathedrals."

## 2. Core Data Model

### 2.1 Fractal Definition

```typescript
interface FractalDefinition {
  // Core parameters
  type: 'mandelbox' | 'mandelbulb' | 'kifs' | 'hybrid'
  iterations: number        // 8-20 typical
  bailout: number           // 100-1000 typical

  // Mandelbox-specific
  boxFold: {
    limit: number           // 1.0-2.0 typical (foldLimit)
  }

  sphereFold: {
    minRadius: number       // 0.1-0.5 typical
    maxRadius: number       // 1.0-2.0 typical
  }

  // Scale and offset
  scale: number             // -3.0 to 3.0 typical
  offset: Vec3              // Translation per iteration

  // Mandelbulb-specific (if applicable)
  power: number             // 8 is classic, 2-16 range
}
```

### 2.2 Symmetry Configuration

```typescript
interface SymmetryConfig {
  // Kaleidoscopic folding
  kaleido: {
    enabled: boolean
    slices: number          // 4, 6, 8, 12 typical
    planes: ('xy' | 'xz' | 'yz')[]
  }

  // Mirror-sort folding (crystalline)
  mirrorSort: {
    enabled: boolean
    axes: ('x' | 'y' | 'z')[]
  }

  // Simple axis mirroring
  axisMirror: {
    x: boolean
    y: boolean
    z: boolean
  }
}
```

### 2.3 Space Warping

```typescript
interface SpaceWarp {
  // Domain warping for organic feel
  domainWarp: {
    enabled: boolean
    strength: number        // 0.01-0.2 typical
    frequency: number       // 1.0-5.0 typical
    timeScale: number       // 0.1-1.0 typical
  }

  // Logarithmic zoom for infinite descent
  logZoom: {
    enabled: boolean
    speed: number           // 0.1-1.0 typical
    plane: 'xy' | 'xz' | 'yz'
  }

  // World scroll (tunnel flight)
  scroll: {
    enabled: boolean
    axis: 'x' | 'y' | 'z'
    speed: number           // 0.1-2.0 typical
  }
}
```

### 2.4 Lighting Configuration

```typescript
interface LightingConfig {
  // Ambient occlusion
  ao: {
    enabled: boolean
    strength: number        // 0.5-2.0 typical
    samples: number         // 3-8 typical
    stepSize: number        // 0.01-0.1 typical
  }

  // Directional lights
  lights: Array<{
    direction: Vec3
    color: Vec3
    intensity: number
  }>

  // Specular / metallic
  specular: {
    enabled: boolean
    power: number           // 16-128 typical
    intensity: number       // 0.1-1.0 typical
  }

  // Fog / atmosphere
  fog: {
    enabled: boolean
    color: Vec3
    density: number         // 0.01-0.1 typical
    startDistance: number
  }

  // Glow accumulation
  glow: {
    enabled: boolean
    color: Vec3
    intensity: number       // 0.01-0.5 typical
    falloff: number         // 1.0-10.0 typical
  }
}
```

### 2.5 Color Configuration

```typescript
interface ColorConfig {
  // Base coloring mode
  mode: 'iteration' | 'position' | 'normal' | 'orbit'

  // Cosine palette (smooth procedural color)
  palette: {
    a: Vec3   // offset
    b: Vec3   // amplitude
    c: Vec3   // frequency
    d: Vec3   // phase
  }

  // Color cycling
  cycling: {
    enabled: boolean
    speed: number
  }

  // Post color grading
  grading: {
    contrast: number        // 0.5-2.0 typical
    saturation: number      // 0.5-2.0 typical
    warmth: number          // -0.5 to 0.5 typical
    gamma: number           // 1.0-2.4 typical
  }
}
```

### 2.6 Camera Configuration

```typescript
interface CameraConfig {
  // Position and orientation
  position: Vec3
  target: Vec3
  up: Vec3
  fov: number               // 60-90 typical

  // Animation
  animation: {
    // Forward flight
    forwardSpeed: number
    forwardAxis: 'x' | 'y' | 'z'

    // Orbital drift
    orbitEnabled: boolean
    orbitRadius: number
    orbitSpeed: number

    // Roll wobble
    rollEnabled: boolean
    rollAmplitude: number
    rollFrequency: number
  }
}
```

### 2.7 Render Configuration

```typescript
interface RenderConfig {
  // Raymarching parameters
  raymarch: {
    maxSteps: number        // 64-256 typical
    maxDistance: number     // 10-100 typical
    epsilon: number         // 0.0001-0.001 typical
    stepScale: number       // 0.5-1.0 typical (for safety)
  }

  // Resolution
  resolution: {
    width: number
    height: number
    pixelRatio: number
  }

  // Post processing
  post: {
    bloom: {
      enabled: boolean
      threshold: number
      intensity: number
      radius: number
    }

    vignette: {
      enabled: boolean
      strength: number
    }

    chromaticAberration: {
      enabled: boolean
      strength: number
    }

    feedback: {
      enabled: boolean
      decay: number         // 0.9-0.99 typical
    }
  }
}
```

### 2.8 Animation Timeline

```typescript
interface AnimationTimeline {
  duration: number          // Total duration in seconds

  // Parameter keyframes
  keyframes: Array<{
    time: number

    // Any animatable parameter
    fractal?: Partial<FractalDefinition>
    symmetry?: Partial<SymmetryConfig>
    warp?: Partial<SpaceWarp>
    lighting?: Partial<LightingConfig>
    color?: Partial<ColorConfig>
    camera?: Partial<CameraConfig>
  }>

  // Interpolation mode between keyframes
  interpolation: 'linear' | 'smoothstep' | 'cubic'
}
```

## 3. Core Functions

### 3.1 Distance Estimator Functions

```glsl
// Main distance function dispatcher
float DE(vec3 p, FractalParams params) {
  switch(params.type) {
    case MANDELBOX: return mandelboxDE(p, params);
    case MANDELBULB: return mandelbulbDE(p, params);
    case KIFS: return kifsDE(p, params);
    default: return hybridDE(p, params);
  }
}

// Mandelbox distance estimator
float mandelboxDE(vec3 p, FractalParams params) {
  vec3 z = p;
  float dr = 1.0;

  for (int i = 0; i < params.iterations; i++) {
    // Box fold
    z = clamp(z, -params.boxFoldLimit, params.boxFoldLimit) * 2.0 - z;

    // Sphere fold
    float r2 = dot(z, z);
    if (r2 < params.minRadius2) {
      float temp = params.fixedRadius2 / params.minRadius2;
      z *= temp;
      dr *= temp;
    } else if (r2 < params.fixedRadius2) {
      float temp = params.fixedRadius2 / r2;
      z *= temp;
      dr *= temp;
    }

    // Scale and translate
    z = params.scale * z + p;
    dr = dr * abs(params.scale) + 1.0;
  }

  return length(z) / abs(dr);
}

// Mandelbulb distance estimator
float mandelbulbDE(vec3 p, FractalParams params) {
  vec3 z = p;
  float dr = 1.0;
  float r = 0.0;

  for (int i = 0; i < params.iterations; i++) {
    r = length(z);
    if (r > params.bailout) break;

    // Convert to polar
    float theta = acos(z.z / r);
    float phi = atan(z.y, z.x);
    dr = pow(r, params.power - 1.0) * params.power * dr + 1.0;

    // Scale and rotate
    float zr = pow(r, params.power);
    theta *= params.power;
    phi *= params.power;

    // Back to cartesian
    z = zr * vec3(
      sin(theta) * cos(phi),
      sin(phi) * sin(theta),
      cos(theta)
    );
    z += p;
  }

  return 0.5 * log(r) * r / dr;
}
```

### 3.2 Symmetry Functions

```glsl
// 2D kaleidoscope fold
vec2 kaleido2(vec2 p, float slices) {
  float sector = TAU / slices;
  float angle = atan(p.y, p.x);
  angle = mod(angle, sector);
  angle = abs(angle - sector * 0.5);
  return length(p) * vec2(cos(angle), sin(angle));
}

// 3D kaleidoscope fold
vec3 kaleidoFold3D(vec3 p, float slices, int planes) {
  if ((planes & 1) != 0) p.xy = kaleido2(p.xy, slices);
  if ((planes & 2) != 0) p.xz = kaleido2(p.xz, slices);
  if ((planes & 4) != 0) p.yz = kaleido2(p.yz, slices);
  return p;
}

// Mirror-sort fold (crystalline symmetry)
vec3 mirrorSortFold(vec3 p) {
  p = abs(p);
  if (p.x < p.y) p.xy = p.yx;
  if (p.x < p.z) p.xz = p.zx;
  if (p.y < p.z) p.yz = p.zy;
  return p;
}

// Simple axis mirror
vec3 axisMirror(vec3 p, bvec3 axes) {
  if (axes.x) p.x = abs(p.x);
  if (axes.y) p.y = abs(p.y);
  if (axes.z) p.z = abs(p.z);
  return p;
}
```

### 3.3 Space Warping Functions

```glsl
// Domain warping
vec3 domainWarp(vec3 p, float strength, float freq, float time) {
  return p + strength * sin(p.yzx * freq + time);
}

// Logarithmic zoom (infinite descent)
vec3 logZoom(vec3 p, float time, float speed, int plane) {
  vec2 pxy;
  if (plane == 0) pxy = p.xy;
  else if (plane == 1) pxy = p.xz;
  else pxy = p.yz;

  float r = length(pxy);
  float logR = log(r + 1e-6);
  logR += time * speed;
  float fractR = fract(logR);
  float newR = exp(fractR);

  float angle = atan(pxy.y, pxy.x);
  vec2 newPxy = newR * vec2(cos(angle), sin(angle));

  if (plane == 0) p.xy = newPxy;
  else if (plane == 1) p.xz = newPxy;
  else p.yz = newPxy;

  return p;
}

// World scroll (tunnel flight)
vec3 worldScroll(vec3 p, float time, float speed, int axis) {
  if (axis == 0) p.x += time * speed;
  else if (axis == 1) p.y += time * speed;
  else p.z += time * speed;
  return p;
}
```

### 3.4 Lighting Functions

```glsl
// Normal from distance field gradient
vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.0001, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)
  ));
}

// Ambient occlusion
float calcAO(vec3 p, vec3 n, float strength, int samples, float stepSize) {
  float ao = 0.0;
  float weight = 1.0;
  for (int i = 1; i <= samples; i++) {
    float dist = float(i) * stepSize;
    float d = map(p + n * dist);
    ao += weight * (dist - d);
    weight *= 0.5;
  }
  return 1.0 - clamp(ao * strength, 0.0, 1.0);
}

// Soft shadow
float calcShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
  float res = 1.0;
  float t = mint;
  for (int i = 0; i < 64; i++) {
    if (t > maxt) break;
    float d = map(ro + rd * t);
    res = min(res, k * d / t);
    if (res < 0.001) break;
    t += d;
  }
  return clamp(res, 0.0, 1.0);
}

// Glow accumulation during raymarch
float accumGlow(float dist, float intensity, float falloff) {
  return intensity * exp(-abs(dist) * falloff);
}
```

### 3.5 Color Functions

```glsl
// Cosine palette
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(TAU * (c * t + d));
}

// Color from iteration count
vec3 iterationColor(float iter, float maxIter, vec4 paletteParams[4]) {
  float t = iter / maxIter;
  return palette(t, paletteParams[0].xyz, paletteParams[1].xyz,
                    paletteParams[2].xyz, paletteParams[3].xyz);
}

// Color grading
vec3 gradeColor(vec3 col, float contrast, float saturation,
                float warmth, float gamma) {
  // Contrast
  col = (col - 0.5) * contrast + 0.5;

  // Saturation
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, saturation);

  // Warmth (shift toward orange/blue)
  col.r += warmth * 0.1;
  col.b -= warmth * 0.1;

  // Gamma
  col = pow(max(col, 0.0), vec3(1.0 / gamma));

  return clamp(col, 0.0, 1.0);
}
```

## 4. Render Pipeline

### 4.1 Main Render Loop

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // 1. Setup ray
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  vec3 ro = uCameraPos;
  vec3 rd = normalize(uCameraRot * vec3(uv, 1.0));

  // 2. Raymarch
  float t = 0.0;
  float glow = 0.0;
  int iter = 0;

  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * t;

    // Apply space transformations
    p = applySpaceTransforms(p, iTime);

    float d = DE(p);

    // Accumulate glow
    glow += accumGlow(d, uGlowIntensity, uGlowFalloff);

    if (d < EPSILON) {
      iter = i;
      break;
    }
    if (t > MAX_DIST) break;

    t += d * STEP_SCALE;
    iter = i;
  }

  // 3. Shading
  vec3 col;
  if (t < MAX_DIST) {
    vec3 p = ro + rd * t;
    p = applySpaceTransforms(p, iTime);

    vec3 n = calcNormal(p);
    float ao = calcAO(p, n, uAOStrength, AO_SAMPLES, AO_STEP);

    // Diffuse
    vec3 lightDir = normalize(uLightDir);
    float diff = max(dot(n, lightDir), 0.0);

    // Specular
    vec3 h = normalize(lightDir - rd);
    float spec = pow(max(dot(n, h), 0.0), uSpecPower);

    // Base color from iteration/position
    vec3 baseCol = getBaseColor(p, float(iter));

    // Combine
    col = baseCol * (diff * ao + 0.1);
    col += uSpecIntensity * spec;
    col += glow * uGlowColor;

    // Fog
    col = mix(col, uFogColor, 1.0 - exp(-t * uFogDensity));
  } else {
    col = uBgColor + glow * uGlowColor;
  }

  // 4. Post processing
  col = gradeColor(col, uContrast, uSaturation, uWarmth, uGamma);

  fragColor = vec4(col, 1.0);
}
```

### 4.2 Space Transform Application

```glsl
vec3 applySpaceTransforms(vec3 p, float time) {
  // 1. World scroll (tunnel flight)
  if (uScrollEnabled) {
    p = worldScroll(p, time, uScrollSpeed, uScrollAxis);
  }

  // 2. Domain warp (organic movement)
  if (uWarpEnabled) {
    p = domainWarp(p, uWarpStrength, uWarpFreq, time * uWarpTimeScale);
  }

  // 3. Kaleidoscopic symmetry
  if (uKaleidoEnabled) {
    p = kaleidoFold3D(p, uKaleidoSlices, uKaleidoPlanes);
  }

  // 4. Mirror-sort symmetry
  if (uMirrorSortEnabled) {
    p = mirrorSortFold(p);
  }

  // 5. Logarithmic zoom
  if (uLogZoomEnabled) {
    p = logZoom(p, time, uLogZoomSpeed, uLogZoomPlane);
  }

  return p;
}
```

## 5. File Structure

```
code/
  fractal/
    types.ts              # TypeScript type definitions

  shader/
    common.glsl           # Shared constants, utilities
    distance.glsl         # Distance estimator functions
    symmetry.glsl         # Symmetry/folding functions
    warp.glsl             # Space warping functions
    lighting.glsl         # Lighting calculations
    color.glsl            # Color/palette functions
    main.glsl             # Main render pipeline

  rendering/
    FractalRenderer.ts    # Three.js/WebGL renderer class
    ShaderBuilder.ts      # Composes shader from modules
    UniformManager.ts     # Manages shader uniforms
    PostProcessor.ts      # Bloom, feedback, etc.

  animation/
    Timeline.ts           # Keyframe animation system
    Interpolation.ts      # Interpolation utilities
    Presets.ts            # Preset configurations

  ui/
    Controls.tsx          # Parameter control UI
    Visualizer.tsx        # Main canvas component
```

## 6. Implementation Phases

### Phase 1: Core Raymarching
- Basic raymarcher in WebGL2/Three.js
- Mandelbox distance estimator
- Simple diffuse lighting
- Basic camera controls

### Phase 2: Symmetry and Warping
- Kaleidoscopic fold functions
- Mirror-sort fold
- Domain warping
- World scroll

### Phase 3: Advanced Lighting
- Ambient occlusion
- Specular highlights
- Glow accumulation
- Fog/atmosphere

### Phase 4: Color and Animation
- Cosine palette system
- Color grading
- Timeline/keyframe system
- Parameter interpolation

### Phase 5: Post Processing
- Bloom pass
- Vignette
- Feedback buffer
- Final compositing

### Phase 6: Presets and UI
- Preset library (cathedral, organic, crystalline, etc.)
- Real-time parameter controls
- Export/recording capabilities

## 7. Performance Considerations

### GPU Optimization
- Keep iteration counts reasonable (8-16 for real-time)
- Use step scaling (0.5-0.8) for safety vs speed tradeoff
- Early termination on bailout
- LOD based on distance from camera

### Memory
- Single render target for basic mode
- Double buffer for feedback effects
- Half-precision floats where acceptable

### Real-time Targets
- 60 FPS at 1080p: 64-128 raymarch steps, 8-12 fractal iterations
- 30 FPS at 4K: same with reduced quality settings
- Offline render: 256+ steps, 20+ iterations for maximum detail

## 8. Preset Examples

### Cathedral Bronze
```typescript
const cathedralPreset: FractalConfig = {
  fractal: {
    type: 'mandelbox',
    iterations: 12,
    scale: -2.0,
    boxFold: { limit: 1.0 },
    sphereFold: { minRadius: 0.25, maxRadius: 1.0 }
  },
  symmetry: {
    kaleido: { enabled: true, slices: 8, planes: ['xy', 'xz'] }
  },
  lighting: {
    ao: { enabled: true, strength: 1.5 },
    specular: { enabled: true, power: 64, intensity: 0.4 }
  },
  color: {
    palette: {
      a: [0.5, 0.4, 0.3],
      b: [0.3, 0.2, 0.1],
      c: [1.0, 1.0, 1.0],
      d: [0.0, 0.1, 0.2]
    },
    grading: { warmth: 0.3, contrast: 1.2 }
  }
}
```

### Infinite Descent
```typescript
const descentPreset: FractalConfig = {
  fractal: {
    type: 'kifs',
    iterations: 10
  },
  symmetry: {
    kaleido: { enabled: true, slices: 12, planes: ['xy'] }
  },
  warp: {
    logZoom: { enabled: true, speed: 0.4, plane: 'xy' },
    domainWarp: { enabled: true, strength: 0.05 }
  },
  lighting: {
    glow: { enabled: true, intensity: 0.2, color: [1, 0.8, 0.5] }
  }
}
```

### Organic Cave
```typescript
const cavePreset: FractalConfig = {
  fractal: {
    type: 'hybrid',
    iterations: 14
  },
  warp: {
    scroll: { enabled: true, axis: 'z', speed: 0.5 },
    domainWarp: { enabled: true, strength: 0.1, frequency: 2.0 }
  },
  lighting: {
    ao: { enabled: true, strength: 2.0 },
    fog: { enabled: true, density: 0.05, color: [0.1, 0.05, 0.02] }
  }
}
```
