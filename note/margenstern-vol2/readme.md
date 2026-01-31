# Margenstern Volume 2 Notes

Notes from "Cellular Automata in Hyperbolic Spaces Volume 2" by Maurice
Margenstern.

## Files

### Theory Notes

| File                  | Topic                                        |
| --------------------- | -------------------------------------------- |
| coordinate-system.md  | Core implementable coordinate model          |
| fibonacci-tree.md     | Fibonacci tree structure and operations      |
| shortest-paths.md     | Path algorithms and distance computation     |
| complexity-results.md | P=NP results, SAT solving, PSPACE            |
| applications.md       | Practical applications (keyboards, IP, etc.) |
| chapter-notes.md      | Detailed chapter-by-chapter reading notes    |

### Implementation Code

| File                            | Topic                                     |
| ------------------------------- | ----------------------------------------- |
| heptagrid-7-3-rules.md          | {7,3} ternary heptagrid rule set          |
| heptagrid-7-3-implementation.md | {7,3} complete TypeScript implementation  |
| pentagrid-5-4-implementation.md | {5,4} pentagrid TypeScript implementation |

## Key Concepts for Implementation

### The Coordinate Model

Every tile in a hyperbolic {p,q} tiling is addressed by:

```
(sector, path)
```

Where:

- sector: 0 to p-1 (which edge of central tile)
- path: sequence of child indices down a spanning tree

### The Spanning Tree

Each sector contains a Fibonacci tree whose growth matches hyperbolic
geometry. Node types determine branching (W=2 children, B=1 child for
pentagrid).

### Linear Time Operations

All essential operations are O(depth):

- Find neighbor
- Compute distance
- Find path
- Change coordinate root

## Reading Progress

- [x] Pages 1-40: Introduction, coordinate systems
- [x] Pages 41-60: Hedlund's theorem, paths
- [x] Pages 61-80: Coordinate change, point coordinates
- [x] Pages 81-100: Localization, initialization
- [x] Pages 101-120: Communications, applications
- [x] Pages 121-140: P systems, SAT solving
- [x] Pages 141-160: Ph = PSPACE, complexity hierarchies
- [ ] Pages 161-200: Complexity theory continued
- [ ] Pages 201-300: 3D/4D hyperbolic spaces
- [ ] Pages 301-359: Additional topics

## Implementation Priorities

1. **Coordinate system** - Core addressing model
2. **Neighbor computation** - Tree navigation with backtracking
3. **Distance computation** - LCA-based algorithm
4. **Rendering** - Poincare disk visualization
