# Package Structure

## Overview

Single package `@cluesurf/hive` with internal modules organized under
`./code/`. Internal imports use the `@/` path alias.

## Directory Structure

```
@cluesurf/hive/
├── package.json
├── tsconfig.json
├── code/
│   ├── index.ts              # Main exports
│   │
│   ├── form/                 # Type definitions (no dependencies)
│   │   ├── index.ts
│   │   ├── point.ts          # HyperPoint, HyperPoint3D
│   │   ├── matrix.ts         # Matrix3, Matrix4
│   │   ├── vector.ts         # Vec2, Vec3, Vec4
│   │   ├── complex.ts        # Complex numbers
│   │   ├── geodesic.ts       # Geodesic type
│   │   ├── polygon.ts        # Polygon type
│   │   ├── tile.ts           # Tile type
│   │   ├── tiling.ts         # Tiling type
│   │   ├── path.ts           # Path type
│   │   └── camera.ts         # Camera2D, Camera3D types
│   │
│   ├── math/                 # Pure math functions
│   │   ├── index.ts
│   │   ├── minkowski.ts      # Minkowski dot, norm, etc.
│   │   ├── hyperboloid.ts    # Hyperboloid operations
│   │   ├── isometry.ts       # Rotation, translation, reflection
│   │   ├── geodesic.ts       # Geodesic operations
│   │   ├── interpolate.ts    # hlerp, slerp
│   │   └── polygon.ts        # Polygon operations
│   │
│   ├── model/                # Model conversions
│   │   ├── index.ts
│   │   ├── poincare.ts       # Poincare disk
│   │   ├── klein.ts          # Klein model
│   │   ├── halfplane.ts      # Upper half-plane
│   │   ├── band.ts           # Band model
│   │   └── ball.ts           # 3D ball model
│   │
│   ├── tiling/               # Tiling generation
│   │   ├── index.ts
│   │   ├── config.ts         # TilingConfig
│   │   ├── generate.ts       # generateTiling
│   │   ├── expand.ts         # expandTiling
│   │   ├── query.ts          # getTileAt, getNeighbors
│   │   └── path.ts           # shortestPath, pathBetween
│   │
│   ├── group/                # Group theory (infinite tilings)
│   │   ├── index.ts
│   │   ├── element.ts        # GroupElement
│   │   ├── vondyck.ts        # Von Dyck group operations
│   │   └── sparse.ts         # Sparse field storage
│   │
│   ├── ca/                   # Cellular automata
│   │   ├── index.ts
│   │   ├── field.ts          # Field<T>
│   │   ├── rule.ts           # Rule definitions
│   │   └── simulate.ts       # step, run
│   │
│   ├── camera/               # Camera operations
│   │   ├── index.ts
│   │   ├── transform.ts      # pan, zoom, rotate, focus
│   │   ├── convert.ts        # screenToHyperbolic, etc.
│   │   └── animate.ts        # Camera animations
│   │
│   ├── interact/             # Interaction (browser-optional)
│   │   ├── index.ts
│   │   ├── controller.ts     # Controller class
│   │   ├── input.ts          # Input handlers (DOM)
│   │   ├── gesture.ts        # Touch gestures
│   │   ├── hit.ts            # Hit testing
│   │   └── navigate.ts       # Keyboard navigation
│   │
│   ├── render/               # Rendering (optional)
│   │   ├── index.ts
│   │   ├── types.ts          # Style types
│   │   │
│   │   ├── three/            # Three.js adapter
│   │   │   ├── index.ts
│   │   │   ├── geometry.ts   # tilingToGeometry
│   │   │   ├── material.ts   # HyperbolicMaterial
│   │   │   ├── scene.ts      # HyperbolicScene
│   │   │   └── camera.ts     # HyperbolicCamera
│   │   │
│   │   ├── canvas/           # Canvas 2D adapter
│   │   │   ├── index.ts
│   │   │   └── renderer.ts
│   │   │
│   │   └── svg/              # SVG adapter
│   │       ├── index.ts
│   │       └── export.ts
│   │
│   └── util/                 # Utilities
│       ├── index.ts
│       ├── hash.ts           # Position hashing
│       ├── serialize.ts      # JSON serialization
│       └── events.ts         # EventEmitter
```

## Import Examples

```typescript
// Internal imports use @/ alias
import { HyperPoint, Tile, Tiling } from '@/form'
import { minkowskiDot, distance } from '@/math'
import { toPoincare, fromPoincare } from '@/model/poincare'
import { generateTiling } from '@/tiling'
import { Controller } from '@/interact'

// Cross-module imports
// In code/tiling/generate.ts:
import { HyperPoint, Tile } from '@/form'
import { reflection, applyMatrix } from '@/math'
```

## External Usage

```typescript
// Users import from package root
import {
  generateTiling,
  toPoincare,
  Controller,
  HyperbolicScene,
} from '@cluesurf/hive'

// Or specific subpaths (if configured)
import { generateTiling } from '@cluesurf/hive/tiling'
import { Controller } from '@cluesurf/hive/interact'
```

## Main Entry Point

```typescript
// code/index.ts

// Type definitions
export * from '@/form'

// Math functions
export * from '@/math'

// Model conversions
export * from '@/model'

// Tiling
export * from '@/tiling'

// Group theory
export * from '@/group'

// Cellular automata
export * from '@/ca'

// Camera
export * from '@/camera'

// Interaction (browser)
export * from '@/interact'

// Rendering (optional, may tree-shake)
export * from '@/render'
```

## Dependency Rules

```
form/     → (nothing)
math/     → form/
model/    → form/, math/
tiling/   → form/, math/
group/    → form/, math/
ca/       → form/, tiling/
camera/   → form/, math/, model/
interact/ → form/, tiling/, camera/ (+ DOM optionally)
render/   → form/, model/, camera/ (+ three.js/canvas)
util/     → (nothing)
```

Type definitions (form/) have zero external dependencies. Only
`render/three/` imports Three.js.
