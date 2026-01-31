# The Tiling Problem and Undecidability

Chapter 5 of Volume 2 covers the tiling problem in hyperbolic space and
related undecidability results.

## Main Result

**Theorem 1 (Margenstern, 2007)**: The domino problem of the hyperbolic
plane is undecidable.

This resolves a long-standing open problem raised by Robinson in 1971.

## Background

### The Tiling Problem

Given a finite set S of prototiles, can we tile the plane with copies of
tiles from S?

| Problem Type       | Description                             |
| ------------------ | --------------------------------------- |
| Origin-constrained | Must start with a specific initial tile |
| General            | No fixed starting tile                  |
| Finite tiling      | Tile a finite region                    |
| Periodic tiling    | Find a tiling with shift invariance     |

### History

- **1961**: Wang raised the question
- **1966**: Berger proved undecidability for Euclidean plane
- **1971**: Robinson gave simpler proof for Euclidean case
- **1978**: Robinson proved origin-constrained undecidable for
  hyperbolic
- **2007**: Margenstern and Kari independently proved general case
  undecidable

## The Mantilla

The proof uses a specific tiling structure in the {7,3} heptagrid called
the **mantilla**.

### Flowers

- A **flower** is a ball of radius 1 (a tile plus its 7 neighbors)
- Flowers tile the hyperbolic plane
- The mantilla is built by partially merging flowers

### Flower Types

| Type     | Description                         |
| -------- | ----------------------------------- |
| F-flower | Standard flower                     |
| G-flower | Specific arrangement with neighbors |
| 8-flower | 8-sector configuration              |

### Sectors

The mantilla uses sectors defined by flower types:

- F-sector: 5 sub-sectors
- G-sector: 5 sub-sectors
- 8-sector: 4 sub-sectors

### Isoclines and Levels

- **Isoclines**: Horizontal lines in the mantilla structure
- **Levels**: Vertical organization from center outward
- Numbered 0-7 with periodic repetition

## Proof Strategy

### Space-Time Diagram Embedding

1. Simulate a Turing machine computation
2. Embed the space-time diagram into the hyperbolic plane
3. Use the mantilla structure to create a grid
4. If machine halts, tiling cannot be completed
5. If machine doesn't halt, tiling can continue indefinitely

### Trilaterals and Brackets

**Trilaterals**: Triangle-like structures in the mantilla

- Vertex on one isocline
- Basis on another isocline
- Legs connecting them

**Abstract brackets**: Pattern of active/silent intervals

- Active intervals: Where computation occurs
- Silent intervals: Spacing between computations

### Signal Types

| Signal Type | Purpose                             |
| ----------- | ----------------------------------- |
| Skeleton    | Materializes trilaterals            |
| Control     | Horizontal signals from trilaterals |
| Scent       | Coordinates between levels          |
| Sync        | Synchronization across regions      |

### Colors

- **Blue-0**: Generation 0
- **Blue**: Positive even generations
- **Red**: Odd generations
- Thickness distinguishes triangles from phantoms

## Corollaries

### Theorem 3: Heesch Number

There is no computable function bounding the Heesch number for tilings
of the hyperbolic plane.

(Heesch number = maximum coronas that can be formed around a disc)

### Theorem 4: Finite Tiling

The finite tiling problem is undecidable for the hyperbolic plane.

### Theorem 5: Periodic Tiling

The periodic tiling problem is undecidable for the hyperbolic plane
(also in domino version).

## Beyond the Halting Problem

### The Infinigrid

Section 5.3 discusses going beyond the Turing barrier using
**infinigrids**.

An infinigrid is a structure with:

- Infinite branching at each level
- Exponential (uncountable) structure
- Special proximity conditions

### Properties

| Condition | Description                                 |
| --------- | ------------------------------------------- |
| (i)       | Cell knows if state appears among neighbors |
| (ii)      | Finite proximity window                     |
| (iii)     | Window moves by one cell per tick           |
| (iv)      | Initially centered on cell itself           |

### Theorem 7 (Grigoriev-Margenstern)

Cellular automata on the infinigrid satisfying conditions (i)-(iv) can
decide any formula of Σ^0_n or Π^0_n for any n, in time n.

This goes beyond classical Turing decidability.

### Super-Turing Computation

The infinigrid provides a theoretical framework for computation beyond
the halting problem. Each cell can:

- See all states in its infinite line simultaneously
- Perform existential/universal quantifier evaluation
- Propagate results upward in the tree

## Prototile Count

The mantilla construction requires a large number of prototiles:

- Original construction: ~10,000 tiles
- Optimized estimates: ~9,000 tiles
- Signals and crossings account for ~1/3 of tiles

## Implementation Relevance

### For Visualization

The mantilla structure provides:

- A way to organize the heptagrid into regular patterns
- Isoclines and levels for hierarchical navigation
- Sector-based decomposition

### For CA Research

The undecidability results imply:

- Cannot algorithmically predict if arbitrary CA halts
- Global properties of hyperbolic CA are generally uncomputable
- Local analysis tools are essential

### For Coordinate Systems

The mantilla's structure uses:

- Fibonacci tree spanning
- Sector decomposition
- Level-by-level construction

These align with the coordinate approaches in other chapters.
