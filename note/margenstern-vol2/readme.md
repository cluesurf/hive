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
| universality.md       | Intrinsic universality, scaled trees         |
| tiling-problem.md     | Undecidability results, mantilla structure   |
| chapter-notes.md      | Detailed chapter-by-chapter reading notes    |

### 3D Hyperbolic Space

| File              | Topic                                        |
| ----------------- | -------------------------------------------- |
| dodecagrid-3d.md  | {5,3,4} dodecagrid coordinate system         |

### Implementation Code

| File                            | Topic                                     |
| ------------------------------- | ----------------------------------------- |
| heptagrid-7-3-rules.md          | {7,3} ternary heptagrid rule set          |
| heptagrid-7-3-implementation.md | {7,3} complete TypeScript implementation  |
| pentagrid-5-4-implementation.md | {5,4} pentagrid TypeScript implementation |
| generalized-pq-engine.md        | Unified engine for any {p,q} tiling       |

### Design Patterns

| File                       | Topic                                     |
| -------------------------- | ----------------------------------------- |
| engine-design-patterns.md  | Practical patterns from both volumes      |

### Planning

| File                 | Topic                              |
| -------------------- | ---------------------------------- |
| remaining-topics.md  | Topics still to capture from book  |

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

### 3D Extension

For 3D tilings like {5,3,4} dodecagrid:

- 8 octants instead of sectors
- 4 node types (0, 1, 2, 3) instead of 2 (B, W)
- 12 neighbors per cell (father + sons + nephews)
- Uncle/nephew relations for non-tree adjacencies

### Linear Time Operations

All essential operations are O(depth):

- Find neighbor
- Compute distance
- Find path
- Change coordinate root

## Reading Progress

### Completed

- [x] Pages 1-40: Introduction, coordinate systems
- [x] Pages 41-60: Hedlund's theorem, paths
- [x] Pages 61-80: Coordinate change, point coordinates
- [x] Pages 81-100: Localization, initialization
- [x] Pages 101-120: Communications, applications
- [x] Pages 121-140: P systems, SAT solving
- [x] Pages 141-160: Ph = PSPACE, complexity hierarchies
- [x] Pages 161-180: Alternating CAs, APh complexity class
- [x] Pages 181-210: Railway circuits, weak universality
- [x] Pages 211-240: Dodecagrid coordinates and algorithms
- [x] Pages 241-340: Tiling problem, mantilla, undecidability
- [x] Pages 341-359: Beyond halting problem, bibliography

### Summary

All major content captured. Key topics documented:

1. 2D coordinate systems ({5,4} pentagrid, {7,3} heptagrid)
2. 3D coordinate systems ({5,3,4} dodecagrid)
3. Generalized {p,q} engine design
4. Complexity results (Ph = PSPACE)
5. Universality (railway circuits, scaled trees)
6. Undecidability (tiling problem)
7. Beyond Turing (infinigrid)

## Implementation Priorities

1. **Coordinate system** - Core addressing model
2. **Neighbor computation** - Tree navigation with backtracking
3. **Distance computation** - LCA-based algorithm
4. **Rendering** - Poincare disk visualization
5. **3D extension** - Dodecagrid support

## Key Theorems

| Theorem | Statement                                      |
|---------|------------------------------------------------|
| Ph = NPh = PSPACE | Complexity classes collapse in hyperbolic |
| SAT in O(n) | 3-SAT solvable in linear time (unary) |
| Tiling undecidable | Domino problem is undecidable |
| Beyond Turing | Infinigrid can decide Σ^0_n formulas |

## Cross-References

See also:
- `../margenstern-vol1/` - Volume 1 theoretical foundations
- `../margenstern-vol1/implementation-insights.md` - Key engine design insights
