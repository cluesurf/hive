# Chapter 1: The Poincaré Disc Model

Notes from Margenstern Volume 1, Section 1.3 (pages 65-70+).

## Overview

The Poincaré disc model represents the hyperbolic plane within the open
unit disc of the Euclidean plane.

## Model Definition

### Points

All points inside the open unit disc U = {z ∈ C : |z| < 1}.

### Lines

Traces of circles in U that are **orthogonal to ∂U** (the boundary
circle).

Special cases:

- Diameters are limit positions of such circles
- Diameters are also valid lines

### Points at Infinity

The boundary ∂U represents **points at infinity** (ends).

- Lines through two ends = arc of circle orthogonal to ∂U
- Parallel lines share a point on ∂U

### Angles

Two lines are perpendicular iff their supports are orthogonal in the
Euclidean sense.

More generally, the hyperbolic angle between two lines equals the
Euclidean angle between their tangent lines at the intersection point.

This makes the model **conformal** (angle-preserving).

## Reflections as Inversions

### Inversion Definition

Inversion of point M with respect to circle of radius R centered at O:

```
M₁ on line OM such that OM · OM₁ = R²
O is not between M and M₁
```

### Reflection in the Model

Reflection in hyperbolic line ℓ = inversion with respect to the
**support** of ℓ (the Euclidean circle whose trace in U is ℓ).

This gives:

- All hyperbolic motions as compositions of inversions
- Preservation of the unit disc
- Conformal transformation

## Circles in the Model (Theorem 32)

**Hyperbolic circles are Euclidean circles** (within U).

### Construction

For a hyperbolic circle Γ with center H and point A on Γ:

1. Draw the Euclidean line HO (O = center of ∂U)
2. Draw the tangent at A to the circle supporting line HA
3. The Euclidean center is the intersection of these

### Key Point

The hyperbolic center and Euclidean center differ unless the hyperbolic
center is at the origin O.

## Visualization Properties

### Near the Origin

Objects near the center of the disc appear close to their Euclidean
size.

### Near the Boundary

Objects appear compressed as they approach ∂U:

- Lines appear as arcs bending toward the boundary
- Equal hyperbolic distances appear smaller in Euclidean terms
- Parallel lines appear to converge at ∂U

### Horocycles

In the model:

- Circles internally tangent to ∂U
- Touch ∂U at exactly one point (the center at infinity)
- All points on horocycle equidistant from center in "horocyclic sense"

### Equidistant Curves

In the model:

- Arcs of circles that cut ∂U at two points
- Not orthogonal to ∂U (so not lines)
- All points equidistant from the axis

## Comparison: Disc vs Half-Plane Model

| Aspect           | Disc Model                  | Half-Plane Model           |
| ---------------- | --------------------------- | -------------------------- |
| Space            | Open unit disc              | Upper half-plane           |
| Lines            | Circles orthogonal to ∂U    | Semicircles/vertical lines |
| Ends             | Points on ∂U                | Points on real axis + ∞    |
| Distinguished pt | None (symmetric)            | Point at ∞                 |
| Best for         | Tilings, uniform structures | Horocycles, certain proofs |

**Margenstern's choice**: Disc model is preferred for cellular automata
because it has no distinguished point, matching the uniform structure of
CAs.

## Implementation Relevance

### For Rendering

The Poincaré model provides:

- Direct mapping to screen coordinates
- Natural handling of angles (conformal)
- Compact representation (bounded)
- Clear visualization of growth

### For Tilings

- Regular polygons appear as circular arcs
- Tile boundaries are circles orthogonal to ∂U
- Central tile is most regular, peripheral tiles are distorted

### For Coordinates

The model allows:

- Complex number representation of points
- Möbius transformations for motions
- Direct distance calculations

### Distance Formula

The hyperbolic distance between points z₁ and z₂:

```
d(z₁, z₂) = 2 · artanh|z₁ - z₂| / |1 - z̄₁z₂|
```

Or equivalently:

```
cosh(d) = 1 + 2|z₁ - z₂|² / ((1 - |z₁|²)(1 - |z₂|²))
```

### Möbius Transformations

Hyperbolic motions can be expressed as Möbius transformations:

```
f(z) = e^(iθ) · (z - a) / (1 - āz)
```

Where |a| < 1 and θ ∈ [0, 2π).

This gives:

- Rotations: a = 0, vary θ
- Other motions: vary a
