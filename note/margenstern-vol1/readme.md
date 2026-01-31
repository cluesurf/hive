# Margenstern Volume 1 Notes

Notes from "Cellular Automata in Hyperbolic Spaces Volume 1" by Maurice
Margenstern.

Volume 1 focuses on **theoretical foundations** while Volume 2 covers
**implementation and computations**.

## Files

### Chapter 1: Hyperbolic Geometry

| File                          | Topic                            |
| ----------------------------- | -------------------------------- |
| chapter1-axioms.md            | Hilbert's axioms, constructions  |
| chapter1-motions.md           | Isometries, rotations, shifts    |
| chapter1-poincare-model.md    | Poincaré disc model              |
| chapter1-distance-formulas.md | Distance, angle of parallelism   |
| chapter1-higher-dimensions.md | IH³, horospheres, models         |

### Implementation

| File                                   | Topic                              |
| -------------------------------------- | ---------------------------------- |
| implementation-insights.md             | Key insights for {p,q} engine      |
| railway-model.md                       | Railway model for universality     |
| ca-simulator-blueprint.md              | Full CA simulator architecture     |
| quantum-error-correction-connection.md | AdS/CFT, HaPPY codes, QEC link     |

## Reading Progress

### Completed

- [x] Pages 1-20: Title, TOC, Introduction
- [x] Pages 21-50: Chapter 1 (Axioms, Constructions, Areas)
- [x] Pages 51-70: Chapter 1 (Motions, Ends, Poincaré Model)
- [x] Pages 71-90: Chapter 1 (Distance, Trigonometry, Higher Dimensions)

### Remaining

- [ ] Pages 91-110: Chapter 1 (continued), Chapter 2 begins
- [ ] Chapter 2: Cellular Automata
- [ ] Chapter 3: Construction of Tilings
- [ ] Chapter 4: Splitting and Spanning Trees (key chapter)
- [ ] Chapter 5: Special Tilings

## Key Chapters for Implementation

### Chapter 1: Hyperbolic Geometry

Provides the axiomatic foundation:

- Hilbert's five axiom groups (I-V)
- Parallelism and angle of parallelism Π(d)
- Classification of motions (rotations, shifts, ideal rotations)
- Horocycles and equidistant curves
- Poincaré disc model
- Distance formulas and hyperbolic trigonometry
- Higher dimensional spaces (IH³)

### Chapter 4: Splitting and Spanning Trees

The core playbook for turning hyperbolic tilings into traversable data
structures.

Key concepts:

- Spanning tree construction from tile splitting
- Language of the splitting (coordinates as regular language words)
- Preferred son property
- General {p,q} support

### Highlighted Tiling Families

| Family  | Examples | Notes                   |
| ------- | -------- | ----------------------- |
| {p,3}   | {7,3}    | Ternary heptagrid       |
| {p,4}   | {5,4}    | Pentagrid               |
| {p+2,3} | Various  | Related to {p,4} family |

These families have particularly clean tree models and neighbor rules.

## Key Theorems

| Theorem | Statement                                           |
| ------- | --------------------------------------------------- |
| 15      | Sum of angles in hyperbolic triangle < π            |
| 17      | AAA congruence (unique to hyperbolic geometry)      |
| 19      | Distance behavior for parallel vs non-secant lines  |
| 30      | Three points lie on circle, horocycle, or equidist  |
| 31      | Motion exists between any congruent segments        |
| 33      | Hyperbolic distance formula                         |
| 34      | Angle of parallelism Π(d) = 2 arctan(e^(-d))        |
| 35      | Hyperbolic trigonometry for rectangular triangles   |

## Key Formulas

### Distance

```
d_h(A, B) = 2 arctanh|(z_A - z_B)/(1 - z̄_B·z_A)|
```

### Angle of Parallelism

```
Π(d) = 2 arctan(e^(-d))
```

### Circle Measurements

```
Circumference = 2π sinh(r)
Area = 4π sinh²(r/2)
```

### Rectangular Triangle (Lobachevsky)

```
cosh(a) = cosh(b)·cosh(c)
sinh(b) = sinh(a)·sin(β)
cos(β) = cosh(b)·sin(γ)
```

## Applications Beyond Tilings

### Quantum Error Correction

Hyperbolic tilings connect to:

- AdS/CFT correspondence (bulk-to-boundary encoding)
- HaPPY holographic codes (perfect tensors on tiles)
- Ryu-Takayanagi formula (entanglement = minimal cut)
- Hyperbolic surface codes (LDPC-like, constant rate)

See `quantum-error-correction-connection.md` for details.

## Relationship to Volume 2

Volume 1 provides the theoretical foundation:

- Axiomatic geometry
- Tree construction theory
- Coordinate language definition
- Neighbor rule derivation

Volume 2 provides implementation details:

- Concrete algorithms
- Complexity analysis
- Practical applications

## Cross-References

See also:

- `../margenstern-vol2/` - Volume 2 implementation notes
- `../margenstern-vol2/generalized-pq-engine.md` - Unified engine design
