# Chapter 1: Axioms of Hyperbolic Geometry

Notes from Margenstern Volume 1, Chapter 1 (pages 18-50).

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
- III.3: If B is between A and C and B' is between A' and C', with AB =
  A'B' and BC = B'C', then AC = A'C'
- III.4: Angle congruence: for any angle and any ray, there is a unique
  congruent angle on a given side
- III.5: (h, k) = (h, k) (reflexivity)
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

## Key Theorems from Congruence

| Theorem | Name                     | Statement                                 |
| ------- | ------------------------ | ----------------------------------------- |
| 1       | First congruence (SAS)   | Two sides + included angle = congruent    |
| 2       | Second congruence (ASA)  | Side + two adjacent angles = congruent    |
| 7       | Right angle uniqueness   | All right angles are congruent            |
| 8       | Perpendicular uniqueness | Unique perpendicular from point to line   |
| 9       | Rectangular congruence   | BC = B'C', angle B = B', right angle at A |
| 16      | Third congruence (SSS)   | Three sides congruent = triangles equal   |
| 17      | Fourth congruence (AAA)  | Three angles congruent = triangles equal  |

**Theorem 17 is unique to hyperbolic geometry.** In Euclidean geometry,
similar triangles with congruent angles can have different sizes.

## Constructions in Absolute Geometry

### Saccheri Quadrangle

A quadrangle ABCD with:

- Right angles at B and C
- AB = CD (equal perpendiculars from basis BC)
- A and D on same side of BC

**Properties**:

- Angles at A and D are congruent
- Both are acute in hyperbolic geometry (Corollary 6)
- Bisector of angle at intersection I is perpendicular to both AD and BC

### Lambert Quadrangle

A quadrangle with exactly three right angles.

**Property**: The fourth angle is acute in hyperbolic geometry.

### Key Constructions

1. **Dropping perpendicular** from point to line
2. **Bisector of angle** construction
3. **Mid-point** of segment construction
4. **Raising perpendicular** from point on line

## Parallelism and Angle of Parallelism

### Angle of Parallelism Function Π

For a point A at distance d from line l:

```
Π(d) = angle between perpendicular and parallel ray
```

**Properties of Π** (Theorem 21):

- Π is strictly decreasing
- Π(d) → π/2 as d → 0
- Π(d) → 0 as d → ∞

### Line Classifications

For lines l and m:

| Relationship | Description                   | Distance Behavior |
| ------------ | ----------------------------- | ----------------- |
| Secant       | Meet at a point               | N/A               |
| Parallel     | Share a point at infinity     | Tends to 0        |
| Non-secant   | Do not meet, even at infinity | Tends to ∞        |

**Theorem 14**: Non-secant lines have a unique common perpendicular.

**Theorem 19**: Distance behavior:

- Secant lines: dist(P, l) → ∞ as P moves away from intersection
- Parallel lines: dist(P, l) → 0 toward shared end, → ∞ away
- Non-secant lines: dist(P, l) → ∞ in both directions

## The Sum of Angles in a Triangle

**Theorem 15**: In the hyperbolic plane, the sum of angles in a triangle
is always less than π.

This is the fundamental distinguishing property from Euclidean geometry.

**Theorem 20 (Lobachevsky)**: If there is one triangle with angle sum =
π, then all triangles have angle sum = π, and we are in Euclidean
geometry.

## Areas

### Definition of Area

For triangle ABC with angles α, β, γ:

```
Area(ABC) = π - (α + β + γ)
```

This is the **angular defect**. The area is always positive in
hyperbolic geometry.

### Properties

- **Additive**: Area(T1 ∪ T2) = Area(T1) + Area(T2) for non-overlapping
  triangles
- Extends naturally to polygons
- A polygon with n vertices has area = (n-2)π - (sum of interior angles)

### Relationship to Euclidean Geometry

- Area = 0 ⟺ Sum of angles = π ⟺ Euclidean geometry
- Area > 0 ⟺ Sum of angles < π ⟺ Hyperbolic geometry

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

### Key Insight

The fundamental difference in hyperbolic geometry is that:

1. Triangles with same angles are congruent (no scaling)
2. Angular defect creates positive area
3. Multiple parallels exist through external points
