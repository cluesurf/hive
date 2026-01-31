# Hyperbolic Honeycombs and Fractal Structures

Deep dive into 3D hyperbolic honeycombs, their fractal nature, and
nested structures.

## The Fundamental Confusion

When looking at images of hyperbolic honeycombs in the Poincare ball
model, there's a natural confusion:

> "I see each circle boundary is basically infinity, so I don't get how
> it stays connected."

This confusion arises from our Euclidean intuition. Here's the key insight:

**The boundary sphere is NOT part of the space.** It represents the
"ideal boundary" or "sphere at infinity." Every cell, no matter how
small it looks near the boundary, has the SAME hyperbolic size. The
cells aren't "touching the boundary" - they're infinitely far from the
center.

## Understanding the Poincare Ball Model

```
                    ___________
                 ,-'   . . .   '-.
               ,'   .   .   .   . '.
              /  .   .   .   .   .  \
             |    .     .     .     |
             |  .   [ CENTER ]   .  |  <-- This cell and
             |    .     .     .     |      all those dots
              \  .   .   .   .   .  /      are the SAME SIZE
               '.   .   .   .   . ,'       in hyperbolic metric
                 '-. . . . . . ,-'
                    '---------'
                         ^
                         |
              Ideal boundary (infinity)
              NOT PART OF THE SPACE
```

In the Poincare ball:
- The center looks big, edges look small (distortion)
- Every cell has identical hyperbolic volume
- Distance to boundary = infinity
- The boundary is a "horizon," not a wall

## {7,3,3} Honeycomb Structure

The {7,3,3} honeycomb fills H³ with {7,3} heptagonal tilings:

| Symbol | Meaning |
|--------|---------|
| 7 | Each face is a heptagon (7 sides) |
| 3 | 3 heptagons meet at each edge of a cell |
| 3 | 3 cells meet around each edge of the honeycomb |

### Cell Structure

Each cell is a {7,3} tiling that looks like a "floor" extending to
infinity:

```
               _________
              /   \ 7 /  \
             / 7   \ /  7 \
            /_______X_______\   <-- This is ONE CELL
            \   7  / \  7   /       It's a 2D hyperbolic surface
             \    /   \    /        embedded in 3D
              \  / 7   \  /
               \/___7___\/

    The cell extends infinitely in its own 2D hyperbolic plane
```

### How Cells Meet

Three cells meet at each edge. In 3D hyperbolic space, you can have
three infinite 2D surfaces meeting along a common line, each making
120° angles with the others.

This is IMPOSSIBLE in Euclidean space (three planes meeting along a
line only work at 60°-60°-60° or similar), but in hyperbolic space,
the angles sum to less than 360°, allowing the structure.

## Why It "Stays Connected"

The apparent disconnection is an artifact of the projection. Here's
what's really happening:

### 1. Intrinsic vs Extrinsic View

**Intrinsic** (from inside): Walking along the honeycomb, you never
hit a boundary. Every cell connects to neighbors. You can walk forever.

**Extrinsic** (Poincare ball): Cells near the boundary look
disconnected because they're compressed to dots. But they're fully
connected in the hyperbolic metric.

### 2. The Exponential Explosion

In H³, the number of cells at distance d from origin grows exponentially:

```
d = 1:  ~7 cells
d = 2:  ~50 cells
d = 3:  ~350 cells
d = 4:  ~2,500 cells
d = 5:  ~17,500 cells
...
```

In the Poincare model, ALL of these must fit in a finite ball. That's
why distant cells become invisibly small.

### 3. Connectivity is Preserved

Even though cells look tiny, their adjacency graph is well-defined:

```typescript
interface HoneycombCell {
  id: string
  // Each cell connects to:
  faces: CellFace[] // {7,3} tiling faces
  neighbors: HoneycombCell[] // Adjacent cells through each face
}

// Connectivity doesn't depend on visual size
function areAdjacent(cell1: HoneycombCell, cell2: HoneycombCell): boolean {
  return cell1.neighbors.includes(cell2)
}
```

## Fractal Structures in Hyperbolic Honeycombs

Now for the interesting part: how do fractals emerge?

### 1. Inherent Self-Similarity

Hyperbolic honeycombs are ALREADY fractal in a sense:

- Every region looks like a scaled copy of the whole
- Zooming in reveals the same structure
- The symmetry group acts with self-similar dynamics

```typescript
// The honeycomb looks the same at every scale
function isometricTo(region1: Region, region2: Region): boolean {
  // There exists an isometry mapping region1 to region2
  // that preserves the honeycomb structure
  return findIsometry(region1, region2) !== null
}
```

### 2. Limit Sets

The most natural fractal in a hyperbolic honeycomb is its **limit set**:

```typescript
interface LimitSet {
  // The set of accumulation points on the ideal boundary
  // Created by the action of the symmetry group

  // For {7,3,3}, this is a fractal subset of S² (boundary sphere)
  dimension: number // Hausdorff dimension, typically between 1 and 2

  // Sample points from the limit set
  samplePoints(count: number): SphericalPoint[]
}

class HoneycombLimitSet implements LimitSet {
  constructor(private honeycomb: Honeycomb) {}

  generate(): Set<SphericalPoint> {
    const points = new Set<SphericalPoint>()

    // Apply group elements to a base point
    // Accumulation points on S² form the limit set
    for (const element of this.honeycomb.group.elements()) {
      const image = element.apply(this.basePoint)
      const boundaryPoint = this.projectToBoundary(image)
      points.add(boundaryPoint)
    }

    return points
  }

  // The limit set is where the "visual fractal" lives
  // It's the boundary of the honeycomb in the Poincare model
}
```

### 3. Nested Honeycombs

You can embed smaller honeycombs inside cells:

```typescript
class NestedHoneycomb {
  constructor(
    private outer: Honeycomb,
    private innerFactory: (cell: Cell) => Honeycomb,
  ) {}

  generate(outerDepth: number, innerDepth: number): Geometry {
    const outerCells = this.outer.generate(outerDepth)
    const allGeometry: Geometry[] = []

    for (const cell of outerCells) {
      // Outer cell geometry
      allGeometry.push(cell.geometry)

      // Create nested honeycomb inside this cell
      const inner = this.innerFactory(cell)
      const scaled = this.scaleToFitCell(inner, cell)
      const innerCells = scaled.generate(innerDepth)

      allGeometry.push(...innerCells.map((c) => c.geometry))
    }

    return this.combine(allGeometry)
  }
}

// Example: {7,3,3} with smaller {7,3,3} inside each cell
const fractalHoneycomb = new NestedHoneycomb(
  new Honeycomb(7, 3, 3),
  (cell) => {
    // Create smaller {7,3,3} scaled to fit inside cell
    return new Honeycomb(7, 3, 3).scaledToFit(cell.inradius * 0.5)
  },
)
```

### 4. Apollonian Sphere Packings

3D analog of 2D Apollonian gasket:

```typescript
class HyperbolicApollonian3D {
  // Pack spheres (horospheres) in H³
  // Each sphere tangent to neighbors

  generate(depth: number): Sphere[] {
    const spheres: Sphere[] = []

    // Start with initial configuration (e.g., 5 mutually tangent)
    const initial = this.initialConfiguration()
    spheres.push(...initial)

    // Recursively fill gaps using Descartes theorem in 3D
    this.fillGaps(initial, depth, spheres)

    return spheres
  }

  // In hyperbolic space, horospheres can be tangent at ideal points
  // Creating fractal packings that reach the boundary
}
```

### 5. Cell Subdivision Fractals

Subdivide each cell like a fractal:

```typescript
class SubdividedHoneycomb {
  // Each cell of {7,3,3} contains a {7,3} tiling
  // Subdivide that tiling fractally

  generate(honeycombDepth: number, tilingFractalDepth: number): Geometry {
    const cells = this.honeycomb.generate(honeycombDepth)
    const allGeometry: Geometry[] = []

    for (const cell of cells) {
      // The cell face is a {7,3} hyperbolic tiling
      const tiling = cell.faceTiling

      // Apply fractal to each tile in the tiling
      for (const tile of tiling.tiles) {
        const fractal = new HyperbolicSierpinski(tile.vertices)
        allGeometry.push(fractal.generate(tilingFractalDepth))
      }
    }

    return this.combine(allGeometry)
  }
}
```

## The "Wall Coming Out of Center Heptagon" Idea

Your intuition about the wall is exactly right. Here's how it works:

### 2D → 3D Extrusion

Take a {7,3} tiling (2D). At each heptagon center, extrude perpendicular
to the plane:

```
    2D Tiling (floor)          3D Structure

        _____                     |     |
       /     \                    |_____|
      /   *   \    --extrude-->  /       \
     /_________\                /_________\

    * = center where           "Wall" rises from center
        wall starts            into 3rd dimension
```

### In Hyperbolic Space

The "wall" is another copy of the {7,3} tiling, but rotated 90° into
the third dimension. In the {7,3,3} honeycomb:

- **Floor**: One {7,3} tiling (looking down)
- **Wall**: Another {7,3} tiling (looking sideways)
- **Ceiling**: Third {7,3} tiling (looking up)

They all meet at edges and share the same symmetry.

```typescript
interface HoneycombView {
  // View the {7,3,3} from inside a cell

  floor(): Tiling // {7,3} below
  walls(): Tiling[] // {7,3} tilings on 7 sides
  ceiling(): Tiling // {7,3} above

  // All are the same {7,3} tiling in different orientations
  // Connected through the 3D hyperbolic structure
}
```

### Recursive Version

Now apply recursion: Inside each heptagon of the floor, place a
smaller {7,3,3} honeycomb. Its floor has more heptagons, each with
walls, each containing smaller honeycombs...

```typescript
class FractalHoneycombFloor {
  generate(recursionDepth: number): Geometry {
    if (recursionDepth === 0) {
      return this.singleHeptagon()
    }

    const geometry: Geometry[] = []

    // The floor tiling
    for (const heptagon of this.floorTiling.tiles) {
      // Draw the heptagon
      geometry.push(heptagon.geometry)

      // At center, spawn a wall (smaller {7,3,3})
      const wall = new FractalHoneycombFloor()
        .scaledTo(heptagon.inradius * 0.5)
        .rotatedToVertical()

      geometry.push(wall.generate(recursionDepth - 1))
    }

    return this.combine(geometry)
  }
}
```

## Visualization Strategies

### 1. Depth-Based Coloring

Color cells by their distance from center:

```typescript
function colorByDepth(cell: Cell, maxDepth: number): Color {
  const depth = cell.distanceFromCenter
  const hue = (depth / maxDepth) * 360
  return hslToRgb(hue, 0.8, 0.5)
}
```

### 2. Slice Views

Show 2D slices through the 3D honeycomb:

```typescript
class HoneycombSlicer {
  // Cut the honeycomb with a hyperbolic plane
  slice(honeycomb: Honeycomb, plane: HyperbolicPlane): Tiling {
    const intersections: Polygon[] = []

    for (const cell of honeycomb.cells) {
      const intersection = this.intersectCellWithPlane(cell, plane)
      if (intersection) {
        intersections.push(intersection)
      }
    }

    return new Tiling(intersections)
  }
}
```

### 3. Zoom Animation

Zoom into the honeycomb to reveal fractal structure:

```typescript
class HoneycombZoom {
  animate(time: number): Camera {
    // Move camera toward boundary
    // Reveals more cells, each looking like the original

    const t = time * 0.1
    const position = this.geodesicPath(this.start, this.target, t)

    return { position, lookAt: this.target }
  }
}
```

### 4. Limit Set Visualization

Show just the fractal boundary:

```typescript
class LimitSetRenderer {
  render(limitSet: LimitSet, resolution: number): ImageData {
    // Render the fractal limit set on the boundary sphere
    // Project to screen

    for (const point of limitSet.samplePoints(1000000)) {
      const screenPos = this.projectToScreen(point)
      this.plot(screenPos)
    }
  }
}
```

## Implementation Plan

```typescript
// 1. Basic {7,3,3} honeycomb
const honeycomb = new Honeycomb(7, 3, 3, new Hyperbolic3D())
const cells = honeycomb.generate(depth: 5)

// 2. Nested fractal version
const fractal = new NestedHoneycomb(honeycomb, nestingRule)
const fractalCells = fractal.generate(outerDepth: 3, innerDepth: 2)

// 3. With Sierpinski in each cell face
const sierpinskiHoneycomb = new SubdividedHoneycomb(
  honeycomb,
  (tile) => new HyperbolicSierpinski(tile),
)

// 4. Limit set visualization
const limitSet = new HoneycombLimitSet(honeycomb)
const fractalBoundary = limitSet.render()

// 5. Combined scene
const scene = new HyperbolicScene()
scene.add(honeycomb)
scene.add(fractalOverlay)
scene.add(limitSetBackground)
```

## Key Mathematical References

- **Coxeter groups**: The symmetry groups of regular honeycombs
- **Kleinian groups**: Discrete subgroups of PSL(2,C), their limit sets
  are fractals
- **Hyperbolic geometry**: Thurston's work on 3-manifolds
- **Margenstern's work**: Cellular automata in hyperbolic tilings

## Questions This Addresses

1. **How does it stay connected?** - Connectivity is in the hyperbolic
   metric, not the visual model. Cells are adjacent in the group
   structure.

2. **What's inside each cell?** - A {7,3} hyperbolic tiling (infinite
   2D surface). In the model, it looks like a disk.

3. **Where are the fractals?** - In the limit set (boundary), in
   nested structures, in subdivided cells, and in the inherent
   self-similarity of the honeycomb itself.

4. **How do walls work?** - Each heptagon in a cell's boundary is
   shared with an adjacent cell. "Walls" are just the edges of cells,
   which are themselves 2D hyperbolic surfaces.

## Directory Structure

```
code/
├── honeycomb/
│   ├── index.ts
│   ├── honeycomb.ts          # Base honeycomb generation
│   ├── cell.ts               # Cell structure
│   ├── group.ts              # Coxeter group operations
│   ├── nested.ts             # Nested/fractal honeycombs
│   ├── limit-set.ts          # Limit set computation
│   ├── slicer.ts             # 2D slices through 3D
│   └── visualize/
│       ├── poincare-ball.ts
│       ├── depth-coloring.ts
│       └── zoom-animation.ts
```
