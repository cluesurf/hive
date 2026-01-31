# Margenstern Volume 1 Notes

Notes from "Cellular Automata in Hyperbolic Spaces Volume 1" by Maurice
Margenstern.

Volume 1 focuses on **theoretical foundations** while Volume 2 covers
**implementation and computations**.

## Files

| File                      | Topic                                   |
| ------------------------- | --------------------------------------- |
| implementation-insights.md| Key insights for {p,q} engine design    |

## Key Chapters for Implementation

### Chapter 4: Splitting and Spanning Trees

The core playbook for turning hyperbolic tilings into traversable data
structures.

Key concepts:
- Spanning tree construction from tile splitting
- Language of the splitting (coordinates as regular language words)
- Preferred son property
- General {p,q} support

### Highlighted Tiling Families

| Family    | Examples        | Notes                          |
|-----------|-----------------|--------------------------------|
| {p,3}     | {7,3}           | Ternary heptagrid              |
| {p,4}     | {5,4}           | Pentagrid                      |
| {p+2,3}   | Various         | Related to {p,4} family        |

These families have particularly clean tree models and neighbor rules.

## Relationship to Volume 2

Volume 1 provides the theoretical foundation:
- Tree construction theory
- Coordinate language definition
- Neighbor rule derivation

Volume 2 provides implementation details:
- Concrete algorithms
- Complexity analysis
- Practical applications

## Cross-References

See also:
- `../margenstern-vol2/` - Volume 2 implementation notes
- `../margenstern-vol2/generalized-pq-engine.md` - Unified engine design
