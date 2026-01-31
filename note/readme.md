# @cluesurf/hive Documentation Index

TypeScript library for hyperbolic, spherical, and Euclidean geometry
visualization.

## Quick Reference

| Topic                    | Document                  |
| ------------------------ | ------------------------- |
| Project goals & vision   | `vision.md`               |
| Implementation phases    | `plan.md`                 |
| Directory structure      | `package-structure.md`    |
| Math theory              | `theory.md`               |
| Curves (2D/3D)           | `curves.md`               |
| Why hyperboloid model    | `hyperboloid-analysis.md` |
| Unified geometry (S/E/H) | `unified-geometry.md`     |
| Geometry implementations | `geometry-models.md`      |
| Design principles        | `principles.md`           |
| Coordinate systems       | `coordinate-systems.md`   |
| Design TODOs             | `design-todos.md`         |
| Tessellation generation  | `tessellation.md`         |
| Kaleidoscope system      | `kaleidoscope.md`         |
| Fractal system           | `fractals.md`             |
| Hyperbolic honeycombs    | `hyperbolic-honeycombs.md`|

## Architecture

| Topic                    | Document              |
| ------------------------ | --------------------- |
| Core architecture        | `architecture.md`     |
| Computation vs rendering | `layer-separation.md` |
| Optimization strategies  | `optimization.md`     |
| Animation system         | `animation.md`        |

## Features

| Topic                 | Document              |
| --------------------- | --------------------- |
| User interaction      | `interactivity.md`    |
| Paths, labels, layers | `visual-features.md`  |
| SVG-style paths       | `visual-features.md`  |
| Path animation        | `visual-features.md`  |
| Curve rendering       | `curve-rendering.md`  |

## Research & References

| Topic                 | Document             |
| --------------------- | -------------------- |
| Source code analysis  | `source-analysis.md` |
| HyperRogue deep dive  | `hyperrogue.md`      |
| External dependencies | `dependencies.md`    |

## Key Decisions

These are the architectural decisions made for this project:

1. **Internal model**: Hyperboloid (Minkowski) model

   - See `hyperboloid-analysis.md`

2. **Package structure**: Single package `@cluesurf/hive`

   - Internal imports use `@/` alias mapping to `./code/*`
   - See `package-structure.md`

3. **Directory naming**: `code/` not `src/`, `code/form/` not
   `code/core/`

   - See `package-structure.md`

4. **Optimization**: Hybrid approach (objects for API, typed arrays for
   GPU)

   - Instanced rendering for tiles
   - Full caching for transforms and geometry
   - See `optimization.md`

5. **Rendering**: Separate from computation

   - Core can run in Node.js/Workers
   - Rendering layer is optional
   - See `layer-separation.md`

6. **Unified geometry**: Curvature parameter K for S/E/H
   - K > 0: Spherical
   - K = 0: Euclidean
   - K < 0: Hyperbolic
   - See `unified-geometry.md`

## Module Dependency Graph

```
form/     → (nothing)
math/     → form/
model/    → form/, math/
tiling/   → form/, math/
group/    → form/, math/
ca/       → form/, tiling/
camera/   → form/, math/, model/
interact/ → form/, tiling/, camera/
render/   → form/, model/, camera/
```

## Implementation Status

Phase 1: Core Mathematics

- Not started

Phase 2: Geometric Objects

- Not started

Phase 3: Tessellation Generation

- Not started

Phase 4: 3D Extension

- Not started

Phase 5: Rendering

- Not started

Phase 6: Interactivity

- Not started

Phase 7: Scene Management

- Not started

Phase 8: Advanced Features

- Not started

See `plan.md` for full details.

## For AI Assistants

When resuming work on this project:

1. Read `vision.md` first for the big picture
2. Check `plan.md` for implementation phases
3. Reference `package-structure.md` for where code goes
4. Use `theory.md` for mathematical foundations
5. Check `optimization.md` for performance patterns
