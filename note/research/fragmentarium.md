# Fragmentarium

Cross-platform fractal fragment shader IDE (Qt5/OpenGL).

## Architecture

- C++/Qt5 with OpenGL 3+
- Custom GLSL preprocessor with `#include` support
- Declarative parameter widgets from shader annotations
- Progressive accumulation rendering
- 143 example shaders, 44 reusable include modules

## Key Techniques

### Modular GLSL System

```glsl
#include "DE-Raytracer.frag"
#include "MathUtils.frag"

#info Mandelbulb Distance Estimator
#donotrun              // Include-only
#buffer RGBA32F        // Accumulation format
#group CategoryName    // UI tab organization
```

### Parameter Extraction

```glsl
uniform float Iterations; slider[10,200,1000]
uniform vec3 JuliaC; slider[(-2,-2,-2),(0,0,0),(2,2,2)]
uniform vec3 BaseColor; color[1.0,1.0,1.0]
uniform bool Julia; checkbox[false]
uniform sampler2D texture; file[image.hdr]
```

Preprocessor generates Qt widgets automatically.

### Progressive Rendering

```glsl
uniform int subframe;      // Current accumulated frame
uniform float time;        // Animation time
uniform sampler2D backbuffer;  // Previous accumulation
```

### Distance Estimator Pattern

```glsl
float DE(vec3 pos);  // User implements

float minDist = pow(10.0, Detail);  // slider[-7,-2.3,0]
for (int i = 0; i < MaxRaySteps; i++) {
    float dist = DE(position);
    if (dist < minDist) break;
    position += direction * dist;
}
```

### Normal Calculation

```glsl
vec3 normal(vec3 pos, float normalDistance) {
    vec3 e = vec3(0.0, normalDistance, 0.0);
    return normalize(vec3(
        DE(pos+e.yxx) - DE(pos-e.yxx),
        DE(pos+e.xyx) - DE(pos-e.xyx),
        DE(pos+e.xxy) - DE(pos-e.xxy)
    ));
}
```

### Orbit Trapping

```glsl
vec4 orbitTrap = vec4(10000.0);
for (...) {
    if (i < ColorIterations)
        orbitTrap = min(orbitTrap, abs(vec4(z.xyz, r*r)));
}

// Apply as coloring
uniform vec4 X; color[-1,0.7,1,0.5,0.6,0.6];  // YZ plane
uniform vec4 Y; color[-1,0.4,1,1.0,0.6,0.0];  // XZ plane
uniform vec4 Z; color[-1,0.5,1,0.8,0.78,1.0]; // XY plane
```

### Lighting System

```glsl
uniform vec4 AO; color[0,0.7,1,0.0,0.0,0.0]      // Ambient occlusion
uniform float Specular; slider[0,0.4,1.0]
uniform float SpecularExp; slider[0,16.0,100.0]
uniform vec4 SpotLight; color[0.0,0.4,1.0,...]
uniform float HardShadow; slider[0,0,1]
uniform float ShadowSoft; slider[0.0,2.0,20]
```

### Mandelbulb Implementation

```glsl
void powN1(inout vec3 z, float r, inout float dr) {
    float theta = acos(z.z/r);
    float phi = atan(z.y, z.x);
    dr = pow(r, Power-1.0)*Power*dr + 1.0;
    float zr = pow(r, Power);
    theta = theta*Power;
    phi = phi*Power;
    z = zr*vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
}
```

### Mandelbox (Rrrola's)

```glsl
float DE(vec3 pos) {
    vec4 p = vec4(pos, 1);
    for (int i=0; i<Iterations; i++) {
        p.xyz = clamp(p.xyz, -1.0, 1.0) * 2.0 - p.xyz;  // Box fold
        float r2 = dot(p.xyz, p.xyz);
        p *= clamp(max(MinRad2/r2, MinRad2), 0.0, 1.0); // Sphere fold
        p = p*scale + p0;
    }
    return ((length(p.xyz) - absScalem1) / p.w) - C2;
}
```

### Kaleidoscopic IFS

```glsl
// Mirror planes
if(z.x+z.y<0.0) z.xy = -z.yx;
if(z.x+z.z<0.0) z.xz = -z.zx;
if(z.y+z.z<0.0) z.zy = -z.yz;
z = z*Scale - Offset*(Scale-1.0);
```

### Tone Mapping

```glsl
uniform int ToneMapping; slider[1,1,4]
// 1: Linear, 2: Exponential, 3: Filmic, 4: Reinhardt

uniform float Gamma; slider[0.0,2.2,5.0]
uniform float Exposure; slider[0.0,1.0,30.0]
```

## Reusable Insights

1. **Modular shader includes** - Separate infrastructure from content
2. **Declarative parameters** - No-code UI generation
3. **Progressive accumulation** - High quality without per-frame cost
4. **Orbit trapping** - Rich coloring from iteration data
5. **Multiple raytracers** - Swap rendering strategies freely
6. **Preset system** - Store/load all uniforms
