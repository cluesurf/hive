# The Heptagrid and the Fibonacci Tree

This document summarizes Maurice Margenstern’s approach to modeling the
hyperbolic plane using the {7,3} tiling and the Fibonacci tree.

## What is the Heptagrid?

- The heptagrid is a tiling of the hyperbolic plane using regular
  heptagons, where three heptagons meet at each vertex.
- It is described by the Schläfli symbol {7,3}, which means:

  - Each polygon has 7 sides.
  - 3 polygons meet at each vertex.

- This tiling is only possible in hyperbolic geometry because the angle
  sum at each vertex is less than 360 degrees.

## Why Use a Tree?

- A single sector (wedge) of the heptagrid can be mapped to a tree
  structure.
- This tree helps:

  - Assign coordinates to tiles.
  - Navigate from one tile to another.
  - Run algorithms or cellular automata on the grid.

## The Fibonacci Tree

- The tree used is based on the Fibonacci sequence.
- The root of the tree is the central tile.
- Each node in the tree corresponds to a tile in the sector.
- The number of nodes at each level grows like the Fibonacci sequence:

  - 1, 2, 3, 5, 8, 13, ...

## Two Types of Nodes

- Nodes in the tree are either white or black:

  - White nodes have 3 children: black, white, white.
  - Black nodes have 2 children: black, white.

- This branching structure creates a tree whose level sizes follow the
  Fibonacci recurrence.

## Numbering the Tree

- Nodes are numbered breadth-first: starting at 1 (the root), then
  numbering level by level from left to right.
- This ensures that each node has a unique index.

## Fibonacci Base Coordinates

- Each tile’s number is converted into a **Zeckendorf representation**:
  a sum of non-consecutive Fibonacci numbers.

  - Example: 6 = 5 + 1 → Fibonacci code = `1001`.

- This code serves as a coordinate or address in the tree.
- The Fibonacci base avoids two consecutive 1s to ensure uniqueness.

## Preferred Son and Parent

- The **preferred son** of a node is the child whose code is formed by
  appending `00` to the parent’s code.
- To recover the parent from a preferred son, remove the trailing `00`.
- This structure allows efficient path and neighbor computations.

## Neighbor Computation

- Each tile in the heptagrid has 7 neighbors.
- Using Margenstern's model, you can compute all neighbors of a tile
  directly from its number.
- Neighboring tiles include:

  - The parent
  - Siblings or nearby nodes
  - The preferred son and its immediate neighbors

## Applications

- This model has been used to:

  - Build universal Turing machines on the hyperbolic plane.
  - Implement cellular automata with exponential space.
  - Explore complexity classes such as PSPACE using hyperbolic CAs.

- It enables local computations that are efficient and scalable in
  hyperbolic geometry.

## Summary

- The {7,3} heptagrid is modeled using a Fibonacci-labeled tree.
- Each tile receives a unique, efficiently computable coordinate.
- The system supports fast navigation, neighbor lookup, and formal
  computation in hyperbolic space.

## Relevance and Applications

The heptagrid Fibonacci tree model, as developed by Maurice Margenstern,
provides a powerful structure for working with hyperbolic geometry,
particularly the regular {7,3} tiling.

### Compact Coordinate System

- Every tile in a sector of the heptagrid is uniquely identified by a
  coordinate derived from a Fibonacci tree.
- These coordinates are based on Zeckendorf representations (sums of
  non-consecutive Fibonacci numbers).
- The preferred-son property (code + `00`) allows efficient encoding and
  navigation through the tree.

### Efficient Algorithms in Hyperbolic Space

- Paths to the root and between nodes can be computed in linear time
  using only the coordinate string.
- Neighbor computation is also linear-time and rule-based, independent
  of geometric embedding.
- These properties make this system suitable for formal algorithmic
  manipulation of hyperbolic space.

### Cellular Automata and Universality

- The coordinate structure enables implementation of deterministic and
  non-deterministic cellular automata.
- Margenstern constructed weakly and strongly universal CAs using this
  model with as few as 6 states.
- This structure supports efficient simulation of Turing machines within
  hyperbolic tilings.

### Applications Beyond Computation

- Supports analysis of symmetry groups and motion patterns in the
  tiling.
- Provides tools for reflection-based motion, discrete geometric group
  theory, and combinatorial constructions in hyperbolic geometry.
- Useful in the study of automatic groups and the geometry of abstract
  rewriting systems.

This model creates a practical framework for studying and manipulating
infinite hyperbolic tilings using finite, structured, and computable
representations.
