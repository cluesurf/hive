# Fractal Explorer Ray Marching

Real-time 3D fractal renderer in C++/OpenGL using ray marching.

## Architecture

- C++ with OpenGL 4.1, GLSL, SDL2, GLM
- Full-screen quad rendering (GPU as compute platform)
- All fractal computation in fragment shaders
- CPU handles only uniforms and input

## Key Techniques

### Ray Marching Core

```glsl
float rayMarch(vec3 from, vec3 direction) {
    float totalDistance = 0.0;
    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = from + totalDistance * direction;
        float d = sceneSDF(p);
        if (d < EPSILON) break;
        totalDistance += d;
        if (totalDistance > MAX_DIST) break;
    }
    return totalDistance;
}
```

Parameters: MAX_STEPS=128, EPSILON=0.0005, MAX_DIST=100

### Distance Estimators

**Mandelbulb** (derivative tracking):
```glsl
// Track derivative for distance estimation
dr = pow(r, POWER-1.0) * POWER * dr + 1.0;
// Final DE
return 0.5 * log(r) * r / dr;
```

**Sierpinski Tetrahedron** (IFS):
```glsl
// Find closest vertex, iterate
z = 2.0 * z - c * (2.0 - 1.0);
return length(z) * pow(2.0, float(-n));
```

**Julia Quaternion**:
```glsl
// Quaternion arithmetic with derivative
return 0.5 * r * log(r) / length(dp);
```

**Mandelbox** (box + sphere folding):
```glsl
p.xyz = clamp(p.xyz, -1.0, 1.0) * 2.0 - p.xyz;  // Box fold
p *= clamp(max(MR2/r2, MR2), 0.0, 1.0);         // Sphere fold
return ((length(p.xyz) - C1) / p.w) - C2;
```

### Orbit Trapping for Coloring

```glsl
vec4 orbitTrap = vec4(MAX_DIST);
// During iteration:
orbitTrap = min(orbitTrap, abs(vec4(z.xyz, r*r)));
// Use for color:
vec3 color = vec3(1.0, orbitTrap.z, orbitTrap.x) * orbitTrap.w;
```

### Normal Calculation

```glsl
vec3 normal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        DE(p+e.xyy) - DE(p-e.xyy),
        DE(p+e.yxy) - DE(p-e.yxy),
        DE(p+e.yyx) - DE(p-e.yyx)
    ));
}
```

### Soft Shadows

```glsl
float shadowDist = rayMarch(point + normal*EPSILON*2.0, lightDir);
if (shadowDist < length(lightPos - point)) diffuse *= 0.3;
```

## Reusable Insights

1. **Full-screen quad pattern** - Treat GPU as compute platform
2. **Derivative tracking** - Essential for fractal DE convergence
3. **Orbit trapping** - Free coloring from iteration data
4. **Light pass flag** - Skip color computation during shadow rays
5. **Step count visualization** - Debug/tune performance
