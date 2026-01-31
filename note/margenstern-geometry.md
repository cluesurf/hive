# Margenstern: Hyperbolic Geometry Foundations

Notes from "Cellular Automata in Hyperbolic Spaces" Volumes 1 and 2 by
Maurice Margenstern.

## Poincare Disc Model

### Distance Formula (Theorem 33)

For two points A and B in the hyperbolic plane with coordinates zA and zB
in the unit disc:

```
dh(A, B) = ln((1 + |zA - zB| / |1 - zB*zA|) / (1 - |zA - zB| / |1 - zB*zA|))
         = 2 * arctanh(|zA - zB| / |1 - zB*zA|)
```

Key insight: The transformation `τa(z) = (z - a) / (1 - a*z)` maps the
unit disc onto itself, keeping the boundary globally invariant. This
represents a hyperbolic shift (displacement) along the line joining two
fixed points at infinity.

### Angle of Parallelism (Theorem 34, Lobachevsky)

The angle of parallelism for distance d:

```
Π(d) = 2 * arctan(e^(-d))
```

At distance h = ln(1 + sqrt(2)) ≈ 0.881374, the angle is π/4.

### Hyperbolic Trigonometry (Theorem 35)

For a right triangle ABC with right angle at A, sides a=BC, b=CA, c=AB,
and angles β at B, γ at C:

1. `cosh(a) = cosh(b) * cosh(c)` (hyperbolic Pythagorean theorem)
2. `sinh(b) = sinh(a) * sin(β)`
3. `sinh(c) = sinh(a) * sin(γ)`
4. `cos(β) = cosh(b) * sin(γ)`
5. `cos(γ) = cosh(c) * sin(β)`
6. `cosh(a) = cotan(β) * cotan(γ)`

Curious Pythagorean-like formula:

```
sinh²(a) = sinh²(b) + sinh²(c) + sinh²(b) * sinh²(c)
```

### Circle Properties (Corollary 14)

For a hyperbolic circle of radius r:

- Circumference: `C(r) = 2π * sinh(r)`
- Area: `A(r) = 4π * sinh²(r/2)`

Key insight: At infinitesimal scale, hyperbolic geometry and Euclidean
geometry coincide.

## Hilbert's Axioms

The book presents hyperbolic geometry through Hilbert's axiomatic
approach with five groups of axioms.

### I. Incidence Axioms

- I.1: Two distinct points determine a unique line
- I.2: Any line contains at least two points
- I.3: There exist three non-collinear points

### II. Order Axioms

Define betweenness relation on points of a line.

- II.1: If B is between A and C, then A, B, C are distinct points on a
  line
- II.2: For any two points A, B, there exists C such that B is between A
  and C
- II.3: Of three points on a line, exactly one is between the other two
- II.4: (Pasch's Axiom) A line entering a triangle through one side must
  exit through another side

### III. Congruence Axioms

- III.1: Segment congruence can be established from any point on any ray
- III.2: If AB = CD and AB = EF, then CD = EF
- III.3: Segment addition preserves congruence
- III.4: Angle congruence: for any angle and any ray, there is a unique
  congruent angle on a given side
- III.5: Reflexivity of angle congruence
- III.6: (SAS) If two triangles have two sides and included angle
  congruent, the remaining angles are congruent

### IV. Parallelism Axioms

Two versions distinguish Euclidean from hyperbolic geometry:

| Axiom | Statement                                                       |
| ----- | --------------------------------------------------------------- |
| IV.e  | Euclidean: Exactly one parallel through point not on line       |
| IV.h  | Hyperbolic: Two rays from A parallel to l, with secants between |

**Axiom IV.h (Bolyai-Lobachevsky)**: For any line l and any point A not
in l, there are two rays u and v issued from A which neither belong to
the same line nor meet l, and any ray w issued from A inside (u, v) cuts
l.

### V. Continuity Axioms

- V.1: (Archimedean) Any segment can be exceeded by repeating a given
  segment
- V.2: (Completeness) A bounded increasing sequence of points has a
  limit

## Key Theorems

| Theorem | Name                     | Statement                                 |
| ------- | ------------------------ | ----------------------------------------- |
| 1       | First congruence (SAS)   | Two sides + included angle = congruent    |
| 2       | Second congruence (ASA)  | Side + two adjacent angles = congruent    |
| 7       | Right angle uniqueness   | All right angles are congruent            |
| 8       | Perpendicular uniqueness | Unique perpendicular from point to line   |
| 16      | Third congruence (SSS)   | Three sides congruent = triangles equal   |
| 17      | Fourth congruence (AAA)  | Three angles congruent = triangles equal  |

**Theorem 17 is unique to hyperbolic geometry.** In Euclidean geometry,
similar triangles with congruent angles can have different sizes.

## Saccheri and Lambert Quadrangles

### Saccheri Quadrangle

A quadrangle ABCD with:

- Right angles at B and C
- AB = CD (equal perpendiculars from basis BC)
- A and D on same side of BC

**Properties**:

- Angles at A and D are congruent
- Both are acute in hyperbolic geometry (Corollary 6)

### Lambert Quadrangle

A quadrangle with exactly three right angles.

**Property**: The fourth angle is acute in hyperbolic geometry.

## Triangle Angle Sum

**Theorem 15**: In the hyperbolic plane, the sum of angles in a triangle
is always less than π.

**Theorem 20 (Lobachevsky)**: If there is one triangle with angle sum =
π, then all triangles have angle sum = π, and we are in Euclidean
geometry.

## Areas

For triangle ABC with angles α, β, γ:

```
Area(ABC) = π - (α + β + γ)
```

This is the **angular defect**. The area is always positive in
hyperbolic geometry.

**Properties**:

- Additive for non-overlapping triangles
- A polygon with n vertices has area = (n-2)π - (sum of interior angles)
- Area = 0 ⟺ Euclidean geometry

## Motions in the Hyperbolic Plane

### Isometries

An isometry τ is a mapping that preserves angles and distances.

**Properties (Theorem 22)**:

- Preserves distances: A^τ B^τ = AB
- Maps lines to lines
- Is bijective
- Inverse is also an isometry
- Isometries form a group under composition

### Classification of Motions

Products of two reflections give three types:

| Intersection Type | Motion Type    | Description                   |
| ----------------- | -------------- | ----------------------------- |
| Point in plane    | Rotation       | Axes meet at point A          |
| Point at infinity | Ideal rotation | Axes are parallel             |
| No intersection   | Shift          | Axes are non-secant (share ⊥) |

Products of three reflections give **glides**.

**Fundamental Theorem (Lemma 30)**: Every isometry is a product of at
most three reflections.

### Rotations

For point A and angle α: take lines a, b through A with (a,b) = α.
Rotation = σ_a ∘ σ_b.

**Properties**:

- Angle of rotation = 2 × (angle between axes)
- Orbit of point M is circle of radius AM centered at A

### Shifts (Translations)

For non-secant lines a, b perpendicular to axis ℓ: Shift = σ_a ∘ σ_b.

**Key Observation**: When you shift in hyperbolic space, there is a
"rotation ingredient" from negative curvature. This is why two lines
initially parallel become non-secant after shifting.

Orbit of point M under shifts along ℓ is an **equidistant curve**.

### Horocycles

The orbit of point M under ideal rotations centered at end A.

**Properties**:

- Centre is a point at infinity
- Shape is limit of circles as radius → ∞
- Perpendicular to line joining any point to center

## Higher Dimensions

### IHn (Hyperbolic n-space)

The model is the open unit hyperball Bn. Hyper-planes are traces of
hyper-spheres orthogonal to ∂Bn.

Three cases for hyper-plane intersection:

1. Intersection is a hyper-sphere of dimension n-2 in Bn
2. Restricted to a point on ∂Bn
3. No intersection, with a common perpendicular line

### 3D Space Tilings

Unlike IH2 which has infinitely many regular polygon tilings, IH3 has
only finitely many based on regular polyhedra:

- T{5,3,4}
- T{5,3,5}
- T{4,3,5}
- T{3,5,3}

### The Horosphere Model

A horosphere in hyperbolic 3D space is a sphere tangent to ∂B3.
Horocycles on the horosphere serve as lines. This satisfies all
Euclidean plane axioms.

## Tessellation Theory

### Schlaefli Symbols {p, q}

A tiling {p, q} has:

- p-sided polygons
- q polygons meeting at each vertex

Hyperbolic condition: `1/p + 1/q < 1/2`

### Angular Sectors and Truncated Sectors

Angular sector notation: `⟨h*v⟩` for angle hπ/v
Truncated sector notation: `[h*v, k*w]`

Basic Lemma for splitting:

```
[h*q, k*r] => (q-(h+1))⟨q⟩ + [p, (k+1)*r]   if hπ/q + (k+1)π/r ≤ 1
[h*q, k*r] => [(h+1)*q, p] + (r-(k+1))⟨r⟩   if (h+1)π/q + kπ/r ≤ 1
```

### Triangle Tilings

For triangles with angles π/p, π/q, π/r satisfying `1/p + 1/q + 1/r < 1`:

- Combinatoric when p, q, r ≥ 3
- Also combinatoric when p = 2 and q, r ≥ 4
- Quasi-combinatoric when p = 2 and q = 3

## Pencils of Lines

Three kinds of line pencils in hyperbolic plane:

1. Lines meeting at point A in plane (orthogonal curves: circles)
2. Lines meeting at point A at infinity (orthogonal curves: horocycles)
3. Non-secant lines with common perpendicular (orthogonal curves:
   equidistant curves)

## Implementation Relevance

### For Coordinate Systems

The axiomatic foundation provides:

- Rigorous definitions of distance and angle
- Construction procedures for key operations
- Properties distinguishing hyperbolic from Euclidean

### For Tilings

The angle defect directly determines:

- Whether a {p,q} tiling fits the geometry
- The curvature of the space
- Growth rates of the tessellation

### For Navigation

The motion classification gives:

- **Rotations**: Moving around a tile (orbiting)
- **Shifts**: Moving along an axis (translating)
- **Ideal rotations**: Moving along a horocycle

### For Rendering

The Poincare model uses motions directly:

- Reflections = inversions in circles
- All motions preserve the unit disk
- Conformal mapping preserves angles
