# Chapter 1: Higher Dimensions

Notes from Margenstern Volume 1, Section 1.4 (pages 84-90).

## Generalization to n Dimensions

### Definition

The hyperbolic space of dimension n+1 restricted to hyperplanes of dimension n
gives a hyperbolic space of dimension n.

Equivalently: IH^n restricted to any hyperplane is a copy of IH^(n-1).

### Poincaré Ball Model

The model generalizes to higher dimensions:

- **Points**: Open unit hyperball B_n = {x : ||x|| < 1}
- **Hyperplanes**: Traces of hyperspheres orthogonal to ∂B_n
- **Boundary**: ∂B_n represents points at infinity

### Equation of Hyperplane

For hypersphere orthogonal to ∂B_n with center (a_1, ..., a_n):

```
Σ x_i² - 2Σ a_i·x_i + 1 = 0
```

Orthogonality condition: OΩ² = R² + 1

## Intersection Properties

### Three Cases for Hyperplane Intersection

| Case                  | Description                              |
| --------------------- | ---------------------------------------- |
| Meet in B_n           | Intersection is hypersphere of dim n-2  |
| Meet on ∂B_n          | Single point at infinity                |
| No intersection       | Common perpendicular exists              |

### Lemma 50: Common Perpendicular

For non-intersecting hyperplanes H_1 and H_2:

- There exists a unique line δ perpendicular to both
- K_1 = δ ∩ H_1, K_2 = δ ∩ H_2
- dist(H_1, H_2) = K_1K_2

**Proof approach**: Reduce to 2D plane containing O and both centers.

## Hyperbolic 3D Space (IH³)

### Key Properties

- Hyperplanes are spheres orthogonal to ∂B_3
- Intersection of two planes is a circle in a diametral plane
- Lines have two points at infinity (same as IH²)
- Two points at infinity define a unique line

### Regular Tilings in IH³

**Only four regular tilings exist** (unlike IH² which has infinitely many):

| Notation  | Polyhedron  | Notes                    |
| --------- | ----------- | ------------------------ |
| {5,3,4}   | Dodecahedra | 4 meet at each edge      |
| {5,3,5}   | Dodecahedra | 5 meet at each edge      |
| {4,3,5}   | Cubes       | 5 meet at each edge      |
| {3,5,3}   | Icosahedra  | 3 meet at each edge      |

**Key difference**: IH² has infinitely many {p,q} tilings, IH³ has only 4.

## Models of Euclidean Plane in Hyperbolic Space

### Horosphere Model (Lobachevsky-Bolyai)

**Setting**: Hyperbolic 3D space.

**Construction**:

- **Points**: Horosphere Σ (sphere tangent to ∂B_3 at point P)
- **Lines**: Horocycles on Σ (intersection of Σ with planes through P)

**Properties**:

- Horocycle through two points is unique (incidence axiom)
- Exactly one parallel through external point (Euclidean parallel axiom)
- Satisfies all Euclidean axioms

**Key insight**: The tangent plane τ at P projects horocycles to lines,
enabling parallel constructions.

### Equidistant Curve Model

**Setting**: Hyperbolic plane (IH²).

**Construction**:

- **Points**: All points of IH²
- **Lines**:
  - Directions: lines through fixed point A
  - Equidistant curves on both sides of directions

**In Poincaré Model** (with A = O):

- Directions = diameters of ∂U
- Equidistant curves = circles cutting ∂U at diameter endpoints

**Equation form**:

```
x² + y² - 2kx + 2ℓy = 0
```

where line (k,ℓ) passes through origin.

## Implementation Relevance

### For 3D Tilings

The {5,3,4} dodecagrid from Volume 2 lives in IH³:

- Uses the 4 regular 3D tilings
- 8 octants instead of sectors
- 12 neighbors per cell

### For Coordinate Systems

The common perpendicular lemma (Lemma 50) generalizes:

- Distance between hyperplanes well-defined
- Unique shortest path exists

### For Rendering

Higher-dimensional Poincaré models:

- Ball model for 3D visualization
- Same principles as 2D disc model
- Conformal, bounded representation

### For Theory

The Euclidean model in hyperbolic space shows:

- Euclidean geometry is a "local limit" of hyperbolic
- Horocycles behave like Euclidean lines
- Provides connection between geometries
