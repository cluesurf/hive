# Chapter 1: Motions in the Hyperbolic Plane

Notes from Margenstern Volume 1, Section 1.2 (pages 49-65).

## Isometries

### Definition

An isometry τ is a mapping that preserves angles: for any non-collinear
triple (A, B, C), the images are non-collinear and angles are preserved.

### Properties (Theorem 22)

- Preserves distances: A^τ B^τ = AB
- Maps lines to lines
- Is bijective
- Inverse is also an isometry
- Isometries form a group under composition

## Reflections

### Definition

Reflection σ_ℓ in line ℓ: For point M, drop perpendicular to ℓ with foot
H. M^σℓ is the point such that H is the midpoint of MM^σℓ.

### Properties

- Involutive: σ_a ∘ σ_a = identity (Theorem 23)
- Fixes all points on the axis ℓ
- Exchanges half-planes defined by ℓ

### Fundamental Theorem (Lemma 30)

Every isometry is a product of at most three reflections.

If three reflections with axes a, b, c are needed, we can assume two
consecutive axes intersect.

## Classification of Motions

Products of two reflections give three types based on axis intersection:

| Intersection Type | Motion Type    | Definition                    |
| ----------------- | -------------- | ----------------------------- |
| Point in plane    | Rotation       | Axes meet at point A          |
| Point at infinity | Ideal rotation | Axes are parallel             |
| No intersection   | Shift          | Axes are non-secant (share ⊥) |

Products of three reflections give:

| Motion | Structure                             |
| ------ | ------------------------------------- |
| Glide  | σ_u ∘ σ_v ∘ σ_w where w ⊥ u and w ⊥ v |

## Rotations

### Definition

For point A and angle α: take lines a, b through A with (a,b) = α.
Rotation = σ_a ∘ σ_b.

### Properties (Lemma 31)

- Angle of rotation = 2 × (angle between axes)
- Choice of axes doesn't matter, only the angle
- Inverse rotation = σ_b ∘ σ_a

### Orbit (Theorem 24)

The orbit of point M under all rotations around A is the circle of
radius AM centered at A.

## Shifts (Translations)

### Definition

For non-secant lines a, b perpendicular to axis ℓ: Shift = σ_a ∘ σ_b.

### Properties (Lemma 32)

- Shift amount = 2 × dist(a, b)
- Preserves distances to axis ℓ
- Shifts have a "rotation ingredient" (negative curvature effect)

### Orbit (Theorem 25)

The orbit of point M under shifts along ℓ is an **equidistant curve**:

- All points at distance dist(M, ℓ) from ℓ on same side
- Equivalently: all points with same angle of parallelism to ℓ

### Key Observation

When you shift in hyperbolic space, there is a "rotation ingredient"
from negative curvature. This is why:

- Two lines initially parallel become non-secant after shifting
- Hilbert's proof of common perpendicular uses this property

## Glides

### Definition

Product of three reflections σ_u ∘ σ_v ∘ σ_w where w is perpendicular to
both u and v.

### Properties (Theorem 26)

- Axis w is called the axis of the glide
- Any product of three reflections (with two consecutive axes meeting)
  can be written in this form
- Orbit is an equidistant curve (reflected from shift orbit)

## The Ends (Points at Infinity)

### Definition

An **end** or **point at infinity** is an equivalence class of parallel
rays.

### Properties (Theorem 27)

- A unique line passes through any two distinct ends
- A unique line passes through any end and any point in the plane

### Line Through Two Ends

Construction (from Theorem 27 proof):

1. Take rays u and v representing the two ends
2. Find point A common to both rays (by continuation)
3. The bisector of angle (u, v) at A gives a perpendicular line
4. This perpendicular is the unique line through both ends

## Ideal Rotations

### Definition

For parallel lines a and b (sharing an end A): Ideal rotation = σ_a ∘
σ_b.

The end A is called the **centre** of the ideal rotation.

### Horocycles

**Definition**: The orbit of point M under ideal rotations centered at
A, together with identity.

This creates a new geometric object: the **horocycle**.

### Properties of Horocycles

| Property | Description                                          |
| -------- | ---------------------------------------------------- |
| Centre   | A point at infinity A                                |
| Shape    | Limit of circles as radius → ∞                       |
| Bisector | For any P, Q on horocycle, bisector passes through A |
| Tangent  | Perpendicular to line joining point to center        |
| Cuts     | A line through A cuts horocycle in exactly one point |

### Horocycle as Limit of Circles (Theorem 29)

As circles grow larger with centers approaching the point at infinity,
they approach the horocycle as a limit.

This is why Lobachevsky called horocycles "limit-curves".

### Lemma on Parallel Lines (Lemma 36)

For parallel lines a and b, there is a unique **bisector** δ such that:

- b = a^δ and a = b^δ
- δ is parallel to both a and b

## Cycles: Unified View (Theorem 30)

For three non-collinear points A, B, C, their perpendicular bisectors:

| Configuration       | Curve Through A, B, C         |
| ------------------- | ----------------------------- |
| Meet at point O     | Circle around O               |
| Meet at end O       | Horocycle centered at O       |
| Pairwise non-secant | Equidistant curve with axis o |

## Motion Existence (Theorem 31)

For any two congruent segments AB and CD, there exists a motion τ such
that CD = A^τ B^τ.

The motion is always a product of at most two reflections (a positive
motion or displacement).

## Implementation Relevance

### For Navigation

The motion classification gives:

- **Rotations**: Moving around a tile (orbiting)
- **Shifts**: Moving along an axis (translating)
- **Ideal rotations**: Moving along a horocycle

### For Coordinate Systems

Understanding motions helps with:

- Transforming between coordinate systems
- Computing neighbors via reflections
- Understanding symmetry groups of tilings

### For Rendering

The Poincaré model (next section) uses these motions directly:

- Reflections = inversions in circles
- All motions preserve the unit disk
- Conformal mapping preserves angles
