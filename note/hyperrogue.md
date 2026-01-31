# HyperRogue Architecture Analysis

HyperRogue is a roguelike game set in hyperbolic space with 10+ years of
development. It represents the most mature open-source implementation of
hyperbolic geometry for interactive applications.

- **Source:** https://github.com/zenorogue/hyperrogue
- **Developer docs:** https://roguetemple.com/z/hyper/dev.php
- **Models explained:** https://roguetemple.com/z/hyper/models.php

## Core Philosophy

From the official docs:

> "The Minkowski hyperboloid model makes hyperbolic geometry obvious!"

> "I recommend using the Minkowski hyperboloid model internally, and the
> Poincaré disk model for display, just as HyperRogue does."

This validates our architectural decision.

## Mathematical Framework

### Internal Representation: Minkowski Hyperboloid

The hyperbolic plane is represented as:

```
{(x, y, t) : t² - x² - y² = 1, t > 0}
```

This is analogous to how a unit sphere represents spherical geometry:

```
{(x, y, z) : x² + y² + z² = 1}
```

**Why this works:** The Minkowski inner product `tt' - xx' - yy'`
replaces the Euclidean inner product. Lorentz transformations serve as
the hyperbolic analog of rotations.

### Key Formula Transformations

When converting Euclidean formulas to hyperbolic:

- Trigonometric functions (sin, cos) become hyperbolic functions (sinh,
  cosh) when arguments represent distance
- Translation by distance α:
  `(cosh(α)·x + sinh(α)·t, y, cosh(α)·t + sinh(α)·x)`
- Isometries preserve the Minkowski inner product

### Data Structures

**hyperpoint**: 3D or 4D homogeneous coordinates

```cpp
struct hyperpoint : array<ld, MAXMDIM> {
  // Hyperbolic: x² + y² - z² = -1, z > 0
  // Spherical: x² + y² + z² = 1
  // Euclidean: z = 1
}
```

**transmatrix**: 3x3 or 4x4 transformation matrices representing
rotations and translations (isometries).

**cell**: Discrete map element with adjacency list.

**walker**: Entity at a cell facing a direction (with optional mirroring
for non-orientable manifolds).

## Two-Level Tiling System

### Discrete Level: Cells and Heptagons

**Heptagon layer**: Coarse-grained dual graph

- Default: {7,3} tiling (7-sided polygons, 3 meeting at each vertex)
- Uses a state automaton for unique generation
- States: `hsOrigin`, `hsA`, `hsB` control valid expansion

**Cell layer**: Fine-grained game cells

- Created by bitruncation of heptagon graph
- Types: standard, bitruncated, Goldberg, irregular, etc.
- `cell::master` points to parent heptagon

### Adjacency Function

`adj(c, i)` returns the isometry mapping the i-th neighbor's internal
coordinates to the cell's coordinate system:

```
adj(c, i) = rotation(i) * shift * rotation(neighbor_edge)
```

This is computed via matrix multiplication.

## Infinite World: Lazy Generation

> "It is impossible to store the whole HyperRogue map in memory. It
> contains over 10^7000 cells."

**Solution: On-demand generation**

1. Cells receive unique paths forming tree structures
2. Each heptagon identified by sequence of turns from origin
3. When neighbors requested, check existence, create if needed
4. The heptagonal grid uses simple rules for path calculation

**mpdist tracking:**

- 0 = player visited
- 1+ = adjacent cells at increasing distances
- Visible cells (mpdist <= 7) receive full generation
- Partial generation extends to radius 9-10

## Rendering Pipeline

### Projection System

The Poincare disk derives from projecting the hyperboloid from point (0,
0, -1). Different projection points yield different models:

| Projection Point | Model             |
| ---------------- | ----------------- |
| z = -1           | Inverted Poincare |
| z = 0            | Beltrami-Klein    |
| z = 1            | Poincare disk     |
| z = infinity     | Gans (orthogonal) |

### Camera System

- Cell `c0` under camera position
- Matrix `V` mapping internal coordinates to screen coordinates
- Recursive `adj` application renders nearby cells
- View optimization moves `c0` when camera transitions

### Continuous Movement

Objects store:

1. Discrete cell location
2. Transformation matrix `at` for local coordinates
3. Two-layer relative positioning for precision

## Supported Models (20+)

From https://roguetemple.com/z/hyper/models.php:

### Conformal Models (preserve angles)

- Poincare disk (default)
- Half-plane
- Band (hyperbolic Mercator)
- Spiral
- Joukowsky transform

### Non-conformal Models

- Beltrami-Klein (straight geodesics)
- Gans (orthogonal projection)

### Cartographic Projections

- Azimuthal: equidistant, equal-area
- Cylindrical: equidistant, equal-area, central
- Pseudocylindrical: sinusoidal, Mollweide, Collignon
- Two-point equidistant

### 3D Representations

- Hyperboloid (native 3D embedding)
- Tractricoid (pseudosphere)
- Dini's surface
- Hypersian Rug (random-fold simulation)
- Poincare Ball (3D analog)

## Multi-Geometry Support

All geometries use the same abstract geometric routines:

**2D Geometries:**

- Hyperbolic: {7,3}, {8,3}, {5,4}, etc.
- Spherical
- Euclidean

**3D Geometries:**

- Honeycombs: {5,3,4}, {4,3,5}, {5,3,5}
- Non-isotropic: Solv, Nil

**Special:**

- Product geometries: H² x E, S² x E
- Quotient spaces: torus, Klein bottle
- Aperiodic: Hat tiling

## Key Implementation Files

| Component     | Files                                      |
| ------------- | ------------------------------------------ |
| Core geometry | `hyperpoint.cpp`, `geometry.cpp`           |
| Discrete map  | `heptagon.cpp`, `cell.cpp`, `location.cpp` |
| Adjacency     | `geometry2.cpp` (adj function)             |
| Rendering     | `hypgraph.cpp`, `drawing.cpp`              |
| Shaders       | `shaders.cpp`, `glhr.cpp`                  |
| 3D geometries | `reg3.cpp`, `nonisotropic.cpp`             |
| Projections   | `models.cpp`                               |

## Lessons for Our Architecture

### Validated Decisions

1. **Hyperboloid model internally** - HyperRogue explicitly recommends
   this approach

2. **Matrix-based isometries** - 3x3/4x4 matrices for all transforms

3. **Lazy generation** - Essential for infinite worlds

4. **Unified geometry framework** - Same code handles hyperbolic,
   spherical, Euclidean

### New Insights

1. **Two-level tiling structure** - Coarse heptagons + fine cells is
   elegant for non-regular tilings

2. **State automaton for generation** - Ensures unique canonical paths

3. **Walker abstraction** - Clean interface for entity positioning

4. **adj() function** - Central to the architecture, computes local
   coordinate transforms

5. **mpdist tracking** - Progressive detail based on distance from
   camera

### What We Can Learn

- The heptagon/cell split enables bitruncation and other tiling variants
- State machines ensure consistent infinite world generation
- Multiple projection models can share the same internal representation
- 3D hyperbolic works with the same principles (4D hyperboloid)

## Code Scale

- 180+ source files
- 218,000+ lines of code
- 10+ years of development
- Supports 40+ different geometries

HyperRogue represents the gold standard for hyperbolic geometry
implementations in games/interactive applications.
