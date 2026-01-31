# Fractal Garden

Interactive 3D fractal explorer using WebGL/REGL with video export.

## Architecture

- Browser-based with REGL (WebGL wrapper)
- Node.js server for headless rendering and video export
- Progressive rendering with ping-pong framebuffers
- Each fractal in separate folder with its own shader

## Key Techniques

### Progressive Rendering

```javascript
// Divides screen into sub-pixel grids (1x1, 2x2, 3x3, 4x4)
// Renders initial pass, fills in higher frequency details
// Uses offsets array for strategic sub-pixel sampling
```

### Distance Estimators

**Mandelbulb**:
```glsl
dr = pow(r, power - 1.0) * power * dr + 1.0;
distance = 0.5 * log(r) * r / dr;
```

**Mandelbox** (sphere + box folding):
```glsl
// Sphere fold
if (r2 < min_r2) scale by (fixed_r2 / min_r2)
else if (r2 < fixed_r2) scale by (fixed_r2 / r2)

// Box fold
p = clamp(p, -limit, limit) * 2.0 - p
```

**Menger Sponge** (deterministic, 7 iterations):
```glsl
// Recursive hole creation
// Scales by 1/3 per iteration
```

**Klein Bottle** (9 folding iterations):
```glsl
// Parametric folding with clamping
k1 = max(param_min.w / rp2, 1.0)
```

### Adaptive Hit Thresholds

```glsl
h = max(hitThreshold * distanceTraveled, hitThreshold/20)
// Klein uses quadratic: h = hitThreshold * distanceTraveled^2
```

| Fractal | Hit Threshold |
|---------|---------------|
| Mandelbulb | 0.00015 |
| Menger | 0.0001 |
| Mandelbox | 0.0005 |
| Klein | 0.00003 |

### Space Repetition

```glsl
vec3 opRepeat(vec3 p, float d) {
    return mod(p + 0.5*d, d) - 0.5*d;
}
```

### Scrollable Parameters

```glsl
// Mouse wheel animates parameters in real-time
power = 12 + sin(scrollY) * 10;          // Mandelbulb (range 2-22)
folding = 1/3 + scrollY/10;              // Mandelbox
offset = 1.9 + 0.1*sin(scrollY + 0.5);   // Klein breathing
```

### Cooperative Multitasking

```javascript
// Generator-based render steps
// Allows event handling between passes
// Prevents blocking main thread
```

## Reusable Insights

1. **Progressive rendering** - Quality builds over time
2. **Ping-pong buffers** - Accumulate samples efficiently
3. **Scrollable params** - Real-time exploration
4. **Per-fractal thresholds** - Tune precision by geometry
5. **Space repetition** - Infinite gallery effect
