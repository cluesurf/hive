# Fractal Tunnel Animation Techniques

Practical techniques for creating infinite tunnel fractal animations and
psychedelic visuals.

## Core Components

1. **Raymarched 3D fractals** (Mandelbulb, etc.)
2. **Kaleidoscopic folding** for symmetry
3. **Color palettes** (Inigo Quilez style)
4. **Post-processing** (bloom, DOF)

## 1. WebGL Fragment Shader: Raymarched Mandelbulb + Kaleidoscope

This is the core of "infinite tunnels and psychedelic fractal matter."

### Fragment Shader (GLSL)

```glsl
// Mandelbulb + kaleidoscope fold + simple glow
// Works as a fullscreen fragment shader.
// Provide uniforms: iResolution (vec2), iTime (float)

precision highp float;

uniform vec2  iResolution;
uniform float iTime;

#define MAX_STEPS 128
#define MAX_DIST  60.0
#define SURF_DIST 0.001

// Cheap, nice palettes (Inigo Quilez style)
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

mat2 rot(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

// Kaleidoscope fold in 2D: folds angle into N wedges, keeps radius.
vec2 kaleido2(vec2 p, float n) {
  float r = length(p);
  float a = atan(p.y, p.x);
  float pi = 3.14159265359;
  float sector = 2.0 * pi / n;
  a = mod(a, sector);
  a = abs(a - 0.5 * sector);
  return r * vec2(cos(a), sin(a));
}

// 3D fold: apply kaleido fold in multiple planes.
vec3 kaleido3(vec3 p, float n) {
  p.xy = kaleido2(p.xy, n);
  p.xz = kaleido2(p.xz, n);
  return p;
}

// Mandelbulb distance estimator
float mandelbulbDE(vec3 p) {
  // Apply symmetry fold for that "kaleidoscopic" feel
  p = kaleido3(p, 8.0);

  vec3 z = p;
  float dr = 1.0;
  float r = 0.0;
  const float power = 8.0;

  for (int i = 0; i < 12; i++) {
    r = length(z);
    if (r > 4.0) break;

    // convert to polar
    float theta = acos(z.z / r);
    float phi   = atan(z.y, z.x);

    // scale derivative
    dr = pow(r, power - 1.0) * power * dr + 1.0;

    // scale and rotate the point
    float zr = pow(r, power);
    theta *= power;
    phi   *= power;

    z = zr * vec3(
      sin(theta) * cos(phi),
      sin(phi)   * sin(theta),
      cos(theta)
    );
    z += p;
  }

  return 0.5 * log(r) * r / dr;
}

// Scene SDF
float map(vec3 p) {
  // mild time warp
  p.xy *= rot(0.2 * sin(iTime * 0.3));
  // push forward to create a tunnel feeling
  p.z += iTime * 1.2;

  float d = mandelbulbDE(p * 0.75);
  return d;
}

// Approx normal from SDF
vec3 normal(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  float d = map(p);
  vec3 n = d - vec3(
    map(p - e.xyy),
    map(p - e.yxy),
    map(p - e.yyx)
  );
  return normalize(n);
}

// Basic raymarch
float raymarch(vec3 ro, vec3 rd, out vec3 hitPos, out float glowAcc) {
  float t = 0.0;
  glowAcc = 0.0;

  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * t;
    float d = map(p);

    // accumulate "glow" from near-misses
    glowAcc += exp(-abs(d) * 12.0) * 0.02;

    if (d < SURF_DIST) {
      hitPos = p;
      return t;
    }
    t += d * 0.9;
    if (t > MAX_DIST) break;
  }

  hitPos = ro + rd * t;
  return -1.0;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution) / iResolution.y;

  // Camera
  vec3 ro = vec3(0.0, 0.0, -6.0);
  vec3 rd = normalize(vec3(uv, 1.5));

  // subtle camera motion
  ro.xz *= mat2(cos(iTime*0.2), -sin(iTime*0.2),
                sin(iTime*0.2), cos(iTime*0.2));
  rd.xz *= mat2(cos(iTime*0.2), -sin(iTime*0.2),
                sin(iTime*0.2), cos(iTime*0.2));

  vec3 hitPos;
  float glowAcc;
  float t = raymarch(ro, rd, hitPos, glowAcc);

  vec3 col = vec3(0.0);

  if (t > 0.0) {
    vec3 n = normal(hitPos);

    // fake light
    vec3 lightDir = normalize(vec3(0.4, 0.7, 0.2));
    float diff = clamp(dot(n, lightDir), 0.0, 1.0);

    // curvature-ish accent
    float edge = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 2.0);

    // color from position
    float m = 0.15 * hitPos.z + 0.3 * sin(hitPos.x * 0.7)
            + 0.2 * sin(hitPos.y * 0.7);
    vec3 base = palette(m,
      vec3(0.5), vec3(0.5), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.1, 0.2)
    );

    col = base * (0.15 + 0.85 * diff) + edge * 0.4;
  }

  // add glow and background palette
  vec3 bg = palette(0.15 * iTime + length(uv),
    vec3(0.2), vec3(0.4), vec3(1.0, 0.8, 0.6), vec3(0.0, 0.33, 0.67)
  );

  col = mix(bg, col, t > 0.0 ? 1.0 : 0.0);
  col += glowAcc * vec3(1.2, 0.8, 1.6);

  // simple tonemap
  col = col / (1.0 + col);

  gl_FragColor = vec4(col, 1.0);
}
```

### Three.js Wrapper (TypeScript)

```typescript
import * as THREE from 'three'

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.style.margin = '0'
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

const uniforms = {
  iTime: { value: 0 },
  iResolution: {
    value: new THREE.Vector2(window.innerWidth, window.innerHeight),
  },
}

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: `
    void main() {
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `/* paste fragment shader here */`,
})

const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
scene.add(mesh)

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight)
  uniforms.iResolution.value.set(window.innerWidth, window.innerHeight)
}
window.addEventListener('resize', onResize)

const clock = new THREE.Clock()
function animate() {
  uniforms.iTime.value += clock.getDelta()
  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}
animate()
```

## Pushing Toward More Psychedelic Effects

- **Increase folds**: change `kaleido3(p, 8.0)` to 10, 12, 16
- **Add feedback**: render to texture and re-sample last frame
- **Add post bloom**: Three.js UnrealBloomPass, or Blender

## 2. Fragmentarium Style Skeleton

```glsl
// Fragmentarium-like pseudo preset skeleton
// The key part is the DE (distance estimator) and map(p).

uniform float Time;
uniform vec2  Resolution;

vec2 kaleido2(vec2 p, float n) {
  float r = length(p);
  float a = atan(p.y, p.x);
  float pi = 3.14159265359;
  float sector = 2.0 * pi / n;
  a = mod(a, sector);
  a = abs(a - 0.5 * sector);
  return r * vec2(cos(a), sin(a));
}

vec3 kaleido3(vec3 p, float n) {
  p.xy = kaleido2(p.xy, n);
  p.xz = kaleido2(p.xz, n);
  return p;
}

float DE(vec3 p) {
  p = kaleido3(p, 8.0);
  vec3 z = p;
  float dr = 1.0;
  float r = 0.0;
  float power = 8.0;

  for (int i = 0; i < 12; i++) {
    r = length(z);
    if (r > 4.0) break;

    float theta = acos(z.z / r);
    float phi   = atan(z.y, z.x);

    dr = pow(r, power - 1.0) * power * dr + 1.0;

    float zr = pow(r, power);
    theta *= power;
    phi   *= power;

    z = zr * vec3(
      sin(theta) * cos(phi),
      sin(phi)   * sin(theta),
      cos(theta)
    );
    z += p;
  }

  return 0.5 * log(r) * r / dr;
}

float map(vec3 p) {
  p.z += Time * 1.2;
  return DE(p * 0.75);
}
```

In Fragmentarium:

- Use its camera + raymarch template
- Drop `map(p)` and `DE(p)` into the right spots
- Animate `Time` and any fold/power parameters
- Export frames

## 3. Blender: Glow and Depth of Field via Python

Assume you rendered an image sequence from Mandelbulber or your shader
renderer. Blender then does:

- Bloom-ish glow (using Glare node)
- Depth of field

### Blender Python Script

```python
import bpy

scene = bpy.context.scene
scene.use_nodes = True
tree = scene.node_tree
nodes = tree.nodes
links = tree.links

# Clear existing nodes
for n in list(nodes):
    nodes.remove(n)

render_layers = nodes.new(type="CompositorNodeRLayers")
render_layers.location = (-300, 0)

glare = nodes.new(type="CompositorNodeGlare")
glare.location = (0, 0)
glare.glare_type = 'FOG_GLOW'
glare.quality = 'HIGH'
glare.mix = 0.15
glare.threshold = 0.6
glare.size = 6

color_balance = nodes.new(type="CompositorNodeColorBalance")
color_balance.location = (220, 0)

composite = nodes.new(type="CompositorNodeComposite")
composite.location = (480, 0)

viewer = nodes.new(type="CompositorNodeViewer")
viewer.location = (480, -180)

links.new(render_layers.outputs["Image"], glare.inputs["Image"])
links.new(glare.outputs["Image"], color_balance.inputs["Image"])
links.new(color_balance.outputs["Image"], composite.inputs["Image"])
links.new(color_balance.outputs["Image"], viewer.inputs["Image"])

print("Compositor glow pipeline created.")
```

## Full Pipeline

1. **Render frames** (Mandelbulber OR shader renderer)
2. **Blender post-process** (glow/grade/DOF)
3. **ffmpeg combine** frames + audio

```bash
ffmpeg -r 60 -i frames/%06d.png -i song.mp3 \
  -c:v libx264 -pix_fmt yuv420p -shortest -crf 18 \
  out.mp4
```

## Advanced Techniques

### Feedback Trails

Ping-pong framebuffer in Three.js for classic trippy loops.

### Morphing Between Fractals

Parameter interpolation + stabilized camera path.

### Music Reactive

FFT in WebAudio drives:

- Fold count
- Palette phase
- Glow strength

## Key Concepts

| Technique           | Effect                                |
| ------------------- | ------------------------------------- |
| Kaleidoscope fold   | Symmetry, infinite mirrors            |
| Distance estimator  | Defines fractal surface               |
| Glow accumulation   | Soft edges, atmosphere                |
| Time-driven z-push  | Tunnel/flight effect                  |
| Palette cycling     | Color variation over surface/time     |
| Post bloom          | Dreamy, overexposed highlights        |

## Infinite Zoom Kaleidoscope

This is where things get hypnotic. "Infinite zoom kaleidoscope" is
basically a trick of coordinate space, not actual infinite geometry. You
make space fold, repeat, and scale toward the center so it feels like
you are diving forever.

This is 100% shader territory, and you can run it in Three.js,
Fragmentarium, or Shadertoy style setups.

### Core Idea: Fake Infinite Zoom with Log Polar Space

Normal UV space is flat. Infinite zoom needs space that repeats as you
scale.

The trick:

1. Convert UV to polar coordinates (radius + angle)
2. Take log(radius) so zooming becomes sliding
3. Wrap angle into symmetry wedges (kaleidoscope)
4. Feed result into repeating texture or procedural pattern

That makes zooming inward look like you are falling through layers
forever.

### Minimal Infinite Zoom Kaleidoscope Shader

This is a pure fragment shader. Works great in Three.js or Shadertoy
style runners.

```glsl
precision highp float;

uniform vec2  iResolution;
uniform float iTime;

#define PI 3.14159265359

// Smooth palette
vec3 palette(float t) {
    return 0.5 + 0.5*cos(6.28318*(vec3(0.2,0.5,0.9)*t + vec3(0.0,0.15,0.2)));
}

// Kaleidoscope fold in angle space
float kaleidoAngle(float a, float slices) {
    float sector = 2.0*PI / slices;
    a = mod(a, sector);
    a = abs(a - 0.5*sector);
    return a;
}

float pattern(vec2 p) {
    // simple fractal-ish pattern
    float v = 0.0;
    float scale = 1.0;
    for(int i=0;i<5;i++){
        p = abs(p) / dot(p,p) - 0.5; // inversion fold
        v += exp(-length(p)*3.0) * scale;
        scale *= 0.6;
    }
    return v;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5*iResolution.xy) / iResolution.y;

    // Polar coords
    float r = length(uv);
    float a = atan(uv.y, uv.x);

    // Kaleidoscope symmetry
    a = kaleidoAngle(a, 8.0);

    // Infinite zoom trick
    float zoomSpeed = 0.4;
    float logR = log(r + 1e-6);          // turn scale into linear space
    logR += iTime * zoomSpeed;           // move through scales
    float fractR = fract(logR);          // repeat infinitely

    float scale = exp(fractR);           // back to radial
    vec2 p = vec2(cos(a), sin(a)) * scale;

    float v = pattern(p);

    vec3 col = palette(v + fractR + iTime*0.1);

    // glow toward center
    col += 0.2/(r+0.1);

    gl_FragColor = vec4(col,1.0);
}
```

### How This Feels Infinite

The key transformations:

| Transform      | Effect                                      |
| -------------- | ------------------------------------------- |
| log(radius)    | Turns scaling into linear sliding           |
| fract()        | Makes the space repeat infinitely           |
| exp()          | Converts back to radial space               |

Every time you zoom in, you enter the same structure at a new "scale
level". Your brain reads it as infinite descent.

### Make It More Psychedelic

Easy upgrades:

**More symmetry**: Change `8.0` in `kaleidoAngle(a, 8.0)` to 10, 12, 16

**Spiral dive**: Replace angle with:

```glsl
a += logR * 0.8;
```

**Organic motion**: Add time warping:

```glsl
p += 0.3*sin(p.yx*3.0 + iTime);
```

**Layered depth**: Render two versions with different zoom speeds and
add together.

**Glow bloom**: Do post processing bloom in Three.js or Blender
compositor.

### Even Deeper "Fractal Tunnel" Style

Combine this with 3D raymarching:

1. Use this kaleido/log zoom mapping to distort space
2. Then raymarch a Mandelbulb or distance field inside that warped space

That creates the "falling through fractal cathedrals forever" effect you
see in high end psychedelic loops.

### Future Techniques to Explore

- **Feedback buffer version**: Classic trippy recursion
- **Music reactive zoom control**: FFT drives zoom speed
- **Spiral vortex version**: Feels like falling into a rotating wormhole

## Theory Model: The Mental Framework

This is the mental model artists and shader people use. Under the hood,
almost all infinite kaleidoscopic fractal animations are built from the
same small set of ideas from dynamical systems, symmetry groups, and
raymarch rendering.

### 1. Space Is the Medium, Not Objects

These visuals are not "modeling shapes." They are defining a
**mathematical space** where every point tells you:

- how far you are from a surface
- what color/light lives there
- how that space folds or repeats

You don't build objects. You build a **function** that describes space
itself.

That function is usually:

```
Distance = f(p)
```

where `p` is a 2D or 3D point.

Everything else is just sampling that function while flying a camera
through it.

### 2. Infinite Detail Comes From Iteration

Fractals and kaleidoscopic worlds are **iterated transforms**.

A point gets repeatedly transformed:

```
p → T(p) → T(T(p)) → T(T(T(p))) …
```

Where T is a combination of:

- reflection (abs folds)
- inversion (divide by radius squared)
- rotation
- scaling
- symmetry folding

This creates **self-similarity across scales**, which your brain reads
as infinity.

Mandelbulb, Mandelbox, IFS, flame fractals all use this idea.

### 3. Kaleidoscope = Symmetry Group Folding

A kaleidoscope is just **angular space folding**.

You convert a point to polar coordinates:

```
radius r
angle θ
```

Then force θ into a small wedge and mirror it:

```
θ → mod(θ, sector)
θ → abs(θ - sector/2)
```

This creates a **dihedral symmetry group** in the plane.

In 3D you do this in multiple planes: xy, xz, yz.

Result: infinite mirrored symmetry without modeling anything.

This is not decoration. It's a **space tiling operation**.

### 4. Infinite Zoom = Logarithmic Space

The infinite zoom effect comes from turning scale into translation.

Normally: zooming in multiplies coordinates.

But if you take `log(radius)`, then multiplying radius becomes
**adding** in log space.

So when you animate:

```
log(r) += time
```

you are sliding through **layers of scale**.

Then using `fract(log(r))` wraps those layers into repeating bands.

This is why it looks like you fall through endless structure. It is
literally **periodic structure in log-space**.

### 5. Domain Warping Makes It Organic

Pure symmetry is crystalline and static.

To make it feel alive, artists use **domain warping**:

Instead of evaluating `f(p)`, you evaluate `f(p + noise(p))`.

That bends space itself.

- Small warps → flowing organic motion
- Large warps → psychedelic melting geometry

This is exactly how procedural textures and fluid shaders work.

### 6. Raymarching Turns Math Into Worlds

Once you have a function that describes space, you render it by
raymarching.

For each pixel:

1. shoot a ray into space
2. repeatedly step forward by the distance to the nearest surface
3. stop when distance is very small

This works because distance estimators tell you how far you can safely
move.

Lighting is then faked using:

- surface normals from gradients
- fake light directions
- glow accumulation
- fog

So what looks like "complex 3D modeling" is actually **sampling a math
function**.

### 7. Glow and Psychedelic Color

Glow is usually not physically accurate. It's accumulated during
raymarch:

```glsl
glow += exp(-abs(distance)*k)
```

This makes near-surface areas bloom.

Color palettes are smooth cosine functions:

```glsl
color = a + b*cos(2π(c*t + d))
```

This gives continuous rainbow flows without hard bands.

### 8. Feedback = Visual Memory

Many psychedelic loops add **frame feedback**:

```
newFrame = currentShader + previousFrame * decay
```

This creates:

- trails
- recursive echo
- "living" visual motion

It simulates memory in the visual system.

### 9. What the Full System Really Is

Put together, these animations are:

> A dynamical system inside a symmetric, folded space with scale mapped
> logarithmically, rendered by sampling a distance field, lit by fake
> lighting, colored by smooth palettes, often with temporal feedback.

In math language:

> You are exploring trajectories of points in a transformed metric space
> under iterated nonlinear mappings.

In artist language:

> You built a universe where space folds, repeats, and breathes, and you
> fly a camera through it.

### 10. Why It Feels Hypnotic

Your visual cortex expects:

- Euclidean geometry
- consistent scale
- limited symmetry

These systems violate all three in smooth, continuous ways.

Your brain tries to build a stable model and fails, but gently, so it
locks attention.

That is the "psychedelic" effect.

## Case Study: Architectural Fractal Cathedral

This section analyzes a layered 3D fractal + symmetry + heavy post
stack. Not just "generic kaleidoscope shader" but a specific aesthetic
of architectural, layered, boxy fractal corridors.

### 1. Core Geometry: 3D Distance-Field Fractal

The visual structure looks like **architectural, layered, boxy fractal
corridors**, not smooth Mandelbulb lobes.

That strongly points to a **Mandelbox or hybrid box-fold fractal**,
raymarched in 3D.

Typical components:

- **Box fold**: `p = clamp(p, -fold, fold) * 2.0 - p;`
- **Sphere fold**: if radius < min → scale up, if > max → scale down
- **Scale and translate loop**

This produces:

- Rectilinear "city / cathedral" structures
- Repeating layered planes
- Nested corridor/tunnel feeling

So base space is likely:

```glsl
distance = mandelboxDE(p)
```

rendered by raymarching.

### 2. Kaleidoscopic Symmetry Is in 3D Space, Not Screen Space

This is not a simple 2D mirror overlay. The symmetry is baked into the
3D world.

Clues:

- The geometry itself repeats radially
- Surfaces line up across wedges
- Depth cues match symmetry

They are doing **3D symmetry folding** before evaluating the fractal.

Typical trick:

```glsl
p.xy = kaleido2(p.xy, N);
p.xz = kaleido2(p.xz, N);
```

or a set of abs/mirror folds like:

```glsl
p = abs(p);
if (p.x < p.y) p.xy = p.yx;
if (p.x < p.z) p.xz = p.zx;
```

This creates kaleidoscopic rotational symmetry in actual 3D space, not
just a post effect.

### 3. Infinite Zoom / Forward Travel Is a Log-Scale Tunnel Trick

The camera is not just flying linearly. The space feels like it keeps
re-entering itself at new scales.

That usually comes from **logarithmic scaling mapped into translation**.

They likely warp space before fractal evaluation:

1. Convert radius in a plane to log space
2. Add time to log radius
3. Wrap with fract()
4. Convert back with exp()

This creates a repeating "scale tunnel".

Combined with forward motion in Z:

```glsl
p.z += time * speed;
```

you get the feeling of:

- falling through infinite nested layers
- structures reappearing at different scales

So geometry = fractal, but **space is logarithmically tiled in scale**.

### 4. Heavy Domain Warping for Organic Complexity

The clean symmetry is broken just enough to feel alive and psychedelic.

You can see:

- surfaces wobble
- patterns smear slightly
- color boundaries swirl

That comes from **domain warping**:

```glsl
p += smallNoise(p * freq + time) * strength;
```

Usually sin/cos noise or simple FBM noise.

This bends the entire fractal space before DE evaluation, giving:

- organic distortion
- non-rigid motion
- "melting" architecture

### 5. Lighting: Mostly Fake, Glow-Driven

This is not physically based lighting. They are using:

- Surface normal from gradient of distance field
- One or two fake directional lights
- Strong edge/fresnel term
- Glow accumulation during raymarch

Glow trick (very common in trippy shaders):

```glsl
glow += exp(-abs(distance) * k) * smallFactor;
```

This creates:

- luminous edges
- internal light bleed
- ethereal feel

There's likely also a fog term based on travel distance.

### 6. Color Is Procedural, Not Textured

The color changes are too smoothly phase-shifted and spatially tied to
geometry.

That suggests **cosine palette functions**, not textures.

Typical:

```glsl
color = a + b*cos(2π(c*t + d));
```

Where t might be:

- hit position (z or length)
- iteration count
- distance traveled

That's why hues cycle smoothly across space and time.

### 7. Camera Path Is Simple but Smart

The motion feels complex, but camera control is probably minimal:

- Camera slowly rotates around center axis
- Slight wobble in orientation
- Forward translation along Z

Most of the complexity comes from **space warping**, not camera
acrobatics.

### 8. Post Processing Is Doing a LOT of Work

After the raymarch render, there is likely:

**Bloom / glow pass**: Very obvious from the soft halos.

**Color grading / LUT**: Shifts overall hue relationships over time.

**Contrast curve**: Crushes blacks, lifts mids for neon look.

**Possibly feedback**: Some frames look like subtle trail memory, which
could be mild frame feedback or temporal accumulation blur.

### 9. Likely Toolchain

This could be made in several ways, but the most plausible stacks are:

- ShaderToy-style GLSL → recorded
- Fragmentarium preset → animated
- Mandelbulber with heavy symmetry + custom color formulas → post in
  Blender/After Effects

Given the strong boxy architecture, **Mandelbox-style DE in a shader**
is very likely.

### 10. Summary Model of How This Style Is Made

1. Define a Mandelbox/hybrid distance estimator
2. Fold 3D space with kaleidoscopic symmetry
3. Warp space with time-based domain distortion
4. Apply logarithmic radial scaling so space repeats across zoom levels
5. Raymarch with glow accumulation and fake lighting
6. Color with smooth cosine palettes tied to position and time
7. Post-process with bloom and grading
8. Move camera slowly forward through Z

So the "infinite psychedelic cathedral" is not modeled. It's a
**mathematical universe with symmetry, scale recursion, and warped
geometry**, sampled by a camera flying through it.
