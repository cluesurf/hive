# Source Repository Analysis

## Summary Table

| Repository               | Language        | Purpose                       | Key Value                         |
| ------------------------ | --------------- | ----------------------------- | --------------------------------- |
| **hyperrogue-master**    | **C++**         | **Hyperbolic roguelike game** | **Gold standard, 218K lines**     |
| MagicTile-master         | C#              | 2D hyperbolic puzzles         | Complete reflection-based tiling  |
| Honeycombs-master        | C#              | 3D hyperbolic honeycombs      | R3.Core library, 3D generation    |
| ht.js-make               | TypeScript      | Port of MagicTile/Honeycombs  | Best TypeScript starting point    |
| hyperbolic-tiling-main   | TypeScript/GLSL | GPU-based rendering           | Shader approach, Wythoff          |
| hyperbolic-ca-simulator  | CoffeeScript    | Cellular automata             | von Dyck groups, infinite tilings |
| hyperboloid-model-master | JavaScript      | Hyperboloid math              | Clean internal representation     |
| hyperbolic-canvas-master | JavaScript      | Demo app                      | Integration example               |
| newconformist-master     | C++             | Conformal shape mapping       | Arbitrary shape tilings           |

## HyperRogue (Gold Standard)

- **Path:** `./base/hyperrogue-master/`
- **Docs:** https://roguetemple.com/z/hyper/dev.php
- **Models:** https://roguetemple.com/z/hyper/models.php

**Scale:** 180+ files, 218,000+ lines, 10+ years development.

**Key Architecture:**

- Uses Minkowski hyperboloid model internally
- Two-level tiling: heptagons (coarse) + cells (fine)
- Lazy generation via state automaton
- 20+ projection models for display
- Supports 40+ geometries (2D, 3D, non-isotropic)

**Key Files:**

- `hyperpoint.cpp` - Core geometry (hyperpoint, transmatrix)
- `heptagon.cpp` - Heptagon grid generation
- `cell.cpp` - Cell layer
- `geometry2.cpp` - adj() function for coordinate transforms
- `models.cpp` - Projection models
- `reg3.cpp` - 3D honeycombs

**Developer recommendation:**

> "I recommend using the Minkowski hyperboloid model internally, and the
> Poincaré disk model for display, just as HyperRogue does."

See `hyperrogue.md` for detailed analysis.

## MagicTile-master

**Path:** `base/MagicTile-master/`

**Architecture:**

- `MagicTile/` - Main puzzle application
- `R3/R3.Core/` - Shared geometry library (also used by Honeycombs)

**Key Files:**

- `R3.Core/Geometry/Polygon.cs` - Polygon representation with segments
- `R3.Core/Geometry/Circle.cs` - Generalized circles (lines as infinite
  radius)
- `R3.Core/Geometry/Segment.cs` - Line or arc segments
- `R3.Core/Math/Mobius.cs` - Mobius transformations
- `R3.Core/Math/Isometry.cs` - General isometries

**Tiling Generation:** Uses reflection-based recursive generation.
Starting from base polygon, reflects across edges, tracking visited
positions via hash map.

## Honeycombs-master

**Path:** `base/Honeycombs-master/`

**Purpose:** Generate 3D hyperbolic honeycombs {p,q,r} for POV-Ray
rendering.

**Key Files:**

- Shares R3.Core with MagicTile
- Adds 4D/H3 specific code
- Outputs POV-Ray scene files

**Value:** Reference for extending to 3D. The R3.Core library is the
most complete mathematical foundation.

## ht.js-make (Existing TypeScript Port)

**Path:** `base/ht.js-make/`

**Structure:**

```
src/
  Geometry/
    Circle.ts
    Polygon.ts
    Segment.ts
    Tile.ts
    Tiling.ts
    TilingConfig.ts
    Vector3D.ts
    ...
  Math/
    Complex.ts
    Geometry2D.ts
    HyperbolicModels.ts
    Mobius.ts
    ...
```

**Status:** Geometry and math modules ported. Missing rendering.

**Recommendation:** Use as starting point, refactor to use hyperboloid
internally, add rendering layer.

## hyperbolic-tiling-main (GPU Renderer)

**Path:** `base/hyperbolic-tiling-main/`

**Files:**

- `src/hyperbolic-tiling.ts` - Main TypeScript (690 lines)
- `src/hyperbolic.vert` - Vertex shader
- `src/hyperbolic.frag` - Fragment shader (250 lines)

**Approach:** Entirely GPU-based. For each pixel:

1. Convert screen coords to Poincare disk
2. Compute which fundamental region
3. Apply reflections until in canonical position
4. Color based on Wythoff construction

**Uniforms:**

- `uProjection` - View matrix
- `uParams` - Triangle group (p, q, r)
- `uMode` - Wythoff construction type

**Value:** Fast rendering approach. Could be adapted for our library's
shader-based mode.

## hyperbolic-ca-simulator-master (Cellular Automata)

**Path:** `base/hyperbolic-ca-simulator-master/`

**Files:**

```
src/core/
  vondyck.coffee      - Von Dyck group implementation
  vondyck_chain.coffee - Chain representation of group elements
  regular_tiling.coffee - Regular tilings on von Dyck groups
  field.coffee        - Sparse field storage
  poincare.coffee     - Poincare disk utilities
  matrix3.coffee      - 3x3 matrix operations
```

**Key Concept: Von Dyck Groups**

Group presentation: `<a, b | a^n = b^m = (ab)^k = e>`

For {p,q} tiling:

- `a` = rotation by 2pi/p around cell center
- `b` = rotation by 2pi/q around vertex
- `ab` = rotation by pi around edge midpoint

Cells identified by chains of group elements:

```
identity -> a -> a*b -> a*b*a^2 -> ...
```

**Sparse Storage:** Only non-empty cells stored. Tree structure for
memory efficiency.

**Value:** Best approach for infinite tilings and cellular automata.

## hyperboloid-model-master

**Path:** `base/hyperboloid-model-master/`

**Single File:** `index.js` (293 lines)

**Key Functions:**

```javascript
// Point operations
normalize(point) // Project to hyperboloid
dist(a, b) // acosh(dot(a,b))
hlerp(a, b, t) // Hyperbolic interpolation

// Transformations
rot(angle) // Rotation around origin
xMove(dist), yMove(dist) // Translation along axes
translationAlongLine(line, d)
rotAroundPoint(point, angle)

// Model conversion
toPoincare(point)
fromPoincare(x, y)
```

**Value:** Clean, minimal implementation of hyperboloid model. Good
reference for internal representation.

## newconformist-master (Conformal Shape Mapping)

**Path:** `base/newconformist-master/`

**Purpose:** Conformally map the hyperbolic plane to arbitrary 2D shapes
using the Riemann mapping theorem. Created by Zeno Rogue (HyperRogue
author).

**Resources:**

- Paper: https://archive.bridgesmathart.org/2019/bridges2019-91.html
- Interactive demo: http://www.roguetemple.com/z/sims/nconf/

**Algorithm Overview:**

1. Shape is rasterized to pixels
2. Two boundary points A, B selected (mapped to band ±∞)
3. For each interior pixel: position = average of neighbors (discrete
   harmonic/Laplace equation)
4. System of linear equations solved via Gaussian elimination
5. Scale x-coordinate to make mapping conformal

**Key Files:**

- `nconf.cpp` - Main implementation (~1800 lines)
- `mat.cpp` - Hyperbolic geometry operations (Minkowski hyperboloid)
- `btd.cpp` - Band-to-disk conversion and fork handling
- `graph2.h` - SDL/libgd bitmap wrapper
- `zebra.cpp` - Period matrices for HyperRogue tilings

**Key Data Structures:**

```cpp
// Point on Minkowski hyperboloid
typedef array<ld, 3> hyperpoint;

// 3x3 Lorentz transformation matrix
typedef array<ld, 9> transmatrix;

// Band/disk coordinates
typedef array<ld, 2> cpoint;

// Per-pixel data
struct datapoint {
  cpoint x;           // Computed band coordinates
  ptype type;         // inside, outside, boundary type
  vector<equation> eqs; // Linear equations for Gaussian elimination
};

// Per-region data
struct sideinfo {
  cpoint cscale;      // Scaling to make conformal
  ld period;          // Period in band units
  ld xcenter;         // Center x coordinate
  vector<transmatrix> period_matrices; // For periodic tilings
  stype type;         // standard (disk), ring (annulus)
};
```

**Core Transformations (mat.cpp):**

```cpp
// Hyperboloid to Poincare disk
cpoint hyper_to_disk(hyperpoint p) {
  return {p[0] / (1+p[2]), p[1] / (1+p[2])};
}

// Band model conversion
pair<ld, ld> unband(cpoint& c, sideinfo& si, ld shift) {
  ld y = c[1] * 2 - 1;  // -1 to 1
  ld x = (c[0] + shift) * 2 / si.cscale[0];
  y = -2 * atanh(tan(y * M_PI / 4));  // Gudermannian
  return {x * M_PI/2, y};
}

// Lorentz boosts
transmatrix xpush(ld alpha) {  // Translation in x
  // [cosh, 0, sinh; 0, 1, 0; sinh, 0, cosh]
}

transmatrix ypush(ld alpha) {  // Translation in y
  // [1, 0, 0; 0, cosh, sinh; 0, sinh, cosh]
}
```

**Gaussian Elimination (nconf.cpp:708-756):**

Each pixel has equations of form: `x = (1/n) * sum(neighbors)`. The
algorithm:

1. Sort pixels by elimination order (diagonal-first for speed)
2. For each pixel, substitute its equation into neighbors
3. After elimination, back-substitute to get final coordinates
4. Complexity depends on elimination order; diagonal order is O(n)

**Fork Handling (btd.cpp):**

For Y-shaped or branching regions:

1. Compute multiple mappings (one per branch end)
2. Find merge points at branch junctions
3. At runtime, check which branch mapping to use
4. Apply transformation to match at merge point

**Period Matrices (zebra.cpp):**

For periodic tilings like HyperRogue's Zebra pattern:

```cpp
// Matrices that move to equivalent positions in the tiling
vector<transmatrix> zebra_matrices;
ld zebra_period;  // Period in band units

// Find closest equivalent point
hyperpoint reperiod(hyperpoint p, vector<transmatrix>& periods) {
  for (auto& z : periods) {
    if (mulnorm(z, p) < p[2]) {  // Closer to origin
      p = mul(z, p);
    }
  }
  return p;
}
```

**Usage:**

```bash
# Map a shape
./nconf -mim shape.png -mapat 100 50 -li tiling.png -zebra -period 6 -draw

# Map all regions
./nconf -mim shape.png -mapall -sma shape.maps
./nconf -lma shape.maps -side 0 -li tiling.png -zebra -period 6 -export result.png
```

**Value for Hive Library:**

1. **Arbitrary shape mapping** - Algorithm to map tilings onto any shape
2. **Band model implementation** - Complete band model with conversions
3. **Fork/branch handling** - Robust algorithm for complex shapes
4. **Period matrix system** - Reusable for periodic tiling display
5. **Discrete harmonic mapping** - Could be adapted for mesh generation
6. **HyperRogue integration** - Direct compatibility with HyperRogue
   tilings

**Implementation Checklist:**

- [ ] Port band model conversions (unband, equirectangular)
- [ ] Port Gaussian elimination solver
- [ ] Port fork detection and merging algorithm
- [ ] Port period matrix handling
- [ ] Create TypeScript API for shape mapping
- [ ] Integrate with existing tessellation system

## Comparison: Coordinate Systems

| Repository        | Internal            | Display  | Why                       |
| ----------------- | ------------------- | -------- | ------------------------- |
| **HyperRogue**    | **Hyperboloid**     | Multiple | Official recommendation   |
| MagicTile         | Complex (Poincare)  | Poincare | Mobius transforms natural |
| ht.js-make        | Complex (Poincare)  | Poincare | Port of MagicTile         |
| hyperbolic-tiling | Homogeneous Complex | Poincare | GPU-friendly              |
| hyperbolic-ca     | Hyperboloid         | Poincare | Clean group theory        |
| hyperboloid-model | Hyperboloid         | Poincare | Clean math                |
| newconformist     | Band + Hyperboloid  | Poincare | Shape mapping             |

**Recommendation:** Use hyperboloid internally (like HyperRogue,
hyperbolic-ca, and hyperboloid-model) for cleaner math, convert to
Poincare or other models for display.

## Comparison: Tiling Generation

| Repository        | Method         | Infinite | Topology |
| ----------------- | -------------- | -------- | -------- |
| **HyperRogue**    | State Machine  | Yes      | Yes      |
| MagicTile         | Reflection     | No       | Yes      |
| ht.js-make        | Reflection     | No       | Yes      |
| hyperbolic-tiling | Shader         | Yes      | No       |
| hyperbolic-ca     | Group          | Yes      | Yes      |
| newconformist     | Gauss Elim     | No       | Yes      |

**Recommendation:** Support both reflection-based (for finite
interactive tilings) and group-based (for infinite tilings and CA).

## Code Quality Assessment

| Repository        | TypeScript  | Tests | Docs | Maintainability |
| ----------------- | ----------- | ----- | ---- | --------------- |
| MagicTile         | No (C#)     | No    | Some | Medium          |
| Honeycombs        | No (C#)     | No    | Some | Medium          |
| ht.js-make        | Yes         | No    | No   | Good            |
| hyperbolic-tiling | Yes         | No    | No   | Good            |
| hyperbolic-ca     | No (Coffee) | Some  | Some | Medium          |
| hyperboloid-model | No (JS)     | No    | No   | Good            |
| newconformist     | No (C++)    | No    | Good | Medium          |

**ht.js-make** has the cleanest TypeScript structure.
**hyperbolic-tiling** has modern TypeScript + WebGL. Both are good
starting points.

## What to Extract

### From ht.js-make:

- Complex number class
- Vector3D class
- Circle/Segment/Polygon classes
- Mobius transformation class
- HyperbolicModels conversions
- Tiling generation algorithm

### From hyperboloid-model:

- Minkowski dot product
- Point normalization
- Distance calculation
- Hyperboloid transformations
- Conversion to/from Poincare

### From hyperbolic-tiling:

- WebGL shader setup
- Homogeneous coordinate approach
- Wythoff construction modes
- Fragment shader algorithm

### From hyperbolic-ca-simulator:

- Von Dyck group implementation
- Chain-based cell identification
- Sparse field storage
- Neighborhood computation
- Matrix3 operations

### From newconformist:

- Band model implementation and conversions
- Discrete harmonic mapping algorithm
- Gaussian elimination solver for linear systems
- Fork/branch detection and merging
- Period matrix handling for periodic tilings
- Shape-to-hyperbolic conformal mapping

## Missing Pieces

None of the repositories provide:

1. **Three.js integration** - Custom geometries for hyperbolic objects
2. **Scene graph** - Composable scene management
3. **Animation system** - Smooth transitions and effects
4. **3D WebGL rendering** - Real-time 3D hyperbolic display
5. **Touch/gesture support** - Mobile-friendly interaction
6. **Level of detail** - Progressive refinement for large scenes

These need to be built from scratch or adapted from other sources.
