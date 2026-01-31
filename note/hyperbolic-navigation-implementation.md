# Hyperbolic Navigation Implementation

This document describes the implementation of navigation through
hyperbolic space in the tessellation viewer.

## Architecture Overview

We use a hybrid approach that combines the strengths of different
hyperbolic models:

| Component    | Model            | Reason                         |
| ------------ | ---------------- | ------------------------------ |
| Tile storage | Hyperboloid      | Exact geometry via reflections |
| Navigation   | SU(1,1) / Möbius | Numerical stability            |
| Display      | Poincaré disk    | Natural bounded representation |

## The Problem

Hyperbolic navigation requires applying isometries (distance-preserving
transformations) to the view. Two natural approaches exist:

### Approach 1: Lorentz Boosts (Hyperboloid)

Represent isometries as 3×3 Lorentz matrices in Minkowski space:

```
M ∈ SO⁺(2,1)  where  Mᵀ J M = J,  J = diag(1, 1, -1)
```

**Problem**: After many compositions, floating-point errors accumulate.
The matrix drifts from SO⁺(2,1), points drift off the hyperboloid,
normalization causes geometry "snaps" and spikes.

### Approach 2: SU(1,1) / Möbius (Poincaré Disk)

Represent isometries as Möbius transformations on the Poincaré disk:

```
f(z) = (a·z + b) / (conj(b)·z + conj(a))

where |a|² - |b|² = 1
```

**Advantage**: Only one scalar constraint to maintain. Renormalization
is simple and stable.

## Our Implementation: SU(1,1)

We store the navigation state as SU(1,1) parameters `(a, b)` where:

- `a` and `b` are complex numbers
- Constraint: `|a|² - |b|² = 1`

### Storage Format

For compatibility with the existing Matrix type (9-element array):

```typescript
;[a_re, a_im, b_re, b_im, 0, 0, 0, 0, 1]
```

### Key Operations

**Identity Transform**:

```
a = 1, b = 0
```

**Translation by w** (where w is a disk vector with |w| < 1):

```
a = 1 / sqrt(1 - |w|²)
b = w / sqrt(1 - |w|²)
```

**Composition** (SU(1,1) matrix multiplication):

```
a = a₁·a₂ + b₁·conj(b₂)
b = a₁·b₂ + b₁·conj(a₂)
```

After composition, renormalize:

```
s = sqrt(|a|² - |b|²)
a /= s
b /= s
```

**View Center** (world point that appears at screen center):

```
z_center = -b / a
```

**Apply to Point**:

```
z' = (a·z + b) / (conj(b)·z + conj(a))
```

## Rendering Pipeline

At render time for each tile vertex:

1. **Hyperboloid → Poincaré disk**:

   ```
   z = (x + iy) / (1 + t)
   ```

2. **Apply SU(1,1) transform**:

   ```
   z' = (a·z + b) / (conj(b)·z + conj(a))
   ```

3. **Poincaré disk → Screen coordinates**:
   ```
   screen_x = center_x + z'.re * radius
   screen_y = center_y - z'.im * radius
   ```

## Tile Generation

The tile manager needs to know which region of hyperbolic space is
visible to generate appropriate tiles.

1. Compute view center from SU(1,1) state:

   ```
   z_center = -b / a  (in Poincaré disk)
   ```

2. Convert to hyperboloid:

   ```
   r² = |z_center|²
   x = 2·Re(z_center) / (1 - r²)
   y = 2·Im(z_center) / (1 - r²)
   t = (1 + r²) / (1 - r²)
   ```

3. Generate tiles around this hyperboloid point using reflection-based
   expansion (BFS from nearest tile).

## Coordinate Conversions

### Hyperboloid → Poincaré Disk

```
u = x / (1 + t)
v = y / (1 + t)
```

### Poincaré Disk → Hyperboloid

```
r² = u² + v²
x = 2u / (1 - r²)
y = 2v / (1 - r²)
t = (1 + r²) / (1 - r²)
```

## Drag Handling

When the user drags from screen position A to B:

1. Convert to Poincaré disk coordinates:

   ```
   from = screenToDisk(A)
   to = screenToDisk(B)
   ```

2. Compute displacement:

   ```
   w = (to - from) * sensitivity
   ```

3. Clamp magnitude (small steps are more stable):

   ```
   if |w| > 0.2: w = 0.2 * w / |w|
   ```

4. Build SU(1,1) translation:

   ```
   factor = 1 / sqrt(1 - |w|²)
   a_drag = factor
   b_drag = w * factor
   ```

5. Compose with current transform:

   ```
   (a, b) = compose((a_drag, b_drag), (a, b))
   ```

6. Renormalize:
   ```
   s = sqrt(|a|² - |b|²)
   a /= s, b /= s
   ```

## Why This Works

The SU(1,1) approach is numerically stable because:

1. **Single constraint**: Only need to maintain `|a|² - |b|² = 1` (one
   scalar condition), versus the full Lorentz constraint `Mᵀ J M = J` (6
   independent conditions in 3×3).

2. **Easy renormalization**: After any operation, just divide by
   `sqrt(|a|² - |b|²)`.

3. **Bounded domain**: The Poincaré disk is the unit disk, so all
   intermediate values are bounded. No risk of overflow.

4. **No cumulative vertex mutation**: We never modify stored tile
   vertices. The transform is applied at render time only.

## Files

| File                                   | Purpose                            |
| -------------------------------------- | ---------------------------------- |
| `code/interaction/hyperbolic2d.ts`     | SU(1,1) transform implementation   |
| `code/interaction/controller.ts`       | Drag handling and state management |
| `code/tessellation/dynamic/manager.ts` | Tile generation with view center   |
| `code/math/projection.ts`              | Coordinate conversions             |
| `code/rendering/canvas2d.ts`           | Render pipeline                    |

## Bug Fixes (January 2026)

### Issue: Tile distortion when scrolling far from origin

After 5-10 scroll operations, tiles would become visibly distorted with
gaps appearing at edges. Investigation revealed two critical bugs in the
hyperboloid geometry implementation:

### Fix 1: Normalization formula

**Problem**: The `normalize()` function used `Math.abs()` on the
Minkowski norm:

```typescript
// WRONG:
const scale = 1 / Math.sqrt(Math.abs(dot))
```

Using `abs()` hides the fact that points have drifted off the
hyperboloid. For valid points, `m = t² - x² - y²` should always be +1.

**Solution**: Check that `m > 0` before rescaling. If `m <= 0`, use a
safe fallback that recomputes `t` from `x` and `y`:

```typescript
const m = pt * pt - px * px - py * py
if (m > 1e-10) {
  const scale = 1 / Math.sqrt(m)
  // rescale...
} else {
  // Fallback: keep x, y and recompute t
  const newT = Math.sqrt(1 + px * px + py * py)
  return [px, py, newT]
}
```

### Fix 2: Geodesic normal (Minkowski cross product)

**Problem**: The `geodesicThrough()` function computed the wrong "cross
product" for Minkowski space:

```typescript
// WRONG:
const x = ay * bt - at * by
const y = at * bx - ax * bt
const z = ax * by - ay * bx
```

For the normal `n` to be Minkowski-orthogonal to both `A` and `B`:

- `⟨n, A⟩_M = n.x*A.x + n.y*A.y - n.t*A.t = 0`
- `⟨n, B⟩_M = n.x*B.x + n.y*B.y - n.t*B.t = 0`

This requires the Euclidean cross product of `(A.x, A.y, -A.t)` and
`(B.x, B.y, -B.t)`.

**Solution**: Correct the signs:

```typescript
// CORRECT:
const x = at * by - ay * bt
const y = ax * bt - at * bx
const z = ax * by - ay * bx
```

### Fix 3: Reflection matrix sign errors

**Problem**: The `reflection()` function had wrong signs in 4 matrix
entries. The code swapped signs between `R(e_x).t`, `R(e_y).t` and
`R(e_t).x`, `R(e_t).y`:

```typescript
// WRONG:
out[2] = (-2 * x * t) / dot  // should be +
out[5] = (-2 * y * t) / dot  // should be +
out[6] = (2 * x * t) / dot   // should be -
out[7] = (2 * y * t) / dot   // should be -
```

**Solution**: Fix the signs:

```typescript
// CORRECT:
out[2] = (2 * x * t) / dot   // R(e_t).x
out[5] = (2 * y * t) / dot   // R(e_t).y
out[6] = (-2 * x * t) / dot  // R(e_x).t
out[7] = (-2 * y * t) / dot  // R(e_y).t
```

### Why these bugs caused the observed symptoms

The original code had **compensating bugs**: the wrong geodesic normal
and the wrong reflection matrix partially canceled each other out,
producing tiles that looked OK at the origin but accumulated errors.

When only the geodesic normal was fixed, the reflection matrix bug was
exposed and tiles became completely broken. Both bugs needed to be fixed
together for correct behavior.

## References

- Hyperbolic geometry and the Poincaré disk model
- SU(1,1) as the isometry group of the hyperbolic plane
- Möbius transformations and their properties
