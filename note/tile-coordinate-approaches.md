# Tile Coordinate Approaches

This document compares different approaches to representing tiles in
hyperbolic tessellations, their trade-offs, and our implementation
choices.

## The Problem: Coordinate Explosion

In hyperbolic geometry, coordinates grow exponentially with distance
from origin. For the hyperboloid model:

```
Point at hyperbolic distance d from origin:
- Hyperboloid: (x, y, t) where t ≈ cosh(d) ≈ e^d/2
- At d=10: t ≈ 11,013
- At d=20: t ≈ 242,582,598
```

Float64 has ~15 significant digits. After d≈35, precision is essentially
gone.

## Approach 1: Hyperboloid with Lorentz Matrices (Original)

**How it works:**

- Store tile vertices as `[x, y, t]` on hyperboloid
- Use Lorentz reflection matrices for tile generation
- Accumulate transforms as tiles are generated

**Problems:**

1. Coordinates explode exponentially with distance
2. Reflections accumulate floating-point errors
3. Normalization can't recover from large errors
4. After 5-10 scrolls, tiles become distorted

**File:** (deprecated - removed)

## Approach 2: SU(1,1) / Möbius Navigation (Improvement)

**How it works:**

- Store view transform as SU(1,1) parameters `[a_re, a_im, b_re, b_im]`
- Constraint: `|a|² - |b|² = 1` (easy to maintain)
- Apply Möbius transform at render time: `f(z) = (az + b)/(b̄z + ā)`

**Advantages:**

- Single scalar constraint (vs 6 for Lorentz matrices)
- All intermediate values bounded in [-1, 1]
- Easy renormalization

**Remaining problem:**

- Tiles are still stored in hyperboloid coords
- Tile generation still explodes

**Files:**

- `code/interaction/hyperbolic2d.ts` - SU(1,1) implementation
- `note/hyperbolic-navigation-implementation.md` - Details

## Approach 3: Poincaré Disk Direct (Circle Inversion)

**How it works:**

- Store vertices in Poincaré disk coords `[u, v]`
- Use circle inversion for reflections (not Lorentz matrices)
- All coordinates bounded in [-1, 1]

**Formula for vertex distance:**

```
d = sqrt((cot(π/q) - tan(π/p)) / (cot(π/q) + tan(π/p)))
```

**Reflection via circle inversion:**

```
P' = C + r² * (P - C) / |P - C|²
```

**Advantages:**

- Coordinates always bounded
- Uniform precision across entire disk

**File:** `note/poincare-disk-tiling-technique.md`

## Approach 4: Address-Based / Discrete Coordinates (HyperRogue)

**How it works:**

- Tiles identified by discrete addresses (group words, integers)
- Neighbor relationships computed via group algebra
- NO floating-point coordinates stored with tiles
- Geometry computed on-demand at render time

**Example tile ID:** `"a2b1a-1"` (group word in Von Dyck group)

**Key insight from HyperRogue:**

```cpp
// Cells have explicit neighbor pointers, no stored coordinates
cell* c->move(direction) // returns neighbor cell
transmatrix relative_matrix(c1, c2) // computed on demand
```

**Advantages:**

1. Tile IDs are exact (no precision loss)
2. Neighbor relations are combinatorial (exact)
3. Geometry computed fresh each frame (no accumulation)
4. Works for infinite distances

**Files:**

- `code/coordinates/hyperbolic/von-dyck.ts` - Group word coordinates
- `code/tessellation/hyperbolic2d.ts` - Main implementation
- `base/hyperrogue-master/` - Reference implementation

## Our Implementation Strategy

### Current State (January 2026)

We now use address-based tessellation exclusively (`Hyperbolic2DTessellation`):

1. **Navigation:** SU(1,1) Möbius transforms (bounded coordinates)
2. **Tile storage:** Group word addresses (discrete, exact)
3. **Geometry:** Computed on-demand at render time (no accumulation)

### Key Features

| Aspect    | Hyperbolic2DTessellation        |
| --------- | ------------------------------- |
| Tile ID   | Group word string (e.g. "a2b1") |
| Vertices  | Computed on demand              |
| Neighbors | Via Von Dyck group algebra      |
| Precision | Uniform (no degradation)        |
| Model     | Poincaré disk (bounded [-1,1])  |

## Bug Fixes Applied

### Hyperboloid Geometry Bugs (January 2026)

1. **Normalization:** Was using `Math.abs()` incorrectly
2. **Geodesic normal:** Wrong cross product signs
3. **Reflection matrix:** 4 sign errors in matrix entries

These were compensating bugs that partially canceled each other.

See: `note/hyperbolic-navigation-implementation.md` for details.

## References

- HyperRogue source: `base/hyperrogue-master/`
- Poincaré disk technique: `note/poincare-disk-tiling-technique.md`
- SU(1,1) implementation: `note/hyperbolic-navigation-implementation.md`
- Von Dyck groups: `code/coordinates/hyperbolic/von-dyck.ts`
