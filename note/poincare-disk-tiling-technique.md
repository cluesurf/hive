# Poincaré Disk Tiling Technique

Notes from https://www.malinc.se/noneuclidean/en/poincaretiling.php

## Key Insight: Work Directly in the Poincaré Disk

The technique described works **entirely in the Poincaré disk** using
circle inversions (Möbius transformations), rather than going through
the hyperboloid model. This avoids coordinate explosion at large
distances.

## Polygon Size Formula

The Euclidean distance `d` from the origin to vertices of a regular
{p,q} hyperbolic polygon:

```
d = sqrt((tan(π/2 - π/q) - tan(π/p)) / (tan(π/2 - π/q) + tan(π/p)))
```

Simplified using `cot(x) = tan(π/2 - x)`:

```
d = sqrt((cot(π/q) - tan(π/p)) / (cot(π/q) + tan(π/p)))
```

This gives the **Euclidean radius** in the Poincaré disk directly, no
hyperboloid conversion needed.

## Reflection via Circle Inversion

In the Poincaré disk, hyperbolic lines are either:

1. Diameters of the disk (lines through center)
2. Circular arcs perpendicular to the boundary

Reflection across a hyperbolic line is done via **circle inversion**:

For a circle with center C and radius r, the inversion of point P is:

```
P' = C + r² * (P - C) / |P - C|²
```

For a line through the origin (diameter), reflection is standard
Euclidean reflection.

## Tile Generation Strategy

1. **Create origin polygon**: Place first polygon at disk center with
   vertices at distance `d` from origin, evenly spaced at angles `2πi/p`

2. **Reflect across edges**: Each edge is a hyperbolic line (circular
   arc). Invert the polygon's vertices through the circle containing
   that arc.

3. **Recursive expansion**: Reflect new polygons across their "free"
   edges (edges not shared with already-generated tiles)

## Advantages Over Hyperboloid Approach

| Aspect      | Hyperboloid                      | Poincaré Disk Direct              |
| ----------- | -------------------------------- | --------------------------------- |
| Coordinates | Grow exponentially with distance | Always bounded in [-1, 1]         |
| Reflections | 3×3 Lorentz matrix multiply      | Circle inversion (simple formula) |
| Precision   | Degrades at large distances      | Uniform across entire disk        |
| Storage     | 3 coordinates (x, y, t)          | 2 coordinates (x, y)              |

## Implementation Approach

### Step 1: Compute Edge Circles

For an edge from vertex A to vertex B (both in Poincaré disk coords),
the hyperbolic line is an arc of a circle perpendicular to the unit
boundary.

The circle containing this arc has:

- Center on the line through origin perpendicular to AB
- Radius such that the circle is orthogonal to the unit circle

For edge from A to B:

```
// Midpoint
M = (A + B) / 2

// The geodesic circle passes through A and B and is orthogonal to unit circle
// For points on unit disk, the circle center lies outside the disk

// Using the formula for circle through two points orthogonal to unit circle:
// Center is at distance 1/|M| from origin in direction of M (scaled)
// Actually: use the perpendicular bisector intersection with the
// "orthogonal circle" constraint
```

### Step 2: Invert Through Edge Circle

```typescript
function invertPoint(
  p: [number, number],
  circle: Circle,
): [number, number] {
  const dx = p[0] - circle.cx
  const dy = p[1] - circle.cy
  const distSq = dx * dx + dy * dy
  const scale = (circle.r * circle.r) / distSq
  return [circle.cx + dx * scale, circle.cy + dy * scale]
}
```

### Step 3: Generate Tiles

```typescript
function generateTiles(p: number, q: number, maxDepth: number) {
  const d = computeVertexRadius(p, q)
  const origin = createPolygon(p, d)

  const tiles = [origin]
  const queue = [{ tile: origin, depth: 0 }]

  while (queue.length > 0) {
    const { tile, depth } = queue.shift()
    if (depth >= maxDepth) continue

    for (const edge of tile.edges) {
      if (edge.hasNeighbor) continue

      const neighbor = reflectPolygon(tile, edge)
      tiles.push(neighbor)
      linkEdges(tile, edge, neighbor)
      queue.push({ tile: neighbor, depth: depth + 1 })
    }
  }

  return tiles
}
```

## Validity Constraint

For a hyperbolic tiling {p, q} to exist:

```
(p - 2)(q - 2) > 4
```

- `= 4`: Euclidean (only {4,4}, {3,6}, {6,3})
- `< 4`: Spherical (Platonic solids)
- `> 4`: Hyperbolic (infinite tilings)

## Comparison to Our Current Implementation

### Current (Hyperboloid)

- Store vertices as (x, y, t) on hyperboloid
- Reflect using Lorentz matrices
- Convert to Poincaré disk for display
- **Problem**: Coordinates explode, precision lost

### Proposed (Poincaré Disk Direct)

- Store vertices as (x, y) in Poincaré disk
- Reflect using circle inversion
- No conversion needed for display
- **Advantage**: Coordinates always bounded, uniform precision

## Migration Path

1. Change tile vertex storage from `Point` (hyperboloid) to
   `[number, number]` (Poincaré disk)

2. Implement circle inversion for reflections

3. Compute edge circles (geodesics) from vertex pairs

4. Keep SU(1,1) navigation (already works in Poincaré disk)

5. Remove hyperboloid ↔ Poincaré conversions from hot paths

## Circle Inversion Formula Details

For a circle with center (cx, cy) and radius r, inverting point (px,
py):

```typescript
function invert(
  px: number,
  py: number,
  cx: number,
  cy: number,
  r: number,
): [number, number] {
  const dx = px - cx
  const dy = py - cy
  const d2 = dx * dx + dy * dy
  const k = (r * r) / d2
  return [cx + dx * k, cy + dy * k]
}
```

For a line through origin (special case), use standard reflection:

```typescript
function reflectThroughLine(
  px: number,
  py: number,
  nx: number,
  ny: number, // unit normal to line
): [number, number] {
  const dot = px * nx + py * ny
  return [px - 2 * dot * nx, py - 2 * dot * ny]
}
```

## Finding the Geodesic Circle

Given two points A and B in the Poincaré disk, the geodesic (hyperbolic
line) through them is an arc of a circle orthogonal to the unit
boundary.

The center of this circle lies on the perpendicular bisector of AB, at a
point such that the circle is orthogonal to the unit circle.

For orthogonality to unit circle: if center is at distance D from
origin, and circle has radius R, then: `D² = 1 + R²`

Combined with the constraint that A lies on the circle:
`|A - center|² = R²`

This gives a system that can be solved for the center.

**Special case**: If A and B are collinear with origin, the geodesic is
a diameter (straight line through origin).
