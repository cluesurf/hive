# Remaining Topics to Capture

Based on reading progress and known chapter structure.

## Pages 161-200: Chapter 4 (Universality) Continued

### Railway Model (pp. 181-190)

An alternative model for universal computation using railway circuits.

#### Key Concepts

- **Railway circuits**: Directed graphs representing computation paths
- **Switches**: Three types
  - **Fixed switch**: Always routes to one direction
  - **Flip-flop switch**: Alternates direction each pass
  - **Memory switch**: Remembers last direction set
- **Crossings**: Allow two tracks to cross without interaction
- **Stations**: Starting/ending points for particles

#### Why Relevant for Implementation

Railway circuits provide a different computational model that may be
useful for:

- Visualizing computation flows in hyperbolic tilings
- Alternative representations of cellular automaton state machines
- Educational demonstrations of universality

### Additional Universality Results (pp. 190-200)

- **Weakly universal CAs**: Require infinite initial configurations
- **Strongly universal CAs**: Work from finite configurations
- **Rotation-number constraints**: Limits on universality based on
  rotation invariance

## Pages 201-300: 3D/4D Hyperbolic Spaces

### Expected Topics

- **Dodecahedral honeycomb {5,3,4}**: 3D analog of pentagrid
- **Coordinate systems in 3D**: Extension of sector+path model
- **Tree structures**: How Fibonacci trees generalize to 3D
- **Neighbor computation**: More complex adjacency relationships
- **Distance algorithms**: LCA-based methods in higher dimensions

### Implementation Relevance

If extending `@cluesurf/hive` to 3D visualization:

- Same coordinate philosophy should apply
- Grammar-based node types may need extension
- Side numbering becomes face numbering

## Pages 301-359: Additional Topics

### Potential Content

- **Other {p,q} tilings**: Beyond pentagrid and heptagrid
- **Irregular tilings**: Mixed polygon types
- **Boundary conditions**: Finite hyperbolic regions
- **Practical applications**: Further examples

### Key Questions to Answer

1. Does the Fibonacci tree structure work for ALL {p,q} tilings?
2. Are there tilings that require different grammar rules?
3. How do the complexity results extend beyond pentagrid?

## Priority Insights for Implementation

### High Priority

1. **3D coordinate model**: If 3D visualization is planned
2. **Other {p,q} grammars**: For generalized engine completeness
3. **Boundary handling**: For finite region rendering

### Medium Priority

1. Railway circuits (alternative computation model)
2. Weakly vs strongly universal distinctions
3. Rotation-number theory

### Lower Priority

1. Detailed complexity proofs (already have key results)
2. Historical context
3. Advanced theoretical results not affecting implementation

## Notes on Generalized {p,q} Engine

The `generalized-pq-engine.md` file provides the unified engine design.
Remaining book sections should verify:

1. **Grammar universality**: Does Fibonacci grammar work for all {p,q}?
2. **Side mapping variations**: How do different tilings map sides?
3. **Sector counting**: Always p sectors for {p,q}?

Key insight from existing notes: The standard Fibonacci tree structure
plays the same role in both {5,4} and {7,3}, suggesting it may be
universal for a family of tilings satisfying certain curvature
constraints.

## Action Items for Continued Reading

When continuing with the book:

1. [ ] Confirm 3D coordinate structure (pages 201-250)
2. [ ] Document any non-Fibonacci tree tilings (pages 250-300)
3. [ ] Extract practical algorithms for implementation (throughout)
4. [ ] Note any edge cases or gotchas mentioned (throughout)
5. [ ] Capture rendering/visualization guidance if present
