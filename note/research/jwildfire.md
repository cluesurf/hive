# JWildfire

Java-based flame fractal renderer with 888 variation functions.

## Architecture

- Java with Swing UI
- Pluggable variation system (VariationFunc base class)
- Multi-stage rendering pipeline
- GPU acceleration via CUDA/OpenCL
- 25+ years of development

## Core Algorithm

### Chaos Game Iteration

```java
p = random point in [-1, 1]^2
for i = 0 to max_iterations:
    // Select transform (weighted probability)
    xf = xform.getNextAppliedXFormTable()

    // Apply transformations
    p = applyPreVariations(p)
    p = applyAffineTransform(p)
    p = applyMainVariations(p)
    p = applyPostVariations(p)
    p = applyPostAffine(p)

    // Update color
    color = updateColor(color, xf.colorParams)

    // Plot to density buffer
    raster.plot(project(p), color)
```

### Transformation Pipeline

1. **Pre-variations** (priority < 0)
2. **Affine transform** (2D/3D linear)
3. **Main variations** (priority = 0)
4. **Post-variations** (priority > 0)
5. **Post-affine** (second linear)
6. **Color transform**

### XYZPoint Precalculation

```java
class XYZPoint {
    double x, y, z;
    // Cached values (lazy-loaded)
    double sumsq;   // x^2 + y^2
    double sqrt;    // sqrt(x^2 + y^2)
    double atan;    // atan2(y, x)
    double sinA, cosA;
}
```

### Variation Example (Spiral)

```java
public void transform(XYZPoint p, XYZPoint out) {
    double r = sqrt(p.x*p.x + p.y*p.y) + EPSILON;
    double sinr = sin(r), cosr = cos(r);
    out.x += amount * (cosr + p.sinA) / r;
    out.y += amount * (sinr - p.cosA) / r;
}
```

### GPU Code Generation

```cuda
float r_eps = sqrtf(__r2 + EPSILON);
__px += __spiral*__rinv*(__y*__rinv+sinf(r_eps));
__py += __spiral*__rinv*(__x*__rinv-cosf(r_eps));
```

## Rendering Pipeline

1. **Iteration** - Multi-threaded chaos game
2. **Log-Density Filter** - `log(1 + density) / log(max_density)`
3. **Gamma Correction** - `output = input^(1/gamma)`
4. **Spatial Filter** - Mitchell, B-spline, Gaussian kernels
5. **Vibrancy Blend** - `color = vibrancy*gamma + (1-vibrancy)*linear`

## Color System

### Palette (256 colors)

```java
class RGBPalette {
    Map<Integer, RGBColor> rawColors;  // Sparse defined
    RGBColor[] transformedColors;       // Full 256 interpolated
}
```

### Color Modifications

- modHue - HSL rotation
- modSaturation - Intensity
- modContrast - Gray distance
- modGamma - Lightness curve
- modBrightness - Value shift

### Color Assignment Methods

- SINGLE - Fixed palette index
- DIFFUSION - Random distribution
- CYCLIC - Rotating index
- TARGETG - Blend toward target
- SMOOTH_GRADIENT - Interpolated

## Advanced Features

### Weighting Fields
- Per-pixel weight maps
- Selective parameter modulation
- Geographic influence on transforms

### Motion Curves
- Keyframe-based animation
- Smooth interpolation
- Per-parameter curves

### Solid Rendering
- 3D rasterization with depth
- Material properties
- Light sources with shadows
- Depth-of-field

## Reusable Insights

1. **Precalculated caching** - Validity flags prevent redundant math
2. **Dynamic pipeline** - Skip identity transforms
3. **Weighted table lookup** - Fast probability-based selection
4. **GPU code generation** - Maintain CPU/GPU parity
5. **Log-density filtering** - Handle extreme dynamic range
6. **Vibrancy blending** - Balance gamma vs linear
