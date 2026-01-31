# Margenstern: Cellular Automata in Hyperbolic Spaces, Volume 2

Notes from reading the book for application to the @cluesurf/hive
project.

## Overview

This is Volume 2 of Maurice Margenstern's comprehensive work on cellular
automata in hyperbolic spaces. Volume 2 focuses on **implementation and
computations**.

**Key tilings discussed:**

- **Pentagrid {5,4}**: Pentagons with 4 meeting at each vertex
- **Ternary heptagrid {7,3}**: Heptagons with 3 meeting at each vertex

Both are spanned by **Fibonacci trees**.

---

## Chapter 1: General Properties of CA in Hyperbolic Spaces

### 1.1 Hardware vs Software for Coordinates (pp. 13-21)

The coordinate system in hyperbolic CA is treated as "hardware" (built
into the structure), while CA rules are "software."

**Key concept: Fibonacci tree structure**

For pentagrid/heptagrid, the plane is organized as:

- A **central cell** surrounded by sectors (5 for pentagrid, 7 for
  heptagrid)
- Each sector is spanned by a **Fibonacci tree**

**Extended Status of Nodes**

Each node in a Fibonacci tree has an "extended status" encoding:

1. Node's own status (black/white)
2. Father's status (black/white)
3. Position among siblings (for white nodes with white fathers)

Extended status labels:

- `Bb`: Black node, black father
- `Bw`: Black node, white father
- `Wwm`: White node, white father, middle son
- `Wwr`: White node, white father, right-hand son
- `Wb`: White node, black father

**Propagation Cellular Automaton (P5, P7)**

A CA that installs the Fibonacci tree structure from a central cell
outward. Works in two stages:

1. Propagation: spreads structure to all cells
2. Conservation: maintains structure once installed

The rules are **rotation invariant** by design.

### 1.2 Hyperbolic Hedlund's Theorem (pp. 19-35)

**Classical Hedlund's Theorem** (Euclidean): A function on
configurations is a CA's global function iff it is continuous and
commutes with shifts.

**In Hyperbolic Spaces**, this does NOT hold directly because:

- Shifts do NOT commute in hyperbolic space
- The group of shifts is not abelian
- Finding the father of a cell does NOT commute with shifts

**Key Result (Theorem 1)**: A CA on grid {p,q} with symmetric
(ball-shaped) neighborhood commutes with shifts **if and only if** it is
**rotation invariant**.

**Definition**: A CA is **rotation invariant** if for any rule and any
circular permutation of neighbors, the permuted rule also exists.

**Generators of Shifts**:

- For pentagrid: 2 generators (shifts along two edges)
- For ternary heptagrid: Uses mid-point lines (not edge lines)
- General {p,q}: At most p generators when q is even, p\*q when q is odd

### 1.2.6 Garden of Eden (pp. 31-35)

**Major difference from Euclidean case!**

In Euclidean plane, Moore-Myhill theorem: GA surjective iff GF_A
injective.

**In hyperbolic plane, this FAILS:**

- **Theorem 6**: There exists:
  - A CA with injective but NOT surjective global function
  - A CA with surjective but NOT injective global function

The proof uses the tree structure:

- Injective non-surjective: `η(x, t+1) = η(father(x), t)` (copies
  father's state to all children)
- Surjective non-injective: XOR with leftmost son

### 1.3 Coordinate Systems (pp. 35-60)

**Standard Fibonacci Trees** are preferred because they:

1. Have the "preferred son property"
2. Maximize black nodes from leftmost position
3. Work well with shortest path algorithms

**Coordinate Representation**

Uses base (3+√5)/2 (square of golden mean) with alphabet {0, 1, 2}.

Forbidden pattern: `21*2` (like 22, 212, 2112, etc.)

**Theorem 7** (Properties of Standard Fibonacci Tree):

- Preferred son property holds
- Continuator of a node is always white
- For white father, continuator is middle son
- Black nodes end in 1 or 2
- Black son of black node ends in 2
- Black son of white (preceded by white) ends in 2
- White nodes end in 0 or 1
- White nodes ending in 1 are rightmost son of white node

**Computing Father's Coordinate (Corollary 3)**: If coordinate is A(m)j,
father is m+h(j) where:

- h(j) = sg(j) when j ∈ {0, 2}
- h(1) = 1 - st(ν), where st(ν) indicates white/black

**Algorithm 1**: Computing A(n+1) from A(n) in linear time.

**Algorithm 2**: Computing path from node to root in linear time.

**Neighbor Tables**:

- Table 5 (pentagrid): 5 neighbors indexed by status
- Table 6 (heptagrid): 7 neighbors, includes ν±1 (same level neighbors)

### 1.3.2 Shortest Paths (pp. 42-60)

**Definition**: Path from A to B is sequence of tiles sharing edges.
Distance = length of shortest path.

**Path Word**: Sequence of exit numbers (2-5) describing the path. Entry
= 1 (previous tile), exits numbered counter-clockwise from entry.

**Key Concepts**:

- **Direct path**: All exits are 3 or 4
- **Straightforward path**: All exits are same (all 3s or all 4s)
- **Diamond configuration**: Used in proofs

**Lemma 8**: If path is direct, it is the UNIQUE shortest path.

**Lemma 9**: For any two shortest paths p, q: apart(p, q) ≤ 1

**Lemma 10**: A shortest path is contained in any standard Fibonacci
tree rooted at A containing B.

**Theorem 9**: The rightmost shortest path = path in Fibonacci tree.

**Theorem 10**: Leftmost shortest path = reverse of rightmost from B to
A.

**Key lemmas for path equivalences**:

- Pattern 55 and 22 cannot occur in shortest path words
- `a5b ≡ as2bs` where as = a+1 (mod 5, wrapping)

**Hook Configuration** (Lemma 14):

- Word `3^n 2` has n+1 equivalent shortest paths
- Rightmost: `3 3^n 2`
- Leftmost: `2 5 4^n`

**Set-Square Configuration** (Lemma 15):

- Word `3^(n+1) 2 3^(m+1)`
- Rightmost: `3 3^(n+1) 2 3^(m+1)`
- Leftmost: `2 5 4^(n-1) 3 4^(m-1) 5`

**Algorithms 3 & 4**: Computing leftmost shortest path from rightmost
path in linear time.

---

## Key Insights for @cluesurf/hive

### 1. Fibonacci Tree Addressing

The Fibonacci tree structure provides an elegant way to address tiles in
{5,4} and {7,3} tilings. Each tile gets a unique coordinate based on its
path from the central cell.

### 2. Standard Fibonacci Trees are Optimal

Use standard Fibonacci trees (preferred son property) for:

- Consistent coordinate representation
- Efficient shortest path computation
- Clean tree structure

### 3. Rotation Invariance is Key

For CA in hyperbolic spaces to behave "correctly" (commute with shifts),
they MUST be rotation invariant.

### 4. Coordinate Arithmetic

Coordinates can be represented in base (3+√5)/2 with alphabet {0,1,2}.
Addition/subtraction of 1 can be computed in linear time with carry
propagation.

### 5. Path Algorithms

Linear-time algorithms exist for:

- Finding path from node to root
- Computing shortest paths
- Converting between leftmost/rightmost shortest paths

### 6. Neighbor Computation

Given a node's coordinate and status, all neighbors can be computed
using simple rules (Tables 5 and 6).

---

## Open Questions / Areas to Explore

1. How to efficiently implement coordinate arithmetic in TypeScript?
2. Can the Fibonacci tree structure be generalized to other {p,q}
   tilings?
3. How to handle the central cell (which has no father)?
4. Performance implications of the linear-time algorithms at scale?

---

## Chapter 1 (continued): Pages 61-80

### 1.3.2 Shortest Paths in Ternary Heptagrid (pp. 61-62)

All results from pentagrid extend to ternary heptagrid with
modifications:

**Numbering differences**:

- Edges numbered 1-7 (not 1-5)
- Edges 2 and 7 of white tile shared with same-level tiles
- Edges 3 and 7 of black tile shared with same-level tiles
- Shortest path exits: 3,4,5,6 (white) or 4,5,6 (black)

**Pattern changes**:

- Patterns 33 and 66 ruled out (instead of 22 and 55)
- Basic relation: `a6b ≡ as3bs` (instead of `a5b ≡ as2bs`)

**Morphism**: Pentagrid to heptagrid via h([2,3,4,5]) = [3,4,5,6]

### 1.3.3 Changing Coordinates: Linear Algorithm (pp. 59-70)

**Problem**: Given O (old center), Ω (new center), T (tile), compute T's
coordinate with respect to Ω knowing coordinates with respect to O.

**Strategy**:

1. Compute shortest path from Ω to T
2. Convert path to coordinate

**Case 1**: If paths to Ω and T cannot be enclosed in same Fibonacci
tree rooted at O, concatenate path Ω→O→T.

**Case 2**: Both in same tree. Use apartness analysis between leftmost
path to Ω and rightmost path to T.

**Theorem 11**: Computing rightmost shortest path from Ω to T is linear
in the lengths of paths from O to Ω and O to T.

**Bounding Coordinates Technique**:

- Maintain lower bound µ and upper bound ν during traversal
- Resetting occurs at black nodes or rightmost sons of white nodes
- Total copying bounded by path length

**Theorem 12**: Computing coordinate of T with respect to Ω from
coordinates of T and Ω with respect to O is **linear time**.

**Corollary 4**: Works for both Fibonacci sequence coords and square of
golden mean coords, in both pentagrid and ternary heptagrid.

### 1.3.4 When T is in Fibonacci Tree Rooted at Ω (pp. 67-70)

Special case: T is in subtree of Ω. Simple string transformation.

**Theorem 13** (Fibonacci coords): If ν is coordinate of node in tree
rooted at α:

```
ν0 = β(1)0^(2⌊|ν|/2⌋+1) + ν
```

where α = β(1)0.

**Theorem 14** (Square of golden mean coords): More complex formula with
cases based on ν position.

### 1.4 Coordinates for Points (not just tiles) (pp. 70-80)

**Motivation**: Extend tile coordinates to arbitrary points in the
plane.

**Construction**:

1. Find tile τ containing point P
2. Divide τ into 7 triangles (from center to edges)
3. Recursively subdivide triangles into 4 sub-triangles
4. Each subdivision gives one digit (0-3) of "fractional part"

**Extended Coordinate**: x = (integer part)(fractional part)

- Integer part: tile coordinate + triangle index (0-6)
- Fractional part: infinite sequence of digits 0-3

**Theorem 15**: Characterizes when points have "equivalent" coordinates
(related by displacement leaving grid invariant).

**Important Note**: Unlike real numbers, distinct extended coordinates
can represent the same point (analogous to 0.999... = 1.000...).

### 1.4.2 Peano Curve in Hyperbolic Plane (pp. 74-80)

**Goal**: Construct a space-filling curve (Peano curve) in hyperbolic
plane.

**Challenge**: No similarity in hyperbolic space, so cannot simply scale
Euclidean constructions.

**Solution**: Two-part construction:

**Part 1: Plane-Filling Path** (visits each tile once)

- Fix central tile T0
- Visit sectors 1-7 level by level
- Alternate direction on even/odd levels
- Path from midpoint of edge 1 to midpoint of edge 4 in T0

**Part 2: Subdividing Tiles**

- Step 0: Segment [AB] between entry/exit midpoints
- Step k+1: Replace each segment with appropriate pattern
- Uses 6 basic patterns (one for each entry/exit pair)
- Subdivide into rings of trapezes
- Dichotomic subdivision of trapezes

This gives a sequence of curves with finer and finer coverage.

---

## Key Implementation Insights (pp. 61-80)

### 1. Coordinate Change is O(n)

The algorithm to change coordinate origin is linear, making it feasible
to support multiple viewpoints/origins efficiently.

### 2. Two Coordinate Systems

Both work equally well:

- Fibonacci sequence: alphabet {0,1}, forbid 11
- Square of golden mean: alphabet {0,1,2}, forbid 21\*2

### 3. Point Coordinates

Can address arbitrary points (not just tile centers) using:

- Tile coordinate (integer part)
- Triangle subdivision (fractional part, base 4)

### 4. Plane-Filling Paths

Level-by-level traversal of Fibonacci trees provides natural ordering of
all tiles. Useful for serialization, iteration, etc.

---

## Chapter 2: Implementation Issues (pp. 81-100)

### 2.1 Localization and Initialization (pp. 81-96)

**Problem**: Given a point P with Euclidean coordinates (x,y) in
Poincare disk, find which tile of the grid contains it.

**Why it's hard in general**: Equality testing of real numbers is
undecidable. Can't algorithmically determine if a point lies on an edge.

**Solution**: Restrict to rational coordinates. Then localization
becomes algorithmic because:

1. Edge circles have algebraic coefficients
2. Rational points NEVER lie exactly on edges (irrational coefficients)
3. Sign tests are always definite (+1 or -1, never 0)

#### Algebraic Structure of Edge Equations

**For pentagrid {5,4}**:

```
ω^4 - 2ω^2 - 4 = 0
```

where ω = 1/√(cos(2π/5))

Roots: ±√(1+√5) and ±i√(√5-1)

**For ternary heptagrid {7,3}**:

```
ω^6 - 3ω^4 - 4ω^2 - 1 = 0
```

Setting Y = ω^2 - 1 gives cubic: Y^3 - 7Y - 7 = 0

**Theorem 1**: All edge circle centers have coordinates in the algebraic
field K = QQ(ω, ζ), where:

- ω satisfies the equations above
- ζ is primitive 5th/7th root of unity
- For heptagrid, also need ϑ = √(ω^2 - 1)

**Theorem 2**: For rational coordinates (x,y) with x^2 + y^2 ≤ r < 1:

- Number of equations to check is **linear** in coordinate size
- Each check is **polynomial** in coordinate size

#### Key Formulas for Circle Inversion

```
zA' = zO + ρ²/(|zA - zO|² - R²) × (zA - zO)
R'² = |zA'|² - 1
```

For Euclidean line reflection through origin:

```
x' = ((b² - a²)x - 2aby)/(a² + b²)
y' = ((a² - b²)y - 2abx)/(a² + b²)
```

### 2.2 Communications Between Cells (pp. 97-100)

Two communication scenarios covered:

1. **Point-to-point**: Two specific cells want to communicate
2. **Broadcast**: All cells communicate with each other

---

_Reading continues with pages 101-120..._
