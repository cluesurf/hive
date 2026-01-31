# Chapter 1: Distance and Trigonometry

Notes from Margenstern Volume 1, Section 1.3.4 (pages 76-86).

## The Möbius Transformation

### Definition

The key transformation for distance computation:

```
τ_a(z) = (z - a) / (1 - āz)
```

where a ∈ U (the unit disc).

### Properties

- Preserves ∂U globally
- τ_a(a) = 0 (sends a to origin)
- Bijective: inverse is τ_{-a}
- Analytic (holomorphic), preserves angles
- Represents a **shift** in hyperbolic space

### Decomposition

Can be split into:

1. Inversion with respect to a circle around 1/ā
2. Reflection in the x-axis
3. Rotation around O

### Fixed Points

Two fixed points at infinity: u and -u where u = a/|a|.

This confirms τ_a is a shift along the line joining u to -u.

## Hyperbolic Distance Formula

### Theorem 33

For points A, B in the unit disc with complex coordinates z_A, z_B:

```
d_h(A, B) = K · ln[(1 + |...|) / (1 - |...|)]
```

where the argument is:

```
|(z_A - z_B) / (1 - z̄_B·z_A)|
```

### Lobachevsky's Choice (K = 1)

**Definition 18**: The standard hyperbolic distance:

```
d_h(A, B) = ln[(1 + |(z_A - z_B)/(1 - z̄_B·z_A)|) / (1 - |(z_A - z_B)/(1 - z̄_B·z_A)|)]
         = 2 arctanh|(z_A - z_B)/(1 - z̄_B·z_A)|
```

### Useful Form

If d_e is Euclidean distance from origin:

```
d_e = tanh(d/2)
```

## Angle of Parallelism

### Theorem 34 (Lobachevsky)

The angle of parallelism for distance d:

```
Π(d) = 2 arctan(e^(-d))
```

### Special Value

```
Π(h) = π/4 when h = ln(1 + √2) ≈ 0.881374
```

This indicates the chosen unit is quite large.

### Alternative Formulations

Lobachevsky preferred expressing formulas using Π(x):

```
sin Π(x) = 1/cosh(x)
```

## Hyperbolic Trigonometry

### Theorem 35 (Lobachevsky): Rectangular Triangle

For triangle ABC with right angle at A:

- a = BC (opposite to right angle)
- b = CA
- c = AB
- β = angle at B
- γ = angle at C

**Fundamental Formulas**:

| Formula | Name/Description           |
| ------- | -------------------------- |
| (1)     | cosh(a) = cosh(b)·cosh(c)  |
| (2a)    | sinh(b) = sinh(a)·sin(β)  |
| (2b)    | sinh(c) = sinh(a)·sin(γ)  |
| (3a)    | cos(β) = cosh(b)·sin(γ)   |
| (3b)    | cos(γ) = cosh(c)·sin(β)   |
| (4)     | cosh(a) = cot(β)·cot(γ)   |

### Derived Formulas

**Pythagoras-like**:

```
sinh²(a) = sinh²(b) + sinh²(c) + sinh²(b)·sinh²(c)
```

**Other useful relations**:

```
tanh(c) = tanh(a)·cos(β)
tanh(c) = sinh(c)·tan(γ)
```

### Comparison to Euclidean

At infinitesimal scale (as quantities → 0):

- Hyperbolic formulas approach Euclidean formulas
- sinh(x) ≈ x, cosh(x) ≈ 1, tanh(x) ≈ x

## Circle Measurements

### Corollary 14

For a hyperbolic circle of radius r:

| Quantity       | Formula                |
| -------------- | ---------------------- |
| Circumference  | C(r) = 2π sinh(r)      |
| Area           | A(r) = 4π sinh²(r/2)   |

### Comparison to Euclidean

| Geometry   | Circumference | Area       |
| ---------- | ------------- | ---------- |
| Euclidean  | 2πr           | πr²        |
| Hyperbolic | 2π sinh(r)    | 4π sinh²(r/2) |

As r → 0: sinh(r) ≈ r, so formulas converge.

As r → ∞: Hyperbolic circle grows **exponentially** faster.

### Proof Approach

Uses inscribed/circumscribed regular polygons:

1. Triangle ABC with right angle at A, angle π/n at C
2. Compute perimeter of n-sided polygon
3. Take limit as n → ∞
4. Show inscribed and circumscribed limits coincide

## Implementation Formulas

### Distance Computation

```typescript
function hyperbolicDistance(z1: Complex, z2: Complex): number {
  const diff = subtract(z1, z2)
  const denom = subtract(ONE, multiply(conjugate(z2), z1))
  const ratio = abs(divide(diff, denom))
  return 2 * Math.atanh(ratio)
}
```

### Position from Distance

Given distance d from origin:

```typescript
function euclideanRadius(d: number): number {
  return Math.tanh(d / 2)
}
```

### Angle of Parallelism

```typescript
function angleOfParallelism(d: number): number {
  return 2 * Math.atan(Math.exp(-d))
}
```

## Key Insights

### Growth Rates

| Quantity             | Euclidean | Hyperbolic        |
| -------------------- | --------- | ----------------- |
| Distance from origin | r         | 2 arctanh(r)      |
| Circle circumference | O(r)      | O(e^r)            |
| Circle area          | O(r²)     | O(e^r)            |
| Tiles at radius n    | O(n²)     | O(e^n)            |

### For Rendering

- Objects near boundary appear compressed
- Equal hyperbolic distances map to decreasing Euclidean distances
- Need LOD (level of detail) for efficient rendering

### For Tilings

- Tile count grows exponentially with radius
- Distance computation essential for region management
- Angle of parallelism determines parallel line behavior
