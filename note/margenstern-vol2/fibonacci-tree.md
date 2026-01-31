# Fibonacci Tree Structure for Hyperbolic Tilings

## Overview

The Fibonacci tree is the core data structure for addressing tiles in
{5,4} and {7,3} hyperbolic tilings. It provides a spanning tree whose
growth matches the exponential expansion of hyperbolic space.

## Basic Fibonacci Numbers

```
F_0 = 1
F_1 = 1
F_n = F_{n-1} + F_{n-2}

Sequence: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ...
```

## Connection to Hyperbolic Tilings

### Level Population

For pentagrid {5,4}:

- Level k has F\_{2k+1} nodes

For ternary heptagrid {7,3}:

- Level k has F\_{2k+1} nodes (same formula, different tree structure)

### Growth Rate

The number of tiles grows as the golden ratio phi^n where:

```
phi = (1 + sqrt(5)) / 2 ≈ 1.618
```

This matches hyperbolic space's exponential growth.

## Tree Node Types

### Pentagrid {5,4}

Two node colors:

- **White (W)**: Has 2 children (branching)
- **Black (B)**: Has 1 child (linear)

Standard configuration at each level:

```
Level k: f_{2k-1} white nodes, f_{2k-2} black nodes
```

### Extended Status Labels

More precise node classification:

| Label | Meaning                                  |
| ----- | ---------------------------------------- |
| Bb    | Black node with black father             |
| Bw    | Black node with white father             |
| Wwm   | White node, white father, middle son     |
| Wwr   | White node, white father, right-hand son |
| Wb    | White node with black father             |

### Ternary Heptagrid {7,3}

Two node colors:

- **White (W)**: Has 3 children
- **Black (B)**: Has 2 children

## Fibonacci Representation of Paths

### Standard Representation

Alphabet: {0, 1} Constraint: No consecutive 1s

```
Valid:   0, 1, 10, 100, 101, 1000, 1001, 1010, ...
Invalid: 11, 110, 011, 111, ...
```

This is called the **Zeckendorf representation**.

### Alternative: Golden Ratio Base

Alphabet: {0, 1, 2} Base: phi^2 (square of golden ratio) Constraint:
Forbid pattern "21\*2" (2 followed by any 1s followed by 2)

### Conversion Between Representations

Linear-time algorithms exist for:

1. Standard Fibonacci -> Golden ratio base
2. Golden ratio base -> Standard Fibonacci

Key insight: Both represent the same underlying tree position, just with
different digit encodings.

## Tree Operations

### Numbering Scheme

Within each level, nodes are numbered left-to-right:

```
Level 0: node 1 (root)
Level 1: nodes 1, 2
Level 2: nodes 1, 2, 3
Level k: nodes 1 to F_{2k+1}
```

### Child Computation

For a white node at position n on level k:

- Left child is at position f(n) on level k+1
- Right child is at position f(n)+1 on level k+1

For a black node at position n on level k:

- Only child is at position g(n) on level k+1

The functions f and g are derived from Fibonacci arithmetic.

### Parent Computation

Reverse of child computation. Given node position on level k+1, compute
parent position on level k using inverse Fibonacci formulas.

## Implementation Notes

### Data Structure

```typescript
interface FibonacciNode {
  level: number
  position: number // 1-indexed within level
  color: 'white' | 'black'
  // OR
  status: 'Bb' | 'Bw' | 'Wwm' | 'Wwr' | 'Wb'
}
```

### Path Encoding

```typescript
type FibonacciPath = number[] // sequence of child indices

// For white nodes: child index in {0, 1}
// For black nodes: child index is always 0

// Alternative: encode as Fibonacci number directly
type FibonacciAddress = bigint
```

### Key Algorithms

1. **Level computation**: O(1) from path length
2. **Position within level**: O(path length)
3. **Path from position**: O(level) using Fibonacci decomposition
4. **Neighbor finding**: O(level) with backtracking

## Propagation Cellular Automaton

The Fibonacci tree structure can be installed dynamically using a
cellular automaton:

### P5 Automaton (Pentagrid)

Starting from central cell, spreads outward installing:

- Node colors (W/B)
- Parent-child relationships
- Sector labels

### P7 Automaton (Heptagrid)

Similar to P5 but for {7,3} structure.

### Key Property

After n steps, the automaton has correctly labeled all tiles up to level
n in the Fibonacci tree. This provides dynamic initialization for
hyperbolic grids.

## Relationship to Fibonacci Sequence

The tree structure directly encodes Fibonacci numbers:

- Level 0: F_1 = 1 node
- Level 1: F_3 = 2 nodes
- Level 2: F_5 = 5 nodes
- Level k: F\_{2k+1} nodes

The white/black pattern mirrors Fibonacci addition:

```
nodes(k) = nodes(k-1) + nodes(k-2)
```

Where white nodes contribute 2 to next level, black nodes contribute 1.
