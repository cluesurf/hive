# Hyperboloid Model Analysis

## The Question

Is the hyperboloid (Minkowski) model the best general internal
representation for hyperbolic geometry, with other models derived via
projection?

**Short answer: Yes, for computational purposes.**

## What the Repositories Tell Us

Looking at the reference implementations:

| Repository              | Internal Model      | Why They Chose It              |
| ----------------------- | ------------------- | ------------------------------ |
| **HyperRogue**          | **Hyperboloid**     | Official recommendation        |
| MagicTile/ht.js-make    | Poincare (Complex)  | Mobius transforms are natural  |
| hyperbolic-ca-simulator | Hyperboloid         | Clean group theory, matrix ops |
| hyperboloid-model       | Hyperboloid         | Clean math, linear isometries  |
| hyperbolic-tiling       | Homogeneous Complex | GPU-friendly, shader math      |

The most mature implementation (HyperRogue, 218K lines, 10+ years) and
the mathematically sophisticated ones chose the hyperboloid model. The
MagicTile lineage uses Poincare because Mobius transforms are expressed
naturally in complex numbers.

## Hyperboloid Model Advantages

### 1. Isometries are Linear

In the hyperboloid model, all isometries are represented by 3x3 matrices
(for H²) or 4x4 matrices (for H³). This is huge.

**Hyperboloid rotation around origin:**

```
| cos(θ)  -sin(θ)  0 |
| sin(θ)   cos(θ)  0 |
|   0        0     1 |
```

**Hyperboloid translation along x-axis:**

```
| cosh(d)  0  sinh(d) |
|    0     1     0    |
| sinh(d)  0  cosh(d) |
```

Compare to Mobius transformations which require complex division:

```
f(z) = (Az + B) / (Cz + D)
```

Matrix multiplication is:

- Faster (no division)
- More numerically stable
- Easier to compose
- GPU-friendly (mat3/mat4 are native types)

### 2. No Boundary Issues

The Poincare disk has a boundary at |z| = 1. Points approaching this
boundary have coordinates approaching infinity in hyperbolic distance
but bounded Euclidean coordinates. This causes:

- Numerical precision loss near boundary
- Need for special handling of "ideal points"
- Division by near-zero in some formulas

The hyperboloid has no boundary. Points at hyperbolic infinity
correspond to the light cone (t² = x² + y²), which is geometrically
natural.

### 3. Natural Distance Formula

Hyperboloid distance:

```
d(a, b) = acosh(-<a,b>)
where <a,b> = ax*bx + ay*by - az*bz  (Minkowski dot product)
```

Poincare distance:

```
d(a, b) = 2 * atanh(|a - b| / |1 - conj(a)*b|)
```

The hyperboloid formula involves one dot product and one acosh. The
Poincare formula involves complex conjugation, subtraction, division,
and a modified arctangent.

### 4. Clean Geodesics

In the hyperboloid model, geodesics are the intersections of planes
through the origin with the hyperboloid surface. This is:

- Geometrically intuitive
- Easy to compute (cross product of two points gives plane normal)
- Easy to reflect across

### 5. Generalizes to Higher Dimensions

The hyperboloid model extends naturally:

- H²: x² + y² - t² = -1 in R^{2,1}
- H³: x² + y² + z² - w² = -1 in R^{3,1}
- H^n: Σx_i² - t² = -1 in R^{n,1}

The Poincare disk uses complex numbers which are inherently 2D.
Extending to 3D requires quaternions or other constructions that lose
the elegance.

### 6. Unified Treatment of Objects

Points, lines, and ideal points are all vectors in Minkowski space:

- Points: <v,v> < 0 (timelike)
- Ideal points: <v,v> = 0 (lightlike)
- Lines: <v,v> > 0 (spacelike)

From `hyperboloid-model/index.js`:

```javascript
exports.type = function (a) {
  // -1 is a point, 0 is an ideal point, 1 is a line
  return Math.sign(exports.dot(a, a))
}
```

This unified treatment simplifies many algorithms.

## Hyperboloid Model Disadvantages

### 1. Not Conformal

The Poincare disk is conformal (preserves angles). The hyperboloid model
projected to screen coordinates is not. For visualization, you often
want the Poincare projection anyway.

**Mitigation:** Convert to Poincare for display.

### 2. Unfamiliar to Many

Most people learn hyperbolic geometry via the Poincare disk. The
hyperboloid model requires understanding Minkowski space.

**Mitigation:** Hide the internal representation behind clean APIs.

### 3. Complex Number Elegance Lost

Mobius transformations are beautiful in complex notation. The matrix
form is more mechanical.

**Mitigation:** Provide a Mobius class that converts to/from hyperboloid
matrices when needed.

## What HyperRogue Does

[HyperRogue](https://roguetemple.com/z/hyper/models.php), a popular
hyperbolic geometry game, uses the hyperboloid model internally:

> "This makes this model great for computations, and this is why the
> Minkowski hyperboloid is internally used by HyperRogue for its
> computations."

They note that all other models (Poincare, Klein, Band, etc.) can be
derived from the hyperboloid via perspective projections:

- Klein model: project from z = 0
- Poincare disk: project from z = -1
- Various others: different projection points

## Research Paper Evidence

From
["Numerical Aspects of Hyperbolic Geometry"](https://arxiv.org/html/2404.09039v1):

> "The linear representation (hyperboloid/Minkowski model) is more
> natural for those who understand Minkowski geometry. Formulas for
> operations like computing midpoints are straightforward in the
> Minkowski hyperboloid, but the respective Poincaré model formulas are
> not."

## Practical Comparison

### Computing a Midpoint

**Hyperboloid:**

```typescript
function midpoint(a: Vector3, b: Vector3): Vector3 {
  // Linear combination, then normalize
  const sum = add(a, b)
  return normalize(sum) // Project back to hyperboloid
}
```

**Poincare:**

```typescript
function midpoint(a: Complex, b: Complex): Complex {
  // Much more complex formula involving Mobius transforms
  const m = mobiusTranslation(a, ORIGIN)
  const bPrime = m.apply(b)
  const mid = scale(bPrime, 0.5)
  return m.inverse().apply(mid)
}
```

### Reflecting Across a Geodesic

**Hyperboloid:**

```typescript
function reflect(point: Vector3, geodesic: Vector3): Vector3 {
  // Householder-like reflection
  const dot = minkowskiDot(point, geodesic)
  return subtract(point, scale(geodesic, 2 * dot))
}
```

**Poincare:**

```typescript
function reflect(point: Complex, geodesic: Circle): Complex {
  // Inversion in a circle (or reflection in a line)
  if (geodesic.isLine) {
    // Complex reflection formula
  } else {
    // Circle inversion: p' = center + r² / conj(p - center)
  }
}
```

## Recommendation

**Use the hyperboloid model as the internal canonical representation.**

1. Store all points as `[x, y, t]` vectors satisfying x² + y² - t² = -1
2. Store all transformations as 3x3 matrices
3. Convert to Poincare/Klein/etc. only for display
4. Keep Mobius transforms as a convenience layer that converts to/from
   matrices

### Architecture:

```
User API (Poincare coordinates, Mobius transforms)
    ↓ convert on input
Internal (Hyperboloid coordinates, Matrix transforms)
    ↓ convert on output
Display (Poincare/Klein/etc. as needed)
```

### Conversions:

```typescript
// Hyperboloid -> Poincare
function toPoincare(p: [number, number, number]): [number, number] {
  return [p[0] / (1 + p[2]), p[1] / (1 + p[2])]
}

// Poincare -> Hyperboloid
function fromPoincare(x: number, y: number): [number, number, number] {
  const sq = x * x + y * y
  return [(2 * x) / (1 - sq), (2 * y) / (1 - sq), (1 + sq) / (1 - sq)]
}

// Mobius -> Matrix
function mobiusToMatrix(m: Mobius): Matrix3 {
  // Convert 4 complex numbers to 3x3 real matrix
  // This is possible because Mobius transforms on the Poincare disk
  // correspond to Lorentz transforms on the hyperboloid
}
```

## 3D Extension

This approach scales perfectly to 3D:

- H³ uses 4D vectors `[x, y, z, w]` with x² + y² + z² - w² = -1
- Isometries are 4x4 matrices
- Ball model (3D Poincare): `[x/(1+w), y/(1+w), z/(1+w)]`

The matrix approach remains linear and clean.

## Sources

- [HyperRogue Models of Hyperbolic Geometry](https://roguetemple.com/z/hyper/models.php)
- [Numerical Aspects of Hyperbolic Geometry (arXiv)](https://arxiv.org/html/2404.09039v1)
- [Hyperbolic Geometry and Poincaré Embeddings](https://bjlkeng.github.io/posts/hyperbolic-geometry-and-poincare-embeddings/)
- [Wikipedia: Hyperboloid Model](https://en.wikipedia.org/wiki/Hyperboloid_model)
